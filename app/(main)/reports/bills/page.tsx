import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { BillListClient } from "@/components/reports/bill-list-client"
import { PageHeader } from "@/components/ui/page-header"

type BillRange = "today" | "week" | "month" | "year" | "all"

function getDateRange(range: BillRange) {
  if (range === "all") return undefined

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (range === "week") {
    const day = start.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diffToMonday)
  }

  if (range === "month") {
    start.setDate(1)
  }

  if (range === "year") {
    start.setMonth(0, 1)
  }

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return { gte: start, lte: end }
}

export default async function BillsPage(props: { searchParams: Promise<{ range?: string }> }) {
  const searchParams = await props.searchParams
  const session = await auth()
  const role = (session?.user as any)?.role || "CASHIER"

  if (!hasPermission(role, "report:sales")) {
    redirect("/pos")
  }

  const range = ["today", "week", "month", "year", "all"].includes(searchParams.range || "")
    ? (searchParams.range as BillRange)
    : "today"
  const saleDate = getDateRange(range)

  const sales = await prisma.sale.findMany({
    where: saleDate ? { saleDate } : undefined,
    include: {
      customer: true,
      createdBy: true,
      items: {
        include: {
          product: { select: { name: true, code: true } },
          productUnit: { include: { unit: { select: { name: true } } } },
        },
        orderBy: { id: "asc" },
      },
      deliveries: {
        include: {
          driver: { select: { id: true, name: true, nickname: true, phone: true } },
          assignedVehicle: { select: { id: true, vehicleCode: true, plateNumber: true, brand: true, model: true } },
          deliveryCustomer: { select: { id: true, name: true, phone: true, deliveryAddress: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { saleDate: "desc" },
    take: range === "all" ? 1000 : 500,
  })

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="รวมบิลทั้งหมด"
        description="ดูรายการบิล กรองตามช่วงเวลา เปิดดูรายการสินค้าและรายละเอียดจัดส่งได้"
      />
      <BillListClient
        sales={sales}
        activeRange={range}
        canVoidSale={hasPermission(role, "sale:void")}
        canCreateReturn={hasPermission(role, "return:create")}
      />
    </div>
  )
}
