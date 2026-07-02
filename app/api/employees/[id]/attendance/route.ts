import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"
import { toDateOnly } from "@/lib/hr-fleet"

const attendanceSchema = z.object({
  action: z.enum(["check_in", "check_out"]),
  note: z.string().trim().nullable().optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const employeeId = parsePositiveId(id, "employee ID")
    const month = new URL(req.url).searchParams.get("month")
    const baseDate = month ? new Date(`${month}-01T00:00:00`) : new Date()
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1)

    const logs = await prisma.attendanceLog.findMany({
      where: { employeeId, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(logs)
  } catch (error) {
    return apiErrorResponse(error, "Error loading attendance")
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiSession(["OWNER"])
    const { id } = await params
    const employeeId = parsePositiveId(id, "employee ID")
    const { action, note } = await parseJsonBody(req, attendanceSchema)
    const now = new Date()
    const today = toDateOnly(now)

    const log = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true, isActive: true } })
      if (!employee || !employee.isActive) throw new ApiError("ไม่พบพนักงานที่ใช้งานอยู่", 404)

      const existing = await tx.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId, date: today } },
      })

      if (action === "check_in") {
        if (existing?.checkIn) throw new ApiError("พนักงานคนนี้เช็คอินวันนี้แล้ว", 409)
        return tx.attendanceLog.upsert({
          where: { employeeId_date: { employeeId, date: today } },
          create: { employeeId, date: today, checkIn: now, note: note || null, recordedById: userId },
          update: { checkIn: now, note: note || existing?.note || null, recordedById: userId },
        })
      }

      if (!existing?.checkIn) throw new ApiError("ยังไม่มีเวลาเข้างานของวันนี้", 400)
      if (existing.checkOut) throw new ApiError("พนักงานคนนี้เช็คเอาต์วันนี้แล้ว", 409)

      const workMinutes = Math.max(0, Math.round((now.getTime() - existing.checkIn.getTime()) / 60000))
      return tx.attendanceLog.update({
        where: { employeeId_date: { employeeId, date: today } },
        data: { checkOut: now, workMinutes, note: note || existing.note, recordedById: userId },
      })
    })

    return NextResponse.json(log)
  } catch (error) {
    return apiErrorResponse(error, "Error recording attendance")
  }
}
