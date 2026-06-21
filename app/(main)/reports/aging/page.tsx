import { prisma } from "@/lib/prisma"
import { AgingReportClient } from "@/components/reports/aging-client"

export const dynamic = "force-dynamic"


export default async function AgingReportPage() {
  const customers = await prisma.customer.findMany({
    where: { balance: { gt: 0 } },
    select: {
      id: true,
      name: true,
      phone: true,
      creditTermDays: true,
      sales: {
        where: { status: { in: ["UNPAID", "PARTIAL"] } },
        select: {
          id: true,
          saleDate: true,
          grandTotal: true,
          paidAmount: true,
        }
      }
    }
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <AgingReportClient customers={customers} />
    </div>
  )
}
