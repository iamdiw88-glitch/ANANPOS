"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Save, Calendar, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Select } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function PaymentClient({ customers, defaultCustomerId, defaultInvoiceId, currentUserId }: any) {
  const router = useRouter()

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">(defaultCustomerId || "")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | "">(defaultInvoiceId || "")

  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amountInput, setAmountInput] = useState<string>("")
  const [method, setMethod] = useState("CASH")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")

  const [isAuto, setIsAuto] = useState(true)
  const [manualAllocations, setManualAllocations] = useState<Record<number, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === selectedCustomerId)
  }, [customers, selectedCustomerId])

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  // FIFO Auto Allocation
  const autoAllocations = useMemo(() => {
    const allocs: Record<number, number> = {}
    if (!selectedCustomer || !isAuto) return allocs

    let remainingAmount = parseFloat(amountInput) || 0
    if (remainingAmount <= 0) return allocs

    // Prioritize invoice if selected? Actually the requirements say apply to bills.
    // If an invoice is selected, we could filter sales to only those in the invoice.
    // For simplicity, we just apply to all unpaid sales oldest first.
    let targetSales = selectedCustomer.sales

    if (selectedInvoiceId) {
      const invoice = selectedCustomer.invoices.find((i: any) => i.id === selectedInvoiceId)
      if (invoice) {
        const invoiceSaleIds = invoice.invoiceSales.map((is: any) => is.saleId)
        targetSales = targetSales.filter((s: any) => invoiceSaleIds.includes(s.id))
      }
    }

    for (const sale of targetSales) {
      const remainingSaleBalance = sale.grandTotal - sale.paidAmount
      if (remainingSaleBalance <= 0) continue

      if (remainingAmount >= remainingSaleBalance) {
        allocs[sale.id] = remainingSaleBalance
        remainingAmount -= remainingSaleBalance
      } else {
        allocs[sale.id] = remainingAmount
        remainingAmount = 0
        break
      }
    }

    return allocs
  }, [selectedCustomer, amountInput, isAuto, selectedInvoiceId])

  const currentAllocations = isAuto ? autoAllocations : manualAllocations

  const totalAllocated = useMemo(() => {
    return Object.values(currentAllocations).reduce((sum, val) => sum + val, 0)
  }, [currentAllocations])

  // If manual, amount input should ideally reflect total allocated, or we just validate they match

  const handleManualChange = (saleId: number, val: string, maxAmount: number) => {
    setIsAuto(false)
    const num = parseFloat(val) || 0
    setManualAllocations(prev => {
      const next = { ...prev }
      if (num <= 0) {
        delete next[saleId]
      } else {
        next[saleId] = Math.min(num, maxAmount)
      }
      return next
    })
  }

  // Pre-fill amount if invoice is selected
  useEffect(() => {
    if (selectedInvoiceId && selectedCustomer) {
      const invoice = selectedCustomer.invoices.find((i: any) => i.id === selectedInvoiceId)
      if (invoice && invoice.balance > 0) {
        setAmountInput(invoice.balance.toString())
        setIsAuto(true)
      }
    }
  }, [selectedInvoiceId, selectedCustomer])

  const handleSubmit = async () => {
    const payAmount = parseFloat(amountInput) || 0
    if (!selectedCustomerId || payAmount <= 0) {
      alert("กรุณาระบุจำนวนเงินที่รับชำระ")
      return
    }

    if (totalAllocated <= 0) {
      alert("ไม่มีบิลให้ตัดยอด หรือไม่ได้จัดสรรยอดชำระ")
      return
    }

    // Prepare allocations array
    const allocationsArray = Object.entries(currentAllocations).map(([saleId, applyAmount]) => ({
      saleId: parseInt(saleId),
      applyAmount
    }))

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          invoiceId: selectedInvoiceId || undefined,
          amount: payAmount,
          method,
          reference,
          note,
          paymentDate: new Date(paymentDate).toISOString(),
          createdById: currentUserId,
          allocations: allocationsArray
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create payment")
      }

      alert("บันทึกรับชำระเงินสำเร็จ")
      router.push(`/ar/customers/${selectedCustomerId}`)
      router.refresh()
    } catch (error: any) {
      alert(error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto w-full">
      {/* Header & Back */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/ar" className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm border border-border">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-heading font-bold text-slate-800 tracking-tight">รับชำระเงิน</h1>
            <p className="text-sm text-slate-500 mt-0.5">บันทึกการรับชำระเงินและตัดยอดหนี้</p>
          </div>
        </div>

        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={handleSubmit}
          disabled={isSubmitting || totalAllocated === 0}
        >
          {isSubmitting ? "กำลังบันทึก..." : <><Save className="w-4 h-4" /> ยืนยันรับชำระเงิน</>}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Left Form */}
        <div className="col-span-2 space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า</label>
              <Select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value ? Number(e.target.value) : "")
                  setSelectedInvoiceId("")
                  setAmountInput("")
                  setManualAllocations({})
                  setIsAuto(true)
                }}
                className="w-full"
              >
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} (ค้าง {formatBaht(c.balance)})</option>
                ))}
              </Select>
            </div>

            {selectedCustomer && selectedCustomer.invoices.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อ้างอิงใบวางบิล (ถ้ามี)</label>
                <Select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : ""
                    setSelectedInvoiceId(id)
                    setManualAllocations({})
                    setIsAuto(true)
                    if (!id) setAmountInput("")
                  }}
                  className="w-full"
                >
                  <option value="">-- ไม่ระบุบิล --</option>
                  {selectedCustomer.invoices.map((i: any) => (
                    <option key={i.id} value={i.id}>{i.invoiceNo} (ยอดค้าง {formatBaht(i.balance)})</option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนเงินที่ได้รับ <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">฿</span>
                <Input
                  type="number"
                  value={amountInput}
                  onChange={e => {
                    setAmountInput(e.target.value)
                    if (!isAuto) {
                      // If they change amount while manual, maybe we just leave manual allocations alone
                      // or warn them. We will just let them mismatch and show a warning in UI.
                    }
                  }}
                  className="w-full pl-8 text-base font-bold text-emerald-600"
                  placeholder="0.00"
                />
              </div>
                {!isAuto && Math.abs((parseFloat(amountInput)||0) - totalAllocated) > 0.01 && (
                  <p className="text-orange-500 text-xs mt-1 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    ยอดจัดสรรไม่ตรงกับยอดรับเงิน
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ช่องทางชำระ</label>
                <Select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full"
                >
                  <option value="CASH">เงินสด</option>
                  <option value="TRANSFER">โอนเงิน</option>
                  <option value="CHEQUE">เช็ค</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รับชำระ</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">เลขอ้างอิง / สลิป</label>
              <Input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full"
                placeholder="เช่น เลขที่สลิป หรือเลขที่เช็ค"
              />
            </div>
          </Card>
        </div>

        {/* Right Panel: Allocation */}
        <Card className="col-span-3 flex flex-col h-[calc(100vh-200px)] p-0 overflow-hidden">
          <div className="p-3 border-b border-border flex justify-between items-center bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">จัดสรรยอดชำระ</h2>
            <div className="flex gap-1 bg-white rounded-md p-1 border border-border">
              <button
                onClick={() => {
                  setIsAuto(true)
                  setManualAllocations({})
                }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                  isAuto ? "bg-blue-100 text-primary" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                อัตโนมัติ (FIFO)
              </button>
              <button
                onClick={() => {
                  setIsAuto(false)
                  setManualAllocations({ ...autoAllocations })
                }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                  !isAuto ? "bg-blue-100 text-primary" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                กำหนดเอง
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!selectedCustomer ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">เลือกลูกค้าทางซ้ายเพื่อแสดงบิล</div>
            ) : selectedCustomer.sales.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มียอดค้างชำระ</div>
            ) : (
              <div className="space-y-2">
                {selectedCustomer.sales.map((s: any) => {
                  const remaining = s.grandTotal - s.paidAmount
                  const allocated = currentAllocations[s.id] || 0
                  const isFullyCleared = allocated > 0 && Math.abs(allocated - remaining) < 0.01

                  // If invoice is selected, maybe we only show those sales?
                  // Or we show all but highlight invoice ones. Let's just show all for now.

                  return (
                    <div key={s.id} className={cn(
                      "p-3 rounded-md border transition-colors",
                      allocated > 0 ? "border-emerald-200 bg-emerald-50" : "border-border bg-white hover:border-slate-300"
                    )}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{s.billNo}</p>
                          <p className="text-xs text-slate-500">{new Date(s.saleDate).toLocaleDateString('th-TH')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">ยอดค้างบิลนี้</p>
                          <p className="font-bold text-slate-800 text-sm">฿{formatBaht(remaining)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          {isAuto ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{ width: `${(allocated / remaining) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-emerald-600 w-24 text-right">
                                {allocated > 0 ? `+ ฿${formatBaht(allocated)}` : ""}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-sm text-slate-500">ตัดยอด:</span>
                              <Input
                                type="number"
                                value={currentAllocations[s.id] || ""}
                                onChange={(e) => handleManualChange(s.id, e.target.value, remaining)}
                                className="w-32 text-right"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                        </div>
                        {isFullyCleared && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border bg-slate-50 flex justify-between items-center">
            <span className="text-sm text-slate-600 font-medium">รวมยอดจัดสรร</span>
            <span className="text-xl font-heading font-bold text-emerald-600">฿{formatBaht(totalAllocated)}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
