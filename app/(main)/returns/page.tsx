import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"


export const dynamic = "force-dynamic"

export default async function ReturnsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!hasPermission(session.user.role, "return:view")) redirect("/pos")

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
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="รับคืนสินค้า (Returns)"
        description="ประวัติการรับคืนสินค้าและลดหนี้"
        actions={
          <Link href="/returns/new">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4" /> สร้างรายการรับคืน
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {returns.length === 0 ? (
          <div className="card flex-1 flex items-center justify-center">
            <EmptyState icon={RotateCcw} title="ยังไม่มีประวัติการรับคืนสินค้า" />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>วันที่รับคืน</TH>
                <TH>เลขที่ใบรับคืน</TH>
                <TH>อ้างอิงบิลขาย</TH>
                <TH>ลูกค้า</TH>
                <TH>เหตุผล</TH>
                <TH className="text-right">ยอดคืนเงิน (บาท)</TH>
              </TR>
            </THead>
            <TBody>
              {returns.map(r => (
                <TR key={r.id}>
                  <TD>{new Date(r.returnDate).toLocaleDateString('th-TH')}</TD>
                  <TD className="font-medium text-slate-800">{r.returnNo}</TD>
                  <TD>{r.originalSale.billNo}</TD>
                  <TD className="text-slate-800">{r.customer?.name || "ลูกค้าทั่วไป"}</TD>
                  <TD>
                    {r.reason === "DAMAGED" ? "สินค้าชำรุด" :
                     r.reason === "WRONG_ITEM" ? "จ่ายสินค้าผิด" : "ลูกค้าขอคืน"}
                  </TD>
                  <TD className="text-right font-semibold text-slate-800">{formatBaht(r.totalRefund)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  )
}
