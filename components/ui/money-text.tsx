"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type MoneyTone = "cash" | "credit" | "overdue" | "neutral" | "default"
export type MoneySize = "display" | "metric" | "title" | "body" | "caption"

interface MoneyTextProps {
  value: number
  tone?: MoneyTone
  size?: MoneySize
  showCurrency?: boolean
  className?: string
}

export function MoneyText({
  value,
  tone = "default",
  size = "body",
  showCurrency = true,
  className,
}: MoneyTextProps) {
  const formatted = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)

  const toneClasses: Record<MoneyTone, string> = {
    cash: "text-[#0F7A4D]",
    credit: "text-[#A85B00]",
    overdue: "text-[#BE2A2A]",
    neutral: "text-[#5D6B80]",
    default: "text-slate-900",
  }

  const sizeClasses: Record<MoneySize, string> = {
    display: "text-[34px] font-extrabold leading-[1.30]",
    metric: "text-[28px] font-bold leading-[1.25]",
    title: "text-[22px] font-bold leading-[1.45]",
    body: "text-[16px] font-semibold leading-[1.70]",
    caption: "text-[14px] font-medium leading-[1.55]",
  }

  return (
    <span
      className={cn(
        "font-num inline-block text-right tracking-tight tabular-nums",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {showCurrency && <span className="mr-0.5 text-[0.85em] font-normal">฿</span>}
      {formatted}
    </span>
  )
}
