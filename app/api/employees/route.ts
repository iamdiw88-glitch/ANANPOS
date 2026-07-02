import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { employeeSelect, nextEmployeeCode } from "@/lib/hr-fleet"

const employeeSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อพนักงาน"),
  nickname: z.string().trim().nullable().optional(),
  role: z.string().trim().default("STAFF"),
  position: z.string().trim().nullable().optional(),
  employeeType: z.string().trim().default("fulltime"),
  phone: z.string().trim().nullable().optional(),
  idCard: z.string().trim().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  avatarColor: z.string().trim().default("#6B7280"),
  userId: z.coerce.number().int().positive().nullable().optional(),
})

export async function GET(req: Request) {
  try {
    await requireApiSession(["OWNER"])
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const type = searchParams.get("type")
    const isActive = searchParams.get("isActive")

    const employees = await prisma.employee.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(type ? { employeeType: type } : {}),
        ...(isActive != null ? { isActive: isActive === "true" } : {}),
      },
      select: employeeSelect,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })

    return NextResponse.json(employees)
  } catch (error) {
    return apiErrorResponse(error, "Error loading employees")
  }
}

export async function POST(req: Request) {
  try {
    await requireApiSession(["OWNER"])
    const body = await parseJsonBody(req, employeeSchema)

    if (body.userId) {
      const user = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })
      if (!user) throw new ApiError("ไม่พบผู้ใช้ที่ต้องการผูกกับพนักงาน", 404)
    }

    const employee = await prisma.$transaction(async (tx) => {
      return tx.employee.create({
        data: {
          ...body,
          employeeCode: await nextEmployeeCode(tx),
          nickname: body.nickname || null,
          position: body.position || null,
          phone: body.phone || null,
          idCard: body.idCard || null,
          note: body.note || null,
          userId: body.userId || null,
        },
        select: employeeSelect,
      })
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Error creating employee")
  }
}
