"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  MapPin,
  Package,
  Phone,
  Printer,
  Save,
  Search,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type DeliveryStatus = "PENDING" | "IN_TRANSIT" | "DELIVERED" | "FAILED"
type BoardStatusFilter = "ALL" | "PENDING" | "IN_TRANSIT"
type DateFilter = "today" | "week" | "month" | "year" | "all"

const statusLabel: Record<DeliveryStatus, string> = {
  PENDING: "รอจัดส่ง",
  IN_TRANSIT: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  FAILED: "มีปัญหา",
}

const columns: Array<{
  id: DeliveryStatus
  title: string
  icon: LucideIcon
  badge: "warning" | "info" | "success" | "danger"
  shell: string
  iconClass: string
}> = [
  {
    id: "PENDING",
    title: "รอจัดส่ง",
    icon: CalendarClock,
    badge: "warning",
    shell: "border-amber-200 bg-amber-50/60",
    iconClass: "bg-amber-100 text-amber-700",
  },
  {
    id: "IN_TRANSIT",
    title: "กำลังจัดส่ง",
    icon: Truck,
    badge: "info",
    shell: "border-blue-200 bg-blue-50/60",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    id: "DELIVERED",
    title: "ส่งสำเร็จ",
    icon: CheckCircle,
    badge: "success",
    shell: "border-emerald-200 bg-emerald-50/60",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "FAILED",
    title: "มีปัญหา",
    icon: AlertCircle,
    badge: "danger",
    shell: "border-red-200 bg-red-50/60",
    iconClass: "bg-red-100 text-red-700",
  },
]

export function DeliveryBoard({ initialDeliveries }: { initialDeliveries: any[] }) {
  const [deliveries, setDeliveries] = useState(initialDeliveries)
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [deliveryCustomers, setDeliveryCustomers] = useState<any[]>([])
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(initialDeliveries[0]?.id ?? null)
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>("ALL")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [showCompleted, setShowCompleted] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/employees/drivers").then((res) => res.json()).catch(() => []),
      fetch("/api/vehicles/available").then((res) => res.json()).catch(() => []),
      fetch("/api/delivery-customers").then((res) => res.json()).catch(() => []),
    ]).then(([driverRows, vehicleRows, deliveryCustomerRows]) => {
      setDrivers(Array.isArray(driverRows) ? driverRows : [])
      setVehicles(Array.isArray(vehicleRows) ? vehicleRows : [])
      setDeliveryCustomers(Array.isArray(deliveryCustomerRows) ? deliveryCustomerRows : [])
    })
  }, [])

  const selectedDelivery = deliveries.find((delivery) => delivery.id === selectedDeliveryId) || null

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  const roundMoney = (value: number) => Math.round(value * 100) / 100

  const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10)

  const toDateTimeLocal = (value: string | Date | null | undefined) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60 * 1000)
    return local.toISOString().slice(0, 16)
  }

  const matchesDateFilter = useCallback((value: string | Date | null | undefined) => {
    if (dateFilter === "all") return true
    if (!value) return false

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (dateFilter === "today") {
      return startOfDate.getTime() === startOfToday.getTime()
    }

    if (dateFilter === "week") {
      const day = startOfToday.getDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      const startOfWeek = new Date(startOfToday)
      startOfWeek.setDate(startOfToday.getDate() + mondayOffset)
      return startOfDate >= startOfWeek && startOfDate <= startOfToday
    }

    if (dateFilter === "month") {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    }

    return date.getFullYear() === now.getFullYear()
  }, [dateFilter])

  const getRecipientName = useCallback((delivery: any) => (
    delivery.recipientName || delivery.deliveryCustomer?.name || delivery.customer?.name || "ลูกค้าหน้าร้าน"
  ), [])

  const getShortArea = useCallback((delivery: any) => {
    const pieces = [
      delivery.subdistrictName ? `ต.${delivery.subdistrictName}` : "",
      delivery.moo ? `หมู่ ${delivery.moo}` : "",
      delivery.villageName || "",
    ].filter(Boolean)
    return pieces.join(" ") || delivery.deliveryAddress || "-"
  }, [])

  const getCODRemainingAmount = (delivery: any) => {
    if (!delivery.isCOD) return 0
    return roundMoney(delivery.sale.grandTotal - delivery.sale.paidAmount)
  }

  const getCODCollectedAmount = (delivery: any) => {
    const value = Number(delivery.cashActualAmount)
    return Number.isFinite(value) ? value : 0
  }

  const canMarkDelivered = (delivery: any) => {
    if (!delivery.isCOD) return true
    return getCODCollectedAmount(delivery) >= getCODRemainingAmount(delivery)
  }

  const hasAssignedDriver = (delivery: any) => Boolean(delivery.driverId || delivery.driverName?.trim() || delivery.driver)
  const hasAssignedVehicle = (delivery: any) => Boolean(delivery.vehicleId || delivery.vehicle?.trim() || delivery.assignedVehicle)
  const canStartDelivery = (delivery: any) => hasAssignedDriver(delivery) && hasAssignedVehicle(delivery)

  const updateDeliveryField = (id: number, field: string, value: any) => {
    setDeliveries((prev) =>
      prev.map((delivery) => delivery.id === id ? { ...delivery, [field]: value } : delivery)
    )
  }

  const updateManualRecipientField = (id: number, field: string, value: any) => {
    setDeliveries((prev) =>
      prev.map((delivery) =>
        delivery.id === id ? { ...delivery, deliveryCustomerId: null, [field]: value } : delivery
      )
    )
  }

  const selectRecipient = (deliveryId: number, key: string) => {
    if (!key) {
      updateDeliveryField(deliveryId, "deliveryCustomerId", null)
      return
    }

    const selected = deliveryCustomers.find((item) => item.id === Number(key))
    if (!selected) return

    setDeliveries((prev) =>
      prev.map((delivery) =>
        delivery.id === deliveryId
          ? {
              ...delivery,
              deliveryCustomerId: selected.id,
              recipientName: selected.name || "",
              recipientPhone: normalizePhone(selected.phone || ""),
              recipientPhone2: normalizePhone(selected.phone2 || ""),
              deliveryAddress: selected.deliveryAddress || delivery.deliveryAddress,
              subdistrictId: selected.subdistrictId || null,
              subdistrictName: selected.subdistrictName || null,
              moo: selected.moo || null,
              villageName: selected.villageName || null,
              landmark: selected.landmark || null,
            }
          : delivery
      )
    )
  }

  const buildDeliveryPayload = (delivery: any, status: DeliveryStatus) => ({
    status,
    scheduledDate: delivery?.scheduledDate || null,
    driverName: delivery?.driverName || null,
    vehicle: delivery?.vehicle || null,
    driverId: delivery?.driverId ? Number(delivery.driverId) : null,
    vehicleId: delivery?.vehicleId ? Number(delivery.vehicleId) : null,
    deliveryCustomerId: delivery?.deliveryCustomerId ? Number(delivery.deliveryCustomerId) : null,
    deliveryAddress: delivery?.deliveryAddress || "",
    recipientName: delivery?.recipientName || null,
    recipientPhone: delivery?.recipientPhone || null,
    recipientPhone2: delivery?.recipientPhone2 || null,
    subdistrictId: delivery?.subdistrictId || null,
    subdistrictName: delivery?.subdistrictName || null,
    moo: delivery?.moo || null,
    villageName: delivery?.villageName || null,
    landmark: delivery?.landmark || null,
    note: delivery?.note || null,
    cashActualAmount: delivery?.cashActualAmount || null,
  })

  const updateStatus = async (id: number, newStatus: DeliveryStatus) => {
    const delivery = deliveries.find((item) => item.id === id)
    if (!delivery) return
    if (!delivery.deliveryAddress?.trim()) {
      alert("กรุณากรอกที่อยู่จัดส่ง")
      return
    }
    if (newStatus === "IN_TRANSIT" && !canStartDelivery(delivery)) {
      alert("กรุณาเลือกชื่อคนส่งและรถส่งก่อนเริ่มจัดส่ง")
      setSelectedDeliveryId(delivery.id)
      return
    }

    setIsLoading(id)
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildDeliveryPayload(delivery, newStatus)),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "Failed to update status")
      }

      const updated = await res.json()

      setDeliveries((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: updated.status,
                deliveredAt: updated.deliveredAt,
                scheduledDate: updated.scheduledDate,
                driverName: updated.driverName,
                vehicle: updated.vehicle,
                driverId: updated.driverId,
                vehicleId: updated.vehicleId,
                deliveryCustomerId: updated.deliveryCustomerId,
                deliveryAddress: updated.deliveryAddress,
                recipientName: updated.recipientName,
                recipientPhone: updated.recipientPhone,
                recipientPhone2: updated.recipientPhone2,
                subdistrictId: updated.subdistrictId,
                subdistrictName: updated.subdistrictName,
                moo: updated.moo,
                villageName: updated.villageName,
                landmark: updated.landmark,
                driver: updated.driver,
                assignedVehicle: updated.assignedVehicle,
                note: updated.note,
                cashSettledAt: updated.cashSettledAt,
                cashSettledById: updated.cashSettledById,
                cashExpectedAmount: updated.cashExpectedAmount,
                cashActualAmount: updated.cashActualAmount,
                cashDifference: updated.cashDifference,
              }
            : item
        )
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตสถานะ")
    } finally {
      setIsLoading(null)
    }
  }

  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return deliveries.filter((delivery) => {
      if (statusFilter !== "ALL" && delivery.status !== statusFilter) return false
      if (!matchesDateFilter(delivery.scheduledDate || delivery.deliveredAt || delivery.createdAt)) return false
      if (!query) return true

      const haystack = [
        delivery.sale?.billNo,
        getRecipientName(delivery),
        delivery.recipientPhone,
        delivery.deliveryAddress,
        delivery.driverName,
        delivery.vehicle,
        delivery.subdistrictName,
        delivery.villageName,
      ].filter(Boolean).join(" ").toLowerCase()

      return haystack.includes(query)
    })
  }, [deliveries, getRecipientName, matchesDateFilter, search, statusFilter])

  const completedDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return deliveries.filter((delivery) => {
      if (delivery.status !== "DELIVERED") return false
      if (!matchesDateFilter(delivery.deliveredAt || delivery.scheduledDate || delivery.createdAt)) return false
      if (!query) return true

      const haystack = [
        delivery.sale?.billNo,
        getRecipientName(delivery),
        delivery.recipientPhone,
        delivery.deliveryAddress,
        delivery.driverName,
        delivery.vehicle,
        delivery.subdistrictName,
        delivery.villageName,
      ].filter(Boolean).join(" ").toLowerCase()

      return haystack.includes(query)
    })
  }, [deliveries, getRecipientName, matchesDateFilter, search])

  const boardColumns = columns.filter((column) => column.id !== "DELIVERED" && column.id !== "FAILED")
  const activeColumns = statusFilter === "ALL"
    ? boardColumns
    : boardColumns.filter((column) => column.id === statusFilter)

  const summary = {
    pending: deliveries.filter((delivery) => delivery.status === "PENDING").length,
    transit: deliveries.filter((delivery) => delivery.status === "IN_TRANSIT").length,
    cod: deliveries.filter((delivery) => delivery.isCOD && delivery.status !== "DELIVERED").length,
    completed: completedDeliveries.length,
  }

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="rounded-md border border-border bg-white p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-xs font-semibold text-amber-700">รอส่ง</div>
                <div className="text-xl font-bold text-amber-900">{summary.pending}</div>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="text-xs font-semibold text-blue-700">กำลังส่ง</div>
                <div className="text-xl font-bold text-blue-900">{summary.transit}</div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <div className="text-xs font-semibold text-red-700">COD ค้างรับ</div>
                <div className="text-xl font-bold text-red-900">{summary.cod}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1 md:min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาบิล ลูกค้า เบอร์ พื้นที่"
                  className="input h-10 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                className="select h-10 px-2 text-sm"
              >
                <option value="all">ทั้งหมด</option>
                <option value="today">วันนี้</option>
                <option value="week">สัปดาห์นี้</option>
                <option value="month">เดือนนี้</option>
                <option value="year">ปีนี้</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as BoardStatusFilter)}
                className="select h-10 px-2 text-sm"
              >
                <option value="ALL">ทุกสถานะ</option>
                {boardColumns.map((column) => (
                  <option key={column.id} value={column.id}>{column.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-emerald-200 bg-emerald-50/70">
          <button
            type="button"
            onClick={() => setShowCompleted((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-emerald-100/60"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-900">ส่งสำเร็จ</div>
                <div className="text-xs text-emerald-700">ซ่อนไว้เพื่อลดความแน่นของบอร์ด</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">{summary.completed}</Badge>
              <ChevronRight className={`h-4 w-4 text-emerald-700 transition-transform ${showCompleted ? "rotate-90" : ""}`} />
            </div>
          </button>
          {showCompleted && (
            <div className="max-h-64 space-y-2 overflow-y-auto border-t border-emerald-200 p-2.5">
              {completedDeliveries.length === 0 ? (
                <div className="rounded-md border border-dashed border-emerald-200 bg-white/70 px-3 py-6 text-center text-sm font-semibold text-emerald-700">
                  ไม่มีรายการส่งสำเร็จในช่วงเวลานี้
                </div>
              ) : (
                completedDeliveries.map((delivery) => (
                  <button
                    key={delivery.id}
                    type="button"
                    onClick={() => setSelectedDeliveryId(delivery.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left transition-colors hover:border-emerald-300 ${
                      selectedDeliveryId === delivery.id ? "border-emerald-500 ring-2 ring-emerald-100" : "border-emerald-100"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{getRecipientName(delivery)}</div>
                      <div className="truncate text-xs text-slate-500">{delivery.sale.billNo} · {getShortArea(delivery)}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleDateString("th-TH") : "-"}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto pb-2">
          <div className="grid h-full min-w-[680px] grid-cols-2 gap-3">
            {activeColumns.map((column) => {
              const columnDeliveries = filteredDeliveries.filter((delivery) => delivery.status === column.id)
              const ColumnIcon = column.icon

              return (
                <section key={column.id} className={`flex min-h-0 flex-col rounded-md border ${column.shell}`}>
                  <div className="flex items-center justify-between border-b border-white/70 bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${column.iconClass}`}>
                        <ColumnIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">{column.title}</h2>
                        <p className="text-xs text-slate-500">แสดงเฉพาะข้อมูลจำเป็น</p>
                      </div>
                    </div>
                    <Badge variant={column.badge}>{columnDeliveries.length}</Badge>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
                    {columnDeliveries.length === 0 ? (
                      <div className="flex h-28 items-center justify-center rounded-md border-2 border-dashed border-slate-200 bg-white/70 text-sm font-semibold text-slate-400">
                        ไม่มีรายการ
                      </div>
                    ) : (
                      columnDeliveries.map((delivery) => (
                        <button
                          key={delivery.id}
                          type="button"
                          onClick={() => setSelectedDeliveryId(delivery.id)}
                          className={`w-full rounded-md border bg-white p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${
                            selectedDeliveryId === delivery.id ? "border-primary ring-2 ring-primary/15" : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{getRecipientName(delivery)}</div>
                              <div className="mt-0.5 font-mono text-xs text-slate-500">{delivery.sale.billNo}</div>
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </div>

                          <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">{getShortArea(delivery)}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {delivery.isCOD && (
                              <Badge variant="danger">COD ฿{formatBaht(getCODRemainingAmount(delivery))}</Badge>
                            )}
                            <Badge variant={hasAssignedDriver(delivery) ? "neutral" : "warning"}>
                              คนส่ง: {delivery.driver?.nickname || delivery.driverName || "ยังไม่เลือก"}
                            </Badge>
                            <Badge variant={hasAssignedVehicle(delivery) ? "info" : "warning"}>
                              รถ: {delivery.assignedVehicle?.plateNumber || delivery.vehicle || "ยังไม่เลือก"}
                            </Badge>
                          </div>

                          <div className="mt-3 flex gap-2">
                            {delivery.status === "PENDING" && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                disabled={isLoading === delivery.id || !canStartDelivery(delivery)}
                                title={!canStartDelivery(delivery) ? "ต้องเลือกคนส่งและรถส่งก่อน" : undefined}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  updateStatus(delivery.id, "IN_TRANSIT")
                                }}
                              >
                                <Truck className="h-3.5 w-3.5" />
                                เริ่มส่ง
                              </Button>
                            )}
                            {delivery.status === "IN_TRANSIT" && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                className="flex-1"
                                disabled={isLoading === delivery.id || !canMarkDelivered(delivery)}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  updateStatus(delivery.id, "DELIVERED")
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                ส่งสำเร็จ
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedDeliveryId(delivery.id)
                              }}
                            >
                              รายละเอียด
                            </Button>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>

      <aside className="hidden h-full w-[390px] shrink-0 overflow-hidden rounded-md border border-border bg-white shadow-sm lg:flex lg:flex-col">
        {selectedDelivery ? (
          <DeliveryDetailPanel
            delivery={selectedDelivery}
            deliveryCustomers={deliveryCustomers}
            drivers={drivers}
            vehicles={vehicles}
            isLoading={isLoading === selectedDelivery.id}
            formatBaht={formatBaht}
            toDateTimeLocal={toDateTimeLocal}
            normalizePhone={normalizePhone}
            selectRecipient={selectRecipient}
            updateDeliveryField={updateDeliveryField}
            updateManualRecipientField={updateManualRecipientField}
            updateStatus={updateStatus}
            getCODRemainingAmount={getCODRemainingAmount}
            canMarkDelivered={canMarkDelivered}
            canStartDelivery={canStartDelivery}
            onClose={() => setSelectedDeliveryId(null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
            <ClipboardList className="mb-3 h-10 w-10" />
            <p className="text-sm font-semibold">เลือกการ์ดเพื่อดูรายละเอียด</p>
          </div>
        )}
      </aside>

      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 lg:hidden">
          <div className="ml-auto h-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
            <DeliveryDetailPanel
              delivery={selectedDelivery}
              deliveryCustomers={deliveryCustomers}
              drivers={drivers}
              vehicles={vehicles}
              isLoading={isLoading === selectedDelivery.id}
              formatBaht={formatBaht}
              toDateTimeLocal={toDateTimeLocal}
              normalizePhone={normalizePhone}
              selectRecipient={selectRecipient}
              updateDeliveryField={updateDeliveryField}
              updateManualRecipientField={updateManualRecipientField}
              updateStatus={updateStatus}
              getCODRemainingAmount={getCODRemainingAmount}
              canMarkDelivered={canMarkDelivered}
              canStartDelivery={canStartDelivery}
              onClose={() => setSelectedDeliveryId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function DeliveryDetailPanel({
  delivery,
  deliveryCustomers,
  drivers,
  vehicles,
  isLoading,
  formatBaht,
  toDateTimeLocal,
  normalizePhone,
  selectRecipient,
  updateDeliveryField,
  updateManualRecipientField,
  updateStatus,
  getCODRemainingAmount,
  canMarkDelivered,
  canStartDelivery,
  onClose,
}: any) {
  const vehicleOptions = vehicles
    .concat(delivery.assignedVehicle ? [delivery.assignedVehicle] : [])
    .filter((vehicle: any, index: number, rows: any[]) => rows.findIndex((item) => item.id === vehicle.id) === index)

  const handlePrintDeliveryNote = async () => {
    try {
      const res = await fetch(`/api/print/delivery-note/${delivery.id}`, {
        method: "POST",
      })
      if (!res.ok) {
        alert("ไม่สามารถสร้าง PDF ใบส่งของได้")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch {
      alert("เกิดข้อผิดพลาดในการพิมพ์ใบส่งของ")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={delivery.status === "DELIVERED" ? "success" : delivery.status === "IN_TRANSIT" ? "info" : delivery.status === "FAILED" ? "danger" : "warning"}>
              {statusLabel[delivery.status as DeliveryStatus] || delivery.status}
            </Badge>
            {delivery.isCOD && <Badge variant="danger">COD</Badge>}
          </div>
          <h3 className="mt-2 truncate text-base font-bold text-slate-900">
            {delivery.recipientName || delivery.customer?.name || "ลูกค้าหน้าร้าน"}
          </h3>
          <p className="font-mono text-xs text-slate-500">{delivery.sale.billNo}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" onClick={handlePrintDeliveryNote} title="พิมพ์ใบส่งของ A4">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">พิมพ์ใบส่งของ</span>
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-2">
          <SectionTitle icon={UserRound} title="ผู้รับและที่อยู่" />
          <select
            value={delivery.deliveryCustomerId || ""}
            onChange={(event) => selectRecipient(delivery.id, event.target.value)}
            className="select h-10 px-2 text-sm"
          >
            <option value="">เลือกผู้รับจากลิสต์ หรือกรอกเอง</option>
            {deliveryCustomers.map((customer: any) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={delivery.recipientName || ""}
              onChange={(event) => updateManualRecipientField(delivery.id, "recipientName", event.target.value)}
              placeholder="ชื่อผู้รับ"
              className="input h-10 px-2 text-sm"
            />
            <input
              type="tel"
              inputMode="tel"
              value={delivery.recipientPhone || ""}
              onChange={(event) => updateManualRecipientField(delivery.id, "recipientPhone", normalizePhone(event.target.value))}
              placeholder="เบอร์ผู้รับ"
              maxLength={10}
              className="input h-10 px-2 text-sm"
            />
            <input
              type="tel"
              inputMode="tel"
              value={delivery.recipientPhone2 || ""}
              onChange={(event) => updateManualRecipientField(delivery.id, "recipientPhone2", normalizePhone(event.target.value))}
              placeholder="เบอร์สำรอง"
              maxLength={10}
              className="input h-10 px-2 text-sm"
            />
            <input
              type="text"
              value={delivery.subdistrictName || ""}
              onChange={(event) => updateManualRecipientField(delivery.id, "subdistrictName", event.target.value)}
              placeholder="ตำบล/พื้นที่"
              className="input h-10 px-2 text-sm"
            />
          </div>
          <textarea
            value={delivery.deliveryAddress || ""}
            onChange={(event) => updateManualRecipientField(delivery.id, "deliveryAddress", event.target.value)}
            placeholder="ที่อยู่จัดส่ง"
            rows={3}
            className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm"
          />
          {(delivery.recipientPhone || delivery.customer?.phone) && (
            <a
              href={`tel:${delivery.recipientPhone || delivery.customer?.phone}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              <Phone className="h-4 w-4" />
              {delivery.recipientPhone || delivery.customer?.phone}
            </a>
          )}
        </section>

        <section className="space-y-2">
          <SectionTitle icon={Truck} title="คนขับและรถ" />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={toDateTimeLocal(delivery.scheduledDate)}
              onChange={(event) => updateDeliveryField(delivery.id, "scheduledDate", event.target.value)}
              className="input h-10 px-2 text-sm"
            />
            <select
              value={delivery.driverId || ""}
              onChange={(event) => {
                const driver = drivers.find((item: any) => item.id === Number(event.target.value))
                updateDeliveryField(delivery.id, "driverId", event.target.value)
                updateDeliveryField(delivery.id, "driverName", driver ? driver.nickname || driver.name : "")
              }}
              className="select h-10 px-2 text-sm"
            >
              <option value="">{delivery.driverName || "เลือกผู้ส่ง"}</option>
              {drivers.map((driver: any) => (
                <option key={driver.id} value={driver.id}>
                  {driver.nickname || driver.name}
                  {driver.phone ? ` - ${driver.phone}` : ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={delivery.driverName || ""}
              onChange={(event) => {
                updateDeliveryField(delivery.id, "driverId", null)
                updateDeliveryField(delivery.id, "driverName", event.target.value)
              }}
              placeholder="พิมพ์ชื่อผู้ส่งเอง"
              className="input h-10 px-2 text-sm"
            />
            <select
              value={delivery.vehicleId || ""}
              onChange={(event) => {
                const vehicle = vehicleOptions.find((item: any) => item.id === Number(event.target.value))
                updateDeliveryField(delivery.id, "vehicleId", event.target.value)
                updateDeliveryField(delivery.id, "vehicle", vehicle ? vehicle.plateNumber : "")
              }}
              className="select h-10 px-2 text-sm"
            >
              <option value="">{delivery.vehicle || "เลือกรถส่ง"}</option>
              {vehicleOptions.map((vehicle: any) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} {vehicle.brand || ""} {vehicle.model || ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={delivery.vehicle || ""}
              onChange={(event) => {
                updateDeliveryField(delivery.id, "vehicleId", null)
                updateDeliveryField(delivery.id, "vehicle", event.target.value)
              }}
              placeholder="พิมพ์รถส่งเอง"
              className="input h-10 px-2 text-sm"
            />
          </div>
          <input
            type="text"
            value={delivery.note || ""}
            onChange={(event) => updateDeliveryField(delivery.id, "note", event.target.value)}
            placeholder="หมายเหตุจัดส่ง"
            className="input h-10 px-2 text-sm"
          />
        </section>

        <section className="space-y-2">
          <SectionTitle icon={Package} title={`รายการสินค้า (${delivery.sale.items.length})`} />
          <div className="rounded-md border border-slate-200">
            {delivery.sale.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                <span className="min-w-0 truncate font-medium text-slate-700">{item.customName || item.product.name}</span>
                <span className="shrink-0 text-slate-500">{item.quantity} {item.customUnitName || item.productUnit.unit.name}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <span>ยอดบิล</span>
            <span>฿{formatBaht(delivery.sale.grandTotal)}</span>
          </div>
        </section>

        {delivery.isCOD && (
          <section className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between text-sm font-bold text-amber-900">
              <span>ยอดเก็บปลายทาง</span>
              <span>฿{formatBaht(getCODRemainingAmount(delivery))}</span>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={delivery.cashActualAmount ?? ""}
              onChange={(event) => updateDeliveryField(delivery.id, "cashActualAmount", event.target.value)}
              placeholder="กรอกยอดเงินที่รับได้"
              className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-right text-sm font-bold text-slate-900"
            />
            {!canMarkDelivered(delivery) && delivery.status === "IN_TRANSIT" && (
              <p className="text-xs font-medium text-amber-800">ต้องกรอกยอดเงินปลายทางให้ครบก่อนกดส่งสำเร็จ</p>
            )}
          </section>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => updateStatus(delivery.id, delivery.status)}
            disabled={isLoading}
          >
            <Save className="h-4 w-4" />
            บันทึก
          </Button>
          {delivery.status === "PENDING" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => updateStatus(delivery.id, "IN_TRANSIT")}
              disabled={isLoading || !canStartDelivery(delivery)}
              title={!canStartDelivery(delivery) ? "ต้องเลือกคนส่งและรถส่งก่อน" : undefined}
            >
              <Truck className="h-4 w-4" />
              เริ่มส่ง
            </Button>
          )}
          {delivery.status === "IN_TRANSIT" && (
            <>
              <Button type="button" variant="ghost" onClick={() => updateStatus(delivery.id, "PENDING")} disabled={isLoading}>
                ย้อนกลับ
              </Button>
              <Button type="button" variant="primary" onClick={() => updateStatus(delivery.id, "DELIVERED")} disabled={isLoading || !canMarkDelivered(delivery)}>
                <CheckCircle className="h-4 w-4" />
                ส่งสำเร็จ
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
  )
}
