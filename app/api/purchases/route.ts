import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const data = await request.json()
    // data: { supplierId, purchaseDate, subtotal, total, items: [{productId, productUnitId, quantity, unitCost, lineTotal}] }

    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase
      const p = await tx.purchase.create({
        data: {
          purchaseNo: `PO${new Date().getTime()}`, // simple PO generation
          supplierId: data.supplierId,
          purchaseDate: new Date(data.purchaseDate),
          subtotal: data.subtotal,
          total: data.total,
          status: 'RECEIVED', // Assuming direct receipt for MVP
          note: data.note,
          createdById: Number(session.user.id),
          items: {
            create: data.items.map((i: any) => ({
              productId: i.productId,
              productUnitId: i.productUnitId,
              quantity: i.quantity,
              unitCost: i.unitCost,
              lineTotal: i.lineTotal
            }))
          }
        },
        include: { items: { include: { productUnit: true } } }
      })

      // 2. Increment Stock and Log Movement
      for (const item of p.items) {
        const qtyBase = item.quantity * item.productUnit.conversionRate

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: 'PURCHASE_IN',
            quantityBase: qtyBase,
            unitCost: item.unitCost / item.productUnit.conversionRate,
            refType: 'PURCHASE',
            refId: p.id,
            createdById: Number(session.user.id)
          }
        })

        await tx.stockBalance.upsert({
          where: { productId: item.productId },
          update: { quantityOnHand: { increment: qtyBase } },
          create: { productId: item.productId, quantityOnHand: qtyBase }
        })
      }

      return p
    })

    return NextResponse.json({ success: true, data: purchase })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
