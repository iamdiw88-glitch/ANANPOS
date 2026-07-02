"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, CreditCard, DollarSign, Receipt } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

type DailyReportClientProps = {
  initialDate: string
  summary: {
    totalSales: number
    cashReceived: number
    creditSales: number
  }
}

export function DailyReportClient({ initialDate, summary }: DailyReportClientProps) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate)

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDate(newDate)
    router.push(`/reports/daily?date=${newDate}`)
  }

  return (
    <div className="space-y-4">
      <div className="card inline-flex items-center gap-3 p-3">
        <Calendar className="w-4 h-4 text-primary" />
        <input
          type="date"
          value={date}
          onChange={handleDateChange}
          className="text-sm font-semibold text-slate-700 outline-none bg-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="ยอดขายรวม" value={`฿${formatBaht(summary.totalSales)}`} icon={Receipt} tone="default" />
        <StatCard label="เงินสดรับ" value={`฿${formatBaht(summary.cashReceived)}`} icon={DollarSign} tone="success" />
        <StatCard label="เงินเชื่อ (ค้างชำระ)" value={`฿${formatBaht(summary.creditSales)}`} icon={CreditCard} tone="warning" />
      </div>
    </div>
  )
}
