"use client"

import { useState, useMemo } from "react"
import { Calendar, Download, Search, Wallet, AlertTriangle, AlertOctagon } from "lucide-react"
import { differenceInDays, format } from "date-fns"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

export function AgingReportClient({ customers }: any) {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [searchQuery, setSearchQuery] = useState("")

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  // Calculate Aging
  const agingData = useMemo(() => {
    const referenceDate = new Date(asOfDate)
    
    let totalAll = 0
    let total0to30 = 0
    let total31to60 = 0
    let total61to90 = 0
    let totalOver90 = 0

    const rows = customers.map((c: any) => {
      let b0to30 = 0
      let b31to60 = 0
      let b61to90 = 0
      let bOver90 = 0
      let customerTotal = 0

      c.sales.forEach((s: any) => {
        const saleDate = new Date(s.saleDate)
        
        if (saleDate <= referenceDate) {
          const days = differenceInDays(referenceDate, saleDate)
          const remaining = s.grandTotal - s.paidAmount
          
          if (remaining > 0) {
            customerTotal += remaining
            if (days <= 30) b0to30 += remaining
            else if (days <= 60) b31to60 += remaining
            else if (days <= 90) b61to90 += remaining
            else bOver90 += remaining
          }
        }
      })

      totalAll += customerTotal
      total0to30 += b0to30
      total31to60 += b31to60
      total61to90 += b61to90
      totalOver90 += bOver90

      return {
        ...c,
        total: customerTotal,
        b0to30,
        b31to60,
        b61to90,
        bOver90
      }
    }).filter((r: any) => r.total > 0) 

    if (searchQuery) {
      return {
        rows: rows.filter((r: any) => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.phone?.includes(searchQuery)),
        totals: { totalAll, total0to30, total31to60, total61to90, totalOver90 }
      }
    }

    return {
      rows: rows.sort((a: any, b: any) => b.total - a.total),
      totals: { totalAll, total0to30, total31to60, total61to90, totalOver90 }
    }
  }, [customers, asOfDate, searchQuery])

  const exportCSV = () => {
    const headers = ["ชื่อลูกค้า", "ยอดรวม", "0-30 วัน", "31-60 วัน", "61-90 วัน", "เกิน 90 วัน"]
    const csvRows = agingData.rows.map((r: any) => 
      [r.name, r.total, r.b0to30, r.b31to60, r.b61to90, r.bOver90].join(",")
    )
    csvRows.unshift(headers.join(","))
    csvRows.push(["รวมทั้งสิ้น", agingData.totals.totalAll, agingData.totals.total0to30, agingData.totals.total31to60, agingData.totals.total61to90, agingData.totals.totalOver90].join(","))
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aging_report_${asOfDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="รายงานอายุหนี้ (AR Aging Report)"
        description="วิเคราะห์ยอดค้างชำระแบ่งตามช่วงเวลา"
        actions={
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="ยอดรวมค้างชำระ"
          value={`฿${formatBaht(agingData.totals.totalAll)}`}
          icon={<Wallet className="h-5 w-5" />}
          tone="default"
        />
        <StatCard
          label="ค้าง 31-90 วัน"
          value={`฿${formatBaht(agingData.totals.total31to60 + agingData.totals.total61to90)}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="ค้างเกิน 90 วัน"
          value={`฿${formatBaht(agingData.totals.totalOver90)}`}
          icon={<AlertOctagon className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="ค้นหาลูกค้า..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">วิเคราะห์ ณ วันที่:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>ชื่อลูกค้า</TH>
              <TH className="text-right">ยอดรวมค้างชำระ</TH>
              <TH className="text-right text-emerald-700">0 - 30 วัน</TH>
              <TH className="text-right text-amber-600">31 - 60 วัน</TH>
              <TH className="text-right text-orange-600">61 - 90 วัน</TH>
              <TH className="text-right text-red-600">เกิน 90 วัน</TH>
            </TR>
          </THead>
          <TBody>
            {agingData.rows.map((row: any) => (
              <TR key={row.id}>
                <TD className="font-medium text-slate-800">{row.name}</TD>
                <TD className="text-right font-bold text-slate-800">{formatBaht(row.total)}</TD>
                <TD className="text-right text-slate-600">{row.b0to30 > 0 ? formatBaht(row.b0to30) : "-"}</TD>
                <TD className="text-right text-slate-600">{row.b31to60 > 0 ? formatBaht(row.b31to60) : "-"}</TD>
                <TD className="text-right text-slate-600">{row.b61to90 > 0 ? formatBaht(row.b61to90) : "-"}</TD>
                <TD className="text-right font-bold text-red-500">{row.bOver90 > 0 ? formatBaht(row.bOver90) : "-"}</TD>
              </TR>
            ))}

            {agingData.rows.length === 0 && (
              <TR>
                <TD colSpan={6}>
                  <EmptyState title="ไม่มียอดค้างชำระ ณ วันที่ระบุ" />
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
        {agingData.rows.length > 0 && (
          <div className="mt-2 rounded-md bg-slate-800 text-white px-3 py-2 flex items-center justify-end gap-4 text-sm flex-wrap">
            <span className="font-bold">รวมทั้งสิ้น: ฿{formatBaht(agingData.totals.totalAll)}</span>
            <span className="font-bold text-emerald-400">0-30 วัน: ฿{formatBaht(agingData.totals.total0to30)}</span>
            <span className="font-bold text-amber-400">31-60 วัน: ฿{formatBaht(agingData.totals.total31to60)}</span>
            <span className="font-bold text-orange-400">61-90 วัน: ฿{formatBaht(agingData.totals.total61to90)}</span>
            <span className="font-bold text-red-400">เกิน 90 วัน: ฿{formatBaht(agingData.totals.totalOver90)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
