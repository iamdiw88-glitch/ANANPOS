"use client"

import Link from "next/link"
import { ArrowLeft, Printer, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InvoiceDetailClient({ invoice }: { invoice: any }) {
  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto w-full">
      {/* Header & Actions (Hidden in Print) */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/ar" className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm border border-border">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg font-heading font-bold text-slate-800 tracking-tight">ใบวางบิล {invoice.invoiceNo}</h1>
            <p className="text-sm text-slate-500 mt-0.5">รายละเอียดใบวางบิลและประวัติการชำระเงิน</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> พิมพ์เอกสาร
          </Button>
          {invoice.status !== "PAID" && (
            <Link href={`/ar/payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`}>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Receipt className="w-4 h-4" /> รับชำระเงิน
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* A4 Printable Area */}
      <div className="mx-auto w-full max-w-[210mm] rounded-lg border border-border bg-white p-4 shadow-sm sm:min-h-[297mm] sm:p-8 lg:p-10 print:min-h-[297mm] print:border-none print:p-0 print:shadow-none">

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-slate-900">ใบวางบิล / INVOICE</h2>
        </div>

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="font-bold text-slate-800">{invoice.customer.name}</p>
            <p className="text-sm text-slate-600 mt-1">{invoice.customer.address || "ไม่ระบุที่อยู่"}</p>
            <p className="text-sm text-slate-600">โทร: {invoice.customer.phone || "-"}</p>
            {invoice.customer.taxId && <p className="text-sm text-slate-600">เลขประจำตัวผู้เสียภาษี: {invoice.customer.taxId}</p>}
          </div>
          <div className="text-right border border-border p-3 rounded-md bg-slate-50">
            <p className="text-xs text-slate-500">เลขที่ใบวางบิล</p>
            <p className="font-bold text-slate-800 mb-2">{invoice.invoiceNo}</p>

            <p className="text-xs text-slate-500">วันที่วางบิล</p>
            <p className="text-sm font-medium text-slate-800 mb-2">{new Date(invoice.invoiceDate).toLocaleDateString('th-TH')}</p>

            <p className="text-xs text-slate-500">วันครบกำหนด</p>
            <p className="font-bold text-red-600">{new Date(invoice.dueDate).toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        {/* Bills Table */}
        <div className="touch-scroll mb-8 overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm print:min-w-0">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-200 text-slate-800">
              <th className="p-2.5 border-r border-slate-200 w-12 text-center">ลำดับ</th>
              <th className="p-2.5 border-r border-slate-200">วันที่บิล</th>
              <th className="p-2.5 border-r border-slate-200">เลขที่บิลอ้างอิง</th>
              <th className="p-2.5 border-r border-slate-200 text-right">ยอดรวมบิล</th>
              <th className="p-2.5 text-right">ยอดที่ต้องชำระ</th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoiceSales.map((is: any, index: number) => (
              <tr key={is.saleId} className="border-b border-slate-200">
                <td className="p-2.5 border-r border-slate-200 text-center">{index + 1}</td>
                <td className="p-2.5 border-r border-slate-200">{new Date(is.sale.saleDate).toLocaleDateString('th-TH')}</td>
                <td className="p-2.5 border-r border-slate-200">{is.sale.billNo}</td>
                <td className="p-2.5 border-r border-slate-200 text-right">{formatBaht(is.sale.grandTotal)}</td>
                <td className="p-2.5 text-right font-bold">{formatBaht(is.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-b-2 border-slate-800">
              <td colSpan={4} className="p-2.5 text-right font-bold text-slate-800 border-r border-slate-200">
                รวมเงินที่ต้องชำระทั้งสิ้น
              </td>
              <td className="p-2.5 text-right font-black text-base text-slate-900">
                ฿{formatBaht(invoice.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>

        {/* Status / Balance */}
        <div className="flex justify-between items-center mb-12 text-sm">
          <div>
            <p className="text-slate-600">สถานะ:
              {invoice.status === "PAID" ? <span className="ml-2 font-bold text-emerald-600">ชำระครบแล้ว</span> :
               invoice.status === "PARTIAL" ? <span className="ml-2 font-bold text-orange-600">ชำระบางส่วน</span> :
               <span className="ml-2 font-bold text-red-600">รอชำระ</span>}
            </p>
          </div>
          {invoice.status !== "OPEN" && (
            <div className="text-right">
              <p className="text-slate-600">ชำระแล้ว: <span className="font-bold text-emerald-600">฿{formatBaht(invoice.paidAmount)}</span></p>
              {invoice.balance > 0 && (
                <p className="text-slate-600 mt-1">ยอดคงค้าง: <span className="font-bold text-red-600 text-lg">฿{formatBaht(invoice.balance)}</span></p>
              )}
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-16 print:mt-32 print:grid-cols-2">
          <div className="text-center">
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-sm text-slate-600">ผู้รับบิล (ลูกค้า)</p>
            <p className="text-sm text-slate-500 mt-1">วันที่ _______/_______/_______</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-8"></div>
            <p className="text-sm text-slate-600">ผู้วางบิล</p>
            <p className="text-sm text-slate-500 mt-1">{invoice.createdBy?.name || "พนักงาน"}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
