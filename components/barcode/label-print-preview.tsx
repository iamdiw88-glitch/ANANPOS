"use client"

import { Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarcodeDisplay } from "@/components/products/barcode-display"

export type LabelItem = {
  productId: number
  name: string
  code: string
  barcodeValue: string
  price: string
}

export function LabelPrintPreview({
  labels,
  template = "a4_sheet_24",
  copiesPerItem = 1,
  onClose,
}: {
  labels: LabelItem[]
  template: "a4_sheet_24" | "a4_sheet_12" | "thermal_roll"
  copiesPerItem: number
  onClose: () => void
}) {
  // Expand labels based on copiesPerItem
  const expandedLabels = labels.flatMap((item) =>
    Array.from({ length: copiesPerItem }, () => item)
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm">
      {/* Header controls (hidden when printing) */}
      <div className="print:hidden flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4 text-white">
        <div>
          <h2 className="font-heading text-lg font-bold">ตัวอย่างฉลากบาร์โค้ดสำหรับพิมพ์</h2>
          <p className="text-xs text-slate-300">
            จำนวนทั้งหมด {expandedLabels.length} ดวง | รูปแบบ:{" "}
            {template === "a4_sheet_24"
              ? "กระดาษ A4 (24 ดวง/แผ่น 70x36mm)"
              : template === "a4_sheet_12"
                ? "กระดาษ A4 (12 ดวงใหญ่/แผ่น)"
                : "ม้วนสติกเกอร์ความร้อน (Thermal 58mm)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" className="text-white hover:bg-slate-700" onClick={onClose}>
            <X className="h-4 w-4" />
            ปิด
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            พิมพ์ฉลาก
          </Button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            @page {
              margin: 5mm;
            }
          }
        `}</style>

        {template === "thermal_roll" ? (
          <div className="w-[58mm] flex flex-col gap-3 bg-white p-2 shadow print:shadow-none">
            {expandedLabels.map((label, i) => (
              <div key={i} className="flex flex-col items-center justify-between border border-slate-200 p-2 text-center print:border-none">
                <span className="font-bold text-xs truncate max-w-full">{label.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">SKU: {label.code}</span>
                <BarcodeDisplay value={label.barcodeValue} width={1.5} height={35} displayValue={false} />
                <span className="text-xs font-bold font-mono">฿{label.price}</span>
              </div>
            ))}
          </div>
        ) : template === "a4_sheet_12" ? (
          <div className="w-[210mm] min-h-[297mm] bg-white p-6 shadow grid grid-cols-2 gap-4 auto-rows-max print:shadow-none print:p-0">
            {expandedLabels.map((label, i) => (
              <div key={i} className="flex flex-col items-center justify-between border border-dashed border-slate-300 p-4 rounded text-center">
                <span className="font-bold text-sm line-clamp-1">{label.name}</span>
                <span className="text-xs text-slate-500 font-mono">SKU: {label.code}</span>
                <BarcodeDisplay value={label.barcodeValue} width={2} height={55} displayValue={true} />
                <span className="text-base font-extrabold text-slate-900 font-mono">฿{label.price}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Default A4 24 labels (70x36mm, 3 cols x 8 rows) */
          <div className="w-[210mm] min-h-[297mm] bg-white p-5 shadow grid grid-cols-3 gap-2 auto-rows-max print:shadow-none print:p-0">
            {expandedLabels.map((label, i) => (
              <div key={i} className="h-[36mm] flex flex-col items-center justify-between border border-slate-200 p-1.5 text-center overflow-hidden">
                <span className="font-bold text-[11px] leading-tight line-clamp-1">{label.name}</span>
                <BarcodeDisplay value={label.barcodeValue} width={1.4} height={30} displayValue={false} />
                <div className="flex w-full items-center justify-between px-1 text-[10px] font-mono">
                  <span className="text-slate-500 truncate max-w-[60%]">{label.code}</span>
                  <span className="font-bold text-slate-900">฿{label.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
