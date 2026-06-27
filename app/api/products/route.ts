import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

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

export async function GET() {
  try {
    await requireApiSession()

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        baseUnit: true,
        productUnits: {
          where: { isActive: true },
          include: { unit: true },
        },
        stockBalance: true,
      },
      orderBy: { id: "desc" },
    })
    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch products")
  }
}

export async function POST(request: Request) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const data = await parseJsonBody(request, productSchema)
    validateProductUnits(data.productUnits)

    const exists = await prisma.product.findUnique({ where: { code: data.code } })
    if (exists) throw new ApiError("รหัสสินค้านี้มีอยู่ในระบบแล้ว", 400)

    const product = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          code: data.code,
          name: data.name,
          categoryId: data.categoryId,
          baseUnitId: data.baseUnitId,
          reorderPoint: data.reorderPoint,
          isStockItem: data.isStockItem,
          productUnits: {
            create: data.productUnits.map((unit) => ({
              unitId: unit.unitId,
              conversionRate: unit.conversionRate,
              price: unit.price,
              contractorPrice: unit.contractorPrice,
              barcode: unit.barcode || null,
              isDefaultSale: unit.isDefaultSale,
              isActive: true,
            })),
          },
          ...(data.isStockItem ? { stockBalance: { create: { quantityOnHand: 0 } } } : {}),
        },
        include: { productUnits: true, stockBalance: true },
      })
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create product")
  }
}

