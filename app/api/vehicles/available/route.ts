import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET() {
  try {
    await requireApiSession()
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true, status: "AVAILABLE", vehicleType: { in: ["TRUCK", "PICKUP", "MOTORCYCLE"] } },
      select: {
        id: true,
        vehicleCode: true,
        plateNumber: true,
        vehicleType: true,
        brand: true,
        model: true,
      },
      orderBy: { plateNumber: "asc" },
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    return apiErrorResponse(error, "Error loading available vehicles")
  }
}
