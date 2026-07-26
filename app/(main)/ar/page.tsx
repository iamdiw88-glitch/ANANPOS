import { prisma } from "@/lib/prisma"
import { ArClient } from "@/components/ar/ar-client"
import { differenceInDays } from "date-fns"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Wallet, AlertTriangle, AlertOctagon } from "lucide-react"

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
    <div className="flex flex-col h-full gap-4">
      <PageHeader title="ลูกหนี้ / เงินเชื่อ" description="จัดการหนี้สิน การวางบิล และรับชำระเงิน" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="ยอดลูกหนี้รวม"
          value={`฿${totalAR.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          tone="default"
        />
        <StatCard
          label="ค้าง 31-60 วัน"
          value={`฿${overdue30.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="ค้างเกิน 60 วัน"
          value={`฿${overdue60.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
          icon={AlertOctagon}
          tone="danger"
        />
      </div>

      <ArClient customers={processedCustomers} />
    </div>
  )
}
