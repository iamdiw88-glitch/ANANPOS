import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

const categorySchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อหมวดหมู่"),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export async function GET() {
  try {
    await requireApiSession()

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch categories")
  }
}

export async function POST(request: Request) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const data = await parseJsonBody(request, categorySchema)

    const exists = await prisma.category.findUnique({ where: { name: data.name } })
    if (exists) throw new ApiError("ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว", 400)

    const category = await prisma.category.create({
      data: { name: data.name, sortOrder: data.sortOrder },
    })
    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create category")
  }
}

