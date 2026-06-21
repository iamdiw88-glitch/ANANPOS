import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  Package, 
  BarChart3, 
  Settings,
  AlertTriangle,
  TrendingUp,
  ReceiptText
} from "lucide-react"


const formatBaht = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
}

export default async function DashboardPage() {
  const session = await auth()
  const role = session?.user?.role as string || "CASHIER"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1. Sales & Bills count
  const todaysSales = await prisma.sale.aggregate({
    where: { 
      saleDate: { gte: today },
      status: { not: "VOID" }
    },
    _sum: { grandTotal: true },
    _count: { id: true }
  })

  const totalSalesToday = todaysSales._sum.grandTotal || 0
  const totalBillsToday = todaysSales._count.id || 0

  // 2. Pending Deliveries
  const pendingDeliveries = await prisma.delivery.count({
    where: { status: "PENDING" }
  })

  // 3. AR Balance
  const arBalance = await prisma.customer.aggregate({
    where: { balance: { gt: 0 } },
    _sum: { balance: true }
  })
  const totalAR = arBalance._sum.balance || 0

  // 4. Low stock check
  const allStockItems = await prisma.product.findMany({
    where: { isStockItem: true },
    include: {
      stockBalance: true,
      baseUnit: true
    }
  })
  
  const lowStockProducts = allStockItems.filter(
    (p) => (p.stockBalance?.quantityOnHand ?? 0) < p.reorderPoint
  )

  const menuItems = [
    { name: "ขายของ", icon: ShoppingCart, href: "/pos", allowedRoles: ["OWNER", "CASHIER", "STAFF"], color: "bg-blue-500", hover: "hover:bg-blue-600" },
    { name: "ลูกหนี้", icon: CreditCard, href: "/ar", allowedRoles: ["OWNER", "CASHIER", "STAFF"], color: "bg-emerald-500", hover: "hover:bg-emerald-600" },
    { name: "จัดส่ง", icon: Truck, href: "/delivery", allowedRoles: ["OWNER", "CASHIER", "STAFF"], color: "bg-amber-500", hover: "hover:bg-amber-600" },
    { name: "สต็อก", icon: Package, href: "/inventory", allowedRoles: ["OWNER", "CASHIER", "STAFF"], color: "bg-indigo-500", hover: "hover:bg-indigo-600" },
    { name: "รายงาน", icon: BarChart3, href: "/reports/daily", allowedRoles: ["OWNER", "STAFF"], color: "bg-purple-500", hover: "hover:bg-purple-600" },
    { name: "ตั้งค่า", icon: Settings, href: "/settings", allowedRoles: ["OWNER"], color: "bg-slate-500", hover: "hover:bg-slate-600" },
  ]

  const visibleMenu = menuItems.filter(item => item.allowedRoles.includes(role))

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Quick Nav Grid */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">เมนูหลัก</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {visibleMenu.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${item.color} ${item.hover} text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-transform hover:scale-105 active:scale-95 shadow-lg min-h-[160px]`}
              >
                <Icon className="w-12 h-12" />
                <span className="text-xl font-bold">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Stats Cards */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">ข้อมูลวันนี้</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 font-medium">ยอดขายวันนี้</p>
              <p className="text-3xl font-bold text-slate-800">{formatBaht(totalSalesToday)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ReceiptText className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 font-medium">จำนวนบิล</p>
              <p className="text-3xl font-bold text-slate-800">{totalBillsToday} ใบ</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 font-medium">รอจัดส่ง</p>
              <p className="text-3xl font-bold text-slate-800">{pendingDeliveries} เที่ยว</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 font-medium">ลูกหนี้ค้างชำระ</p>
              <p className="text-3xl font-bold text-slate-800">{formatBaht(totalAR)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {lowStockProducts.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-800">แจ้งเตือนสต็อกใกล้หมด</h2>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {lowStockProducts.length} รายการ
            </span>
          </div>
          
          <div className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 font-semibold text-slate-600">รหัส</th>
                  <th className="p-4 font-semibold text-slate-600">ชื่อสินค้า</th>
                  <th className="p-4 font-semibold text-slate-600">คงเหลือ</th>
                  <th className="p-4 font-semibold text-slate-600">จุดสั่งซื้อ (ต่ำกว่า)</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600">{product.code}</td>
                    <td className="p-4 font-medium text-slate-800">{product.name}</td>
                    <td className="p-4 font-bold text-red-600">
                      {product.stockBalance?.quantityOnHand ?? 0} {product.baseUnit.name}
                    </td>
                    <td className="p-4 text-slate-500">
                      {product.reorderPoint} {product.baseUnit.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}
