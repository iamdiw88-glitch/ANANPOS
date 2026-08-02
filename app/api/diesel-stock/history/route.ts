import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiSession } from "@/lib/api"

export async function GET() {
  try {
    await requireApiSession(["OWNER", "STAFF"])

    const ledger = await prisma.dieselStockLedger.findMany({
      orderBy: { recordedAt: "desc" },
      take: 200,
    })

    // Extract unique employee and vehicle IDs to fetch details
    const employeeIds = Array.from(new Set(ledger.map((l) => l.employeeId).filter(Boolean))) as number[]
    const vehicleIds = Array.from(new Set(ledger.map((l) => l.vehicleId).filter(Boolean))) as number[]

    const [employees, vehicles] = await Promise.all([
      prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true, nickname: true },
      }),
      prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true, plateNumber: true },
      }),
    ])

    const employeeMap = new Map(employees.map((e) => [e.id, e.nickname || e.name]))
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v.plateNumber]))

    const history = ledger.map((item) => ({
      id: item.id,
      type: item.type,
      liters: Number(item.liters.toString()),
      balanceAfter: Number(item.balanceAfter.toString()),
      recordedAt: item.recordedAt,
      companyName: item.companyName,
      note: item.note,
      employeeName: item.employeeId ? employeeMap.get(item.employeeId) || `พนักงาน #${item.employeeId}` : null,
      vehiclePlate: item.vehicleId ? vehicleMap.get(item.vehicleId) || `ทะเบียน #${item.vehicleId}` : null,
    }))

    return NextResponse.json(history)
  } catch (error) {
    console.error("Failed to load diesel stock history:", error)
    return NextResponse.json({ error: "ไม่สามารถโหลดประวัติสต็อกน้ำมันได้" }, { status: 500 })
  }
}
