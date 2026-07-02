import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiPermission, requireApiSession } from "@/lib/api"

const optionalMoneySchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().min(0).nullable()
)

const productUnitSchema = z.object({
  unitId: z.coerce.number().int().positive(),
  conversionRate: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  contractorPrice: optionalMoneySchema,
  barcode: z.string().trim().nullable().optional(),
  isDefaultSale: z.coerce.boolean().default(false),
})

const productSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสสินค้า"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อสินค้า"),
  searchTags: z.string().trim().nullable().optional(),
  categoryId: z.coerce.number().int().positive(),
  baseUnitId: z.coerce.number().int().positive(),
  reorderPoint: z.coerce.number().min(0).default(0),
  stockQuantity: z.coerce.number().min(0).nullable().optional(),
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
    const { userId } = await requireApiPermission("product:manage")
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "product ID")
    const data = await parseJsonBody(request, productSchema)
    validateProductUnits(data.productUnits)

    const exists = await prisma.product.findFirst({ where: { code: data.code, id: { not: id } } })
    if (exists) throw new ApiError("รหัสสินค้านี้ถูกใช้ไปแล้ว", 400)

    const currentProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        productUnits: {
          where: { isActive: true },
          select: { unitId: true, conversionRate: true },
        },
        _count: {
          select: {
            stockMovements: true,
            saleItems: true,
            purchaseItems: true,
            returnItems: true,
          },
        },
      },
    })
    if (!currentProduct) throw new ApiError("Product not found", 404)

    const hasStockHistory =
      currentProduct._count.stockMovements > 0 ||
      currentProduct._count.saleItems > 0 ||
      currentProduct._count.purchaseItems > 0 ||
      currentProduct._count.returnItems > 0

    if (hasStockHistory && currentProduct.baseUnitId !== data.baseUnitId) {
      throw new ApiError("สินค้านี้มีประวัติแล้ว ไม่สามารถเปลี่ยนหน่วยฐานได้", 400)
    }
    if (hasStockHistory && currentProduct.isStockItem !== data.isStockItem) {
      throw new ApiError("สินค้านี้มีประวัติแล้ว ไม่สามารถเปลี่ยนสถานะสินค้าตัดสต็อกได้", 400)
    }
    if (hasStockHistory) {
      const currentUnitMap = new Map(currentProduct.productUnits.map((unit) => [unit.unitId, unit.conversionRate]))
      for (const unit of data.productUnits) {
        const currentConversionRate = currentUnitMap.get(unit.unitId)
        if (currentConversionRate != null && Math.abs(currentConversionRate - unit.conversionRate) > 0.000001) {
          throw new ApiError("สินค้านี้มีประวัติแล้ว ไม่สามารถเปลี่ยนอัตราแปลงของหน่วยขายเดิมได้", 400)
        }
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          searchTags: data.searchTags || null,
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

        if (data.stockQuantity != null) {
          await tx.$queryRaw`
            SELECT "productId" FROM "StockBalance"
            WHERE "productId" = ${id}
            FOR UPDATE
          `
          const balance = await tx.stockBalance.findUnique({ where: { productId: id } })
          const currentQuantity = balance?.quantityOnHand ?? 0
          const nextQuantity = data.stockQuantity
          const difference = Math.round((nextQuantity - currentQuantity) * 100) / 100

          await tx.stockBalance.update({
            where: { productId: id },
            data: { quantityOnHand: nextQuantity },
          })

          if (difference !== 0) {
            await tx.stockMovement.create({
              data: {
                productId: id,
                movementType: "ADJUST",
                quantityBase: difference,
                refType: "ADJUSTMENT",
                note: "Stock quantity edited from product form",
                createdById: userId,
              },
            })
          }
        }
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
    await requireApiPermission("product:manage")
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
