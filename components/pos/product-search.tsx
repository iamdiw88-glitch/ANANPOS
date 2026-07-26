"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Boxes,
  ChevronLeft,
  FolderOpen,
  ImageIcon,
  PackagePlus,
  Plus,
  Search,
} from "lucide-react"
import { CategoryCreateButton } from "@/components/inventory/category-create-button"
import { Button } from "@/components/ui/button"

type ActiveCategory = number | "ALL" | null

export function ProductSearch({
  products,
  categories,
  canCreateCatalog = false,
  onSelectProduct,
  onCreateCustomItem,
}: any) {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>(null)
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
        if (typeof activeCategory === "number") {
          params.set("categoryId", String(activeCategory))
        }

        const response = await fetch(`/api/products/search?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = await response.json()
        if (data.success) setResults(data.data)
      } catch {
        if (!controller.signal.aborted) {
          const loweredSearch = search.trim().toLocaleLowerCase("th")
          setResults(products.filter((product: any) => {
            const matchesSearch = !loweredSearch ||
              product.name.toLocaleLowerCase("th").includes(loweredSearch) ||
              product.code.toLocaleLowerCase("th").includes(loweredSearch) ||
              product.searchTags?.toLocaleLowerCase("th").includes(loweredSearch)
            const matchesCategory = typeof activeCategory === "number"
              ? product.categoryId === activeCategory
              : true
            return matchesSearch && matchesCategory
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

  const visibleResults = results.filter((product: any) => {
    if (product.code === "MISC-001") return false
    return typeof activeCategory !== "number" || product.categoryId === activeCategory
  })
  const canCreateCustomItem = search.trim().length > 0
  const isCategoryBrowser = !search.trim() && activeCategory === null
  const activeCategoryName = useMemo(() => {
    if (activeCategory === "ALL") return "สินค้าทั้งหมด"
    return categories.find((category: any) => category.id === activeCategory)?.name || "สินค้า"
  }, [activeCategory, categories])
  const productCount = products.filter((product: any) => product.code !== "MISC-001").length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border bg-white p-3">
        <div className="flex flex-col gap-2 xl:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              id="product-search-input"
              type="search"
              placeholder="ค้นหาชื่อ รหัส คำค้น หรือสแกนบาร์โค้ด (F1)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input h-11 pl-10 pr-4 text-base"
            />
          </div>
          {canCreateCatalog && (
            <div className="flex shrink-0 gap-2">
              <CategoryCreateButton className="h-11 flex-1 whitespace-nowrap xl:flex-none" />
              <Link href="/inventory/products/new" className="flex-1 xl:flex-none">
                <Button className="h-11 w-full whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  เพิ่มสินค้า
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-3 pb-24 scrollbar-thin sm:p-4 sm:pb-4">
        {isCategoryBrowser ? (
          <section aria-labelledby="category-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="category-heading" className="font-heading text-xl font-extrabold text-slate-900">
                  เลือกหมวดหมู่สินค้า
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  แตะหมวดที่ต้องการเพื่อดูสินค้า
                </p>
              </div>
              <span className="hidden text-sm font-semibold text-slate-500 sm:block">
                {categories.length} หมวดหมู่
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              <button
                type="button"
                onClick={() => {
                  setResults(products)
                  setActiveCategory("ALL")
                }}
                className="group relative aspect-[4/3] min-h-32 cursor-pointer overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-700 to-blue-500 text-left shadow-sm transition-all duration-200 hover:border-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
              >
                <Boxes className="absolute -right-5 -top-6 h-28 w-28 text-white/10 transition-transform duration-300 group-hover:-translate-x-1 group-hover:translate-y-1" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-4 pt-12 text-white">
                  <span className="block font-heading text-base font-extrabold">สินค้าทั้งหมด</span>
                  <span className="mt-0.5 block text-xs font-semibold text-blue-100">{productCount} รายการ</span>
                </span>
              </button>

              {categories.map((category: any) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => {
                    setResults(products.filter((product: any) => product.categoryId === category.id))
                    setActiveCategory(category.id)
                  }}
                  className="group relative aspect-[4/3] min-h-32 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                >
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 text-primary/45">
                      <ImageIcon className="h-12 w-12" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-4 pt-12 text-white">
                    <span className="block line-clamp-2 font-heading text-base font-extrabold">{category.name}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-200">
                      {category._count?.products ?? 0} รายการ
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {categories.length === 0 && (
              <div className="mx-auto mt-8 max-w-sm rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <FolderOpen className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 font-bold text-slate-800">ยังไม่มีหมวดหมู่สินค้า</p>
                <p className="mt-1 text-sm text-slate-600">เพิ่มหมวดหมู่แรกเพื่อเริ่มจัดสินค้าให้ค้นหาได้ง่ายขึ้น</p>
              </div>
            )}
          </section>
        ) : (
          <section aria-labelledby="product-heading">
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setActiveCategory(null)
                }}
                className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary/40 hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft className="h-4 w-4" />
                หมวดหมู่
              </button>
              <div className="min-w-0">
                <h2 id="product-heading" className="truncate font-heading text-lg font-extrabold text-slate-900">
                  {search.trim() ? `ผลการค้นหา “${search.trim()}”` : activeCategoryName}
                </h2>
                <p className="text-xs font-semibold text-slate-500">{visibleResults.length} รายการ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visibleResults.map((product: any) => {
                const defaultUnit = product.productUnits.find((unit: any) => unit.isDefaultSale) || product.productUnits[0]
                const price = defaultUnit?.price || 0
                const stock = product.stockBalance?.quantityOnHand || 0
                const isOut = product.isStockItem && stock <= 0
                const isLow = product.isStockItem && !isOut && stock <= product.reorderPoint

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="group relative flex min-h-52 cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                  >
                    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 text-slate-300">
                          <ImageIcon className="h-11 w-11" />
                        </span>
                      )}
                      {(isOut || isLow) && (
                        <span className={`absolute right-2 top-2 rounded-md px-2 py-1 text-[11px] font-extrabold text-white shadow-sm ${
                          isOut ? "bg-red-700" : "bg-amber-600"
                        }`}>
                          {isOut ? "สินค้าหมด" : "ใกล้หมด"}
                        </span>
                      )}
                    </span>

                    <span className="flex flex-1 flex-col p-3">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{product.code}</span>
                      <span className="mt-1 line-clamp-2 flex-1 font-heading text-sm font-bold leading-snug text-slate-900">
                        {product.name}
                      </span>
                      <span className="mt-3 flex w-full items-end justify-between gap-2">
                        <span className="text-lg font-extrabold text-primary">
                          ฿{Number(price).toLocaleString("th-TH", { maximumFractionDigits: 2 })}
                        </span>
                        {product.isStockItem && (
                          <span className={`text-xs font-bold ${
                            isOut ? "text-red-700" : isLow ? "text-amber-700" : "text-slate-500"
                          }`}>
                            เหลือ {stock}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            {isLoading && (
              <div className="mt-4 text-center text-sm font-medium text-slate-600">กำลังค้นหา...</div>
            )}

            {!isLoading && visibleResults.length === 0 && (
              <div className="mx-auto mt-10 max-w-sm rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div className="text-sm font-bold text-slate-900">ไม่พบสินค้าในระบบ</div>
                <div className="mt-1 text-xs text-slate-600">
                  เพิ่มเป็นรายการขายเฉพาะบิลนี้ โดยไม่ตัดสต็อก
                </div>
                <button
                  type="button"
                  disabled={!canCreateCustomItem}
                  onClick={() => onCreateCustomItem(search.trim())}
                  className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  เพิ่มสินค้านอกระบบ
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
