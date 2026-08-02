import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parsePositiveId, requireApiPermission } from "@/lib/api"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("product:manage")
    const { id: rawId } = await params
    const productId = parsePositiveId(rawId, "product ID")

    const existing = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!existing) {
      throw new ApiError("ไม่พบสินค้าที่ต้องการสร้างบาร์โค้ด", 404)
    }

    const generatedBarcode = existing.code

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        barcode: generatedBarcode,
        barcodeGenerated: true,
      },
      include: {
        category: true,
        baseUnit: true,
        productUnits: { include: { unit: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return apiErrorResponse(error, "Failed to generate barcode for product")
  }
}
