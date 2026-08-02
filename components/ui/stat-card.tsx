"use client"

import React, { ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { MoneyText, MoneyTone } from "./money-text"

export type StatCardVariant = "hero" | "default" | "inline"
export type ExtendedTone = MoneyTone | "success" | "warning" | "danger"

interface StatCardProps {
  title?: string
  label?: string
  value: number | string
  unit?: string
  icon?: LucideIcon | ReactNode
  deltaText?: string
  tone?: ExtendedTone
  variant?: StatCardVariant
  onClick?: () => void
  className?: string
  isMoney?: boolean
}

export function StatCard({
  title,
  label,
  value,
  unit,
  icon: Icon,
  deltaText,
  tone = "default",
  variant = "default",
  onClick,
  className,
  isMoney = true,
}: StatCardProps) {
  const displayTitle = title || label || ""
  const isClickable = Boolean(onClick)

  let resolvedTone: MoneyTone = "default"
  if (tone === "success" || tone === "cash") resolvedTone = "cash"
  else if (tone === "warning" || tone === "credit") resolvedTone = "credit"
  else if (tone === "danger" || tone === "overdue") resolvedTone = "overdue"
  else if (tone === "neutral") resolvedTone = "neutral"

  const renderIcon = () => {
    if (!Icon) return null
    if (React.isValidElement(Icon)) return Icon
    if (typeof Icon === "function") {
      const Component = Icon as LucideIcon
      return <Component className="h-5 w-5" />
    }
    return null
  }

  if (variant === "inline") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex items-center justify-between rounded-lg border border-[#DFE4EC] bg-white p-3 transition-all",
          isClickable && "cursor-pointer hover:border-[#0B63CE] hover:shadow-sm",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-slate-500 shrink-0">{renderIcon()}</div>
          <span className="text-sm font-medium text-slate-600 truncate">{displayTitle}</span>
        </div>
        <div className="flex items-baseline gap-1">
          {typeof value === "number" && isMoney ? (
            <MoneyText value={value} tone={resolvedTone} size="title" />
          ) : (
            <span className="font-num text-lg font-bold text-slate-900">{value}</span>
          )}
          {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
        </div>
      </div>
    )
  }

  const isHero = variant === "hero"

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#DFE4EC] bg-white p-4 shadow-sm transition-all",
        isHero && "border-[#0B63CE]/30 bg-gradient-to-br from-white via-blue-50/20 to-white shadow-md p-5",
        isClickable && "cursor-pointer hover:-translate-y-0.5 hover:border-[#0B63CE] hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-sm font-medium text-slate-600", isHero && "text-base font-semibold text-slate-800")}>
          {displayTitle}
        </span>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600",
              isHero && "h-12 w-12 bg-[#0B63CE]/10 text-[#0B63CE]"
            )}
          >
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        {typeof value === "number" && isMoney ? (
          <MoneyText value={value} tone={resolvedTone} size={isHero ? "display" : "metric"} />
        ) : (
          <span className={cn("font-num font-bold text-slate-900 tabular-nums", isHero ? "text-[34px]" : "text-[28px]")}>
            {value}
          </span>
        )}
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>

      {deltaText && (
        <div className="mt-2 text-xs font-medium text-slate-500">
          {deltaText}
        </div>
      )}
    </div>
  )
}
