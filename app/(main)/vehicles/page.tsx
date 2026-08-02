import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { VehiclesClient } from "@/components/vehicles/vehicles-client"
import { buildVehicleAlerts } from "@/lib/vehicle-alerts"
import { getDieselStockSummary } from "@/lib/diesel-stock"

export const dynamic = "force-dynamic"

export default async function VehiclesPage() {
  const session = await auth()
  const role = session?.user?.role as string
  if (!["OWNER", "STAFF"].includes(role)) {
    redirect("/dashboard")
  }

  const [vehicles, employees, fuelTotals, dieselStock] = await Promise.all([
    prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nickname: true },
      orderBy: { name: "asc" },
    }),
    prisma.fuelLog.groupBy({
      by: ["vehicleId"],
      _sum: { liters: true },
      _count: { id: true },
    }),
    getDieselStockSummary(),
  ])
  const alerts = buildVehicleAlerts(vehicles)

  const fuelSummaryByVehicle = new Map(
    fuelTotals.map((row) => [
      row.vehicleId,
      {
        totalLiters: Number(row._sum.liters?.toString() || 0),
        count: row._count.id,
      },
    ])
  )

  const vehiclesWithAlerts = vehicles.map((vehicle) => ({
    ...vehicle,
    alerts: alerts.filter((alert) => alert.vehicleId === vehicle.id),
    fuelSummary: fuelSummaryByVehicle.get(vehicle.id) || { totalLiters: 0, count: 0 },
  }))

  return (
    <div className="space-y-5">
      <PageHeader title="รถและเครื่องจักร" description="จัดการรถส่งของ รถยก โฟคลิฟท์ รถตัก และสต็อกน้ำมันดีเซล" />
      <VehiclesClient initialVehicles={vehiclesWithAlerts} initialDrivers={employees} initialDieselStock={dieselStock} canManageVehicles={["OWNER", "STAFF"].includes(role)} />
    </div>
  )
}
