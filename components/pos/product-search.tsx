"use client"

import { useEffect, useState } from "react"
import { PackagePlus, Search } from "lucide-react"

export function ProductSearch({ products, categories, onSelectProduct, onCreateCustomItem }: any) {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [results, setResults] = useState(products)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setResults(products)
  }, [products])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsLoading(true)

      try {
        const params = new URLSearchParams({ limit: "48" })
        if (search.trim()) params.set("q", search.trim())
        if (activeCategory) params.set("categoryId", String(activeCategory))

        const res = await fetch(`/api/products/search?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.success) setResults(data.data)
      } catch {
        if (!controller.signal.aborted) {
          const loweredSearch = search.trim().toLowerCase()
          setResults(products.filter((p: any) => {
            const matchSearch = !loweredSearch ||
              p.name.toLowerCase().includes(loweredSearch) ||
              p.code.toLowerCase().includes(loweredSearch) ||
              p.searchTags?.toLowerCase().includes(loweredSearch)
            const matchCat = activeCategory ? p.categoryId === activeCategory : true
            return matchSearch && matchCat
          }).slice(0, 48))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [activeCategory, products, search])

  const visibleResults = results.filter((product: any) => product.code !== "MISC-001")
  const canCreateCustomItem = search.trim().length > 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="product-search-input"
            type="text"
            placeholder="ค้นหาสินค้าด้วยชื่อ, รหัส, คำค้น, barcode (F1)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input h-11 pl-10 pr-4 text-base"
          />
        </div>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`h-9 rounded-md border px-4 text-sm font-semibold transition-colors ${
            activeCategory === null
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-border bg-white text-slate-600 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          ทั้งหมด
        </button>
        {categories.map((cat: any) => (
          <button
            type="button"
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`h-9 rounded-md border px-4 text-sm font-semibold transition-colors ${
              activeCategory === cat.id
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-border bg-white text-slate-600 hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-background p-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleResults.map((p: any) => {
            const defaultUnit = p.productUnits.find((u: any) => u.isDefaultSale) || p.productUnits[0]
            const price = defaultUnit?.price || 0
            const stock = p.stockBalance?.quantityOnHand || 0
            const isOut = p.isStockItem && stock <= 0
            const isLow = p.isStockItem && !isOut && stock <= p.reorderPoint

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProduct(p)}
                className="card relative flex min-h-[110px] flex-col overflow-hidden p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
              >
                {(isOut || isLow) && (
                  <div className={`absolute right-0 top-0 rounded-bl-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${isOut ? "bg-red-700" : "bg-amber-500"}`}>
                    {isOut ? "หมด" : "ใกล้หมด"}
                  </div>
                )}
                <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{p.code}</span>
                <span className="mb-3 flex-1 text-sm font-heading font-semibold leading-tight text-slate-800">{p.name}</span>
                <div className="mt-auto flex w-full items-end justify-between">
                  <span className="text-lg font-bold text-primary">฿{price}</span>
                  {p.isStockItem && (
                    <span className={`text-xs font-semibold ${isOut ? "text-red-700" : isLow ? "text-amber-600" : "text-slate-400"}`}>
                      เหลือ {stock}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {isLoading && (
          <div className="mt-3 text-center text-sm text-slate-500">กำลังค้นหา...</div>
        )}

        {!isLoading && visibleResults.length === 0 && (
          <div className="mx-auto mt-10 max-w-sm rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-slate-800">ไม่พบสินค้าในระบบ</div>
            <div className="mt-1 text-xs text-slate-500">เพิ่มเป็นรายการขายเฉพาะบิลนี้ โดยไม่ตัดสต็อก</div>
            <button
              type="button"
              disabled={!canCreateCustomItem}
              onClick={() => onCreateCustomItem(search.trim())}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              เพิ่มสินค้านอกระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
