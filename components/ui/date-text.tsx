"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface DateTextProps {
  value: Date | string | number | null | undefined
  format?: "date" | "datetime" | "time" | "relative"
  className?: string
}

export function DateText({ value, format = "date", className }: DateTextProps) {
  if (!value) return <span className={cn("text-slate-400", className)}>-</span>

  const dateObj = typeof value === "object" ? value : new Date(value)
  if (isNaN(dateObj.getTime())) {
    return <span className={cn("text-slate-400", className)}>-</span>
  }

  let formatted = ""
  if (format === "date") {
    formatted = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(dateObj)
  } else if (format === "datetime") {
    formatted = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj)
  } else if (format === "time") {
    formatted = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj)
  } else {
    formatted = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(dateObj)
  }

  return (
    <span className={cn("font-num tracking-tight tabular-nums text-slate-700", className)}>
      {formatted}
    </span>
  )
}
