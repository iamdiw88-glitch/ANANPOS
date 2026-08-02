import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { isCheckInLate } from "@/lib/attendance-utils"

const schema = z.object({ action: z.enum(["assign", "ignore"]), employeeId: z.coerce.number().int().positive().optional() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiSession(["OWNER"])
    const body = await parseJsonBody(request, schema)
    const id = (await params).id
    const scan = await prisma.unrecognizedScanLog.findUnique({ where: { id } })
    if (!scan || scan.status !== "pending") throw new ApiError("ไม่พบรายการสแกนที่รอตรวจสอบ", 404)
    if (body.action === "ignore") {
      return NextResponse.json(await prisma.unrecognizedScanLog.update({ where: { id }, data: { status: "ignored", resolvedById: userId, resolvedAt: new Date() } }))
    }
    if (!body.employeeId) throw new ApiError("กรุณาเลือกพนักงาน", 400)
    const employee = await prisma.employee.findFirst({ where: { id: body.employeeId, isActive: true } })
    if (!employee) throw new ApiError("ไม่พบพนักงาน", 404)
    const scanDate = scan.createdAt
    const date = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate())
    const attendance = await prisma.attendanceLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      create: { employeeId: employee.id, date, checkIn: scanDate, method: "FACE_SCAN", deviceId: scan.deviceId, isLate: isCheckInLate(scanDate, employee.shiftStartTime || "08:00", employee.lateGraceMin), note: "แก้ไขย้อนหลังจากรายการไม่รู้จัก" },
      update: {},
    })
    const updated = await prisma.unrecognizedScanLog.update({ where: { id }, data: { status: "resolved", resolvedEmployeeId: employee.id, resolvedById: userId, resolvedAt: new Date() } })
    return NextResponse.json({ success: true, data: { scan: updated, attendance } })
  } catch (error) {
    return apiErrorResponse(error, "Failed to resolve unrecognized scan")
  }
}
