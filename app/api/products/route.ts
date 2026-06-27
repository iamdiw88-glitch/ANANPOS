import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        baseUnit: true,
        productUnits: { include: { unit: true } },
        stockBalance: true
      },
      orderBy: { id: 'desc' }
    })
    return NextResponse.json({ success: true, data: products })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Check if code exists
    const exists = await prisma.product.findUnique({ where: { code: data.code } })
    if (exists) return NextResponse.json({ success: false, error: "รหัสสินค้านี้มีอยู่ในระบบแล้ว" }, { status: 400 })

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          code: data.code,
          name: data.name,
          categoryId: data.categoryId,
          baseUnitId: data.baseUnitId,
          reorderPoint: data.reorderPoint,
          isStockItem: data.isStockItem,
          productUnits: {
            create: data.productUnits.map((u: any) => ({
              unitId: u.unitId,
              conversionRate: Number(u.conversionRate),
              price: Number(u.price),
              isDefaultSale: u.isDefaultSale
            }))
          },
          ...(data.isStockItem ? { stockBalance: { create: { quantityOnHand: 0 } } } : {})
        },
        include: { productUnits: true, stockBalance: true }
      })
      return p
    })
    
    return NextResponse.json({ success: true, data: product })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
