import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"
import { employeeSelect, serializeFuelLog } from "@/lib/hr-fleet"

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  nickname: z.string().trim().nullable().optional(),
  role: z.string().trim().optional(),
  position: z.string().trim().nullable().optional(),
  employeeType: z.string().trim().optional(),
  phone: z.string().trim().nullable().optional(),
  idCard: z.string().trim().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  avatarColor: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  userId: z.coerce.number().int().positive().nullable().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER"])
    const { id } = await params
    const employeeId = parsePositiveId(id, "employee ID")

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        ...employeeSelect,
        attendances: { orderBy: { date: "desc" }, take: 7 },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { sale: { select: { billNo: true, grandTotal: true } }, customer: { select: { name: true } } },
        },
        fuelLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { vehicle: { select: { vehicleCode: true, plateNumber: true } } },
        },
      },
    })

    if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })

    return NextResponse.json({
      ...employee,
      fuelLogs: employee.fuelLogs.map(serializeFuelLog),
    })
  } catch (error) {
    return apiErrorResponse(error, "Error loading employee")
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER"])
    const { id } = await params
    const employeeId = parsePositiveId(id, "employee ID")
    const body = await parseJsonBody(req, updateEmployeeSchema)

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...body,
        nickname: body.nickname === "" ? null : body.nickname,
        position: body.position === "" ? null : body.position,
        phone: body.phone === "" ? null : body.phone,
        idCard: body.idCard === "" ? null : body.idCard,
        note: body.note === "" ? null : body.note,
        userId: body.userId || null,
      },
      select: employeeSelect,
    })

    return NextResponse.json(employee)
  } catch (error) {
    return apiErrorResponse(error, "Error updating employee")
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER"])
    const { id } = await params
    const employeeId = parsePositiveId(id, "employee ID")

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false, endDate: new Date() },
      select: employeeSelect,
    })

    return NextResponse.json(employee)
  } catch (error) {
    return apiErrorResponse(error, "Error deactivating employee")
  }
}
