"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, ChevronDown, ChevronRight, MapPin, Package, Truck } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ReturnSaleDialog } from "@/components/returns/return-sale-dialog"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

const ranges = [
  { id: "today", label: "วันนี้" },
  { id: "week", label: "สัปดาห์นี้" },
  { id: "month", label: "เดือนนี้" },
  { id: "year", label: "ปีนี้" },
  { id: "all", label: "ทั้งหมด" },
]

type BillListClientProps = {
  sales: any[]
  activeRange: string
  canVoidSale: boolean
  canCreateReturn: boolean
}

export function BillListClient({ sales, activeRange, canVoidSale, canCreateReturn }: BillListClientProps) {
  const router = useRouter()
  const [voidingId, setVoidingId] = useState<number | null>(null)
  const [confirmVoidId, setConfirmVoidId] = useState<number | null>(null)
  const [returnSaleId, setReturnSaleId] = useState<number | null>(null)
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null)

  const handleRangeChange = (range: string) => {
    router.push(`/reports/bills?range=${range}`)
  }

  const handleVoid = async (id: number) => {
    setVoidingId(id)
    try {
      const res = await fetch(`/api/sales/${id}/void`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to void")
      toast.success("ยกเลิกบิลสำเร็จ", { description: "สต็อกถูกคืนเข้าระบบแล้ว" })
      router.refresh()
    } catch {
      toast.error("เกิดข้อผิดพลาดในการยกเลิกบิล")
    } finally {
      setVoidingId(null)
      setConfirmVoidId(null)
    }
  }

  const getDisplayStatus = (sale: any) => {
    if (sale.status === "VOID") {
      return { label: "ยกเลิกแล้ว", variant: "danger" as const, icon: <Ban className="w-3 h-3" /> }
    }

    const deliveryStatuses = (sale.deliveries || []).map((delivery: any) => delivery.status)
    if (deliveryStatuses.includes("FAILED")) return { label: "ส่งไม่สำเร็จ", variant: "danger" as const }
    if (deliveryStatuses.includes("PENDING")) return { label: "รอจัดส่ง", variant: "warning" as const }
    if (deliveryStatuses.includes("IN_TRANSIT")) return { label: "กำลังจัดส่ง", variant: "info" as const }

    if (sale.status === "PAID") return { label: "สมบูรณ์", variant: "success" as const }
    if (sale.status === "PARTIAL") return { label: "ชำระบางส่วน", variant: "info" as const }
    return { label: "ค้างชำระ", variant: "warning" as const }
  }

  const getDeliveryStatusText = (status: string) => {
    if (status === "PENDING") return "รอจัดส่ง"
    if (status === "IN_TRANSIT") return "กำลังจัดส่ง"
    if (status === "DELIVERED") return "ส่งสำเร็จ"
    if (status === "FAILED") return "ส่งไม่สำเร็จ"
    return status || "-"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
        {ranges.map((range) => (
          <button
            key={range.id}
            type="button"
            onClick={() => handleRangeChange(range.id)}
            className={`h-9 rounded-md px-3 text-sm font-semibold transition-colors cursor-pointer ${
              activeRange === range.id
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-primary"
            }`}
          >
            {range.label}
          </button>
        ))}
        <div className="ml-auto text-sm font-semibold text-slate-500">ทั้งหมด {sales.length} บิล</div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>เลขที่บิล</TH>
            <TH>วันที่/เวลา</TH>
            <TH>ลูกค้า</TH>
            <TH>ประเภท</TH>
            <TH className="text-right">ยอดรวม</TH>
            <TH className="text-center">สถานะ</TH>
            <TH className="text-center">จัดการ</TH>
          </TR>
        </THead>
        <TBody>
          {sales.map((sale: any) => {
            const isVoid = sale.status === "VOID"
            const isExpanded = expandedSaleId === sale.id
            const displayStatus = getDisplayStatus(sale)

            return (
              <Fragment key={sale.id}>
                <TR className={isVoid ? "opacity-50 bg-slate-50" : ""}>
                  <TD className="font-semibold text-slate-800">
                    <button
                      type="button"
                      onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                      className="inline-flex items-center gap-2 text-left font-semibold text-slate-800 hover:text-primary cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {sale.billNo}
                    </button>
                  </TD>
                  <TD className="text-slate-500">
                    {new Date(sale.saleDate).toLocaleString("th-TH", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TD>
                  <TD className="text-slate-700">{sale.customer?.name || "ลูกค้าทั่วไป"}</TD>
                  <TD>
                    <Badge
                      variant={
                        sale.paymentType === "CASH" ? "success" : sale.paymentType === "CREDIT" ? "warning" : "info"
                      }
                    >
                      {sale.paymentType}
                    </Badge>
                  </TD>
                  <TD className={`text-right font-bold ${isVoid ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    ฿{formatBaht(sale.grandTotal)}
                  </TD>
                  <TD className="text-center">
                    <Badge variant={displayStatus.variant}>
                      {displayStatus.icon} {displayStatus.label}
                    </Badge>
                  </TD>
                  <TD className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                        รายละเอียด
                      </Button>
                      {!isVoid && canCreateReturn && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnSaleId(sale.id)}
                          className="text-primary border-blue-200 hover:bg-blue-50"
                        >
                          รับคืน
                        </Button>
                      )}
                      {!isVoid && canVoidSale && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmVoidId(sale.id)}
                          disabled={voidingId === sale.id}
                          className="bg-white text-destructive border border-red-200 hover:bg-red-50 shadow-none"
                        >
                          {voidingId === sale.id ? "กำลังยกเลิก..." : "ยกเลิกบิล"}
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>

                {isExpanded && (
                  <TR className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TD colSpan={7} className="p-4">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <section className="rounded-md border border-slate-200 bg-white p-3">
                          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <Package className="h-4 w-4 text-primary" />
                            รายการสินค้า
                          </div>
                          <div className="space-y-2">
                            {(sale.items || []).map((item: any) => {
                              if (item.customUnitName && item.productUnit?.unit) {
                                item.productUnit.unit.name = item.customUnitName
                              }
                              return (
                              <div
                                key={item.id}
                                className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800">{item.customName || item.product?.name || "-"}</div>
                                  <div className="text-xs text-slate-500">
                                    {item.quantity} {item.productUnit?.unit?.name || ""} x ฿{formatBaht(item.unitPrice)}
                                  </div>
                                </div>
                                <div className="font-bold text-slate-900">฿{formatBaht(item.lineTotal)}</div>
                              </div>
                              )
                            })}
                            {(!sale.items || sale.items.length === 0) && (
                              <div className="text-sm text-slate-500">ไม่มีรายการสินค้า</div>
                            )}
                          </div>
                        </section>

                        <section className="rounded-md border border-slate-200 bg-white p-3">
                          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <Truck className="h-4 w-4 text-primary" />
                            รายละเอียดจัดส่ง
                          </div>
                          {(sale.deliveries || []).length > 0 ? (
                            <div className="space-y-3">
                              {sale.deliveries.map((delivery: any) => (
                                <div key={delivery.id} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={
                                        delivery.status === "DELIVERED"
                                          ? "success"
                                          : delivery.status === "FAILED"
                                            ? "danger"
                                            : delivery.status === "IN_TRANSIT"
                                              ? "info"
                                              : "warning"
                                      }
                                    >
                                      {getDeliveryStatusText(delivery.status)}
                                    </Badge>
                                    {delivery.isCOD && <Badge variant="danger">เก็บปลายทาง</Badge>}
                                  </div>
                                  <DetailRow label="ผู้รับ" value={delivery.recipientName || delivery.customer?.name || "-"} />
                                  <DetailRow label="เบอร์" value={[delivery.recipientPhone, delivery.recipientPhone2].filter(Boolean).join(", ") || "-"} />
                                  <DetailRow
                                    label="ผู้ส่ง"
                                    value={delivery.driver?.nickname || delivery.driver?.name || delivery.driverName || "-"}
                                  />
                                  <DetailRow
                                    label="รถส่ง"
                                    value={
                                      delivery.assignedVehicle
                                        ? `${delivery.assignedVehicle.plateNumber} ${delivery.assignedVehicle.brand || ""} ${delivery.assignedVehicle.model || ""}`.trim()
                                        : delivery.vehicle || "-"
                                    }
                                  />
                                  <div className="mt-2 flex items-start gap-2 text-slate-700">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    <div>
                                      <div className="font-semibold text-slate-500">ที่อยู่จัดส่ง</div>
                                      <div>{delivery.deliveryAddress || "-"}</div>
                                      {(delivery.subdistrictName || delivery.villageName || delivery.landmark) && (
                                        <div className="mt-1 text-xs text-slate-500">
                                          {[delivery.subdistrictName, delivery.villageName, delivery.landmark]
                                            .filter(Boolean)
                                            .join(" / ")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {delivery.note && <DetailRow label="หมายเหตุ" value={delivery.note} />}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">ไม่มีข้อมูลจัดส่งสำหรับบิลนี้</div>
                          )}
                        </section>
                      </div>
                    </TD>
                  </TR>
                )}
              </Fragment>
            )
          })}
          {sales.length === 0 && (
            <TR>
              <TD colSpan={7}>
                <EmptyState title="ยังไม่มีบิลในช่วงเวลานี้" />
              </TD>
            </TR>
          )}
        </TBody>
      </Table>

      <ConfirmDialog
        isOpen={confirmVoidId !== null}
        title="ยืนยันการยกเลิกบิล"
        message={`ยกเลิกบิล ${sales.find((sale: any) => sale.id === confirmVoidId)?.billNo}? สต็อกจะถูกคืนเข้าระบบอัตโนมัติ ไม่สามารถย้อนกลับได้`}
        confirmText="ยืนยันการยกเลิก"
        isDestructive={true}
        onCancel={() => setConfirmVoidId(null)}
        onConfirm={() => confirmVoidId && handleVoid(confirmVoidId)}
      />

      <ReturnSaleDialog
        saleId={returnSaleId}
        onClose={() => setReturnSaleId(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[78px_1fr] gap-2 py-1 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  )
}
