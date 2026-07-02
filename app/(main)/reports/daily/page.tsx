import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { DailyReportClient } from "@/components/reports/daily-report-client"
import { PageHeader } from "@/components/ui/page-header"

export default async function DailyReportPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams
  await auth()

  const dateParam = searchParams.date ? new Date(searchParams.date) : new Date()

  const startOfDay = new Date(dateParam)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(dateParam)
  endOfDay.setHours(23, 59, 59, 999)

  const [sales, codCashDeliveries] = await Promise.all([
    prisma.sale.findMany({
      where: {
        saleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        deliveries: {
          select: {
            isCOD: true,
            cashExpectedAmount: true,
          },
        },
      },
      orderBy: { saleDate: "desc" },
    }),
    prisma.delivery.findMany({
      where: {
        isCOD: true,
        cashSettledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        sale: { select: { status: true } },
      },
    }),
  ])

  const roundMoney = (value: number) => Math.round(value * 100) / 100

  const activeSales = sales.filter((sale) => sale.status !== "VOID")
  const totalSales = activeSales.reduce((sum, sale) => sum + sale.grandTotal, 0)
  const saleDateCashReceived = activeSales.reduce((sum, sale) => {
    const codDelivery = sale.deliveries.find((delivery) => delivery.isCOD)
    if (codDelivery) {
      const initialPaid =
        sale.paymentType === "PARTIAL"
          ? codDelivery.cashExpectedAmount != null
            ? roundMoney(sale.grandTotal - codDelivery.cashExpectedAmount)
            : sale.paidAmount
          : 0
      return sum + initialPaid
    }
    if (sale.paymentType === "CASH" || sale.paymentType === "PARTIAL") return sum + sale.paidAmount
    return sum
  }, 0)
  const codCashReceived = codCashDeliveries
    .filter((delivery) => delivery.sale.status !== "VOID")
    .reduce((sum, delivery) => sum + (delivery.cashActualAmount ?? 0), 0)
  const creditSales = activeSales.reduce((sum, sale) => {
    const isCOD = sale.deliveries.some((delivery) => delivery.isCOD)
    if (isCOD) return sum
    if (sale.paymentType === "CREDIT" || sale.paymentType === "PARTIAL") return sum + (sale.grandTotal - sale.paidAmount)
    return sum
  }, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <PageHeader title="รายงานภาพรวมประจำวัน" description="สรุปยอดขาย เงินสดรับ และยอดค้างชำระตามวันที่เลือก" />
      <DailyReportClient
        initialDate={startOfDay.toISOString().split("T")[0]}
        summary={{
          totalSales,
          cashReceived: saleDateCashReceived + codCashReceived,
          creditSales,
        }}
      />
    </div>
  )
}
