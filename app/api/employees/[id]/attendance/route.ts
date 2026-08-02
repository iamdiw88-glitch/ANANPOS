import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiPermission } from "@/lib/api"
import { isCheckInLate } from "@/lib/attendance-utils"

const schema = z.object({ action: z.enum(["check_in", "check_out"]) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiPermission("settings:manage")
    const employeeId = parsePositiveId((await params).id, "employee ID")
    const { action } = await parseJsonBody(request, schema)
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, isActive: true } })
    if (!employee) return NextResponse.json({ success: false, error: "ไม่พบพนักงานที่ใช้งานอยู่" }, { status: 404 })

    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const current = await prisma.attendanceLog.findUnique({ where: { employeeId_date: { employeeId, date } } })

    if (action === "check_in") {
      if (current?.checkIn) throw new ApiError("พนักงานคนนี้ลงเวลาเข้างานแล้ว", 400)
      const attendance = await prisma.attendanceLog.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: { employeeId, date, checkIn: now, method: "MANUAL", isLate: isCheckInLate(now, employee.shiftStartTime || "08:00", employee.lateGraceMin), recordedById: userId },
        update: { checkIn: now, method: "MANUAL", isLate: isCheckInLate(now, employee.shiftStartTime || "08:00", employee.lateGraceMin), recordedById: userId },
      })
      return NextResponse.json({ success: true, data: attendance })
    }

    if (!current?.checkIn) throw new ApiError("ยังไม่มีเวลาเข้างานของพนักงานคนนี้", 400)
    if (current.checkOut) throw new ApiError("พนักงานคนนี้ลงเวลาออกงานแล้ว", 400)
    const attendance = await prisma.attendanceLog.update({
      where: { id: current.id },
      data: { checkOut: now, workMinutes: Math.max(0, Math.floor((now.getTime() - current.checkIn.getTime()) / 60000)), method: "MANUAL", recordedById: userId },
    })
    return NextResponse.json({ success: true, data: attendance })
  } catch (error) {
    return apiErrorResponse(error, "ไม่สามารถบันทึกเวลาเข้างานได้")
  }
}
