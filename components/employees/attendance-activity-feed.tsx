"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, LogIn, LogOut, RefreshCw, ScanFace } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type FeedItem = {
  type: "check_in" | "check_out" | "unrecognized"
  employeeName?: string
  method?: string
  time: string
  isLate?: boolean
  unrecognizedId?: string
  deviceName?: string
}

export function AttendanceActivityFeed({ onUnrecognized }: { onUnrecognized: (scanId: string) => void }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const response = await fetch("/api/attendance/activity-feed?limit=20", { cache: "no-store" })
      if (response.ok) setItems(await response.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-900">กิจกรรมการเข้างานวันนี้</h2>
          <p className="text-xs text-slate-500">อัปเดตอัตโนมัติทุก 15 วินาที</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()} aria-label="รีเฟรชกิจกรรม">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {loading && !items.length ? <p className="text-sm text-slate-500">กำลังโหลด...</p> : null}
      {!loading && !items.length ? <p className="text-sm text-slate-500">ยังไม่มีกิจกรรมวันนี้</p> : null}
      <div className="space-y-2">
        {items.map((item, index) => {
          const unknown = item.type === "unrecognized"
          return (
            <div key={`${item.time}-${item.unrecognizedId || index}`} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${unknown ? "bg-amber-100 text-amber-700" : item.type === "check_in" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                {unknown ? <AlertTriangle className="h-4 w-4" /> : item.type === "check_in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {unknown ? `ไม่รู้จักใบหน้า · ${item.deviceName || "อุปกรณ์"}` : `${item.employeeName} ${item.type === "check_in" ? "เข้างาน" : "ออกงาน"}`}
                </p>
                <p className="text-xs text-slate-500">{new Date(item.time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}{item.method ? ` · ${item.method}` : ""}</p>
              </div>
              {item.isLate ? <Badge variant="warning">สาย</Badge> : null}
              {unknown && item.unrecognizedId ? <Button size="sm" variant="outline" onClick={() => onUnrecognized(item.unrecognizedId!)}>ตรวจสอบ</Button> : null}
            </div>
          )
        })}
      </div>
      <ScanFace className="mt-3 h-4 w-4 text-slate-300" aria-hidden="true" />
    </section>
  )
}
