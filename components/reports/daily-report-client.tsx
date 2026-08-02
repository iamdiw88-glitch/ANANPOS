"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, CreditCard, DollarSign, FileText, Receipt } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"

type Period = "day" | "month" | "year" | "all"

type SaleRow = {
  id: number
  billNo: string
  saleDate: string
  grandTotal: number
  paidAmount: number
  paymentType: string
  customer: { name: string } | null
}

type Props = {
  initialFrom: string
  initialTo: string
  initialPeriod: Period
  summary: { totalSales: number; cashReceived: number; creditSales: number; billCount: number }
  sales: SaleRow[]
}

const formatBaht = (amount: number) => new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)

const formatDate = (value: string) => new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value))

export function DailyReportClient({ initialFrom, initialTo, initialPeriod, summary, sales }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [period, setPeriod] = useState<Period>(initialPeriod)

  const applyFilter = () => {
    const params = new URLSearchParams({ period })
    if (period !== "all") {
      if (from) params.set("from", from)
      if (to) params.set("to", to)
    }
    router.push(`/reports/daily?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="min-w-36 flex-1 text-sm font-bold text-slate-700">
          ช่วงเวลา
          <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="select mt-1 h-10">
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </label>
        <label className="min-w-48 flex-1 text-sm font-bold text-slate-700">
          ตั้งแต่วันที่
          <span className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={period === "all"} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none disabled:opacity-50" />
          </span>
        </label>
        <label className="min-w-48 flex-1 text-sm font-bold text-slate-700">
          ถึงวันที่
          <span className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={period === "all"} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none disabled:opacity-50" />
          </span>
        </label>
        <button type="button" onClick={applyFilter} disabled={period !== "all" && (!from || !to)} className="h-10 cursor-pointer rounded-lg bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25">
          แสดงรายงาน
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="ยอดขายรวม" value={`฿${formatBaht(summary.totalSales)}`} icon={<Receipt className="h-5 w-5" />} tone="default" />
        <StatCard label="เงินรับแล้ว" value={`฿${formatBaht(summary.cashReceived)}`} icon={<DollarSign className="h-5 w-5" />} tone="success" />
        <StatCard label="ยอดค้างชำระ" value={`฿${formatBaht(summary.creditSales)}`} icon={<CreditCard className="h-5 w-5" />} tone="warning" />
        <StatCard label="จำนวนบิล" value={`${summary.billCount} ใบ`} icon={<FileText className="h-5 w-5" />} tone="default" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-heading text-base font-extrabold text-slate-900">รายการขาย</h2></div>
        <div className="overflow-x-auto">
          <table className="table-dense">
            <thead><tr><th>เลขที่บิล</th><th>วันที่</th><th>ลูกค้า</th><th>ประเภทชำระ</th><th>ยอดรวม</th><th>รับแล้ว</th></tr></thead>
            <tbody>
              {sales.map((sale) => <tr key={sale.id}>
                <td className="font-bold text-slate-900">{sale.billNo}</td>
                <td>{formatDate(sale.saleDate)}</td>
                <td>{sale.customer?.name || "ลูกค้าทั่วไป"}</td>
                <td>{sale.paymentType === "CREDIT" ? "ขายเชื่อ" : sale.paymentType === "PARTIAL" ? "ชำระบางส่วน" : "เงินสด"}</td>
                <td className="font-bold">฿{formatBaht(sale.grandTotal)}</td>
                <td className="font-bold text-emerald-700">฿{formatBaht(sale.paidAmount)}</td>
              </tr>)}
              {sales.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-500">ไม่พบรายการขายในช่วงเวลานี้</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
