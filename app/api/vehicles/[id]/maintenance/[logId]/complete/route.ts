import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parsePositiveId, requireApiSession } from "@/lib/api"
import { serializeMaintenanceLog } from "@/lib/hr-fleet"

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string; logId: string }> }) {
  try {
    await requireApiSession(["OWNER"])
    const { id, logId } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")
    const maintenanceId = parsePositiveId(logId, "maintenance ID")

    const log = await prisma.$transaction(async (tx) => {
      const maintenanceLog = await tx.maintenanceLog.update({
        where: { id: maintenanceId, vehicleId },
        data: { completedAt: new Date() },
      })
      await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "AVAILABLE" } })
      return maintenanceLog
    })

    return NextResponse.json(serializeMaintenanceLog(log))
  } catch (error) {
    return apiErrorResponse(error, "Error completing maintenance")
  }
}
