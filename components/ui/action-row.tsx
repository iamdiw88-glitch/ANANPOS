"use client"

import React, { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MoneyText, MoneyTone } from "./money-text"
import { Badge } from "./badge"
import { OverflowMenu, OverflowMenuItem } from "./overflow-menu"

export interface ActionRowProps {
  title: string
  subtitle?: string
  metric?: {
    value: number
    unit?: string
    tone?: MoneyTone
  }
  badges?: Array<{
    label: string
    variant?: "success" | "warning" | "danger" | "info" | "neutral"
  }>
  meter?: {
    used: number
    limit: number
  }
  primaryAction?: {
    label: string
    onPress: (e: React.MouseEvent) => void
    disabled?: boolean
  }
  overflowItems?: OverflowMenuItem[]
  onPress?: () => void
  className?: string
  icon?: ReactNode
}

export function ActionRow({
  title,
  subtitle,
  metric,
  badges,
  meter,
  primaryAction,
  overflowItems,
  onPress,
  className,
  icon,
}: ActionRowProps) {
  const isClickable = Boolean(onPress)

  return (
    <div
      onClick={onPress}
      className={cn(
        "relative flex min-h-[var(--row-h,64px)] w-full items-center justify-between gap-4 rounded-xl border border-[#DFE4EC] bg-white p-3.5 shadow-sm transition-all",
        isClickable && "cursor-pointer hover:border-[#0B63CE] hover:shadow-md active:bg-slate-50",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">{icon}</div>}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="truncate text-[17px] font-semibold text-[#0B1220]">{title}</h4>
            {badges?.map((b, i) => (
              <Badge key={i} variant={b.variant || "neutral"} size="sm">
                {b.label}
              </Badge>
            ))}
          </div>
          {subtitle && <p className="truncate text-[14px] text-[#5D6B80]">{subtitle}</p>}

          {meter && (
            <div className="mt-1.5 w-full max-w-[200px]">
              <div className="flex justify-between text-xs font-medium text-slate-500 mb-0.5">
                <span>ใช้วงเงิน</span>
                <span>{Math.round((meter.used / (meter.limit || 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    meter.used > meter.limit
                      ? "bg-[#BE2A2A]"
                      : meter.used / meter.limit >= 0.7
                        ? "bg-[#A85B00]"
                        : "bg-[#0F7A4D]"
                  )}
                  style={{ width: `${Math.min(100, Math.round((meter.used / (meter.limit || 1)) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {metric && (
          <div className="text-right">
            <MoneyText value={metric.value} tone={metric.tone} size="title" />
          </div>
        )}

        {primaryAction && (
          <button
            type="button"
            disabled={primaryAction.disabled}
            onClick={(e) => {
              e.stopPropagation()
              primaryAction.onPress(e)
            }}
            className="inline-flex h-[var(--tap-min,48px)] items-center justify-center rounded-lg bg-[#0B63CE] px-4 font-semibold text-white shadow-sm transition-all hover:bg-[#0A57B4] active:scale-[0.98] disabled:opacity-50"
          >
            {primaryAction.label}
          </button>
        )}

        {overflowItems && overflowItems.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <OverflowMenu items={overflowItems} />
          </div>
        )}
      </div>
    </div>
  )
}
