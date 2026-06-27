import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parsePositiveId, requireApiSession } from "@/lib/api"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    await requireApiSession()
    const { saleId: saleIdParam } = await params
    const saleId = parsePositiveId(saleIdParam, "sale ID")

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        items: {
          include: {
            product: true,
            productUnit: {
              include: {
                unit: true
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json({ success: false, error: "Sale not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: sale })
  } catch (error) {
    return apiErrorResponse(error, "Error fetching print data")
  }
}
