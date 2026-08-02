"use client"

import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  BarChart3,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Printer,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  Users,
  X,
  type LucideProps,
} from "lucide-react"
import { ShopBar } from "./shop-bar"
import { CommandPalette } from "@/components/ui/command-palette"

type NavItem = {
  name: string
  href: string
  icon: ComponentType<LucideProps>
  allowedRoles: string[]
  badgeCount?: number
}

type NavSection = {
  title: string
  items: NavItem[]
}

const menuSections: NavSection[] = [
  {
    title: "งานประจำวัน",
    items: [
      { name: "ขายของ", icon: ShoppingCart, href: "/pos", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
      { name: "คิวจัดส่ง", icon: Truck, href: "/delivery", allowedRoles: ["OWNER", "CASHIER", "STAFF"], badgeCount: 2 },
      { name: "รับชำระหนี้", icon: CreditCard, href: "/delivery-customers?tab=ar", allowedRoles: ["OWNER", "CASHIER"], badgeCount: 6 },
    ],
  },
  {
    title: "ข้อมูลร้าน",
    items: [
      { name: "สินค้าและสต็อก", icon: Package, href: "/inventory", allowedRoles: ["OWNER", "CASHIER", "STAFF"], badgeCount: 1 },
      { name: "พิมพ์ฉลากบาร์โค้ด", icon: Tag, href: "/barcode-labels", allowedRoles: ["OWNER", "STAFF"] },
      { name: "ลูกค้าและลูกหนี้", icon: Users, href: "/delivery-customers", allowedRoles: ["OWNER"] },
      { name: "รวมบิลทั้งหมด", icon: FileText, href: "/reports/bills", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    ],
  },
  {
    title: "ทีมและรถ",
    items: [
      { name: "รถและเครื่องจักร", icon: Truck, href: "/vehicles", allowedRoles: ["OWNER", "STAFF"] },
      { name: "พนักงาน", icon: Users, href: "/employees", allowedRoles: ["OWNER"] },
    ],
  },
  {
    title: "รายงาน · ตั้งค่า",
    items: [
      { name: "หน้าหลัก", icon: BarChart3, href: "/dashboard", allowedRoles: ["OWNER"] },
      { name: "รายงานการขาย", icon: BarChart3, href: "/reports/daily", allowedRoles: ["OWNER"] },
      { name: "ระบบเครื่องพิมพ์", icon: Printer, href: "/print-history", allowedRoles: ["OWNER"] },
      { name: "ตั้งค่า", icon: Settings, href: "/settings", allowedRoles: ["OWNER"] },
    ],
  },
]

function Brand({ logoUrl = "" }: { logoUrl?: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#0B63CE] to-blue-600 shadow-md shadow-[#0B63CE]/20">
        {logoUrl ? (
          <Image src={logoUrl} alt="โลโก้ร้าน" fill unoptimized sizes="36px" className="object-contain bg-white p-0.5" />
        ) : (
          <Store className="h-4 w-4 text-white" />
        )}
      </span>
      <span className="truncate font-heading text-lg font-extrabold tracking-tight text-slate-800 xl:inline">ANAN POS</span>
    </Link>
  )
}

function Navigation({
  sections,
  onNavigate,
  isRail = false,
}: {
  sections: NavSection[]
  onNavigate?: () => void
  isRail?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="เมนูหลัก" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 scrollbar-thin">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          {!isRail && (
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#5D6B80]">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#0B63CE] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                } ${isRail ? "flex-col justify-center px-1 text-center py-2" : ""}`}
                title={item.name}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-[#0B63CE]"}`} />
                  {item.badgeCount ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#BE2A2A] px-1 font-num text-[10px] font-bold text-white">
                      {item.badgeCount}
                    </span>
                  ) : null}
                </div>
                <span className={isRail ? "text-[10px] leading-tight font-medium" : "truncate"}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function AppShell({
  children,
  userName,
  role,
  logoUrl = "",
}: {
  children: ReactNode
  userName: string
  role: string
  logoUrl?: string
  logoutAction: () => Promise<void>
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false)

  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.allowedRoles.includes(role)),
    }))
    .filter((section) => section.items.length > 0)

  useEffect(() => {
    setIsMoreSheetOpen(false)
  }, [pathname])

  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8] font-sans">
      {/* 1. Signature ShopBar Header */}
      <ShopBar currentUser={{ name: userName, role }} />

      {/* Global ⌘K Command Palette */}
      <CommandPalette />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 2. Desktop Full Sidebar (≥1440px) */}
        <aside className="relative z-20 hidden w-60 shrink-0 flex-col border-r border-[#DFE4EC] bg-white shadow-sm 2xl:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-[#DFE4EC] px-4">
            <Brand logoUrl={logoUrl} />
          </div>
          <Navigation sections={visibleSections} />
        </aside>

        {/* 3. Icon Rail Navigation (1024px – 1439px) */}
        <aside className="relative z-20 hidden w-[76px] shrink-0 flex-col border-r border-[#DFE4EC] bg-white shadow-sm lg:flex 2xl:hidden">
          <div className="flex h-14 shrink-0 items-center justify-center border-b border-[#DFE4EC]">
            <Brand logoUrl={logoUrl} />
          </div>
          <Navigation sections={visibleSections} isRail />
        </aside>

        {/* 4. Main Workspace Content */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="app-shell-main min-h-0 min-w-0 flex-1 overflow-auto p-3 scrollbar-thin sm:p-4 lg:p-6">
            <div className="mx-auto h-full min-w-0 max-w-[1600px] animate-in fade-in duration-200">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 5. Mobile & Tablet Bottom Tab Bar (<1024px - Zone of Thumb) */}
      <nav className="sticky bottom-0 z-40 flex h-16 w-full items-center justify-around border-t border-[#DFE4EC] bg-white px-2 shadow-lg lg:hidden">
        <Link
          href="/pos"
          className={`flex flex-col items-center justify-center py-1 font-semibold transition-colors ${
            pathname === "/pos" ? "text-[#0B63CE]" : "text-slate-500"
          }`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[11px]">ขายของ</span>
        </Link>

        <Link
          href="/delivery"
          className={`flex flex-col items-center justify-center py-1 font-semibold transition-colors relative ${
            pathname === "/delivery" ? "text-[#0B63CE]" : "text-slate-500"
          }`}
        >
          <Truck className="h-5 w-5" />
          <span className="text-[11px]">จัดส่ง</span>
          <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#BE2A2A] font-num text-[9px] font-bold text-white">2</span>
        </Link>

        <Link
          href="/inventory"
          className={`flex flex-col items-center justify-center py-1 font-semibold transition-colors ${
            pathname === "/inventory" ? "text-[#0B63CE]" : "text-slate-500"
          }`}
        >
          <Package className="h-5 w-5" />
          <span className="text-[11px]">สต็อก</span>
        </Link>

        <Link
          href="/delivery-customers"
          className={`flex flex-col items-center justify-center py-1 font-semibold transition-colors ${
            pathname === "/delivery-customers" ? "text-[#0B63CE]" : "text-slate-500"
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[11px]">ลูกค้า</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMoreSheetOpen(true)}
          className={`flex flex-col items-center justify-center py-1 font-semibold transition-colors ${
            isMoreSheetOpen ? "text-[#0B63CE]" : "text-slate-500"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[11px]">เพิ่มเติม</span>
        </button>
      </nav>

      {/* 6. "เพิ่มเติม" Mobile Bottom Sheet */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 backdrop-blur-sm lg:hidden">
          <div className="fixed inset-0" onClick={() => setIsMoreSheetOpen(false)} />

          <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[#DFE4EC] bg-white p-4 shadow-2xl animate-in slide-in-from-bottom duration-250">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />

            <div className="flex items-center justify-between border-b border-[#DFE4EC] pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">เมนูเพิ่มเติม</h3>
              <button
                type="button"
                onClick={() => setIsMoreSheetOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  router.push("/delivery-customers?tab=ar")
                }}
                className="flex items-center gap-3 rounded-xl border border-[#DFE4EC] bg-slate-50 p-3 text-left font-semibold text-slate-800 hover:bg-blue-50/50"
              >
                <CreditCard className="h-5 w-5 text-[#0B63CE]" />
                <span>รับชำระหนี้</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  router.push("/reports/bills")
                }}
                className="flex items-center gap-3 rounded-xl border border-[#DFE4EC] bg-slate-50 p-3 text-left font-semibold text-slate-800 hover:bg-blue-50/50"
              >
                <FileText className="h-5 w-5 text-slate-600" />
                <span>รวมบิลทั้งหมด</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  router.push("/barcode-labels")
                }}
                className="flex items-center gap-3 rounded-xl border border-[#DFE4EC] bg-slate-50 p-3 text-left font-semibold text-slate-800 hover:bg-blue-50/50"
              >
                <Tag className="h-5 w-5 text-[#0B63CE]" />
                <span>พิมพ์ฉลากบาร์โค้ด</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  router.push("/vehicles")
                }}
                className="flex items-center gap-3 rounded-xl border border-[#DFE4EC] bg-slate-50 p-3 text-left font-semibold text-slate-800 hover:bg-blue-50/50"
              >
                <Truck className="h-5 w-5 text-slate-600" />
                <span>รถและเครื่องจักร</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  router.push("/employees")
                }}
                className="flex items-center gap-3 rounded-xl border border-[#DFE4EC] bg-slate-50 p-3 text-left font-semibold text-slate-800 hover:bg-blue-50/50"
              >
                <Users className="h-5 w-5 text-slate-600" />
                <span>พนักงาน</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  router.push("/print-history")
                }}
                className="flex items-center gap-3 rounded-xl border border-[#DFE4EC] bg-slate-50 p-3 text-left font-semibold text-slate-800 hover:bg-blue-50/50"
              >
                <Printer className="h-5 w-5 text-slate-600" />
                <span>ระบบเครื่องพิมพ์</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
