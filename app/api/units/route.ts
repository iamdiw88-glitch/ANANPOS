import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiPermission, requireApiSession } from "@/lib/api"

const unitSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อหน่วย"),
  abbreviation: z.string().trim().optional(),
})

export async function GET() {
  try {
    await requireApiSession()

    const units = await prisma.unit.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ success: true, data: units })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch units")
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission("product:manage")
    const data = await parseJsonBody(request, unitSchema)

    const exists = await prisma.unit.findUnique({ where: { name: data.name } })
    if (exists) throw new ApiError("ชื่อหน่วยนี้มีอยู่ในระบบแล้ว", 400)

    const unit = await prisma.unit.create({
      data: { name: data.name, abbreviation: data.abbreviation },
    })
    return NextResponse.json({ success: true, data: unit })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create unit")
  }
}

export async function PUT(request: Request) {
  try {
    await requireApiPermission("product:manage")
    const id = Number(new URL(request.url).searchParams.get("id"))
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("รหัสหน่วยนับไม่ถูกต้อง", 400)

    const data = await parseJsonBody(request, unitSchema)
    const exists = await prisma.unit.findFirst({
      where: { name: data.name, NOT: { id } },
      select: { id: true },
    })
    if (exists) throw new ApiError("ชื่อหน่วยนับนี้มีอยู่ในระบบแล้ว", 400)

    const unit = await prisma.unit.update({
      where: { id },
      data: { name: data.name, abbreviation: data.abbreviation || null },
    })
    return NextResponse.json({ success: true, data: unit })
  } catch (error) {
    return apiErrorResponse(error, "Failed to update unit")
  }
}
