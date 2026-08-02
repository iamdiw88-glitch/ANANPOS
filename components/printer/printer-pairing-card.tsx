"use client"

import { useState, useEffect } from "react"
import { Printer, CheckCircle2, AlertCircle, RefreshCw, Usb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  isWebUSBSupported,
  pairThermalPrinter,
  getPairedPrinters,
  sendToThermalPrinter,
  type USBDevice,
} from "@/lib/thermal-printer-client"
import { buildReceiptCommands } from "@/lib/escpos-builder"

export function PrinterPairingCard({ documentType = "receipt" }: { documentType?: string }) {
  const [supported, setSupported] = useState(true)
  const [pairedDevice, setPairedDevice] = useState<USBDevice | null>(null)
  const [loading, setLoading] = useState(false)
  const [testPrinting, setTestPrinting] = useState(false)

  useEffect(() => {
    const isSupported = isWebUSBSupported()
    setSupported(isSupported)

    if (isSupported) {
      getPairedPrinters().then((devices) => {
        if (devices.length > 0) {
          setPairedDevice(devices[0])
        }
      })
    }
  }, [])

  const handlePair = async () => {
    try {
      setLoading(true)
      const device = await pairThermalPrinter()
      setPairedDevice(device)

      // Save pairing info to server config
      await fetch(`/api/printer-config/${documentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultDeviceId: `usb-${device.vendorId}-${device.productId}`,
          usbVendorId: String(device.vendorId),
          usbProductId: String(device.productId),
        }),
      })

      toast.success(`เชื่อมต่อเครื่องพิมพ์ ${device.productName || "ESC/POS Thermal"} สำเร็จ`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "ไม่สามารถเชื่อมต่อเครื่องพิมพ์ได้")
    } finally {
      setLoading(false)
    }
  }

  const handleTestPrint = async () => {
    if (!pairedDevice) return
    try {
      setTestPrinting(true)
      const sampleData = {
        shopName: "ร้านอนันตกิจการค้า",
        saleNo: "TEST-0001",
        createdAt: new Date(),
        cashierName: "ทดสอบระบบ",
        items: [
          { name: "ปูนซีเมนต์ผสม 40kg", qty: "1", unit: "ถุง", price: "145.00", lineTotal: "145.00" },
          { name: "เหล็กเส้น RB9 6m", qty: "2", unit: "เส้น", price: "95.00", lineTotal: "190.00" },
        ],
        subtotal: "335.00",
        total: "335.00",
        paymentMethod: "เงินสด (ทดสอบ)",
        fulfillment: "pickup" as const,
        openCashDrawer: true,
      }

      const bytes = await buildReceiptCommands(sampleData)
      await sendToThermalPrinter(pairedDevice, bytes)
      toast.success("ส่งคำสั่งทดสอบพิมพ์สำเร็จ")
    } catch (err: any) {
      console.error(err)
      toast.error("พิมพ์ทดสอบไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดในการส่งข้อมูล"))
    } finally {
      setTestPrinting(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-heading text-base font-extrabold text-slate-900">
              เครื่องพิมพ์ใบเสร็จความร้อน (Thermal Printer)
            </h3>
            <p className="text-xs text-slate-500">
              {documentType === "receipt" ? "สำหรับพิมพ์สลิปและใบเสร็จรับเงิน" : "สำหรับพิมพ์เอกสารความร้อน"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {!supported ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              เบราว์เซอร์นี้ไม่รองรับการพิมพ์ผ่าน USB โดยตรง (WebUSB API) ระบบจะเปิดหน้าต่างพิมพ์ปกติของระบบปฏิบัติการแทน
            </span>
          </div>
        ) : pairedDevice ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">
                  เชื่อมต่อแล้ว: {pairedDevice.productName || `USB (${pairedDevice.vendorId}:${pairedDevice.productId})`}
                </span>
              </div>
              <Usb className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleTestPrint} disabled={testPrinting}>
                {testPrinting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                {testPrinting ? "กำลังพิมพ์..." : "ทดสอบพิมพ์สลิป"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handlePair} disabled={loading}>
                เปลี่ยนเครื่อง
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              ยังไม่ได้จับคู่เครื่องพิมพ์ความร้อนแบบ direct USB คลิกปุ่มด้านล่างเพื่อเลือกเครื่องพิมพ์
            </p>
            <Button type="button" size="sm" onClick={handlePair} disabled={loading}>
              <Usb className="h-4 w-4" />
              {loading ? "กำลังจับคู่..." : "เชื่อมต่อเครื่องพิมพ์สลิป"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
