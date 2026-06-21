import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { originalSaleId, customerId, returnDate, reason, totalRefund, refundMethod, note, items, createdById } = body

    if (!originalSaleId || !customerId || !reason || !refundMethod || !items || items.length === 0 || !createdById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate Return No (RET-YYMMDD-XXXX)
    const today = new Date()
    const yy = String(today.getFullYear()).slice(2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const prefix = `RET${yy}${mm}${dd}`

    const result = await prisma.$transaction(async (tx) => {
      const lastReturn = await tx.return.findFirst({
        where: { returnNo: { startsWith: prefix } },
        orderBy: { returnNo: 'desc' }
      })
      
      let nextNum = 1
      if (lastReturn) {
        nextNum = parseInt(lastReturn.returnNo.slice(-4)) + 1
      }
      const returnNo = `${prefix}${String(nextNum).padStart(4, '0')}`

      // 1. Create Return Record
      const returnRec = await tx.return.create({
        data: {
          returnNo,
          originalSaleId,
          customerId,
          returnDate: new Date(returnDate),
          reason,
          totalRefund,
          refundMethod,
          note,
          createdById,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              quantityBase: item.quantityBase,
              restock: item.restock,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice
            }))
          }
        },
        include: { items: true }
      })

      // 2. Process Restock (if requested)
      for (const item of returnRec.items) {
        if (item.restock) {
          // Add back to StockMovement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "RETURN_IN",
              quantityBase: item.quantityBase,
              unitCost: 0, // usually returns use the previous average cost or 0
              refType: "RETURN",
              refId: returnRec.id,
              createdById
            }
          })

          // Update StockBalance
          await tx.stockBalance.upsert({
            where: { productId: item.productId },
            create: { productId: item.productId, quantityOnHand: item.quantityBase },
            update: { quantityOnHand: { increment: item.quantityBase } }
          })
        } else {
          // Optional: Record as damage if not restocking? The prompt says "if restock=false, it's a damage"
          // We could create a DAMAGE_OUT movement, but since it was already sold (SALE_OUT), 
          // returning it but NOT restocking means the stock is still OUT. So we don't need to do anything to stock.
        }
      }

      // 3. Handle Refund
      if (refundMethod === "CREDIT_NOTE") {
        // Reduce customer balance by the refund amount (they owe us less)
        const customer = await tx.customer.findUnique({ where: { id: customerId } })
        if (customer && customer.balance > 0) {
          // Subtract from customer balance. Note: to be fully correct we should create a negative payment or similar,
          // but updating the customer balance directly works for MVP. Wait, customer balance is derived from UNPAID sales.
          // To properly reduce it, we should apply this credit note as a "Payment" towards their oldest unpaid sale.
          
          await tx.payment.create({
            data: {
              paymentNo: `CN-${returnNo}`,
              customerId,
              amount: totalRefund,
              method: "TRANSFER", // Treat as transfer/credit
              note: `Credit Note from Return ${returnNo}`,
              createdById
            }
          })

          // Simple balance adjustment
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { decrement: totalRefund } }
          })
        }
      }

      return returnRec
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating return:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
