"use client"

import React from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type QtyTone = "cash" | "credit" | "overdue" | "neutral" | "auto"

interface QtyUnitProps {
  qty: number
  unit: string
  tone?: QtyTone
  showWarningIcon?: boolean
  className?: string
}

export function QtyUnit({
  qty,
  unit,
  tone = "auto",
  showWarningIcon = true,
  className,
}: QtyUnitProps) {
  // Format whole numbers without decimals (e.g. 5 instead of 5.00), keep decimals if fractional
  const formattedQty =
    Number.isInteger(qty)
      ? qty.toLocaleString("th-TH")
      : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(qty)

  let resolvedTone = tone
  if (tone === "auto") {
    if (qty < 0) resolvedTone = "overdue"
    else if (qty === 0) resolvedTone = "credit"
    else resolvedTone = "cash"
  }

  const toneClasses: Record<QtyTone, string> = {
    cash: "text-[#0F7A4D]",
    credit: "text-[#A85B00]",
    overdue: "text-[#BE2A2A] font-bold",
    neutral: "text-slate-600",
    auto: "text-slate-900",
  }

  const isNegative = qty < 0

  return (
    <span
      className={cn(
        "font-num inline-flex items-center gap-1 tabular-nums",
        toneClasses[resolvedTone],
        className
      )}
    >
      {isNegative && showWarningIcon && (
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#BE2A2A] animate-pulse" />
      )}
      <span>{formattedQty}</span>
      <span className="text-[0.9em] font-normal text-slate-500">{unit || "ชิ้น"}</span>
    </span>
  )
}
