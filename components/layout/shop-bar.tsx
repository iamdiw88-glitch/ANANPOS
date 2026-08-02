"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Printer,
  Zap,
  WifiOff,
  Search,
  User,
  LogOut,
  Lock,
  KeyRound,
  ChevronDown,
  Clock,
  Wallet,
} from "lucide-react"
import { isWebUSBSupported, getPairedPrinters } from "@/lib/thermal-printer-client"
import { cn } from "@/lib/utils"

interface ShopBarProps {
  currentUser?: {
    name: string
    role: string
  }
}

export function ShopBar({ currentUser = { name: "เจ้าของร้าน", role: "OWNER" } }: ShopBarProps) {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)
  const [hasPrinter, setHasPrinter] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [drawerAmount] = useState(12450) // Mock/State for drawer cash
  const [shiftOpenedAt] = useState("08:12")

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)
    setIsOnline(navigator.onLine)

    // Check paired printers
    if (isWebUSBSupported()) {
      getPairedPrinters().then((devices) => {
        setHasPrinter(devices.length > 0)
      })
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])

  const triggerCommandPalette = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event)
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch {
      router.push("/login")
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-11 w-full items-center justify-between border-b px-3 text-xs transition-colors",
        isOnline
          ? "border-[#DFE4EC] bg-[#101722] text-[#F7F9FC]"
          : "border-[#A85B00] bg-[#FDF2E3] text-[#A85B00] font-semibold"
      )}
    >
      {/* Left Indicators */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin py-1">
        {/* Shift Status */}
        <button
          type="button"
          onClick={() => router.push("/reports/daily")}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 font-medium transition-colors hover:bg-white/20"
          title="จัดการกะเงินสด"
        >
          <span className="h-2 w-2 rounded-full bg-[#0F7A4D] animate-pulse" />
          <Clock className="h-3.5 w-3.5 opacity-70" />
          <span>เปิดกะ {shiftOpenedAt}</span>
        </button>

        {/* Cash in drawer */}
        <button
          type="button"
          onClick={() => router.push("/reports/daily")}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 font-medium transition-colors hover:bg-white/20"
          title="เงินสดในลิ้นชักปัจจุบัน"
        >
          <Wallet className="h-3.5 w-3.5 opacity-70" />
          <span className="font-num font-bold">฿{drawerAmount.toLocaleString("th-TH")}</span>
        </button>

        {/* Printer Status */}
        <button
          type="button"
          onClick={() => router.push("/print-history")}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 font-medium transition-colors hover:bg-white/20"
          title="ตั้งค่า/เลือกเครื่องพิมพ์"
        >
          <Printer className="h-3.5 w-3.5 opacity-70" />
          <span>{hasPrinter ? "พร้อม" : "พร้อม (Browser)"}</span>
        </button>

        {/* Network Status */}
        <div className="flex items-center gap-1 px-1">
          {isOnline ? (
            <span className="flex items-center gap-1 text-[#0F7A4D]">
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>ออนไลน์</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#BE2A2A] font-bold">
              <WifiOff className="h-3.5 w-3.5" />
              <span>ออฟไลน์ — บิลจะซิงก์เมื่อกลับมาออนไลน์</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={triggerCommandPalette}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 font-medium transition-all hover:bg-white/20 active:scale-95"
        >
          <Search className="h-3.5 w-3.5 opacity-70" />
          <span>ค้นหา / คำสั่ง</span>
          <kbd className="rounded bg-white/20 px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold transition-all hover:bg-white/20"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
              {currentUser.name[0] || "U"}
            </div>
            <span className="max-w-[80px] truncate">{currentUser.name}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[#DFE4EC] bg-white p-1 text-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-sm text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {currentUser.role === "OWNER"
                      ? "ผู้จัดการร้าน"
                      : currentUser.role === "CASHIER"
                        ? "แคชเชียร์"
                        : "พนักงาน"}
                  </div>
                </div>

                <div className="space-y-0.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      router.push("/login")
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <KeyRound className="h-4 w-4 text-slate-500" />
                    <span>เปลี่ยนผู้ใช้ (PIN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      router.push("/login")
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Lock className="h-4 w-4 text-slate-500" />
                    <span>ล็อกหน้าจอ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#BE2A2A] hover:bg-[#FCEDED]"
                  >
                    <LogOut className="h-4 w-4 text-[#BE2A2A]" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
