"use client"

import React, { useEffect } from "react"
import { Delete } from "lucide-react"
import { cn } from "@/lib/utils"

interface NumpadProps {
  value: string
  onChange: (newValue: string) => void
  onConfirm?: () => void
  grandTotal?: number
  className?: string
}

export function Numpad({
  value,
  onChange,
  onConfirm,
  grandTotal = 0,
  className,
}: NumpadProps) {

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch {
        // Ignore
      }
    }
  }

  const handleKeyPress = (key: string) => {
    triggerHaptic()
    if (key === "C") {
      onChange("")
    } else if (key === "BACKSPACE") {
      onChange(value.slice(0, -1))
    } else if (key === ".") {
      if (!value.includes(".")) {
        onChange(value === "" ? "0." : value + ".")
      }
    } else {
      // Digit / 00
      onChange(value + key)
    }
  }

  // Calculate smart banknote chips based on grandTotal
  const getSmartChips = (total: number) => {
    if (total <= 0) return []
    const roundedInt = Math.ceil(total)
    const chips: number[] = []

    // 1. Exact amount
    chips.push(total)

    // 2. Next nearest 10, 50, 100, 500, 1000
    const nextTen = Math.ceil(roundedInt / 10) * 10
    if (nextTen > total && !chips.includes(nextTen)) chips.push(nextTen)

    const nextFifty = Math.ceil(roundedInt / 50) * 50
    if (nextFifty > total && !chips.includes(nextFifty)) chips.push(nextFifty)

    const nextHundred = Math.ceil(roundedInt / 100) * 100
    if (nextHundred > total && !chips.includes(nextHundred)) chips.push(nextHundred)

    const nextFiveHundred = Math.ceil(roundedInt / 500) * 500
    if (nextFiveHundred > total && !chips.includes(nextFiveHundred)) chips.push(nextFiveHundred)

    const nextThousand = Math.ceil(roundedInt / 1000) * 1000
    if (nextThousand > total && !chips.includes(nextThousand)) chips.push(nextThousand)

    return chips.slice(0, 4)
  }

  const smartChips = getSmartChips(grandTotal)

  // Listen for keyboard input without requiring focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === "input" || activeTag === "textarea") return

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault()
        handleKeyPress(e.key)
      } else if (e.key === ".") {
        e.preventDefault()
        handleKeyPress(".")
      } else if (e.key === "Backspace") {
        e.preventDefault()
        handleKeyPress("BACKSPACE")
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        e.preventDefault()
        handleKeyPress("C")
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (onConfirm) onConfirm()
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [value, grandTotal])

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* Smart Banknote Chips */}
      {grandTotal > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {smartChips.map((chipVal, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                triggerHaptic()
                onChange(chipVal.toString())
              }}
              className="flex h-11 items-center justify-center rounded-xl border-2 border-[#0B63CE] bg-blue-50/60 font-num text-sm font-bold text-[#0B63CE] transition-all hover:bg-[#0B63CE] hover:text-white active:scale-95"
            >
              {i === 0 ? "พอดี" : `฿${chipVal.toLocaleString("th-TH")}`}
            </button>
          ))}
        </div>
      )}

      {/* 7-8-9 Calculator Numpad Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1: 7, 8, 9, Backspace */}
        <button
          type="button"
          onClick={() => handleKeyPress("7")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("8")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("9")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("BACKSPACE")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-red-50 text-[#BE2A2A] shadow-sm transition-all hover:bg-red-100 active:scale-95"
          title="ลบ"
        >
          <Delete className="h-6 w-6" />
        </button>

        {/* Row 2: 4, 5, 6, Clear */}
        <button
          type="button"
          onClick={() => handleKeyPress("4")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("5")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("6")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("C")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-amber-50 font-bold text-[#A85B00] shadow-sm transition-all hover:bg-amber-100 active:scale-95 text-xl"
        >
          C
        </button>

        {/* Row 3: 1, 2, 3, Enter (Spans 2 rows) */}
        <button
          type="button"
          onClick={() => handleKeyPress("1")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("2")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("3")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic()
            if (onConfirm) onConfirm()
          }}
          className="row-span-2 flex h-full items-center justify-center rounded-xl bg-[#0F7A4D] text-2xl font-bold text-white shadow-md transition-all hover:bg-[#0d6841] active:scale-95"
          title="ยืนยันการขาย"
        >
          ⏎
        </button>

        {/* Row 4: 0, 00, . */}
        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("00")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          00
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress(".")}
          className="flex h-[var(--tap-numpad,64px)] items-center justify-center rounded-xl border border-[#DFE4EC] bg-white font-num text-2xl font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          .
        </button>
      </div>
    </div>
  )
}
