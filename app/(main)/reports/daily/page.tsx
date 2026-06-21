import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { DailyReportClient } from "@/components/reports/daily-report-client"


export default async function DailyReportPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth()
  const role = (session?.user as any)?.role || "STAFF"

  const dateParam = searchParams.date ? new Date(searchParams.date) : new Date()
  
  // Set to start and end of the day
  const startOfDay = new Date(dateParam)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(dateParam)
  endOfDay.setHours(23, 59, 59, 999)

  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      customer: true,
      createdBy: true
    },
    orderBy: { saleDate: 'desc' }
  })

  // Calculate summaries
  const totalSales = sales.filter(s => s.status !== 'VOID').reduce((sum, s) => sum + s.grandTotal, 0)
  const cashReceived = sales.filter(s => s.status !== 'VOID' && s.paymentType === 'CASH').reduce((sum, s) => sum + s.paidAmount, 0)
  const partialCash = sales.filter(s => s.status !== 'VOID' && s.paymentType === 'PARTIAL').reduce((sum, s) => sum + s.paidAmount, 0)
  const creditSales = sales.filter(s => s.status !== 'VOID' && (s.paymentType === 'CREDIT' || s.paymentType === 'PARTIAL')).reduce((sum, s) => sum + (s.grandTotal - s.paidAmount), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">รายงานยอดขายประจำวัน</h1>
      </div>
      <DailyReportClient 
        initialDate={startOfDay.toISOString().split('T')[0]} 
        sales={sales}
        summary={{
          totalSales,
          cashReceived: cashReceived + partialCash,
          creditSales
        }}
        userRole={role}
      />
    </div>
  )
}
