import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const data = await request.json()
    // data: { originalSaleId, customerId, reason, totalRefund, refundMethod, items: [{productId, productUnitId, quantity, restock, unitPrice, lineTotal}] }

    const returnRec = await prisma.$transaction(async (tx) => {
      // 1. Create Return
      const r = await tx.return.create({
        data: {
          returnNo: `RT${new Date().getTime()}`,
          originalSaleId: data.originalSaleId,
          customerId: data.customerId,
          reason: data.reason,
          totalRefund: data.totalRefund,
          refundMethod: data.refundMethod,
          note: data.note,
          createdById: Number(session.user.id),
          items: {
            create: data.items.map((i: any) => ({
              productId: i.productId,
              productUnitId: i.productUnitId,
              quantity: i.quantity,
              quantityBase: i.quantityBase,
              restock: i.restock,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal
            }))
          }
        },
        include: { items: true }
      })

      // 2. Adjust Stock if restocked
      for (const item of r.items) {
        if (item.restock) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: 'RETURN_IN',
              quantityBase: item.quantityBase,
              refType: 'RETURN',
              refId: r.id,
              createdById: Number(session.user.id)
            }
          })

          await tx.stockBalance.update({
            where: { productId: item.productId },
            data: { quantityOnHand: { increment: item.quantityBase } }
          })
        }
      }

      // 3. If credit note, refund to customer balance
      if (data.refundMethod === 'CREDIT_NOTE') {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { balance: { decrement: data.totalRefund } }
        })
      }

      return r
    })

    return NextResponse.json({ success: true, data: returnRec })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
