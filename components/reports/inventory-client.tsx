"use client"

import { useState } from "react"
import { Search, Download, Printer, AlertTriangle, Package, Wallet } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"

export function InventoryClient({ initialData }: { initialData: any[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  const formatQty = (qty: number) => {
    return new Intl.NumberFormat('th-TH').format(qty)
  }

  const filteredData = initialData.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const urgentItems = filteredData.filter(p => p.status === "URGENT")
  const totalInventoryValue = filteredData.reduce((sum, p) => sum + p.totalValue, 0)

  const handleExportCSV = () => {
    const headers = ["รหัสสินค้า", "ชื่อสินค้า", "คงเหลือ", "หน่วยฐาน", "จุดสั่งซื้อ", "ต้นทุนเฉลี่ย", "มูลค่ารวม", "สถานะ"]
    const rows = filteredData.map(p => [
      p.code,
      p.name,
      p.quantityOnHand,
      p.baseUnit,
      p.reorderPoint,
      p.avgCost.toFixed(2),
      p.totalValue.toFixed(2),
      p.status === "URGENT" ? "ต้องสั่งซื้อ" : "ปกติ"
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `inventory_report_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintPO = () => {
    // Print just the urgent items as a simplified PO
    if (urgentItems.length === 0) {
      alert("ไม่มีสินค้าที่ต้องสั่งซื้อ")
      return
    }
    
    const printContents = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="text-align: center;">ใบสั่งซื้อที่แนะนำ (Suggested Purchase Order)</h2>
        <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">รหัส</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">สินค้า</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">คงเหลือ</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">จุดสั่งซื้อ</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">ควรสั่ง (แนะนำ)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">หน่วย</th>
            </tr>
          </thead>
          <tbody>
            ${urgentItems.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.code}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantityOnHand}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.reorderPoint}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">
                  ${item.reorderPoint > 0 ? (item.reorderPoint * 2) - item.quantityOnHand : 10}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.baseUnit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContents)
      printWindow.document.close()
      printWindow.focus()
      // slight delay for rendering
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 pb-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="รายการสินค้าทั้งหมด" value={`${filteredData.length} รายการ`} icon={Package} tone="default" />
        <StatCard label="มูลค่าสต็อกรวม (ทุนเฉลี่ย)" value={`฿${formatBaht(totalInventoryValue)}`} icon={Wallet} tone="default" />
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 bg-red-50 text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">ต้องสั่งซื้อด่วน</p>
              <p className="text-xl font-heading font-bold text-red-700 leading-tight">{urgentItems.length} รายการ</p>
            </div>
          </div>
          {urgentItems.length > 0 && (
            <Button variant="danger" size="sm" onClick={handlePrintPO}>
              พิมพ์ใบสั่งซื้อ
            </Button>
          )}
        </div>
      </div>

      <div className="card p-0 flex-1 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex justify-between items-center bg-slate-50">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="ค้นหารหัส หรือ ชื่อสินค้า..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>รหัส</TH>
                <TH>สินค้า</TH>
                <TH className="text-right">คงเหลือ</TH>
                <TH>หน่วยฐาน</TH>
                <TH className="text-right">จุดสั่งซื้อ</TH>
                <TH className="text-right">ทุนเฉลี่ย</TH>
                <TH className="text-right">มูลค่ารวม</TH>
                <TH className="text-center">สถานะ</TH>
              </TR>
            </THead>
            <TBody>
              {filteredData.map(item => (
                <TR key={item.id} className={item.status === 'URGENT' ? 'bg-red-50/30' : ''}>
                  <TD className="text-slate-500 font-mono text-xs">{item.code}</TD>
                  <TD className="font-medium text-slate-800">{item.name}</TD>
                  <TD className={`text-right font-semibold ${item.status === 'URGENT' ? 'text-red-600' : 'text-slate-700'}`}>
                    {formatQty(item.quantityOnHand)}
                  </TD>
                  <TD className="text-slate-600">{item.baseUnit}</TD>
                  <TD className="text-right text-slate-500">{formatQty(item.reorderPoint)}</TD>
                  <TD className="text-right text-slate-600">฿{formatBaht(item.avgCost)}</TD>
                  <TD className="text-right font-medium text-primary">฿{formatBaht(item.totalValue)}</TD>
                  <TD className="text-center">
                    {item.status === "URGENT" ? (
                      <Badge variant="danger">
                        <AlertTriangle className="w-3 h-3" /> ต้องสั่งซื้อ
                      </Badge>
                    ) : (
                      <Badge variant="success">ปกติ</Badge>
                    )}
                  </TD>
                </TR>
              ))}
              {filteredData.length === 0 && (
                <TR>
                  <TD colSpan={8}>
                    <EmptyState title="ไม่พบข้อมูลสินค้า" />
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
