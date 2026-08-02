import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody } from "@/lib/api"

const schema = z.object({ deviceId: z.string().min(1) })

function isValidDeviceKey(request: Request) {
  const key = request.headers.get("x-device-key")
  return Boolean(key && process.env.FACE_SCAN_DEVICE_API_KEY && key === process.env.FACE_SCAN_DEVICE_API_KEY)
}

export async function POST(request: Request) {
  try {
    if (!isValidDeviceKey(request)) return NextResponse.json({ success: false, error: "Invalid device key" }, { status: 401 })
    const { deviceId } = await parseJsonBody(request, schema)
    const device = await prisma.faceScanDevice.updateMany({ where: { id: deviceId, isActive: true }, data: { status: "online", lastPingAt: new Date() } })
    if (!device.count) return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorResponse(error, "Failed to update device heartbeat")
  }
}
