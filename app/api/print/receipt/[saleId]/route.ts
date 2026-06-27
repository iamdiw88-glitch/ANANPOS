import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { saleId: string } }
) {
  try {
    const saleId = Number(params.saleId)
    if (isNaN(saleId)) {
      return NextResponse.json({ success: false, error: "Invalid sale ID" }, { status: 400 })
    }

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
  } catch (error: any) {
    console.error("Error fetching print data:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
