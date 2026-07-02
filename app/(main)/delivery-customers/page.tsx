import Link from "next/link"
import { redirect } from "next/navigation"
import { CreditCard, Phone, Receipt, Trophy, UserRound, Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table"

export const dynamic = "force-dynamic"

type Period = "today" | "month" | "year" | "all"

const periodLabels: Record<Period, string> = {
  today: "วันนี้",
  month: "เดือนนี้",
  year: "ปีนี้",
  all: "ทั้งหมด",
}

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount)
}

function getDateRange(period: Period) {
  const now = new Date()
  if (period === "all") return null

  const start = new Date(now)
  if (period === "today") {
    start.setHours(0, 0, 0, 0)
  } else if (period === "month") {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  } else {
    start.setMonth(0, 1)
    start.setHours(0, 0, 0, 0)
  }

  return { gte: start }
}

export default async function DeliveryCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    redirect("/dashboard")
  }

  const params = await searchParams
  const period = (["today", "month", "year", "all"].includes(params.period || "") ? params.period : "all") as Period
  const saleDateFilter = getDateRange(period)

  const [deliveryCustomers, generalDeliveries, creditCustomers] = await Promise.all([
    prisma.deliveryCustomer.findMany({
      where: { isActive: true },
      include: {
        customer: { select: { code: true, type: true } },
        deliveries: {
          where: saleDateFilter ? { sale: { saleDate: saleDateFilter } } : {},
          include: { sale: { select: { grandTotal: true, saleDate: true } } },
        },
      },
    }),
    prisma.delivery.findMany({
      where: {
        deliveryCustomerId: null,
        customerId: null,
        OR: [{ recipientName: null }, { recipientName: "" }],
        ...(saleDateFilter ? { sale: { saleDate: saleDateFilter } } : {}),
      },
      include: { sale: { select: { grandTotal: true, saleDate: true } } },
    }),
    prisma.customer.findMany({
      where: {
        OR: [{ type: "CREDIT" }, { balance: { gt: 0 } }],
      },
      include: {
        sales: {
          where: saleDateFilter ? { saleDate: saleDateFilter } : {},
          select: { id: true, saleDate: true, grandTotal: true, paidAmount: true, status: true },
        },
      },
      orderBy: { balance: "desc" },
    }),
  ])

  const namedCustomers = deliveryCustomers
    .map((customer) => {
      const periodTotal = customer.deliveries.reduce((sum, delivery) => sum + delivery.sale.grandTotal, 0)
      const lastPurchasedAt = customer.deliveries
        .map((delivery) => delivery.sale.saleDate)
        .sort((a, b) => b.getTime() - a.getTime())[0] || customer.lastPurchasedAt

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        phone2: customer.phone2,
        deliveryAddress: customer.deliveryAddress,
        totalPurchased: period === "all" ? customer.totalPurchased : periodTotal,
        purchaseCount: period === "all" ? customer.purchaseCount : customer.deliveries.length,
        lastPurchasedAt,
        customerCode: customer.customer?.code,
      }
    })
    .filter((customer) => period === "all" || customer.purchaseCount > 0)
    .sort((a, b) => b.totalPurchased - a.totalPurchased)

  const generalTotal = generalDeliveries.reduce((sum, delivery) => sum + delivery.sale.grandTotal, 0)
  const generalLastDate = generalDeliveries
    .map((delivery) => delivery.sale.saleDate)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  const creditRows = creditCustomers
    .map((customer) => {
      const periodTotal = customer.sales.reduce((sum, sale) => sum + sale.grandTotal, 0)
      const unpaidBills = customer.sales.filter((sale) => sale.status === "UNPAID" || sale.status === "PARTIAL").length
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || "-",
        balance: customer.balance,
        creditLimit: customer.creditLimit,
        periodTotal,
        unpaidBills,
      }
    })
    .filter((customer) => period === "all" || customer.periodTotal > 0 || customer.balance > 0)
    .sort((a, b) => b.balance - a.balance || b.periodTotal - a.periodTotal)

  const namedTotal = namedCustomers.reduce((sum, customer) => sum + customer.totalPurchased, 0)
  const creditBalance = creditRows.reduce((sum, customer) => sum + customer.balance, 0)

  return (
    <div className="space-y-5">
      <PageHeader title="ข้อมูลลูกค้า" description="รวมลูกค้าจัดส่ง ลูกค้าทั่วไป และลูกค้าสินเชื่อในหน้าเดียว" />

      <div className="flex flex-wrap gap-2">
        {(Object.keys(periodLabels) as Period[]).map((item) => (
          <Link
            key={item}
            href={`/delivery-customers?period=${item}`}
            className={`h-9 rounded-md border px-3 inline-flex items-center text-sm font-semibold transition-colors ${
              period === item ? "border-primary bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {periodLabels[item]}
          </Link>
        ))}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard icon={Users} label="ลูกค้ามีชื่อ" value={`${namedCustomers.length} ราย`} />
        <SummaryCard icon={Receipt} label="ยอดลูกค้ามีชื่อ" value={formatBaht(namedTotal)} />
        <SummaryCard icon={UserRound} label="ลูกค้าทั่วไป" value={formatBaht(generalTotal)} />
        <SummaryCard icon={CreditCard} label="ยอดลูกหนี้" value={formatBaht(creditBalance)} />
      </section>

      <SectionTitle title="ข้อมูลลูกค้าที่มีชื่อ" count={`${namedCustomers.length} ราย`} />
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>อันดับ</TH>
              <TH>ลูกค้า</TH>
              <TH>เบอร์โทร</TH>
              <TH>ที่อยู่ล่าสุด</TH>
              <TH>จำนวนบิล</TH>
              <TH>ยอดซื้อ</TH>
              <TH>ซื้อล่าสุด</TH>
            </TR>
          </THead>
          <TBody>
            {namedCustomers.map((customer, index) => (
              <TR key={customer.id}>
                <TD>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
                    {index === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : index + 1}
                  </span>
                </TD>
                <TD>
                  <div className="font-bold text-slate-900">{customer.name}</div>
                  {customer.customerCode && <Badge variant="info">ลูกค้าในระบบ {customer.customerCode}</Badge>}
                </TD>
                <TD>
                  <PhoneLine phone={customer.phone} phone2={customer.phone2} />
                </TD>
                <TD className="max-w-md text-slate-600">{customer.deliveryAddress}</TD>
                <TD className="font-semibold text-slate-700">{customer.purchaseCount}</TD>
                <TD className="font-extrabold text-slate-900">{formatBaht(customer.totalPurchased)}</TD>
                <TD className="text-slate-500">{customer.lastPurchasedAt ? customer.lastPurchasedAt.toLocaleDateString("th-TH") : "-"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>

      <SectionTitle title="ข้อมูลลูกค้าทั่วไปที่ไม่มีชื่อ" count={`${generalDeliveries.length} บิล`} />
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryCard icon={Receipt} label="จำนวนบิลรวม" value={`${generalDeliveries.length} บิล`} compact />
          <SummaryCard icon={CreditCard} label="ยอดซื้อรวม" value={formatBaht(generalTotal)} compact />
          <SummaryCard icon={UserRound} label="ล่าสุด" value={generalLastDate ? generalLastDate.toLocaleDateString("th-TH") : "-"} compact />
        </div>
      </section>

      <SectionTitle title="ข้อมูลลูกค้าสินเชื่อ" count={`${creditRows.length} ราย`} />
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>ลูกค้า</TH>
              <TH>เบอร์โทร</TH>
              <TH>ยอดซื้อในช่วง</TH>
              <TH>ยอดค้าง</TH>
              <TH>วงเงิน</TH>
              <TH>บิลค้าง</TH>
              <TH>จัดการ</TH>
            </TR>
          </THead>
          <TBody>
            {creditRows.map((customer) => (
              <TR key={customer.id}>
                <TD className="font-bold text-slate-900">{customer.name}</TD>
                <TD>{customer.phone}</TD>
                <TD className="font-semibold text-slate-800">{formatBaht(customer.periodTotal)}</TD>
                <TD className="font-extrabold text-red-600">{formatBaht(customer.balance)}</TD>
                <TD className="text-slate-600">{customer.creditLimit > 0 ? formatBaht(customer.creditLimit) : "ไม่จำกัด"}</TD>
                <TD>
                  <Badge variant={customer.unpaidBills > 0 ? "warning" : "neutral"}>{customer.unpaidBills} บิล</Badge>
                </TD>
                <TD>
                  <div className="flex gap-2">
                    <Link href={`/ar/customers/${customer.id}`} className="text-sm font-semibold text-primary hover:underline">
                      รายละเอียด
                    </Link>
                    <Link href={`/ar/payments/new?customerId=${customer.id}`} className="text-sm font-semibold text-emerald-700 hover:underline">
                      รับชำระ
                    </Link>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, compact = false }: { icon: any; label: string; value: string; compact?: boolean }) {
  return (
    <div className={`card ${compact ? "p-3" : "p-4"} flex items-center gap-3`}>
      <div className="h-10 w-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className={`${compact ? "text-lg" : "text-xl"} font-extrabold text-slate-900`}>{value}</p>
      </div>
    </div>
  )
}

function SectionTitle({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      <Badge variant="neutral">{count}</Badge>
    </div>
  )
}

function PhoneLine({ phone, phone2 }: { phone: string; phone2?: string | null }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-1 font-semibold text-slate-800">
        <Phone className="h-3.5 w-3.5 text-slate-400" />
        {phone}
      </div>
      {phone2 && <div className="text-slate-500">สำรอง {phone2}</div>}
    </div>
  )
}
