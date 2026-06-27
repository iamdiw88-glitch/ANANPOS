import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

const damageSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantityBase: z.coerce.number().positive(),
  note: z.string().trim().min(1, "กรุณาระบุเหตุผลการตัดของเสีย"),
})

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiSession(["OWNER", "STAFF"])
    const { productId, quantityBase, note } = await parseJsonBody(request, damageSchema)
    const quantity = Math.abs(Number(quantityBase))

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, isActive: true, isStockItem: true },
        select: { id: true, name: true },
      })
      if (!product) throw new ApiError("ไม่พบสินค้าที่นับสต็อก", 400)

      await tx.$queryRaw`
        SELECT "productId" FROM "StockBalance"
        WHERE "productId" = ${productId}
        FOR UPDATE
      `

      const balance = await tx.stockBalance.findUnique({ where: { productId } })
      const current = balance?.quantityOnHand || 0
      if (current < quantity) {
        throw new ApiError(`สต็อกไม่พอสำหรับตัดของเสีย: ${product.name}`, 400)
      }

      await tx.stockMovement.create({
        data: {
          productId,
          movementType: "DAMAGE_OUT",
          quantityBase: -quantity,
          refType: "DAMAGE",
          note,
          createdById: userId,
        },
      })

      await tx.stockBalance.update({
        where: { productId },
        data: { quantityOnHand: { decrement: quantity } },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorResponse(error, "Failed to write off stock")
  }
}

