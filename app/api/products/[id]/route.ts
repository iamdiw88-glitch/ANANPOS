import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const data = await request.json()
    
    // Check code unique
    const exists = await prisma.product.findFirst({ where: { code: data.code, id: { not: id } } })
    if (exists) return NextResponse.json({ success: false, error: "รหัสสินค้านี้ถูกใช้ไปแล้ว" }, { status: 400 })

    const product = await prisma.$transaction(async (tx) => {
      // update product basic info
      const p = await tx.product.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          categoryId: data.categoryId,
          baseUnitId: data.baseUnitId,
          reorderPoint: data.reorderPoint,
          isStockItem: data.isStockItem,
        }
      })

      // replace units
      await tx.productUnit.deleteMany({ where: { productId: id } })
      await tx.productUnit.createMany({
        data: data.productUnits.map((u: any) => ({
          productId: id,
          unitId: u.unitId,
          conversionRate: Number(u.conversionRate),
          price: Number(u.price),
          isDefaultSale: u.isDefaultSale
        }))
      })
      return p
    })
    
    return NextResponse.json({ success: true, data: product })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const p = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    })
    return NextResponse.json({ success: true, data: p })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        baseUnit: true,
        productUnits: { include: { unit: true } },
        stockBalance: true
      }
    })
    if (!p) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: p })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
