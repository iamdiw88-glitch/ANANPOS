"use client"

import Image from "next/image"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  History,
  ImageIcon,
  LoaderCircle,
  Package,
  PackagePlus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"

export function InventoryClient({
  products,
  categories,
  canAdjustStock = false,
}: {
  products: any[]
  categories: any[]
  canAdjustStock?: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState<number | "ALL" | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState("")

  const [damageProduct, setDamageProduct] = useState<any | null>(null)
  const [damageQty, setDamageQty] = useState(0)
  const [damageNote, setDamageNote] = useState("")
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false)
  const [quickStockProductId, setQuickStockProductId] = useState<number | "">(products[0]?.id || "")
  const [quickStockQty, setQuickStockQty] = useState(1)
  const [quickStockNote, setQuickStockNote] = useState("")
  const [quickStockError, setQuickStockError] = useState("")
  const [stockActionLoading, setStockActionLoading] = useState<"quick" | "adjust" | "damage" | null>(null)

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const normalizedSearch = search.trim().toLocaleLowerCase("th")
      const matchSearch = !normalizedSearch ||
        p.name.toLocaleLowerCase("th").includes(normalizedSearch) ||
        p.code.toLocaleLowerCase("th").includes(normalizedSearch) ||
        p.searchTags?.toLocaleLowerCase("th").includes(normalizedSearch)
      const matchCat = catFilter === "ALL" || catFilter === null || p.categoryId === catFilter
      return matchSearch && matchCat
    })
  }, [products, search, catFilter])
  const showCategoryBrowser = !search.trim() && catFilter === null
  const quickStockProduct = products.find((product) => product.id === quickStockProductId)

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
    setStockActionLoading("adjust")
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: adjustProduct.id, quantityBase: adjustQty, note: adjustNote })
      })
      if (res.ok) {
        setAdjustProduct(null)
        setAdjustQty(0)
        setAdjustNote("")
        toast.success(`ปรับสต็อก ${adjustProduct.name} สำเร็จ`)
        router.refresh()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || "ปรับสต็อกไม่สำเร็จ")
      }
    } catch {
      alert("เชื่อมต่อระบบไม่สำเร็จ")
    } finally {
      setStockActionLoading(null)
    }
  }

  const handleDamageStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!damageProduct) return
    setStockActionLoading("damage")
    try {
      const res = await fetch('/api/stock/damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: damageProduct.id, quantityBase: damageQty, note: damageNote })
      })
      if (res.ok) {
        setDamageProduct(null)
        setDamageQty(0)
        setDamageNote("")
        toast.success(`ตัดของเสีย ${damageProduct.name} สำเร็จ`)
        router.refresh()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || "ตัดของเสียไม่สำเร็จ")
      }
    } catch {
      alert("เชื่อมต่อระบบไม่สำเร็จ")
    } finally {
      setStockActionLoading(null)
    }
  }

  const openQuickStock = () => {
    setQuickStockProductId(products[0]?.id || "")
    setQuickStockQty(1)
    setQuickStockNote("")
    setQuickStockError("")
    setIsQuickStockOpen(true)
  }

  const handleQuickStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickStockProductId || quickStockQty <= 0) return
    setStockActionLoading("quick")
    setQuickStockError("")

    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: quickStockProductId,
          quantityBase: quickStockQty,
          note: quickStockNote.trim() || "เพิ่มสต็อกจากหน้าสต็อก",
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setQuickStockError(data?.error || "เพิ่มสต็อกไม่สำเร็จ")
        return
      }

      setIsQuickStockOpen(false)
      setQuickStockQty(1)
      setQuickStockNote("")
      toast.success(`เพิ่มสต็อก ${quickStockProduct?.name || "สินค้า"} สำเร็จ`)
      router.refresh()
    } catch {
      setQuickStockError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setStockActionLoading(null)
    }
  }

  return (
    <div className="card overflow-hidden p-0 relative">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border bg-slate-50 p-3 sm:flex-row">
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
          value={catFilter === null ? "" : catFilter}
          onChange={(e) => {
            if (e.target.value === "") setCatFilter(null)
            else setCatFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
          }}
          className="select w-full sm:w-auto"
          aria-label="เลือกหมวดหมู่สินค้า"
        >
          <option value="">เลือกจากหมวดหมู่</option>
          <option value="ALL">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {showCategoryBrowser ? (
        <section className="bg-slate-50/70 p-4 sm:p-5" aria-labelledby="stock-category-heading">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 id="stock-category-heading" className="font-heading text-xl font-extrabold text-slate-900">
                เลือกหมวดหมู่เพื่อดูสต็อก
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                ดูจำนวนสินค้าและจัดการสต็อกแยกตามหมวดหมู่
              </p>
            </div>
            {canAdjustStock && (
              <Button type="button" onClick={openQuickStock} disabled={products.length === 0} className="shrink-0">
                <PackagePlus className="h-4 w-4" />
                เพิ่มสต็อก
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <button
              type="button"
              onClick={() => setCatFilter("ALL")}
              className="group relative aspect-[4/3] min-h-32 cursor-pointer overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-700 to-blue-500 text-left shadow-sm transition-all duration-200 hover:border-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
            >
              <Boxes className="absolute -right-5 -top-5 h-24 w-24 text-white/10 transition-transform duration-300 group-hover:-translate-x-1 group-hover:translate-y-1" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent p-3 pt-10 text-white">
                <span className="block font-heading font-extrabold">สินค้าทั้งหมด</span>
                <span className="mt-0.5 block text-xs font-semibold text-blue-100">{products.length} รายการ</span>
              </span>
            </button>

            {categories.map((category) => {
              const categoryCount = products.filter((product) => product.categoryId === category.id).length
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setCatFilter(category.id)}
                  className="group relative aspect-[4/3] min-h-32 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                >
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 text-primary/40">
                      <ImageIcon className="h-10 w-10" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 pt-10 text-white">
                    <span className="block line-clamp-2 font-heading font-extrabold">{category.name}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-200">{categoryCount} รายการ</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setCatFilter(null)
                }}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary/40 hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft className="h-4 w-4" />
                หมวดหมู่
              </button>
              <p className="truncate text-sm font-bold text-slate-800">
                {search.trim()
                  ? `ผลการค้นหา “${search.trim()}”`
                  : catFilter === "ALL"
                    ? "สินค้าทั้งหมด"
                    : categories.find((category) => category.id === catFilter)?.name}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{filteredProducts.length} รายการ</span>
          </div>

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
                const isOut = qty <= 0
                const isLow = !isOut && qty <= p.reorderPoint

                return (
                  <TR key={p.id}>
                    <TD className="text-slate-500">{p.code}</TD>
                    <TD>
                      <div className="flex min-w-52 items-center gap-3">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {p.imageUrl ? (
                            <Image
                              src={p.imageUrl}
                              alt=""
                              fill
                              unoptimized
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-slate-400">
                              <ImageIcon className="h-5 w-5" />
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                      </div>
                    </TD>
                    <TD className="text-slate-600">{p.category?.name || "-"}</TD>
                    <TD className={`text-right font-semibold ${isOut ? "text-red-700" : isLow ? "text-amber-600" : "text-slate-800"}`}>
                      {qty} {p.baseUnit?.name}
                    </TD>
                    <TD className="text-right text-slate-500">{p.reorderPoint}</TD>
                    <TD>
                      {isOut ? (
                        <Badge variant="danger">
                          <AlertTriangle className="h-3 w-3" /> หมด
                        </Badge>
                      ) : isLow ? (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3" /> ใกล้หมด
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <Package className="h-3 w-3" /> ปกติ
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-center">
                      {canAdjustStock ? (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setAdjustProduct(p)} className="cursor-pointer rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="ปรับสต็อก">
                            <Settings2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDamageProduct(p)} className="cursor-pointer rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" title="ตัดของเสีย">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TD>
                    <TD className="text-center">
                      <button onClick={() => openHistory(p)} className="cursor-pointer rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="ดูประวัติความเคลื่อนไหว">
                        <History className="h-4 w-4" />
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
        </>
      )}

      {/* Quick add stock modal */}
      {isQuickStockOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !stockActionLoading) {
              setIsQuickStockOpen(false)
            }
          }}
        >
          <form
            onSubmit={handleQuickStock}
            className="modal max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-stock-title"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="quick-stock-title" className="font-heading text-lg font-extrabold text-slate-900">
                  เพิ่มสต็อกสินค้า
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-600">เลือกสินค้าและระบุจำนวนที่รับเข้า</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickStockOpen(false)}
                disabled={stockActionLoading === "quick"}
                aria-label="ปิด"
                className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="quick-stock-product" className="mb-1.5 block text-sm font-bold text-slate-800">
                  สินค้า
                </label>
                <select
                  id="quick-stock-product"
                  required
                  value={quickStockProductId}
                  onChange={(event) => setQuickStockProductId(Number(event.target.value))}
                  className="select"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} — {product.name}
                    </option>
                  ))}
                </select>
                {quickStockProduct && (
                  <p className="mt-1.5 text-xs font-semibold text-slate-600">
                    คงเหลือปัจจุบัน {quickStockProduct.stockBalance?.quantityOnHand || 0} {quickStockProduct.baseUnit?.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quick-stock-quantity" className="mb-1.5 block text-sm font-bold text-slate-800">
                  จำนวนที่เพิ่ม ({quickStockProduct?.baseUnit?.name || "หน่วยฐาน"})
                </label>
                <input
                  id="quick-stock-quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={quickStockQty}
                  onChange={(event) => setQuickStockQty(Number(event.target.value))}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="quick-stock-note" className="mb-1.5 block text-sm font-bold text-slate-800">
                  หมายเหตุ <span className="font-medium text-slate-500">(ไม่บังคับ)</span>
                </label>
                <input
                  id="quick-stock-note"
                  type="text"
                  value={quickStockNote}
                  onChange={(event) => setQuickStockNote(event.target.value)}
                  placeholder="เช่น รับของเข้าจากผู้จำหน่าย"
                  className="input"
                />
              </div>

              {quickStockError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                  {quickStockError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsQuickStockOpen(false)}
                disabled={stockActionLoading === "quick"}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={!quickStockProductId || quickStockQty <= 0 || stockActionLoading === "quick"}
              >
                {stockActionLoading === "quick" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="h-4 w-4" />
                )}
                {stockActionLoading === "quick" ? "กำลังเพิ่ม..." : "ยืนยันเพิ่มสต็อก"}
              </Button>
            </div>
          </form>
        </div>
      )}

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
              <Button type="button" variant="ghost" onClick={() => setAdjustProduct(null)} disabled={stockActionLoading === "adjust"}>ยกเลิก</Button>
              <Button type="submit" disabled={stockActionLoading === "adjust"}>
                {stockActionLoading === "adjust" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {stockActionLoading === "adjust" ? "กำลังบันทึก..." : "ยืนยัน"}
              </Button>
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
              <Button type="button" variant="ghost" onClick={() => setDamageProduct(null)} disabled={stockActionLoading === "damage"}>ยกเลิก</Button>
              <Button type="submit" variant="danger" disabled={stockActionLoading === "damage"}>
                {stockActionLoading === "damage" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {stockActionLoading === "damage" ? "กำลังบันทึก..." : "ยืนยันการตัดจ่าย"}
              </Button>
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
