import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

const adjustSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantityBase: z.coerce.number(),
  note: z.string().trim().optional(),
})

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiSession(["OWNER", "STAFF"])
    const { productId, quantityBase, note } = await parseJsonBody(request, adjustSchema)
    const quantity = Number(quantityBase)
    if (quantity === 0) throw new ApiError("จำนวนปรับสต็อกต้องไม่เป็น 0", 400)

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
      if (current + quantity < 0) {
        throw new ApiError(`ปรับสต็อกแล้วจะทำให้ ${product.name} ติดลบ`, 400)
      }

      await tx.stockMovement.create({
        data: {
          productId,
          movementType: "ADJUST",
          quantityBase: quantity,
          refType: "ADJUSTMENT",
          note: note || "Adjust Stock",
          createdById: userId,
        },
      })

      await tx.stockBalance.upsert({
        where: { productId },
        update: { quantityOnHand: { increment: quantity } },
        create: { productId, quantityOnHand: quantity },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorResponse(error, "Failed to adjust stock")
  }
}

