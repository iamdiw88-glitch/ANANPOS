"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"
import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

function NavigationIcon({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus()

  return pending ? (
    <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-primary" aria-label="กำลังโหลดหน้า" />
  ) : (
    children
  )
}

export function SidebarNavLink({
  href,
  name,
  children,
  onNavigate,
}: {
  href: string
  name: string
  children: ReactNode
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive
          ? "bg-blue-50 text-primary"
          : "text-slate-600 hover:bg-blue-50 hover:text-primary"
      )}
    >
      <div className={cn(
        "absolute bottom-0 left-0 top-0 w-1 rounded-r-md bg-primary transition-opacity",
        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )} />
      <NavigationIcon>{children}</NavigationIcon>
      <span>{name}</span>
    </Link>
  )
}
