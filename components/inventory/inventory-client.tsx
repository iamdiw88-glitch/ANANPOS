"use client"

import { useState, useMemo } from "react"
import { Search, AlertTriangle, X, Package, History, Settings2, Trash2 } from "lucide-react"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"

export function InventoryClient({ products, categories }: { products: any[], categories: any[] }) {
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState<number | "ALL">("ALL")
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState("")

  const [damageProduct, setDamageProduct] = useState<any | null>(null)
  const [damageQty, setDamageQty] = useState(0)
  const [damageNote, setDamageNote] = useState("")

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.includes(search) || p.code.includes(search)
      const matchCat = catFilter === "ALL" || p.categoryId === catFilter
      return matchSearch && matchCat
    })
  }, [products, search, catFilter])

  const openHistory = async (product: any) => {
    setSelectedProduct(product)
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/products/${product.id}/movements`)
      if (res.ok) {
        const data = await res.json()
        setMovements(data)
      } else {
        setMovements([])
      }
    } catch (e) {
      console.error(e)
      setMovements([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustProduct) return
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: adjustProduct.id, quantityBase: adjustQty, note: adjustNote })
      })
      if (res.ok) {
        window.location.reload()
      } else {
        alert("Error adjusting stock")
      }
    } catch (e) {
      alert("Error")
    }
  }

  const handleDamageStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!damageProduct) return
    try {
      const res = await fetch('/api/stock/damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: damageProduct.id, quantityBase: damageQty, note: damageNote })
      })
      if (res.ok) {
        window.location.reload()
      } else {
        alert("Error writing off stock")
      }
    } catch (e) {
      alert("Error")
    }
  }

  return (
    <div className="card overflow-hidden p-0 relative">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-slate-50 flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า หรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
          className="select w-auto"
        >
          <option value="ALL">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Table>
        <THead>
          <tr>
            <TH>รหัส</TH>
            <TH>ชื่อสินค้า</TH>
            <TH>หมวดหมู่</TH>
            <TH className="text-right">คงเหลือ</TH>
            <TH className="text-right">จุดสั่งซื้อ</TH>
            <TH>สถานะ</TH>
            <TH className="text-center">จัดการสต็อก</TH>
            <TH className="text-center">ประวัติ</TH>
          </tr>
        </THead>
        <TBody>
          {filteredProducts.map((p) => {
            const qty = p.stockBalance?.quantityOnHand || 0
            const isLow = qty <= p.reorderPoint

            return (
              <TR key={p.id}>
                <TD className="text-slate-500">{p.code}</TD>
                <TD className="font-semibold text-slate-800">{p.name}</TD>
                <TD className="text-slate-600">{p.category?.name || '-'}</TD>
                <TD className={`text-right font-semibold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                  {qty} {p.baseUnit?.name}
                </TD>
                <TD className="text-right text-slate-500">
                  {p.reorderPoint}
                </TD>
                <TD>
                  {isLow ? (
                    <Badge variant="danger">
                      <AlertTriangle className="w-3 h-3" /> ใกล้หมด
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      <Package className="w-3 h-3" /> ปกติ
                    </Badge>
                  )}
                </TD>
                <TD className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setAdjustProduct(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="ปรับสต็อก">
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDamageProduct(p)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md" title="ตัดของเสีย">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TD>
                <TD className="text-center">
                  <button onClick={() => openHistory(p)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md" title="ดูประวัติความเคลื่อนไหว">
                    <History className="w-4 h-4" />
                  </button>
                </TD>
              </TR>
            )
          })}
          {filteredProducts.length === 0 && (
            <tr><td colSpan={8}><EmptyState icon={Package} title="ไม่พบรายการสินค้า" /></td></tr>
          )}
        </TBody>
      </Table>

      {/* Adjust Stock Modal */}
      {adjustProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdjustStock} className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 font-heading">ปรับปรุงสต็อก (Adjust)</h3>
            <p className="text-sm mb-4">สินค้า: {adjustProduct.name}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">จำนวนที่ปรับ (+/-) หน่วย: {adjustProduct.baseUnit?.name}</label>
              <input type="number" required className="w-full border rounded p-2" value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
              <input type="text" required className="w-full border rounded p-2" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdjustProduct(null)}>ยกเลิก</Button>
              <Button type="submit">ยืนยัน</Button>
            </div>
          </form>
        </div>
      )}

      {/* Damage Stock Modal */}
      {damageProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDamageStock} className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-destructive mb-4 font-heading">ตัดของเสีย (Damage Out)</h3>
            <p className="text-sm mb-4">สินค้า: {damageProduct.name}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">จำนวนที่เสีย (หน่วย: {damageProduct.baseUnit?.name})</label>
              <input type="number" min="0.01" step="0.01" required className="w-full border rounded p-2" value={damageQty} onChange={e => setDamageQty(Number(e.target.value))} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">สาเหตุ</label>
              <input type="text" required className="w-full border rounded p-2" value={damageNote} onChange={e => setDamageNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDamageProduct(null)}>ยกเลิก</Button>
              <Button type="submit" variant="danger">ยืนยันการตัดจ่าย</Button>
            </div>
          </form>
        </div>
      )}

      {/* Slide-over History */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-lg flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-base font-heading font-bold text-slate-800">ประวัติสต็อก</h2>
                <p className="text-sm text-slate-500 mt-0.5">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-slate-200 rounded-md transition-colors bg-white shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : movements.length === 0 ? (
                <EmptyState icon={History} title="ยังไม่มีประวัติความเคลื่อนไหว" />
              ) : (
                <div className="space-y-2">
                  {movements.map((m: any) => {
                    const isOut = m.movementType === 'SALE_OUT' || m.movementType === 'DAMAGE_OUT'
                    return (
                      <div key={m.id} className="card p-3 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOut ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <div className="flex justify-between items-start mb-2 pl-2">
                          <Badge variant={isOut ? "danger" : "success"}>
                            {m.movementType}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(m.createdAt).toLocaleString('th-TH')}
                          </span>
                        </div>
                        <div className="flex justify-between items-end pl-2">
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-slate-700">อ้างอิง: <span className="text-slate-900">{m.refType} {m.refId || '-'}</span></p>
                            <p className="text-xs text-slate-500">โดย: {m.createdBy?.name || '-'}</p>
                          </div>
                          <div className={`text-lg font-bold ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isOut ? '-' : '+'}{Math.abs(m.quantityBase)} <span className="text-xs font-medium text-slate-500">{selectedProduct.baseUnit?.name}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
