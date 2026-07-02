import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { getVehicleAlerts } from "@/lib/vehicle-alerts"
import { nextVehicleCode } from "@/lib/hr-fleet"

const vehicleSchema = z.object({
  plateNumber: z.string().trim().min(1, "กรุณากรอกทะเบียนรถ"),
  vehicleType: z.enum(["TRUCK", "PICKUP", "MOTORCYCLE", "LIFT", "FORKLIFT", "LOADER", "OTHER"]),
  brand: z.string().trim().nullable().optional(),
  model: z.string().trim().nullable().optional(),
  year: z.coerce.number().int().min(1900).max(3000).nullable().optional(),
  color: z.string().trim().nullable().optional(),
  insuranceExpiry: z.coerce.date().nullable().optional(),
  taxExpiry: z.coerce.date().nullable().optional(),
  inspectionExpiry: z.coerce.date().nullable().optional(),
  note: z.string().trim().nullable().optional(),
})

export async function GET(req: Request) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const { searchParams } = new URL(req.url)
    const isActive = searchParams.get("isActive")
    const status = searchParams.get("status")
    const alerts = await getVehicleAlerts()

    const vehicles = await prisma.vehicle.findMany({
      where: {
        ...(isActive != null ? { isActive: isActive === "true" } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: [{ isActive: "desc" }, { plateNumber: "asc" }],
    })

    return NextResponse.json(
      vehicles.map((vehicle) => ({
        ...vehicle,
        alerts: alerts.filter((alert) => alert.vehicleId === vehicle.id),
      }))
    )
  } catch (error) {
    return apiErrorResponse(error, "Error loading vehicles")
  }
}

export async function POST(req: Request) {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const body = await parseJsonBody(req, vehicleSchema)
    const plateNumber = body.plateNumber.toUpperCase()

    const duplicate = await prisma.vehicle.findUnique({ where: { plateNumber }, select: { id: true } })
    if (duplicate) throw new ApiError("ทะเบียนรถนี้มีอยู่แล้ว", 409)

    const vehicle = await prisma.$transaction(async (tx) => {
      return tx.vehicle.create({
        data: {
          ...body,
          plateNumber,
          vehicleCode: await nextVehicleCode(tx),
          brand: body.brand || null,
          model: body.model || null,
          color: body.color || null,
          note: body.note || null,
        },
      })
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Error creating vehicle")
  }
}

