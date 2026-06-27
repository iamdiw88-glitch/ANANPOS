import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

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
    await requireApiSession(["OWNER", "STAFF"])
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

