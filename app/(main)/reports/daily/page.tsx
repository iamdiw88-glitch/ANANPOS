import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DailyReportClient } from "@/components/reports/daily-report-client"
import { PageHeader } from "@/components/ui/page-header"

export const dynamic = "force-dynamic"

type ReportPeriod = "day" | "month" | "year" | "all"

function getPeriod(fromValue: string | undefined, toValue: string | undefined, periodValue: string | undefined) {
  const period: ReportPeriod = ["day", "month", "year", "all"].includes(periodValue || "")
    ? periodValue as ReportPeriod
    : "day"
  const fallback = new Date().toISOString().split("T")[0]
  const from = period === "all" ? undefined : fromValue || fallback
  const to = period === "all" ? undefined : toValue || from || fallback
  const date = from ? new Date(`${from}T00:00:00`) : new Date(0)
  const end = to ? new Date(`${to}T00:00:00`) : new Date()
  end.setDate(end.getDate() + 1)
  end.setHours(0, 0, 0, 0)
  return { period, from, to, date, end }
}

export default async function DailyReportPage(props: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; period?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== "OWNER") redirect("/pos")

  const searchParams = await props.searchParams
  const { period, from, to, date, end } = getPeriod(searchParams.from || searchParams.date, searchParams.to, searchParams.period)
  const sales = await prisma.sale.findMany({
    where: {
      ...(period === "all" ? {} : { saleDate: { gte: date, lt: end } }),
      status: { not: "VOID" },
    },
    select: {
      id: true,
      billNo: true,
      saleDate: true,
      grandTotal: true,
      paidAmount: true,
      paymentType: true,
      customer: { select: { name: true } },
    },
    orderBy: { saleDate: "desc" },
  })

  const summary = {
    totalSales: sales.reduce((sum, sale) => sum + sale.grandTotal, 0),
    cashReceived: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
    creditSales: sales.reduce((sum, sale) => sum + Math.max(0, sale.grandTotal - sale.paidAmount), 0),
    billCount: sales.length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        title="ข้อมูลรายงานการขาย"
        description="ตรวจสอบยอดขาย เงินที่รับ และยอดค้างชำระ โดยกรองตามวัน เดือน หรือปี"
      />
      <DailyReportClient
        initialFrom={from || ""}
        initialTo={to || ""}
        initialPeriod={period}
        summary={summary}
        sales={sales.map((sale) => ({
          ...sale,
          saleDate: sale.saleDate.toISOString(),
        }))}
      />
    </div>
  )
}
