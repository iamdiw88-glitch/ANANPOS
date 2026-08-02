import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiPermission, requireApiSession } from "@/lib/api"

const categorySchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อหมวดหมู่"),
  imageUrl: z.string().max(750_000, "รูปภาพมีขนาดใหญ่เกินไป").nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  parentId: z.coerce.number().int().nullable().optional(),
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
    await requireApiPermission("catalog:create")
    const data = await parseJsonBody(request, categorySchema)

    const exists = await prisma.category.findFirst({
      where: {
        name: data.name,
        parentId: data.parentId || null,
        isActive: true,
      },
    })
    if (exists) throw new ApiError("ชื่อหมวดหมู่นี้มีอยู่ในระดับนี้แล้ว", 400)

    const category = await prisma.category.create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl || null,
        sortOrder: data.sortOrder,
        parentId: data.parentId || null,
      },
    })
    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create category")
  }
}
