import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const INITIAL_DIESEL_STOCK_LITERS = new Prisma.Decimal(1000)

export async function ensureDieselOpeningBalance(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const existing = await tx.dieselStockLedger.findFirst({ select: { id: true } })
  if (existing) return

  await tx.dieselStockLedger.create({
    data: {
      type: "OPENING",
      liters: INITIAL_DIESEL_STOCK_LITERS,
      balanceAfter: INITIAL_DIESEL_STOCK_LITERS,
      note: "ยอดตั้งต้นสต็อกน้ำมันดีเซล 1000 ลิตร",
    },
  })
}

export async function getDieselStockSummary(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  await ensureDieselOpeningBalance(tx)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [latest, monthOut] = await Promise.all([
    tx.dieselStockLedger.findFirst({
      orderBy: { id: "desc" },
      select: { balanceAfter: true },
    }),
    tx.dieselStockLedger.aggregate({
      where: { type: "OUT", recordedAt: { gte: monthStart } },
      _sum: { liters: true },
    }),
  ])

  return {
    capacityLiters: 1000,
    balanceLiters: Number(latest?.balanceAfter?.toString() || 0),
    usedThisMonthLiters: Number(monthOut._sum.liters?.toString() || 0),
  }
}

export async function recordDieselOut({
  tx,
  liters,
  vehicleId,
  employeeId,
  fuelLogId,
  recordedAt,
  createdById,
}: {
  tx: Prisma.TransactionClient
  liters: Prisma.Decimal
  vehicleId: number
  employeeId: number
  fuelLogId: number
  recordedAt: Date
  createdById: number
}) {
  await ensureDieselOpeningBalance(tx)
  const latest = await tx.dieselStockLedger.findFirst({
    orderBy: { id: "desc" },
    select: { balanceAfter: true },
  })
  const currentBalance = latest?.balanceAfter || INITIAL_DIESEL_STOCK_LITERS
  const nextBalance = currentBalance.sub(liters)

  if (nextBalance.lt(0)) {
    throw new Error("น้ำมันดีเซลในสต็อกไม่พอ")
  }

  await tx.dieselStockLedger.create({
    data: {
      type: "OUT",
      liters,
      balanceAfter: nextBalance,
      vehicleId,
      employeeId,
      fuelLogId,
      recordedAt,
      createdById,
    },
  })
}

export async function recordDieselIn({
  tx,
  liters,
  companyName,
  employeeId,
  recordedAt,
  createdById,
}: {
  tx: Prisma.TransactionClient
  liters: Prisma.Decimal
  companyName: string
  employeeId: number
  recordedAt: Date
  createdById: number
}) {
  await ensureDieselOpeningBalance(tx)
  const latest = await tx.dieselStockLedger.findFirst({
    orderBy: { id: "desc" },
    select: { balanceAfter: true },
  })
  const currentBalance = latest?.balanceAfter || INITIAL_DIESEL_STOCK_LITERS
  const nextBalance = currentBalance.add(liters)

  await tx.dieselStockLedger.create({
    data: {
      type: "IN",
      liters,
      balanceAfter: nextBalance,
      companyName,
      employeeId,
      recordedAt,
      createdById,
    },
  })

  return nextBalance
}
