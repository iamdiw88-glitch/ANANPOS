"use client"

import { useEffect, useMemo, useState } from "react"
import { X, RotateCcw, PackageMinus, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"

type ReturnSaleDialogProps = {
  saleId: number | null
  onClose: () => void
  onSaved?: () => void
}

type ReturnableItem = {
  id: number
  productId: number
  productUnitId: number
  customName?: string | null
  customUnitName?: string | null
  product: { name: string }
  productUnit: { conversionRate: number; unit: { name: string } }
  qtyOriginal: number
  qtyAlreadyReturned: number
  qtyReturnable: number
  unitPrice: number
}

type ReturnLine = ReturnableItem & {
  returnQty: number
  restock: boolean
}

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ReturnSaleDialog({ saleId, onClose, onSaved }: ReturnSaleDialogProps) {
  const [sale, setSale] = useState<any>(null)
  const [items, setItems] = useState<ReturnLine[]>([])
  const [existingReturns, setExistingReturns] = useState<any[]>([])
  const [reason, setReason] = useState("CUSTOMER_RETURN")
  const [refundMethod, setRefundMethod] = useState("CASH")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!saleId) return

    let isActive = true
    setLoading(true)
    setSale(null)
    setItems([])
    setExistingReturns([])
    setReason("CUSTOMER_RETURN")
    setRefundMethod("CASH")
    setNote("")

    fetch(`/api/sales/${saleId}/returnable`)
      .then(async (res) => {
        const payload = await res.json().catch(() => null)
        if (!res.ok) throw new Error(payload?.error || "โหลดข้อมูลคืนสินค้าไม่สำเร็จ")
        return payload.data
      })
      .then((data) => {
        if (!isActive) return
        setSale(data.sale)
        setExistingReturns(data.existingReturns || [])
        setItems((data.items || []).map((item: ReturnableItem) => ({
          ...item,
          returnQty: 0,
          restock: true,
        })))
      })
      .catch((error) => {
        if (!isActive) return
        toast.error(error.message)
      })
      .finally(() => {
        if (isActive) setLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [saleId])

  const totalRefund = useMemo(() => {
    return items.reduce((sum, item) => sum + item.returnQty * item.unitPrice, 0)
  }, [items])

  if (!saleId) return null

  const updateReturnQty = (itemId: number, value: string) => {
    const qty = parseFloat(value) || 0
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        returnQty: Math.min(Math.max(0, qty), item.qtyReturnable),
      }
    }))
  }

  const submitReturn = async () => {
    const selectedItems = items.filter((item) => item.returnQty > 0)
    if (!sale || selectedItems.length === 0) {
      toast.warning("กรุณาระบุสินค้าที่ต้องการคืนอย่างน้อย 1 รายการ")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalSaleId: sale.id,
          reason,
          refundMethod,
          note,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            customName: item.customName || null,
            customUnitName: item.customUnitName || null,
            quantity: item.returnQty,
            restock: item.restock,
          })),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || "บันทึกรับคืนสินค้าไม่สำเร็จ")
      }

      toast.success("บันทึกรับคืนสินค้าเรียบร้อย", {
        description: "ระบบสร้างรายการรับคืนแยกจากบิลขายเดิมแล้ว",
      })
      onSaved?.()
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" /> รับคืนสินค้าจากบิล
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {sale ? `${sale.billNo} • ${sale.customer?.name || "ลูกค้าทั่วไป"}` : "กำลังโหลดข้อมูลบิล"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">กำลังโหลดรายการสินค้า...</div>
          ) : !sale ? (
            <div className="py-16 text-center text-sm text-red-600">ไม่พบข้อมูลบิล</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-border rounded-lg overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <PackageMinus className="w-4 h-4" /> รายการที่คืนได้
                  </h3>
                  {existingReturns.length > 0 && (
                    <span className="text-xs text-slate-500">เคยคืนแล้ว {existingReturns.length} ครั้ง</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="table-dense">
                    <thead>
                      <tr>
                        <th>สินค้า</th>
                        <th className="text-center">ซื้อ/คืนแล้ว/คืนได้</th>
                        <th className="text-center w-28">จำนวนคืน</th>
                        <th className="text-center">เข้าสต็อก</th>
                        <th className="text-right">ยอดคืน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className={item.returnQty > 0 ? "bg-blue-50/40" : ""}>
                          <td>
                            <div className="font-semibold text-slate-800">{item.customName || item.product.name}</div>
                            <div className="text-xs text-slate-500">
                              {formatBaht(item.unitPrice)} / {item.customUnitName || item.productUnit.unit.name}
                            </div>
                          </td>
                          <td className="text-center text-sm text-slate-600">
                            {item.qtyOriginal} / {item.qtyAlreadyReturned} / {item.qtyReturnable}
                          </td>
                          <td>
                            <Input
                              type="number"
                              min="0"
                              max={item.qtyReturnable}
                              step="0.01"
                              value={item.returnQty || ""}
                              onChange={(event) => updateReturnQty(item.id, event.target.value)}
                              className="text-center"
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={item.restock}
                              disabled={item.returnQty <= 0}
                              onChange={() => {
                                setItems((prev) => prev.map((line) => (
                                  line.id === item.id ? { ...line, restock: !line.restock } : line
                                )))
                              }}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="text-right font-semibold text-primary">
                            {formatBaht(item.returnQty * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-slate-500 py-8">
                            ไม่มีสินค้าที่คืนได้ในบิลนี้แล้ว
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900 text-white rounded-lg p-4">
                  <div className="text-sm text-slate-300">ยอดคืนรวม</div>
                  <div className="mt-1 text-2xl font-bold">฿{formatBaht(totalRefund)}</div>
                </div>
                <div className="card space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เหตุผล</label>
                    <Select value={reason} onChange={(event) => setReason(event.target.value)}>
                      <option value="CUSTOMER_RETURN">ลูกค้าขอคืน</option>
                      <option value="DAMAGED">สินค้าชำรุด</option>
                      <option value="WRONG_ITEM">จ่ายสินค้าผิด</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วิธีคืนเงิน</label>
                    <Select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)}>
                      <option value="CASH">คืนเงินสด</option>
                      {sale.customerId && <option value="CREDIT_NOTE">ลดหนี้ลูกค้า</option>}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="input h-20 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border bg-slate-50 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button type="button" onClick={submitReturn} disabled={saving || loading || totalRefund <= 0}>
            <Save className="w-4 h-4" />
            {saving ? "กำลังบันทึก..." : "บันทึกรับคืน"}
          </Button>
        </div>
      </div>
    </div>
  )
}
