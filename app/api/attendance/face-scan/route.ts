import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody } from "@/lib/api"
import { isCheckInLate } from "@/lib/attendance-utils"

const schema = z.object({
  deviceId: z.string().min(1),
  employeeId: z.coerce.number().int().positive().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  imageUrl: z.string().trim().max(500).optional(),
})

function isValidDeviceKey(request: Request) {
  const key = request.headers.get("x-device-key")
  return Boolean(key && process.env.FACE_SCAN_DEVICE_API_KEY && key === process.env.FACE_SCAN_DEVICE_API_KEY)
}

export async function POST(request: Request) {
  try {
    if (!isValidDeviceKey(request)) return NextResponse.json({ success: false, error: "Invalid device key" }, { status: 401 })
    const body = await parseJsonBody(request, schema)
    const device = await prisma.faceScanDevice.findFirst({ where: { id: body.deviceId, isActive: true } })
    if (!device) return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 })

    const threshold = Math.min(1, Math.max(0, Number(process.env.FACE_SCAN_CONFIDENCE_THRESHOLD || 0.75)))
    if (!body.employeeId || (body.confidence ?? 0) < threshold) {
      const scan = await prisma.unrecognizedScanLog.create({ data: { deviceId: body.deviceId, imageUrl: body.imageUrl || null, confidence: body.confidence ?? null } })
      return NextResponse.json({ success: true, status: "unrecognized", unrecognizedId: scan.id })
    }

    const employee = await prisma.employee.findFirst({ where: { id: body.employeeId, isActive: true } })
    if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const existing = await prisma.attendanceLog.findUnique({ where: { employeeId_date: { employeeId: employee.id, date } } })
    if (existing?.checkIn && existing.checkOut) return NextResponse.json({ success: true, status: "already_completed", employeeName: employee.name })
    if (existing?.checkIn) {
      const updated = await prisma.attendanceLog.update({ where: { id: existing.id }, data: { checkOut: now, workMinutes: Math.max(0, Math.floor((now.getTime() - existing.checkIn.getTime()) / 60000)), method: "FACE_SCAN", deviceId: body.deviceId } })
      return NextResponse.json({ success: true, status: "check_out", employeeName: employee.name, attendanceId: updated.id })
    }
    const attendance = await prisma.attendanceLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      create: { employeeId: employee.id, date, checkIn: now, method: "FACE_SCAN", deviceId: body.deviceId, isLate: isCheckInLate(now, employee.shiftStartTime || "08:00", employee.lateGraceMin) },
      update: { checkIn: now, method: "FACE_SCAN", deviceId: body.deviceId, isLate: isCheckInLate(now, employee.shiftStartTime || "08:00", employee.lateGraceMin) },
    })
    return NextResponse.json({ success: true, status: "check_in", employeeName: employee.name, attendanceId: attendance.id })
  } catch (error) {
    return apiErrorResponse(error, "Failed to process face scan")
  }
}
