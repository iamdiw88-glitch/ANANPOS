import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ success: true, data: units })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const unit = await prisma.unit.create({
      data: { name: data.name, abbreviation: data.abbreviation }
    })
    return NextResponse.json({ success: true, data: unit })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
