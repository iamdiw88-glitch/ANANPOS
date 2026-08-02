"use client"

import { useState, useMemo } from "react"
import { Search, Printer, CheckSquare, Square, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { toast } from "sonner"
import { BarcodeDisplay } from "@/components/products/barcode-display"
import { resolveBarcodeValue } from "@/lib/barcode-utils"
import { LabelPrintPreview, LabelItem } from "@/components/barcode/label-print-preview"

export function BarcodeLabelsClient({ products, categories }: { products: any[]; categories: any[] }) {
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState<number | "ALL">("ALL")
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [template, setTemplate] = useState<"a4_sheet_24" | "a4_sheet_12" | "thermal_roll">("a4_sheet_24")
  const [copiesPerItem, setCopiesPerItem] = useState(1)

  const [previewLabels, setPreviewLabels] = useState<LabelItem[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
      const matchCat = catFilter === "ALL" || p.categoryId === catFilter
      return matchSearch && matchCat
    })
  }, [products, search, catFilter])

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleGenerateLabels = async () => {
    if (selectedIds.length === 0) {
      toast.error("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ")
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch("/api/barcode-labels/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedIds,
          template,
          copiesPerItem,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถเตรียมข้อมูลฉลากได้")
      }

      setPreviewLabels(data.labels)
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการสร้างฉลาก")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action panel */}
      <div className="card p-5 bg-slate-900 text-white flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/30 text-blue-400">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-extrabold">พิมพ์ฉลากบาร์โค้ดสินค้า (Batch Label Printing)</h2>
            <p className="text-xs text-slate-300">
              เลือกรายการสินค้า กำหนดรูปแบบฉลาก และจำนวนดวงพิมพ์พร้อมกัน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as any)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="a4_sheet_24">A4 (24 ดวง/แผ่น 70x36mm)</option>
            <option value="a4_sheet_12">A4 (12 ดวงใหญ่/แผ่น)</option>
            <option value="thermal_roll">ม้วนสติกเกอร์ (Thermal 58mm)</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-300">จำนวน/ชิ้น:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={copiesPerItem}
              onChange={(e) => setCopiesPerItem(Math.max(1, Number(e.target.value)))}
              className="w-14 rounded bg-slate-900 px-2 py-1 text-center text-xs font-bold text-white focus:outline-none"
            />
          </div>

          <Button type="button" onClick={handleGenerateLabels} disabled={isGenerating || selectedIds.length === 0}>
            <Printer className="h-4 w-4" />
            {isGenerating ? "กำลังสร้าง..." : `ดูตัวอย่างฉลาก (${selectedIds.length})`}
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="card p-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
          className="select w-full sm:w-auto"
        >
          <option value="ALL">หมวดหมู่ทั้งหมด</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products table */}
      <div className="card overflow-hidden p-0">
        <Table>
          <THead>
            <TR>
              <TH className="w-12">
                <button type="button" onClick={toggleSelectAll} className="cursor-pointer">
                  {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </TH>
              <TH>ชื่อสินค้า / SKU</TH>
              <TH>หมวดหมู่</TH>
              <TH>บาร์โค้ด</TH>
              <TH>ราคาขาย</TH>
            </TR>
          </THead>
          <TBody>
            {filteredProducts.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-slate-500">
                  ไม่พบสินค้าที่ตรงกับเงื่อนไข
                </TD>
              </TR>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id)
                const barcodeValue = resolveBarcodeValue(p)
                const defaultUnit = p.productUnits?.[0]
                const price = defaultUnit ? defaultUnit.price.toLocaleString("th-TH") : "0"

                return (
                  <TR key={p.id} className={isSelected ? "bg-blue-50/50" : undefined}>
                    <TD>
                      <button type="button" onClick={() => toggleSelect(p.id)} className="cursor-pointer">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-300" />
                        )}
                      </button>
                    </TD>
                    <TD>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="font-mono text-xs text-slate-500">SKU: {p.code}</div>
                    </TD>
                    <TD className="text-xs text-slate-600">{p.category?.name || "-"}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <BarcodeDisplay value={barcodeValue} width={1.2} height={25} displayValue={false} />
                        <span className="font-mono text-xs text-slate-600">{barcodeValue}</span>
                      </div>
                    </TD>
                    <TD className="font-bold text-slate-900">฿{price}</TD>
                  </TR>
                )
              })
            )}
          </TBody>
        </Table>
      </div>

      {/* Preview Modal */}
      {previewLabels && (
        <LabelPrintPreview
          labels={previewLabels}
          template={template}
          copiesPerItem={copiesPerItem}
          onClose={() => setPreviewLabels(null)}
        />
      )}
    </div>
  )
}
