"use client"

import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"

export function BarcodeDisplay({
  value,
  width = 2,
  height = 50,
  displayValue = true,
  className = "",
}: {
  value: string
  width?: number
  height?: number
  displayValue?: boolean
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current || !value) return
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width,
        height,
        displayValue,
        fontSize: 12,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      })
    } catch (err) {
      console.warn("JsBarcode error rendering CODE128 for value:", value, err)
    }
  }, [value, width, height, displayValue])

  if (!value) {
    return <span className="text-xs text-slate-400">ไม่มีข้อมูลบาร์โค้ด</span>
  }

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1 rounded border border-slate-200 ${className}`}>
      <svg ref={svgRef} />
    </div>
  )
}
