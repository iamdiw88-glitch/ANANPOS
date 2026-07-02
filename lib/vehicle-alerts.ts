import { prisma } from "@/lib/prisma"

export type VehicleAlert = {
  vehicleId: number
  plateNumber: string
  vehicleCode: string
  type: "insurance" | "tax" | "inspection"
  expiryDate: Date
  daysLeft: number
  severity: "expired" | "critical" | "warning"
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function buildAlert(
  vehicle: { id: number; plateNumber: string; vehicleCode: string },
  type: VehicleAlert["type"],
  expiryDate: Date,
  today: Date
): VehicleAlert | null {
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / DAY_MS)
  if (daysLeft > 30) return null

  return {
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    vehicleCode: vehicle.vehicleCode,
    type,
    expiryDate,
    daysLeft,
    severity: daysLeft < 0 ? "expired" : daysLeft <= 7 ? "critical" : "warning",
  }
}

export async function getVehicleAlerts(): Promise<VehicleAlert[]> {
  const today = startOfToday()
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    select: {
      id: true,
      vehicleCode: true,
      plateNumber: true,
      insuranceExpiry: true,
      taxExpiry: true,
      inspectionExpiry: true,
    },
  })

  return vehicles
    .flatMap((vehicle) => {
      const alerts: VehicleAlert[] = []
      if (vehicle.insuranceExpiry) {
        const alert = buildAlert(vehicle, "insurance", vehicle.insuranceExpiry, today)
        if (alert) alerts.push(alert)
      }
      if (vehicle.taxExpiry) {
        const alert = buildAlert(vehicle, "tax", vehicle.taxExpiry, today)
        if (alert) alerts.push(alert)
      }
      if (vehicle.inspectionExpiry) {
        const alert = buildAlert(vehicle, "inspection", vehicle.inspectionExpiry, today)
        if (alert) alerts.push(alert)
      }
      return alerts
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}
