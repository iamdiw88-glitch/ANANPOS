import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"
import { serializeFuelLog } from "@/lib/hr-fleet"
import { getDieselStockSummary, recordDieselOut } from "@/lib/diesel-stock"

const fuelSchema = z.object({
  driverId: z.coerce.number().int().positive(),
  liters: z.coerce.number().positive("จำนวนลิตรต้องมากกว่า 0"),
  fuelDate: z.coerce.date().optional(),
  note: z.string().trim().nullable().optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")
    const month = new URL(req.url).searchParams.get("month")
    const baseDate = month ? new Date(`${month}-01T00:00:00`) : new Date()
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1)

    const [logs, stock] = await Promise.all([
      prisma.fuelLog.findMany({
      where: { vehicleId, createdAt: { gte: start, lt: end } },
      include: { driver: { select: { name: true, nickname: true } } },
      orderBy: { createdAt: "desc" },
      }),
      getDieselStockSummary(),
    ])

    const serialized = logs.map(serializeFuelLog)
    const summary = serialized.reduce(
      (acc, log) => ({
        totalLiters: acc.totalLiters + Number(log.liters || 0),
        totalCost: acc.totalCost + Number(log.totalCost || 0),
      }),
      { totalLiters: 0, totalCost: 0 }
    )

    return NextResponse.json({ logs: serialized, summary, stock })
  } catch (error) {
    return apiErrorResponse(error, "Error loading fuel logs")
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")
    const body = await parseJsonBody(req, fuelSchema)
    const liters = new Prisma.Decimal(body.liters)
    const fuelDate = body.fuelDate || new Date()

    const log = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, isActive: true } })
      if (!vehicle?.isActive) throw new ApiError("ไม่พบรถที่ใช้งานอยู่", 404)

      const driver = await tx.employee.findUnique({ where: { id: body.driverId }, select: { id: true, isActive: true } })
      if (!driver?.isActive) throw new ApiError("ไม่พบคนขับที่ใช้งานอยู่", 404)

      const fuelLog = await tx.fuelLog.create({
        data: {
          vehicleId,
          driverId: body.driverId,
          liters,
          fuelDate,
          note: body.note || null,
          createdById: userId,
        },
        include: { driver: { select: { name: true, nickname: true } } },
      })

      try {
        await recordDieselOut({
          tx,
          liters,
          vehicleId,
          employeeId: body.driverId,
          fuelLogId: fuelLog.id,
          recordedAt: fuelDate,
          createdById: userId,
        })
      } catch (error) {
        if (error instanceof Error) throw new ApiError(error.message, 400)
        throw error
      }

      return fuelLog
    })

    return NextResponse.json(serializeFuelLog(log), { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Error creating fuel log")
  }
}
