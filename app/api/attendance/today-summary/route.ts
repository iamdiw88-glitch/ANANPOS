import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiSession, apiErrorResponse } from "@/lib/api"
import { computeElapsedMinutes } from "@/lib/attendance-utils"

export async function GET() {
  try {
    await requireApiSession(["OWNER"])
    const today = new Date()
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, nickname: true, avatarColor: true, role: true,
        shiftStartTime: true, attendances: {
          where: { date },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { checkIn: true, checkOut: true, method: true, isLate: true, workMinutes: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const data = employees.map((employee) => {
      const attendance = employee.attendances[0]
      const status = !attendance?.checkIn
        ? "not_yet"
        : attendance.checkOut
          ? "checked_out"
          : attendance.isLate ? "late" : "checked_in"
      return {
        id: employee.id, name: employee.name, nickname: employee.nickname,
        avatarColor: employee.avatarColor, role: employee.role,
        attendanceStatus: status,
        checkInTime: attendance?.checkIn?.toISOString() || null,
        checkOutTime: attendance?.checkOut?.toISOString() || null,
        elapsedMinutes: attendance?.checkIn && !attendance.checkOut ? computeElapsedMinutes(attendance.checkIn) : attendance?.workMinutes || null,
        method: attendance?.method?.toLowerCase() || null,
      }
    })
    return NextResponse.json({
      totalEmployees: data.length,
      checkedInCount: data.filter((item) => ["checked_in", "late", "checked_out"].includes(item.attendanceStatus)).length,
      lateCount: data.filter((item) => item.attendanceStatus === "late").length,
      notYetCount: data.filter((item) => item.attendanceStatus === "not_yet").length,
      employees: data,
    })
  } catch (error) {
    return apiErrorResponse(error, "Failed to load attendance summary")
  }
}
