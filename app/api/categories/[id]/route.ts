import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiPermission } from "@/lib/api"

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อหมวดหมู่").optional(),
  imageUrl: z.string().max(750_000, "รูปภาพมีขนาดใหญ่เกินไป").nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  parentId: z.coerce.number().int().nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("catalog:create")
    const { id } = await params
    const categoryId = parsePositiveId(id, "category ID")
    const data = await parseJsonBody(request, updateCategorySchema)

    if (data.name !== undefined || data.parentId !== undefined) {
      const current = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true, parentId: true },
      })
      const nameToCheck = data.name !== undefined ? data.name : current?.name
      const parentIdToCheck = data.parentId !== undefined ? data.parentId : (current?.parentId || null)

      if (nameToCheck) {
        const exists = await prisma.category.findFirst({
          where: {
            name: nameToCheck,
            parentId: parentIdToCheck || null,
            id: { not: categoryId },
            isActive: true,
          },
        })
        if (exists) throw new ApiError("ชื่อหมวดหมู่นี้มีอยู่ในระดับนี้แล้ว", 400)
      }
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    return apiErrorResponse(error, "Failed to update category")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("catalog:create")
    const { id } = await params
    const categoryId = parsePositiveId(id, "category ID")

    // Soft delete by setting isActive to false
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete category")
  }
}
