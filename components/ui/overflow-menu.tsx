"use client"

import React, { useState } from "react"
import { MoreHorizontal, LucideIcon } from "lucide-react"
import { useDensity } from "@/hooks/use-density"
import { cn } from "@/lib/utils"

export interface OverflowMenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface OverflowMenuProps {
  items: OverflowMenuItem[]
  className?: string
}

export function OverflowMenu({ items, className }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isTouch } = useDensity()

  if (!items || items.length === 0) return null

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="touch-target-extend flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition-colors"
        title="ตัวเลือกเพิ่มเติม"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          />

          {/* Menu Dropdown / Panel */}
          <div
            className={cn(
              "absolute right-0 z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-[#DFE4EC] bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150",
              isTouch && "fixed bottom-0 inset-x-0 mt-0 rounded-t-2xl rounded-b-none border-t border-x-0 p-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
            )}
          >
            {isTouch && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />}

            <div className="space-y-1">
              {items.map((item, idx) => {
                const Icon = item.icon
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                      item.onSelect()
                    }}
                    className={cn(
                      "flex h-12 w-full items-center gap-3 rounded-lg px-3.5 text-left text-sm font-semibold transition-colors disabled:opacity-40",
                      item.danger
                        ? "text-[#BE2A2A] hover:bg-[#FCEDED]"
                        : "text-slate-800 hover:bg-slate-100 active:bg-slate-200"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
