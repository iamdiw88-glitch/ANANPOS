import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { productId, quantityBase, note } = await request.json()
    if (!productId || quantityBase === undefined || quantityBase <= 0) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create StockMovement (quantityBase is negative for damage)
      await tx.stockMovement.create({
        data: {
          productId,
          movementType: 'DAMAGE_OUT',
          quantityBase: -Math.abs(Number(quantityBase)),
          refType: 'DAMAGE',
          note: note || "Write off",
          createdById: Number(session.user.id)
        }
      })

      // 2. Update StockBalance
      await tx.stockBalance.update({
        where: { productId },
        data: { quantityOnHand: { decrement: Math.abs(Number(quantityBase)) } }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
