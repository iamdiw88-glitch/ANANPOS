import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, requireApiPermission } from "@/lib/api"

const userSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อผู้ใช้งาน"),
  role: z.enum(["OWNER", "STAFF", "CASHIER"]),
  pin: z.string().trim().regex(/^\d{4,6}$/, "PIN ต้องเป็นตัวเลข 4-6 หลัก"),
  isActive: z.coerce.boolean().default(true),
})

export async function POST(request: Request) {
  try {
    await requireApiPermission("settings:manage")
    const data = await parseJsonBody(request, userSchema)

    const pinHash = await bcrypt.hash(data.pin, 10)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        role: data.role,
        pinHash,
        isActive: data.isActive,
      },
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
    return apiErrorResponse(error, "Failed to create user")
  }
}

export async function GET() {
  try {
    await requireApiPermission("settings:manage")
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch users")
  }
}
