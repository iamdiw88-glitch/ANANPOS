import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const customers = await prisma.customer.findMany({
      where: { 
        isActive: true,
        ...(type ? { type: type as any } : {})
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ success: true, data: customers })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const customer = await prisma.customer.create({
      data: {
        code: data.code,
        name: data.name,
        phone: data.phone,
        address: data.address,
        taxId: data.taxId,
        type: data.type || 'CASH',
        creditLimit: Number(data.creditLimit || 0),
        creditTermDays: Number(data.creditTermDays || 0),
        priceTier: data.priceTier || 'RETAIL'
      }
    })
    return NextResponse.json({ success: true, data: customer })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
