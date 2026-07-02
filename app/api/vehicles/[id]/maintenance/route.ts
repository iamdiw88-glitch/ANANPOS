import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"
import { serializeMaintenanceLog } from "@/lib/hr-fleet"

const maintenanceSchema = z.object({
  type: z.enum(["REPAIR", "SERVICE", "TIRE", "OTHER"]),
  description: z.string().trim().min(1, "กรุณากรอกรายละเอียด"),
  cost: z.coerce.number().min(0).default(0),
  odometer: z.coerce.number().int().positive().nullable().optional(),
  shop: z.string().trim().nullable().optional(),
  date: z.coerce.date(),
  note: z.string().trim().nullable().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiSession(["OWNER"])
    const { id } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")
    const body = await parseJsonBody(req, maintenanceSchema)

    const log = await prisma.$transaction(async (tx) => {
      const maintenanceLog = await tx.maintenanceLog.create({
        data: {
          vehicleId,
          type: body.type,
          description: body.description,
          cost: new Prisma.Decimal(body.cost),
          odometer: body.odometer || null,
          shop: body.shop || null,
          date: body.date,
          note: body.note || null,
          createdById: userId,
        },
      })

      if (body.type === "REPAIR") {
        await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "MAINTENANCE" } })
      }

      return maintenanceLog
    })

    return NextResponse.json(serializeMaintenanceLog(log), { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Error creating maintenance log")
  }
}
