import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"
import { serializeFuelLog, serializeMaintenanceLog } from "@/lib/hr-fleet"

const updateVehicleSchema = z.object({
  plateNumber: z.string().trim().min(1).optional(),
  vehicleType: z.enum(["TRUCK", "PICKUP", "MOTORCYCLE", "LIFT", "FORKLIFT", "LOADER", "OTHER"]).optional(),
  brand: z.string().trim().nullable().optional(),
  model: z.string().trim().nullable().optional(),
  year: z.coerce.number().int().min(1900).max(3000).nullable().optional(),
  color: z.string().trim().nullable().optional(),
  insuranceExpiry: z.coerce.date().nullable().optional(),
  taxExpiry: z.coerce.date().nullable().optional(),
  inspectionExpiry: z.coerce.date().nullable().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE"]).optional(),
  isActive: z.boolean().optional(),
  note: z.string().trim().nullable().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { sale: { select: { billNo: true, grandTotal: true } }, customer: { select: { name: true } } },
        },
        fuelLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { driver: { select: { name: true, nickname: true } } },
        },
        maintenanceLogs: { orderBy: { date: "desc" }, take: 20 },
      },
    })

    if (!vehicle) return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 })

    return NextResponse.json({
      ...vehicle,
      fuelLogs: vehicle.fuelLogs.map(serializeFuelLog),
      maintenanceLogs: vehicle.maintenanceLogs.map(serializeMaintenanceLog),
    })
  } catch (error) {
    return apiErrorResponse(error, "Error loading vehicle")
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")
    const body = await parseJsonBody(req, updateVehicleSchema)

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...body,
        plateNumber: body.plateNumber?.toUpperCase(),
        brand: body.brand === "" ? null : body.brand,
        model: body.model === "" ? null : body.model,
        color: body.color === "" ? null : body.color,
        note: body.note === "" ? null : body.note,
      },
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    return apiErrorResponse(error, "Error updating vehicle")
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const vehicleId = parsePositiveId(id, "vehicle ID")
    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: false, status: "MAINTENANCE" },
    })
    return NextResponse.json(vehicle)
  } catch (error) {
    return apiErrorResponse(error, "Error deactivating vehicle")
  }
}

