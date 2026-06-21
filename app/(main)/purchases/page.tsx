import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus, PackagePlus } from "lucide-react"


export const dynamic = "force-dynamic"

export default async function PurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { purchaseDate: 'desc' },
    include: {
      supplier: true,
      items: true
    },
    take: 50 // Limit for MVP
  })

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">รับสินค้าเข้า (Purchases)</h1>
          <p className="text-slate-500 mt-1">ประวัติการสั่งซื้อและรับสินค้าเข้าสต็อก</p>
        </div>
        
        <Link 
          href="/purchases/new" 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> รับสินค้าใหม่
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium sticky top-0">
              <tr>
                <th className="p-4">วันที่ทำรายการ</th>
                <th className="p-4">เลขที่อ้างอิง (PO)</th>
                <th className="p-4">ผู้จัดจำหน่าย</th>
                <th className="p-4 text-center">จำนวนรายการ</th>
                <th className="p-4 text-right">ยอดรวม (บาท)</th>
                <th className="p-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600">{new Date(p.purchaseDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 font-medium text-slate-800">{p.purchaseNo}</td>
                  <td className="p-4 text-slate-800">{p.supplier.name}</td>
                  <td className="p-4 text-center text-slate-600">{p.items.length}</td>
                  <td className="p-4 text-right font-bold text-slate-800">{formatBaht(p.total)}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      รับเข้าแล้ว
                    </span>
                  </td>
                </tr>
              ))}
              
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <PackagePlus className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>ยังไม่มีประวัติการรับสินค้าเข้า</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
