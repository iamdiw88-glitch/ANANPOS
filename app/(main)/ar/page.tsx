import { prisma } from "@/lib/prisma"
import { ArClient } from "@/components/ar/ar-client"
import { differenceInDays } from "date-fns"

export const dynamic = "force-dynamic"


export default async function ARPage() {
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { type: "CREDIT" },
        { balance: { gt: 0 } }
      ]
    },
    include: {
      sales: {
        where: {
          status: { in: ["UNPAID", "PARTIAL"] },
          paymentType: { in: ["CREDIT", "PARTIAL"] }
        },
        select: {
          id: true,
          saleDate: true,
          grandTotal: true,
          paidAmount: true,
        }
      }
    },
    orderBy: {
      balance: "desc"
    }
  })

  // Calculate Header Stats
  let totalAR = 0
  let overdue30 = 0
  let overdue60 = 0

  const now = new Date()

  const processedCustomers = customers.map(c => {
    let oldestSaleDate: Date | null = null
    let overdueDays = 0

    c.sales.forEach(sale => {
      const remaining = sale.grandTotal - sale.paidAmount
      if (remaining > 0) {
        totalAR += remaining
        const days = differenceInDays(now, sale.saleDate)
        
        if (!oldestSaleDate || sale.saleDate < oldestSaleDate) {
          oldestSaleDate = sale.saleDate
        }

        // absolute age
        if (days > 60) {
          overdue60 += remaining
        } else if (days > 30) {
          overdue30 += remaining
        }
      }
    })

    if (oldestSaleDate) {
      overdueDays = differenceInDays(now, oldestSaleDate)
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone || "-",
      balance: c.balance,
      creditLimit: c.creditLimit,
      creditTermDays: c.creditTermDays,
      unpaidBillsCount: c.sales.length,
      oldestSaleDate,
      overdueDays,
    }
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">ลูกหนี้ / เงินเชื่อ</h1>
        <p className="text-slate-500 mt-1">จัดการหนี้สิน การวางบิล และรับชำระเงิน</p>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium">ยอดลูกหนี้รวม</p>
          <p className="text-4xl font-black text-blue-600 mt-2">
            ฿{totalAR.toLocaleString('th-TH', {minimumFractionDigits: 2})}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium">ค้าง 31-60 วัน</p>
          <p className="text-4xl font-black text-orange-500 mt-2">
            ฿{overdue30.toLocaleString('th-TH', {minimumFractionDigits: 2})}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium">ค้างเกิน 60 วัน</p>
          <p className="text-4xl font-black text-red-600 mt-2">
            ฿{overdue60.toLocaleString('th-TH', {minimumFractionDigits: 2})}
          </p>
        </div>
      </div>

      <ArClient customers={processedCustomers} />
    </div>
  )
}
