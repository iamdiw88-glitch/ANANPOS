import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"
import { startOfToday, endOfToday } from "@/lib/attendance-utils"

export async function GET(request: Request) {
  try {
    await requireApiSession(["OWNER"])
    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 20, 1), 50)
    const [logs, unknowns] = await Promise.all([
      prisma.attendanceLog.findMany({ where: { date: { gte: startOfToday(), lt: endOfToday() } }, include: { employee: true }, orderBy: { updatedAt: "desc" }, take: limit }),
      prisma.unrecognizedScanLog.findMany({ where: { createdAt: { gte: startOfToday(), lt: endOfToday() }, status: "pending" }, include: { device: true }, orderBy: { createdAt: "desc" }, take: limit }),
    ])
    const feed = [
      ...logs.flatMap((log) => [
        ...(log.checkIn ? [{ type: "check_in", employeeName: log.employee.name, method: log.method.toLowerCase(), time: log.checkIn.toISOString(), isLate: log.isLate }] : []),
        ...(log.checkOut ? [{ type: "check_out", employeeName: log.employee.name, method: log.method.toLowerCase(), time: log.checkOut.toISOString() }] : []),
      ]),
      ...unknowns.map((scan) => ({ type: "unrecognized", time: scan.createdAt.toISOString(), unrecognizedId: scan.id, deviceName: scan.device.name })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, limit)
    return NextResponse.json(feed)
  } catch (error) {
    return apiErrorResponse(error, "Failed to load attendance activity")
  }
}
