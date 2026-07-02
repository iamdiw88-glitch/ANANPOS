import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiPermission } from "@/lib/api"

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อผู้ใช้งาน"),
  role: z.enum(["OWNER", "STAFF", "CASHIER"]),
  pin: z.string().trim().regex(/^\d{4,6}$/, "PIN ต้องเป็นตัวเลข 4-6 หลัก").optional().or(z.literal("")),
  isActive: z.coerce.boolean(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("settings:manage")
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "user ID")
    const data = await parseJsonBody(request, updateUserSchema)

    const updateData: {
      name: string
      role: "OWNER" | "STAFF" | "CASHIER"
      isActive: boolean
      pinHash?: string
    } = {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    }

    if (data.pin) {
      updateData.pinHash = await bcrypt.hash(data.pin, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    return apiErrorResponse(error, "Failed to update user")
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("settings:manage")
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "user ID")

    const activeOwnerCount = await prisma.user.count({
      where: {
        role: "OWNER",
        isActive: true,
        id: { not: id },
      },
    })
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!target) throw new ApiError("User not found", 404)
    if (target.role === "OWNER" && activeOwnerCount === 0) {
      throw new ApiError("ต้องมี OWNER ที่ใช้งานได้อย่างน้อย 1 คน", 400)
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete user")
  }
}
