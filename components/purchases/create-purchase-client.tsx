"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Calendar, Search, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function CreatePurchaseClient({ suppliers, products, currentUserId }: any) {
  const router = useRouter()
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "">("")
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [items, setItems] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return []
    const q = searchQuery.toLowerCase()
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [products, searchQuery])

  const addItem = (product: any) => {
    // Default to the first unit
    const defaultUnit = product.productUnits[0]
    if (!defaultUnit) return

    setItems(prev => [
      ...prev,
      {
        id: Date.now().toString(), // temporary id
        productId: product.id,
        productName: product.name,
        productUnits: product.productUnits,
        selectedUnitId: defaultUnit.id,
        quantity: 1,
        unitCost: 0
      }
    ])
    setSearchQuery("")
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
  }, [items])

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      alert("กรุณาเลือกผู้จัดจำหน่าย")
      return
    }
    if (items.length === 0) {
      alert("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ")
      return
    }

    const hasInvalidItem = items.some(item => item.quantity <= 0 || item.unitCost < 0)
    if (hasInvalidItem) {
      alert("กรุณาตรวจสอบจำนวนและราคาต้นทุนให้ถูกต้อง")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          purchaseDate: new Date(purchaseDate).toISOString(),
          note,
          createdById: currentUserId,
          items: items.map(item => ({
            productId: item.productId,
            productUnitId: item.selectedUnitId,
            quantity: parseFloat(item.quantity),
            unitCost: parseFloat(item.unitCost)
          }))
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create purchase")
      }

      alert("บันทึกรับสินค้าสำเร็จ")
      router.push("/purchases")
      router.refresh()
    } catch (error: any) {
      alert(error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto w-full">
      {/* Header & Actions */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="p-2 bg-white rounded-md border border-border hover:bg-slate-100 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-heading font-bold text-slate-800 tracking-tight">สร้างใบรับสินค้าเข้า</h1>
            <p className="text-sm text-slate-500 mt-0.5">รับสินค้าจาก Supplier และนำเข้าสต็อก</p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? "กำลังบันทึก..." : <><Save className="w-4 h-4" /> บันทึกและรับของเข้าสต็อก</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left Form */}
        <div className="col-span-1 space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ผู้จัดจำหน่าย (Supplier) <span className="text-red-500">*</span></label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : "")}
                className="select"
              >
                <option value="">-- เลือก Supplier --</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รับของ</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="input pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="input h-24 resize-none"
                placeholder="เช่น เลขที่อ้างอิงบิลจาก Supplier"
              />
            </div>
          </Card>

          <div className="rounded-lg shadow-sm border border-slate-700 p-4 bg-slate-800 text-white">
            <h3 className="text-slate-400 mb-1 text-sm font-medium">รวมยอดสั่งซื้อ (บาท)</h3>
            <div className="text-2xl font-heading font-bold">{formatBaht(total)}</div>
            <p className="text-xs text-slate-400 mt-2">ยอดรวมนี้ใช้สำหรับอ้างอิงเท่านั้น (ระบบไม่สร้างหนี้ AP)</p>
          </div>
        </div>

        {/* Right Panel: Items */}
        <Card className="flex min-h-[28rem] flex-col overflow-hidden p-0 lg:col-span-2 lg:h-[calc(100dvh-200px)]">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาสินค้าที่ต้องการรับเข้า..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-9"
              />

              {/* Search Results Dropdown */}
              {searchQuery && filteredProducts.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white rounded-md shadow-lg border border-border overflow-hidden">
                  {filteredProducts.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">รหัส: {p.code}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="touch-scroll flex-1 overflow-auto">
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <p className="text-sm">ค้นหาสินค้าด้านบนเพื่อเพิ่มรายการ</p>
              </div>
            ) : (
              <table className="table-dense min-w-[720px]">
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th className="w-32">จำนวน</th>
                    <th className="w-32">หน่วย</th>
                    <th className="w-32 text-right">ต้นทุน/หน่วย</th>
                    <th className="w-32 text-right">รวม</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-slate-800">{item.productName}</p>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          className="input text-center py-1.5"
                          min="1"
                        />
                      </td>
                      <td>
                        <select
                          value={item.selectedUnitId}
                          onChange={(e) => updateItem(item.id, "selectedUnitId", Number(e.target.value))}
                          className="select py-1.5"
                        >
                          {item.productUnits.map((pu: any) => (
                            <option key={pu.id} value={pu.id}>{pu.unit.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.unitCost || ""}
                          onChange={(e) => updateItem(item.id, "unitCost", e.target.value)}
                          className="input text-right py-1.5"
                          min="0"
                        />
                      </td>
                      <td className="text-right font-semibold text-slate-800">
                        {formatBaht((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0))}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
