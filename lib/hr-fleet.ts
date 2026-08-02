import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const employeeSelect = {
  id: true,
  employeeCode: true,
  name: true,
  nickname: true,
  role: true,
  department: true,
  position: true,
  employeeType: true,
  payType: true,
  payRate: true,
  phone: true,
  startDate: true,
  endDate: true,
  note: true,
  avatarColor: true,
  isActive: true,
  userId: true,
  faceEnrolledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmployeeSelect

export function toDateOnly(value = new Date()) {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
}

export async function nextEmployeeCode(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const last = await tx.employee.findFirst({
    orderBy: { id: "desc" },
    select: { employeeCode: true },
  })
  const nextNumber = Number(last?.employeeCode?.match(/EMP-(\d+)/)?.[1] || 0) + 1
  return `EMP-${String(nextNumber).padStart(3, "0")}`
}

export async function nextVehicleCode(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const last = await tx.vehicle.findFirst({
    orderBy: { id: "desc" },
    select: { vehicleCode: true },
  })
  const nextNumber = Number(last?.vehicleCode?.match(/VH-(\d+)/)?.[1] || 0) + 1
  return `VH-${String(nextNumber).padStart(3, "0")}`
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? value : Number(value.toString())
}

export function serializeFuelLog(log: any) {
  return {
    ...log,
    liters: decimalToNumber(log.liters),
    pricePerLit: decimalToNumber(log.pricePerLit),
    totalCost: decimalToNumber(log.totalCost),
  }
}

export function serializeMaintenanceLog(log: any) {
  return {
    ...log,
    cost: decimalToNumber(log.cost),
  }
}
