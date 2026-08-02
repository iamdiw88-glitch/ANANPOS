"use client"

import { useState } from "react"
import { toast } from "sonner"
import { isWebUSBSupported, getPairedPrinters, sendToThermalPrinter } from "@/lib/thermal-printer-client"
import { buildReceiptCommands } from "@/lib/escpos-builder"

export function usePrintReceipt() {
  const [isPrinting, setIsPrinting] = useState(false)

  async function printReceipt(saleId: number | string) {
    setIsPrinting(true)
    let printJobId: string | null = null

    try {
      // 1. Fetch receipt data from server
      const res = await fetch(`/api/print/receipt/${saleId}`, {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถเตรียมข้อมูลใบเสร็จได้")
      }

      printJobId = data.printJobId
      const receiptData = data.receiptData

      // 2. Build ESC/POS bytes
      const bytes = await buildReceiptCommands(receiptData)

      // 3. Try WebUSB printing
      let webUsbSuccess = false
      if (isWebUSBSupported()) {
        const paired = await getPairedPrinters()
        if (paired.length > 0) {
          try {
            await sendToThermalPrinter(paired[0], bytes)
            webUsbSuccess = true

            // Log completion
            if (printJobId) {
              await fetch(`/api/print/jobs/${printJobId}/complete`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "printed" }),
              })
            }
            toast.success("พิมพ์ใบเสร็จสำเร็จ")
          } catch (err: any) {
            console.warn("WebUSB print failed, using fallback:", err)
          }
        }
      }

      // 4. Fallback if WebUSB is unavailable or failed
      if (!webUsbSuccess) {
        // Fallback: Trigger standard browser printing
        triggerBrowserReceiptPrint(receiptData)

        if (printJobId) {
          await fetch(`/api/print/jobs/${printJobId}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "printed", errorMessage: "used browser fallback" }),
          })
        }
        toast.info("พิมพ์ใบเสร็จผ่านเบราว์เซอร์")
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ")

      if (printJobId) {
        await fetch(`/api/print/jobs/${printJobId}/complete`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "failed", errorMessage: err.message }),
        })
      }
    } finally {
      setIsPrinting(false)
    }
  }

  return { printReceipt, isPrinting }
}

function triggerBrowserReceiptPrint(receiptData: any) {
  const printWindow = window.open("", "_blank", "width=400,height=600")
  if (!printWindow) return

  const itemsHtml = receiptData.items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 4px 0;">${item.name}<br/><span style="font-size: 11px; color: #666;">${item.qty} ${item.unit} x ${item.price}</span></td>
      <td style="text-align: right; vertical-align: top; padding: 4px 0;">${item.lineTotal}</td>
    </tr>
  `
    )
    .join("")

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt ${receiptData.saleNo}</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="text-center bold" style="font-size: 16px;">${receiptData.shopName}</div>
        <div class="text-center">ใบเสร็จรับเงิน</div>
        <div class="line"></div>
        <div>เลขที่: ${receiptData.saleNo}</div>
        <div>พนักงาน: ${receiptData.cashierName}</div>
        ${receiptData.customerName ? `<div>ลูกค้า: ${receiptData.customerName}</div>` : ""}
        <div class="line"></div>
        <table>${itemsHtml}</table>
        <div class="line"></div>
        <table style="font-size: 13px;">
          <tr><td>รวมเป็นเงิน</td><td class="text-right">${receiptData.subtotal}</td></tr>
          ${receiptData.discount ? `<tr><td>ส่วนลด</td><td class="text-right">-${receiptData.discount}</td></tr>` : ""}
          <tr class="bold"><td>สุทธิ</td><td class="text-right">${receiptData.total}</td></tr>
        </table>
        <div style="margin-top: 6px;">ชำระโดย: ${receiptData.paymentMethod}</div>
        <div class="line"></div>
        <div class="text-center" style="margin-top: 15px;">ขอบคุณที่ใช้บริการ</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
