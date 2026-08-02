"use client"

import React, { ReactNode } from "react"
import { Inbox, SearchX, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type EmptyStateVariant = "no-data" | "no-results"

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  body?: string
  icon?: LucideIcon | ReactNode
  action?: {
    label: string
    onPress: () => void
  }
  className?: string
}

export function EmptyState({
  variant = "no-data",
  title,
  body,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  const isNoResults = variant === "no-results"
  const defaultTitle = isNoResults ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีข้อมูลในระบบ"
  const defaultBody = isNoResults
    ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง แล้วค้นหาใหม่อีกครั้ง"
    : "เริ่มต้นเพิ่มรายการใหม่ในระบบเพื่อเริ่มใช้งาน"

  const DefaultIcon = isNoResults ? SearchX : Inbox

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#DFE4EC] bg-slate-50/50 p-8 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
        {Icon ? (
          React.isValidElement(Icon) ? (
            Icon
          ) : (
            // @ts-ignore
            <Icon className="h-7 w-7" />
          )
        ) : (
          <DefaultIcon className="h-7 w-7" />
        )}
      </div>

      <h3 className="text-base font-bold text-slate-800">{title || defaultTitle}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body || defaultBody}</p>

      {action && (
        <button
          type="button"
          onClick={action.onPress}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-[#0B63CE] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0A57B4] active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
