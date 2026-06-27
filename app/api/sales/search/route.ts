import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET(req: Request) {
  try {
    await requireApiSession()

    const { searchParams } = new URL(req.url)
    const billNo = searchParams.get("billNo")

    if (!billNo) {
      return NextResponse.json({ error: "billNo is required" }, { status: 400 })
    }

    const sale = await prisma.sale.findUnique({
      where: { billNo },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            productUnit: {
              include: { unit: true }
            }
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    return NextResponse.json(sale)
  } catch (error) {
    return apiErrorResponse(error, "Error finding sale")
  }
}
