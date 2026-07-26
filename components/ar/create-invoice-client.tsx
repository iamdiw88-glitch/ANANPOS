"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Calendar } from "lucide-react"
import { addDays, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, Input } from "@/components/ui/input"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"

export function CreateInvoiceClient({ customers, defaultCustomerId, currentUserId }: any) {
  const router = useRouter()
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">(defaultCustomerId || "")
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [selectedSaleIds, setSelectedSaleIds] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === selectedCustomerId)
  }, [customers, selectedCustomerId])

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  const toggleSale = (id: number) => {
    setSelectedSaleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedCustomer) {
      if (selectedSaleIds.length === selectedCustomer.sales.length) {
        setSelectedSaleIds([])
      } else {
        setSelectedSaleIds(selectedCustomer.sales.map((s: any) => s.id))
      }
    }
  }

  const totalAmount = useMemo(() => {
    if (!selectedCustomer) return 0
    return selectedCustomer.sales
      .filter((s: any) => selectedSaleIds.includes(s.id))
      .reduce((sum: number, s: any) => sum + (s.grandTotal - s.paidAmount), 0)
  }, [selectedCustomer, selectedSaleIds])

  const handleSubmit = async () => {
    if (!selectedCustomerId || selectedSaleIds.length === 0) {
      alert("กรุณาเลือกลูกค้าและบิลอย่างน้อย 1 รายการ")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          saleIds: selectedSaleIds,
          invoiceDate: new Date(invoiceDate).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          createdById: currentUserId
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create invoice")
      }

      const invoice = await res.json()
      alert("สร้างใบวางบิลสำเร็จ เลขที่: " + invoice.invoiceNo)
      router.push(`/ar/invoices/${invoice.id}`)
      router.refresh()
    } catch (error: any) {
      alert(error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto w-full">
      {/* Header & Back */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/ar" className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm border border-border">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-heading font-bold text-slate-800 tracking-tight">สร้างใบวางบิลใหม่</h1>
            <p className="text-sm text-slate-500 mt-0.5">เลือกลูกค้าและรายการบิลค้างชำระเพื่อวางบิล</p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedSaleIds.length === 0}
        >
          {isSubmitting ? "กำลังบันทึก..." : <><Save className="w-4 h-4" /> ยืนยันการสร้างใบวางบิล</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left Column: Form */}
        <div className="col-span-1 space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า</label>
              <Select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value ? Number(e.target.value) : "")
                  setSelectedSaleIds([])
                }}
                className="w-full"
              >
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.sales.length} บิลค้าง)</option>
                ))}
              </Select>
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-slate-50 rounded-md space-y-1.5 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ยอดค้างปัจจุบัน:</span>
                  <span className="font-bold text-red-600">฿{formatBaht(selectedCustomer.balance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">เครดิตเทอม:</span>
                  <span className="font-medium text-slate-800">{selectedCustomer.creditTermDays} วัน</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">วันที่วางบิล</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">วันครบกำหนดชำระ</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full pl-9"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-100 p-4">
            <h3 className="text-sm font-bold text-blue-900 mb-2">สรุปยอดวางบิล</h3>
            <div className="flex justify-between items-end">
              <span className="text-sm text-blue-700">เลือกแล้ว {selectedSaleIds.length} บิล</span>
              <span className="text-xl font-heading font-bold text-blue-700">฿{formatBaht(totalAmount)}</span>
            </div>
          </Card>
        </div>

        {/* Right Column: Bills Table */}
        <Card className="flex min-h-[28rem] flex-col overflow-hidden p-0 lg:col-span-2 lg:h-[calc(100dvh-200px)]">
          <div className="p-3 border-b border-border flex justify-between items-center bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">เลือกรายการบิลค้างชำระ</h2>
            {selectedCustomer && selectedCustomer.sales.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800">
                <input
                  type="checkbox"
                  checked={selectedSaleIds.length === selectedCustomer.sales.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                เลือกทั้งหมด
              </label>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedCustomer ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <p>กรุณาเลือกลูกค้าทางด้านซ้าย</p>
              </div>
            ) : selectedCustomer.sales.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <p>ไม่มีบิลค้างชำระสำหรับลูกค้ารายนี้</p>
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="w-12"></TH>
                    <TH>วันที่ทำรายการ</TH>
                    <TH>เลขที่บิล</TH>
                    <TH className="text-right">ยอดค้าง (บาท)</TH>
                  </TR>
                </THead>
                <TBody>
                  {selectedCustomer.sales.map((s: any) => {
                    const remaining = s.grandTotal - s.paidAmount
                    const isSelected = selectedSaleIds.includes(s.id)
                    return (
                      <TR
                        key={s.id}
                        className={isSelected ? "bg-blue-50/50 cursor-pointer" : "cursor-pointer"}
                        onClick={() => toggleSale(s.id)}
                      >
                        <TD>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSale(s.id)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TD>
                        <TD>{new Date(s.saleDate).toLocaleDateString('th-TH')}</TD>
                        <TD className="font-medium text-slate-800">{s.billNo}</TD>
                        <TD className="text-right font-bold text-slate-800">{formatBaht(remaining)}</TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
