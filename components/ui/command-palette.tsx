"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  ShoppingCart,
  Truck,
  Package,
  Users,
  FileText,
  Printer,
  Settings,
  RotateCcw,
  BarChart3,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandItem {
  id: string
  title: string
  category: "หน้าส่วนตัว" | "คำสั่งรวดเร็ว" | "ค้นหา"
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!isOpen) return null

  const items: CommandItem[] = [
    {
      id: "pos",
      title: "ขายของ (POS)",
      category: "หน้าส่วนตัว",
      icon: ShoppingCart,
      action: () => router.push("/pos"),
    },
    {
      id: "delivery",
      title: "คิวจัดส่ง (Delivery Board)",
      category: "หน้าส่วนตัว",
      icon: Truck,
      action: () => router.push("/delivery"),
    },
    {
      id: "inventory",
      title: "สินค้าและสต็อก (Inventory)",
      category: "หน้าส่วนตัว",
      icon: Package,
      action: () => router.push("/inventory"),
    },
    {
      id: "customers",
      title: "ลูกค้าและลูกหนี้ (Customers)",
      category: "หน้าส่วนตัว",
      icon: Users,
      action: () => router.push("/delivery-customers"),
    },
    {
      id: "bills",
      title: "รวมบิลทั้งหมด (Reports Bills)",
      category: "หน้าส่วนตัว",
      icon: FileText,
      action: () => router.push("/reports/bills"),
    },
    {
      id: "print",
      title: "ระบบเครื่องพิมพ์ (Print History)",
      category: "หน้าส่วนตัว",
      icon: Printer,
      action: () => router.push("/print-history"),
    },
    {
      id: "barcode",
      title: "พิมพ์ฉลากบาร์โค้ด (Barcode Labels)",
      category: "หน้าส่วนตัว",
      icon: Sparkles,
      action: () => router.push("/barcode-labels"),
    },
  ]

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-[15vh]">
      <div
        className="fixed inset-0"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[#DFE4EC] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center border-b border-[#DFE4EC] px-4 py-3">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="พิมพ์คำสั่ง ค้นหาหน้า หรือข้อมูลในระบบ (⌘K)..."
            className="flex-1 bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              ไม่พบคำสั่งสำหรับ &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    item.action()
                  }}
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-blue-50/60 active:bg-blue-100"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-800">
                    {item.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.category}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#DFE4EC] bg-slate-50 px-4 py-2 text-xs text-slate-500">
          <span>กด <strong>Esc</strong> เพื่อปิด</span>
          <span>กด <strong>Ctrl+Shift+D</strong> เพื่อสลับโหมด</span>
        </div>
      </div>
    </div>
  )
}
