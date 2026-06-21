import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { FileText, Printer } from "lucide-react"


export const dynamic = "force-dynamic"

export default async function TaxInvoicesPage() {
  const sales = await prisma.sale.findMany({
    where: { docType: "TAX_INVOICE" },
    orderBy: { saleDate: 'desc' },
    include: {
      customer: true
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
          <h1 className="text-3xl font-bold text-slate-800">ใบกำกับภาษี (Tax Invoices)</h1>
          <p className="text-slate-500 mt-1">ประวัติการออกใบกำกับภาษีเต็มรูป</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium sticky top-0">
              <tr>
                <th className="p-4">วันที่ขาย</th>
                <th className="p-4">เลขที่บิล / ใบกำกับภาษี</th>
                <th className="p-4">ลูกค้า</th>
                <th className="p-4">เลขประจำตัวผู้เสียภาษี</th>
                <th className="p-4 text-right">ยอดรวม (บาท)</th>
                <th className="p-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600">{new Date(s.saleDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 font-medium text-slate-800">{s.billNo}</td>
                  <td className="p-4 text-slate-800">{s.customer?.name || "ขาจร (ไม่ระบุชื่อ)"}</td>
                  <td className="p-4 text-slate-600">{s.customer?.taxId || "-"}</td>
                  <td className="p-4 text-right font-bold text-slate-800">{formatBaht(s.grandTotal)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => alert("ระบบพิมพ์ใบกำกับภาษี A4 กำลังอยู่ระหว่างพัฒนา")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Printer className="w-4 h-4" /> พิมพ์ (PDF)
                    </button>
                  </td>
                </tr>
              ))}
              
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>ยังไม่มีการออกใบกำกับภาษีเต็มรูป</p>
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
