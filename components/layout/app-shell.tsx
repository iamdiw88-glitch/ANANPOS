"use client"

import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  FileText,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
  type LucideProps,
} from "lucide-react"
import { FontSizeToggle } from "@/components/ui/font-size-toggle"
import { SidebarNavLink } from "@/components/ui/sidebar-nav-link"

type NavItem = {
  name: string
  href: string
  icon: ComponentType<LucideProps>
  allowedRoles: string[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

const menuSections: NavSection[] = [
  {
    title: "ขายและลูกค้า",
    items: [
      { name: "ขายของ", icon: ShoppingCart, href: "/pos", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
      { name: "ข้อมูลลูกค้า", icon: Users, href: "/delivery-customers", allowedRoles: ["OWNER"] },
      { name: "จัดส่ง", icon: Truck, href: "/delivery", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
      { name: "รวมบิล", icon: FileText, href: "/reports/bills", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    ],
  },
  {
    title: "สินค้า",
    items: [
      { name: "สต็อก", icon: Package, href: "/inventory", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    ],
  },
  {
    title: "จัดส่งและทีมงาน",
    items: [
      { name: "รถและเครื่องจักร", icon: Truck, href: "/vehicles", allowedRoles: ["OWNER", "STAFF"] },
      { name: "พนักงาน", icon: Users, href: "/employees", allowedRoles: ["OWNER"] },
    ],
  },
  {
    title: "รายงานและระบบ",
    items: [
      { name: "รายงานภาพรวม", icon: BarChart3, href: "/reports/daily", allowedRoles: ["OWNER", "STAFF"] },
      { name: "ตั้งค่า", icon: Settings, href: "/settings", allowedRoles: ["OWNER"] },
    ],
  },
]

const roleNames: Record<string, string> = {
  OWNER: "ผู้จัดการร้าน",
  CASHIER: "แคชเชียร์",
  STAFF: "พนักงาน",
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-md shadow-primary/20">
        <Store className="h-4 w-4 text-white" />
      </span>
      <span className="truncate font-heading text-lg font-extrabold tracking-tight text-slate-800">ANAN POS</span>
    </div>
  )
}

function Navigation({
  sections,
  onNavigate,
}: {
  sections: NavSection[]
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="เมนูหลัก" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5 scrollbar-thin">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{section.title}</div>
          {section.items.map((item) => {
            const Icon = item.icon
            return (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                name={item.name}
                onNavigate={onNavigate}
              >
                <Icon className="h-5 w-5 shrink-0 text-slate-500 transition-colors group-hover:text-primary" />
              </SidebarNavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function LogoutForm({ action }: { action: () => Promise<void> }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 p-4">
      <form action={action}>
        <button
          type="submit"
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </form>
    </div>
  )
}

export function AppShell({
  children,
  userName,
  role,
  logoutAction,
}: {
  children: ReactNode
  userName: string
  role: string
  logoutAction: () => Promise<void>
}) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.allowedRoles.includes(role)),
    }))
    .filter((section) => section.items.length > 0)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false)
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleEscape)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isMobileMenuOpen])

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-background font-sans">
      <aside className="relative z-20 hidden w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white shadow-sm lg:flex">
        <div className="relative flex h-16 shrink-0 items-center overflow-hidden border-b border-slate-100 px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-60" />
          <div className="relative">
            <Brand />
          </div>
        </div>
        <Navigation sections={visibleSections} />
        <LogoutForm action={logoutAction} />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="glass z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 px-3 shadow-sm sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
              aria-label="เปิดเมนู"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden flex-col lg:flex">
              <h1 className="font-heading text-sm font-extrabold tracking-tight text-slate-800">ระบบจัดการร้านค้า</h1>
              <p className="text-[11px] font-medium text-slate-600">ยินดีต้อนรับ {userName}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <FontSizeToggle />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="max-w-36 truncate text-sm font-bold text-slate-800">{userName}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {roleNames[role] || role}
                </span>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-br from-primary to-blue-500 text-sm font-bold text-white shadow-md shadow-primary/20 ring-2 ring-white">
                {userName?.charAt(0) || "A"}
              </span>
            </div>
          </div>
        </header>

        <main className="app-shell-main min-h-0 min-w-0 flex-1 overflow-auto p-3 scrollbar-thin sm:p-4 lg:p-6 xl:p-8">
          <div className="mx-auto h-full min-w-0 max-w-[1600px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </main>
      </div>

      <div
        className={`fixed inset-0 z-[110] lg:hidden ${isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="ปิดเมนู"
          tabIndex={isMobileMenuOpen ? 0 : -1}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute inset-0 cursor-pointer bg-slate-950/35 backdrop-blur-sm transition-opacity duration-200 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          id="mobile-navigation"
          className={`absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="เมนูสำหรับมือถือ"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <Brand />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Navigation sections={visibleSections} onNavigate={() => setIsMobileMenuOpen(false)} />
          <div className="border-t border-slate-100 px-4 py-3 sm:hidden">
            <div className="truncate text-sm font-bold text-slate-800">{userName}</div>
            <div className="text-xs font-semibold text-slate-500">{roleNames[role] || role}</div>
          </div>
          <LogoutForm action={logoutAction} />
        </aside>
      </div>
    </div>
  )
}
