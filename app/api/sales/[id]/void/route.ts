import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const saleId = Number(id)

    // Run transaction to void bill, restore stock, and reverse AR
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true }
      })

      if (!sale) throw new Error("Sale not found")
      if (sale.status === 'VOID') throw new Error("Already voided")

      // 1. Mark Sale as VOID
      await tx.sale.update({
        where: { id: saleId },
        data: { status: 'VOID' }
      })

      // 2. Restore Stock
      for (const item of sale.items) {
        // If it was a stock item, we need to add back the quantityBase
        const movement = await tx.stockMovement.findFirst({
          where: { productId: item.productId, refType: 'SALE', refId: sale.id }
        })

        if (movement) {
          // Restore StockBalance
          await tx.stockBalance.update({
            where: { productId: item.productId },
            data: { quantityOnHand: { increment: item.quantityBase } }
          })

          // Create reversing StockMovement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: 'ADJUST',
              quantityBase: item.quantityBase,
              refType: 'ADJUSTMENT',
              refId: sale.id,
              note: `VOID-${sale.billNo}`,
              createdById: Number(session.user.id)
            }
          })
        }
      }

      // 3. Reverse Customer Balance if CREDIT/PARTIAL
      if (sale.customerId && (sale.paymentType === 'CREDIT' || sale.paymentType === 'PARTIAL')) {
        const creditAmount = sale.grandTotal - sale.paidAmount
        if (creditAmount > 0) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: creditAmount } }
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to void sale" }, { status: 500 })
  }
}
