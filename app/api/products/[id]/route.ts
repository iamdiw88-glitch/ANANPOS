import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"

const productUnitSchema = z.object({
  unitId: z.coerce.number().int().positive(),
  conversionRate: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  contractorPrice: z.coerce.number().min(0).nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  isDefaultSale: z.coerce.boolean().default(false),
})

const productSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสสินค้า"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อสินค้า"),
  categoryId: z.coerce.number().int().positive(),
  baseUnitId: z.coerce.number().int().positive(),
  reorderPoint: z.coerce.number().min(0).default(0),
  isStockItem: z.coerce.boolean().default(true),
  productUnits: z.array(productUnitSchema).min(1, "กรุณาเพิ่มหน่วยขายอย่างน้อย 1 หน่วย"),
})

function validateProductUnits(units: z.infer<typeof productUnitSchema>[]) {
  const uniqueUnitIds = new Set(units.map((unit) => unit.unitId))
  if (uniqueUnitIds.size !== units.length) {
    throw new ApiError("ห้ามเลือกหน่วยขายซ้ำในสินค้าเดียวกัน", 400)
  }
  if (units.filter((unit) => unit.isDefaultSale).length !== 1) {
    throw new ApiError("ต้องเลือกหน่วยขายเริ่มต้น 1 หน่วย", 400)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "product ID")
    const data = await parseJsonBody(request, productSchema)
    validateProductUnits(data.productUnits)

    const exists = await prisma.product.findFirst({ where: { code: data.code, id: { not: id } } })
    if (exists) throw new ApiError("รหัสสินค้านี้ถูกใช้ไปแล้ว", 400)

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          categoryId: data.categoryId,
          baseUnitId: data.baseUnitId,
          reorderPoint: data.reorderPoint,
          isStockItem: data.isStockItem,
        },
      })

      const activeUnitIds = data.productUnits.map((unit) => unit.unitId)
      await tx.productUnit.updateMany({
        where: {
          productId: id,
          unitId: { notIn: activeUnitIds },
        },
        data: { isActive: false, isDefaultSale: false },
      })

      for (const unit of data.productUnits) {
        await tx.productUnit.upsert({
          where: {
            productId_unitId: {
              productId: id,
              unitId: unit.unitId,
            },
          },
          update: {
            conversionRate: unit.conversionRate,
            price: unit.price,
            contractorPrice: unit.contractorPrice,
            barcode: unit.barcode || null,
            isDefaultSale: unit.isDefaultSale,
            isActive: true,
          },
          create: {
            productId: id,
            unitId: unit.unitId,
            conversionRate: unit.conversionRate,
            price: unit.price,
            contractorPrice: unit.contractorPrice,
            barcode: unit.barcode || null,
            isDefaultSale: unit.isDefaultSale,
            isActive: true,
          },
        })
      }

      if (data.isStockItem) {
        await tx.stockBalance.upsert({
          where: { productId: id },
          update: {},
          create: { productId: id, quantityOnHand: 0 },
        })
      }

      return p
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    return apiErrorResponse(error, "Failed to update product")
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "product ID")

    const p = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true, data: p })
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete product")
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession()
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "product ID")

    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        baseUnit: true,
        productUnits: {
          where: { isActive: true },
          include: { unit: true },
        },
        stockBalance: true,
      },
    })
    if (!p) throw new ApiError("Not found", 404)
    return NextResponse.json({ success: true, data: p })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch product")
  }
}

