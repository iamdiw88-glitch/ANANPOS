import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus, RotateCcw } from "lucide-react"


export const dynamic = "force-dynamic"

export default async function ReturnsPage() {
  const returns = await prisma.return.findMany({
    orderBy: { returnDate: 'desc' },
    include: {
      customer: true,
      originalSale: true,
      items: true
    },
    take: 50
  })

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">รับคืนสินค้า (Returns)</h1>
          <p className="text-slate-500 mt-1">ประวัติการรับคืนสินค้าและลดหนี้</p>
        </div>
        
        <Link 
          href="/returns/new" 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> สร้างรายการรับคืน
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium sticky top-0">
              <tr>
                <th className="p-4">วันที่รับคืน</th>
                <th className="p-4">เลขที่ใบรับคืน</th>
                <th className="p-4">อ้างอิงบิลขาย</th>
                <th className="p-4">ลูกค้า</th>
                <th className="p-4">เหตุผล</th>
                <th className="p-4 text-right">ยอดคืนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600">{new Date(r.returnDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 font-medium text-slate-800">{r.returnNo}</td>
                  <td className="p-4 text-slate-600">{r.originalSale.billNo}</td>
                  <td className="p-4 text-slate-800">{r.customer?.name || "ลูกค้าทั่วไป"}</td>
                  <td className="p-4 text-slate-600">
                    {r.reason === "DAMAGED" ? "สินค้าชำรุด" : 
                     r.reason === "WRONG_ITEM" ? "จ่ายสินค้าผิด" : "ลูกค้าขอคืน"}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800">{formatBaht(r.totalRefund)}</td>
                </tr>
              ))}
              
              {returns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RotateCcw className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>ยังไม่มีประวัติการรับคืนสินค้า</p>
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
