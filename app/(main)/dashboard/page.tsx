import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import Link from "next/link"
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CreditCard,
  Package,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getVehicleAlerts } from "@/lib/vehicle-alerts"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount)
}

const formatNumber = (amount: number) => {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

type LowStockRow = {
  id: number
  code: string
  name: string
  reorderPoint: number
  quantityOnHand: number
  unitName: string
}

const alertTypeText = {
  insurance: "ประกัน",
  tax: "ภาษี",
  inspection: "ตรวจสภาพ",
}

const getDaysPastDue = (dueDate: Date, today: Date) => {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
}

const getUtilizationTone = (percent: number) => {
  if (percent >= 100) return "bg-red-500"
  if (percent >= 80) return "bg-amber-500"
  return "bg-emerald-500"
}

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const role = (session?.user?.role as string) || "CASHIER"

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [
    todaysSalesRows,
    pendingDeliveries,
    arBalance,
    openInvoices,
    creditCustomers,
    lowStockProducts,
    vehicleAlerts,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: today, lt: tomorrow }, status: { not: "VOID" } },
      select: { grandTotal: true, paidAmount: true, paymentType: true },
    }),
    prisma.delivery.count({ where: { status: "PENDING" } }),
    prisma.customer.aggregate({
      where: { balance: { gt: 0 } },
      _sum: { balance: true },
    }),
    prisma.invoice.findMany({
      relationLoadStrategy: "join",
      where: { balance: { gt: 0 }, status: { in: ["OPEN", "PARTIAL"] } },
      select: {
        id: true,
        invoiceNo: true,
        dueDate: true,
        balance: true,
        customerId: true,
        customer: { select: { id: true, name: true, phone: true, creditLimit: true, balance: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.customer.findMany({
      relationLoadStrategy: "join",
      where: { OR: [{ type: "CREDIT" }, { balance: { gt: 0 } }], isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        creditLimit: true,
        creditTermDays: true,
        invoices: {
          where: { balance: { gt: 0 }, status: { in: ["OPEN", "PARTIAL"] } },
          select: { id: true, invoiceNo: true, dueDate: true, balance: true },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { balance: "desc" },
      take: 30,
    }),
    prisma.$queryRaw<LowStockRow[]>`
      SELECT p.id, p.code, p.name, p."reorderPoint", sb."quantityOnHand", u.name as "unitName"
      FROM "Product" p
      JOIN "StockBalance" sb ON sb."productId" = p.id
      JOIN "Unit" u ON u.id = p."baseUnitId"
      WHERE p."isStockItem" = true AND sb."quantityOnHand" < p."reorderPoint"
      ORDER BY (p."reorderPoint" - sb."quantityOnHand") DESC
      LIMIT 20
    `,
    getVehicleAlerts(),
  ])

  const totalSalesToday = todaysSalesRows.reduce((sum, sale) => sum + sale.grandTotal, 0)
  const totalBillsToday = todaysSalesRows.length
  const cashReceivedToday = todaysSalesRows.reduce((sum, sale) => sum + sale.paidAmount, 0)
  const creditAddedToday = todaysSalesRows.reduce((sum, sale) => sum + Math.max(0, sale.grandTotal - sale.paidAmount), 0)
  const totalAR = arBalance._sum.balance || 0

  const aging = openInvoices.reduce(
    (acc, invoice) => {
      const days = getDaysPastDue(invoice.dueDate, today)
      if (days <= 0) acc.current += invoice.balance
      else if (days <= 30) acc.d1to30 += invoice.balance
      else if (days <= 60) acc.d31to60 += invoice.balance
      else if (days <= 90) acc.d61to90 += invoice.balance
      else acc.over90 += invoice.balance
      if (days > 0) acc.overdue += invoice.balance
      return acc
    },
    { current: 0, d1to30: 0, d31to60: 0, d61to90: 0, over90: 0, overdue: 0 }
  )

  const followUpCustomers = creditCustomers
    .map((customer) => {
      const overdueInvoices = customer.invoices.filter((invoice) => getDaysPastDue(invoice.dueDate, today) > 0)
      const overdueBalance = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0)
      const oldestDaysPastDue = overdueInvoices.reduce(
        (max, invoice) => Math.max(max, getDaysPastDue(invoice.dueDate, today)),
        0
      )
      const utilizationPct = customer.creditLimit > 0 ? Math.min(999, (customer.balance / customer.creditLimit) * 100) : 0
      const oldestInvoice = customer.invoices[0] || null

      return {
        ...customer,
        overdueBalance,
        oldestDaysPastDue,
        utilizationPct,
        oldestInvoice,
      }
    })
    .filter((customer) => customer.balance > 0)
    .sort((a, b) => b.overdueBalance - a.overdueBalance || b.utilizationPct - a.utilizationPct || b.balance - a.balance)
    .slice(0, 8)

  const menuItems = [
    { name: "ขายของ", icon: ShoppingCart, href: "/pos", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "ลูกค้า", icon: Users, href: "/delivery-customers", allowedRoles: ["OWNER"] },
    { name: "จัดส่ง", icon: Truck, href: "/delivery", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "สต็อก", icon: Package, href: "/inventory", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "คืนสินค้า", icon: RotateCcw, href: "/returns", allowedRoles: ["OWNER", "STAFF"] },
    { name: "รายงาน", icon: BarChart3, href: "/reports/daily", allowedRoles: ["OWNER", "STAFF"] },
    { name: "รถส่งของ", icon: Truck, href: "/vehicles", allowedRoles: ["OWNER", "STAFF"] },
    { name: "ตั้งค่า", icon: Settings, href: "/settings", allowedRoles: ["OWNER"] },
  ]

  const visibleMenu = menuItems.filter((item) => item.allowedRoles.includes(role))

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <PageHeader title="หน้าหลัก" description="ภาพรวมการขาย เงินสด ลูกหนี้ สต็อก และงานที่ต้องจัดการวันนี้" />

      <section className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {visibleMenu.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card flex flex-col items-center justify-center gap-2 py-4 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-slate-700">{item.name}</span>
            </Link>
          )
        })}
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <StatCard label="ยอดขายวันนี้" value={formatBaht(totalSalesToday)} icon={TrendingUp} tone="default" />
        <StatCard label="เงินสดรับจริง" value={formatBaht(cashReceivedToday)} icon={Wallet} tone="success" />
        <StatCard label="ขายเชื่อเพิ่ม" value={formatBaht(creditAddedToday)} icon={CreditCard} tone="warning" />
        <StatCard label="บิลวันนี้" value={`${totalBillsToday} ใบ`} icon={ReceiptText} tone="success" />
        <StatCard label="รอจัดส่ง" value={`${pendingDeliveries} เที่ยว`} icon={Truck} tone="warning" />
        <StatCard label="หนี้เกินกำหนด" value={formatBaht(aging.overdue)} icon={AlertOctagon} tone="danger" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">ลูกหนี้ต้องติดตามก่อน</h2>
              <p className="text-xs text-slate-500">เรียงจากยอดเกินกำหนดและความเสี่ยงวงเงิน</p>
            </div>
            <Link href="/ar" className="text-xs font-bold text-primary hover:underline">ไปหน้าลูกหนี้</Link>
          </div>

          <div className="mt-3">
            <Table>
              <THead>
                <TR>
                  <TH>ลูกค้า</TH>
                  <TH>ค้างรวม</TH>
                  <TH>เกินกำหนด</TH>
                  <TH>อายุหนี้</TH>
                  <TH>ใช้วงเงิน</TH>
                  <TH>จัดการ</TH>
                </TR>
              </THead>
              <TBody>
                {followUpCustomers.map((customer) => {
                  const creditLimitText = customer.creditLimit > 0 ? `${Math.round(customer.utilizationPct)}%` : "ไม่จำกัด"
                  const barPct = customer.creditLimit > 0 ? Math.min(100, customer.utilizationPct) : 0

                  return (
                    <TR key={customer.id}>
                      <TD>
                        <div className="font-semibold text-slate-900">{customer.name}</div>
                        <div className="text-xs text-slate-500">{customer.phone || "-"}</div>
                      </TD>
                      <TD className="font-bold text-slate-900">{formatBaht(customer.balance)}</TD>
                      <TD className={customer.overdueBalance > 0 ? "font-bold text-red-600" : "text-slate-500"}>
                        {formatBaht(customer.overdueBalance)}
                      </TD>
                      <TD>
                        {customer.oldestDaysPastDue > 0 ? (
                          <Badge variant={customer.oldestDaysPastDue > 60 ? "danger" : "warning"}>
                            {customer.oldestDaysPastDue} วัน
                          </Badge>
                        ) : (
                          <Badge variant="neutral">ยังไม่เกิน</Badge>
                        )}
                      </TD>
                      <TD className="min-w-[140px]">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>{creditLimitText}</span>
                          <span>{customer.creditLimit > 0 ? formatBaht(customer.creditLimit) : ""}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${getUtilizationTone(customer.utilizationPct)}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </TD>
                      <TD>
                        <div className="flex gap-2">
                          <Link href={`/ar/customers/${customer.id}`} className="text-xs font-bold text-primary hover:underline">
                            รายละเอียด
                          </Link>
                          <Link href={`/ar/payments/new?customerId=${customer.id}`} className="text-xs font-bold text-emerald-700 hover:underline">
                            รับชำระ
                          </Link>
                        </div>
                      </TD>
                    </TR>
                  )
                })}
                {followUpCustomers.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="py-8 text-center text-slate-500">ยังไม่มีลูกหนี้ค้างชำระ</TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-800">Aging ลูกหนี้</h2>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { label: "ยังไม่ถึงกำหนด", value: aging.current, color: "bg-emerald-500" },
              { label: "เกิน 1-30 วัน", value: aging.d1to30, color: "bg-amber-400" },
              { label: "เกิน 31-60 วัน", value: aging.d31to60, color: "bg-orange-500" },
              { label: "เกิน 61-90 วัน", value: aging.d61to90, color: "bg-red-500" },
              { label: "เกิน 90 วัน", value: aging.over90, color: "bg-red-700" },
            ].map((row) => {
              const pct = totalAR > 0 ? Math.min(100, (row.value / totalAR) * 100) : 0
              return (
                <div key={row.label}>
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{row.label}</span>
                    <span>{formatBaht(row.value)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <div className="text-xs font-bold text-red-700">ยอดเกินกำหนดรวม</div>
            <div className="text-2xl font-extrabold text-red-700">{formatBaht(aging.overdue)}</div>
          </div>
        </div>
      </section>

      {["OWNER", "STAFF"].includes(role) && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-800">เอกสารรถที่ต้องดำเนินการ</h2>
            <Badge variant={vehicleAlerts.length > 0 ? "warning" : "success"}>{vehicleAlerts.length} รายการ</Badge>
          </div>
          {vehicleAlerts.length === 0 ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">เอกสารรถครบถ้วน</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {vehicleAlerts.slice(0, 6).map((alert) => (
                <div key={`${alert.vehicleId}-${alert.type}`} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <b>{alert.plateNumber}</b> - {alertTypeText[alert.type]}{" "}
                  {alert.daysLeft < 0 ? `หมดแล้ว ${Math.abs(alert.daysLeft)} วัน` : `หมดใน ${alert.daysLeft} วัน`}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {lowStockProducts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">แจ้งเตือนสต็อกใกล้หมด</h2>
            <Badge variant="danger">
              <AlertTriangle className="w-3 h-3" />
              {lowStockProducts.length} รายการ
            </Badge>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>รหัส</TH>
                <TH>ชื่อสินค้า</TH>
                <TH>คงเหลือ</TH>
                <TH>จุดสั่งซื้อ</TH>
              </TR>
            </THead>
            <TBody>
              {lowStockProducts.map((product) => (
                <TR key={product.id}>
                  <TD className="text-slate-500">{product.code}</TD>
                  <TD className="font-medium text-slate-800">{product.name}</TD>
                  <TD className="font-semibold text-red-600">
                    {formatNumber(product.quantityOnHand)} {product.unitName}
                  </TD>
                  <TD className="text-slate-500">
                    {formatNumber(product.reorderPoint)} {product.unitName}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      )}
    </div>
  )
}
