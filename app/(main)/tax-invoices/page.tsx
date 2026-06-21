import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { FileText, Printer } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"


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
    <div className="flex flex-col h-full gap-4">
      <PageHeader title="ใบกำกับภาษี (Tax Invoices)" description="ประวัติการออกใบกำกับภาษีเต็มรูป" />

      <div className="flex-1 overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>วันที่ขาย</TH>
              <TH>เลขที่บิล / ใบกำกับภาษี</TH>
              <TH>ลูกค้า</TH>
              <TH>เลขประจำตัวผู้เสียภาษี</TH>
              <TH className="text-right">ยอดรวม (บาท)</TH>
              <TH className="text-center">จัดการ</TH>
            </TR>
          </THead>
          <TBody>
            {sales.map(s => (
              <TR key={s.id}>
                <TD className="text-slate-600">{new Date(s.saleDate).toLocaleDateString('th-TH')}</TD>
                <TD className="font-medium text-slate-800">{s.billNo}</TD>
                <TD className="text-slate-800">{s.customer?.name || "ขาจร (ไม่ระบุชื่อ)"}</TD>
                <TD className="text-slate-600">{s.customer?.taxId || "-"}</TD>
                <TD className="text-right font-bold text-slate-800">{formatBaht(s.grandTotal)}</TD>
                <TD className="text-center">
                  <button
                    onClick={() => alert("ระบบพิมพ์ใบกำกับภาษี A4 กำลังอยู่ระหว่างพัฒนา")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-primary hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                  >
                    <Printer className="w-4 h-4" /> พิมพ์ (PDF)
                  </button>
                </TD>
              </TR>
            ))}

            {sales.length === 0 && (
              <TR>
                <TD colSpan={6}>
                  <EmptyState icon={FileText} title="ยังไม่มีการออกใบกำกับภาษีเต็มรูป" />
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  )
}
