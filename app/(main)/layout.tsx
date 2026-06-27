import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FontSizeToggle } from "@/components/ui/font-size-toggle"
import { LogoutButton } from "@/components/ui/logout-button"
import { 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut, 
  Store,
  Menu
} from "lucide-react"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const role = session.user.role as string

  const menuItems = [
    { name: "ขายของ", icon: ShoppingCart, href: "/pos", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "ลูกหนี้", icon: CreditCard, href: "/ar", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "จัดส่ง", icon: Truck, href: "/delivery", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "สต็อก", icon: Package, href: "/inventory", allowedRoles: ["OWNER", "CASHIER", "STAFF"] },
    { name: "รายงาน", icon: BarChart3, href: "/reports/daily", allowedRoles: ["OWNER", "STAFF"] },
    { name: "ตั้งค่า", icon: Settings, href: "/settings", allowedRoles: ["OWNER"] },
  ]

  const visibleMenu = menuItems.filter(item => item.allowedRoles.includes(role))

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar - Clean White with Blue Accents */}
      <aside className="w-64 bg-white border-r border-slate-200/60 flex-col hidden md:flex shrink-0 z-20 shadow-sm relative">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-50 pointer-events-none"></div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-extrabold text-lg text-slate-800 tracking-tight">ANAN POS</span>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3 overflow-y-auto scrollbar-thin">
          <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Main Menu</div>
          {visibleMenu.map((item) => {
            const Icon = item.icon
            // Note: Since we don't have next/navigation active state easily here without usePathname,
            // we'll apply a clean hover effect that looks great.
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-all duration-200 text-sm font-semibold text-slate-600 hover:text-primary relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <form id="logout-form" action={async () => {
            "use server"
            await signOut()
          }}>
            <button type="submit" className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-red-100 bg-white shadow-sm">
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
        {/* Topbar - Glassmorphism */}
        <header className="h-16 glass border-b-0 sticky top-0 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 transition-all">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex flex-col">
              <h1 className="text-sm font-heading font-extrabold text-slate-800 tracking-tight">ระบบจัดการร้านค้า</h1>
              <p className="text-[11px] text-slate-500 font-medium">Welcome back, {session.user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <FontSizeToggle />
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3 pl-1 group cursor-pointer">
              <div className="flex flex-col items-end leading-tight">
                <span className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{session.user.name}</span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{role}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20 ring-2 ring-white border border-primary/10">
                {session.user.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 scrollbar-thin">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
