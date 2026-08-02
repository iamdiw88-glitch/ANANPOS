import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET() {
  try {
    await requireApiSession()
    const drivers = await prisma.employee.findMany({
      where: {
        isActive: true,
        OR: [{ role: "DRIVER" }, { employeeType: "driver" }],
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        phone: true,
        avatarColor: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    return apiErrorResponse(error, "Error loading drivers")
  }
}
