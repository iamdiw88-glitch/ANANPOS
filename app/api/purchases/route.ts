import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"

const purchaseItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  productUnitId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
})

const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  purchaseDate: z.coerce.date().optional(),
  note: z.string().trim().optional(),
  items: z.array(purchaseItemSchema).min(1, "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiSession(["OWNER", "STAFF"])
    const data = await parseJsonBody(request, purchaseSchema)

    const purchase = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: data.supplierId, isActive: true },
        select: { id: true },
      })
      if (!supplier) throw new ApiError("ไม่พบข้อมูล Supplier", 400)

      const productUnitIds = [...new Set(data.items.map((item) => item.productUnitId))]
      const productUnits = await tx.productUnit.findMany({
        where: { id: { in: productUnitIds }, isActive: true },
        include: { product: true },
      })
      const productUnitMap = new Map(productUnits.map((unit) => [unit.id, unit]))
      if (productUnits.length !== productUnitIds.length) {
        throw new ApiError("พบหน่วยสินค้าที่ไม่ถูกต้องหรือถูกปิดใช้งาน", 400)
      }

      const items = data.items.map((item) => {
        const productUnit = productUnitMap.get(item.productUnitId)
        if (!productUnit || productUnit.productId !== item.productId || !productUnit.product.isActive) {
          throw new ApiError("พบรายการสินค้าที่ไม่ถูกต้อง", 400)
        }

        return {
          productId: item.productId,
          productUnitId: item.productUnitId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineTotal: roundMoney(item.quantity * item.unitCost),
          quantityBase: item.quantity * productUnit.conversionRate,
          unitCostBase: productUnit.conversionRate > 0 ? item.unitCost / productUnit.conversionRate : 0,
          isStockItem: productUnit.product.isStockItem,
        }
      })

      const total = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))

      const todayStr = yymmdd()
      const prefix = `PO${todayStr}`
      await lockDocumentSeries(tx, `purchase:${todayStr}`)
      const lastPurchase = await tx.purchase.findFirst({
        where: { purchaseNo: { startsWith: prefix } },
        orderBy: { purchaseNo: "desc" },
        select: { purchaseNo: true },
      })
      const purchaseNo = `${prefix}${String(nextSequenceFrom(lastPurchase?.purchaseNo, prefix)).padStart(4, "0")}`

      const p = await tx.purchase.create({
        data: {
          purchaseNo,
          supplierId: data.supplierId,
          purchaseDate: data.purchaseDate || new Date(),
          subtotal: total,
          total,
          status: "RECEIVED",
          note: data.note,
          createdById: userId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      })

      for (const item of items) {
        if (!item.isStockItem) continue

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "PURCHASE_IN",
            quantityBase: item.quantityBase,
            unitCost: item.unitCostBase,
            refType: "PURCHASE",
            refId: p.id,
            createdById: userId,
          },
        })

        await tx.stockBalance.upsert({
          where: { productId: item.productId },
          update: { quantityOnHand: { increment: item.quantityBase } },
          create: { productId: item.productId, quantityOnHand: item.quantityBase },
        })
      }

      return p
    })

    return NextResponse.json({ success: true, data: purchase })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create purchase")
  }
}

