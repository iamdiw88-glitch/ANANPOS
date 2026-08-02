import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET() {
  try {
    await requireApiSession(["OWNER"])
    const cutoff = new Date(Date.now() - 2 * 60 * 1000)
    const devices = await prisma.faceScanDevice.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, location: true, status: true, lastPingAt: true } })
    return NextResponse.json(devices.map((device) => ({ ...device, status: device.lastPingAt && device.lastPingAt >= cutoff ? "online" : "offline" })))
  } catch (error) {
    return apiErrorResponse(error, "Failed to load face scan devices")
  }
}
