"use client"

import React, { useEffect, ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footerAction?: ReactNode
  className?: string
}

export function AppSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerAction,
  className,
}: AppSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 xl:items-stretch">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container: SidePanel on >=1280px, BottomSheet on <1280px */}
      <div
        className={cn(
          "relative z-10 flex h-auto max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-[#DFE4EC] bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 xl:h-full xl:max-h-none xl:w-[480px] xl:rounded-none xl:border-l xl:border-t-0 xl:slide-in-from-right",
          className
        )}
      >
        {/* Grab Handle for Touch Bottom Sheet */}
        <div className="flex h-4 w-full items-center justify-center pt-2 xl:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#DFE4EC] p-4">
          <div>
            <h3 className="text-lg font-bold text-[#0B1220]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-[#5D6B80]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target-extend flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
          {children}
        </div>

        {/* Sticky Footer */}
        {footerAction && (
          <div className="sticky bottom-0 border-t border-[#DFE4EC] bg-white p-4 shadow-lg">
            {footerAction}
          </div>
        )}
      </div>
    </div>
  )
}
