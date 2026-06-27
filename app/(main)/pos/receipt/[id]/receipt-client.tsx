"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ThermalReceipt } from "@/components/pos/ThermalReceipt"
import { TaxInvoice } from "@/components/pos/TaxInvoice"
import { ArrowLeft, Printer } from "lucide-react"

export function ReceiptClient({ sale }: { sale: any }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (sale.docType !== 'TAX_INVOICE') {
      // Auto-print thermal receipts
      window.print()
    }
  }, [sale.docType])

  if (!isClient) return null

  return (
    <div className="w-full flex flex-col items-center min-h-screen bg-slate-50 py-8">
      {/* Controls */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 print:hidden px-4">
        <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> กลับไปหน้าขาย
        </Button>
        {sale.docType !== 'TAX_INVOICE' && (
          <Button onClick={() => window.print()} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> พิมพ์บิลอีกครั้ง
          </Button>
        )}
      </div>

      {/* Render Document */}
      {sale.docType === 'TAX_INVOICE' ? (
        <div className="w-full max-w-4xl bg-white shadow-lg p-2 print:hidden rounded-lg">
          <TaxInvoice sale={sale} />
        </div>
      ) : (
        <div className="bg-white shadow-lg print:shadow-none p-4 print:p-0 rounded-lg">
          <ThermalReceipt sale={sale} />
        </div>
      )}
    </div>
  )
}
