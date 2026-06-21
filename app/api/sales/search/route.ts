import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const billNo = searchParams.get("billNo")

  if (!billNo) {
    return NextResponse.json({ error: "billNo is required" }, { status: 400 })
  }

  try {
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
  } catch (error: any) {
    console.error("Error finding sale:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
