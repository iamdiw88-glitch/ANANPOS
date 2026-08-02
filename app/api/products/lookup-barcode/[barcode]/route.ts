import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET(request: Request, { params }: { params: Promise<{ barcode: string }> }) {
  try {
    await requireApiSession()
    const { barcode: rawBarcode } = await params
    const barcode = decodeURIComponent(rawBarcode).trim()

    if (!barcode) {
      throw new ApiError("กรุณาระบุรหัสบาร์โค้ด", 400)
    }

    // Lookup by Product.barcode, Product.code (SKU), or ProductUnit.barcode
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [
          { barcode: barcode },
          { code: barcode },
          { productUnits: { some: { barcode: barcode } } },
        ],
      },
      include: {
        category: true,
        baseUnit: true,
        productUnits: {
          include: { unit: true },
        },
        stockBalance: true,
      },
    })

    if (!product) {
      throw new ApiError(`ไม่พบสินค้าที่ตรงกับบาร์โค้ด "${barcode}"`, 404)
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    return apiErrorResponse(error, "Failed to lookup product by barcode")
  }
}
