"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Fuel, History, Pencil, Plus, Search, Settings, Trash2, Truck, Wrench, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"

type VehicleType = "TRUCK" | "PICKUP" | "MOTORCYCLE" | "LIFT" | "FORKLIFT" | "LOADER" | "OTHER"

type VehicleAlert = {
  vehicleId: number
  type: "insurance" | "tax" | "inspection"
  daysLeft: number
  severity: "expired" | "critical" | "warning"
}

type Vehicle = {
  id: number
  vehicleCode: string
  plateNumber: string
  vehicleType: VehicleType
  brand?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  insuranceExpiry?: string | Date | null
  taxExpiry?: string | Date | null
  inspectionExpiry?: string | Date | null
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE"
  note?: string | null
  isActive: boolean
  alerts?: VehicleAlert[]
  fuelSummary?: { totalLiters: number; count: number }
}

type Employee = {
  id: number
  name: string
  nickname?: string | null
}

type DieselStock = {
  capacityLiters: number
  balanceLiters: number
  usedThisMonthLiters: number
}

type VehicleHistory = {
  fuelLogs: Array<{ id: number; liters: number; fuelDate: string; note?: string | null; driver?: { name: string; nickname?: string | null } | null }>
  maintenanceLogs: Array<{ id: number; type: string; description: string; cost: number; odometer?: number | null; shop?: string | null; date: string; note?: string | null; completedAt?: string | null }>
}

type DieselHistoryLog = {
  id: number
  type: string
  liters: number
  balanceAfter: number
  recordedAt: string | Date
  companyName?: string | null
  note?: string | null
  employeeName?: string | null
  vehiclePlate?: string | null
}

const vehicleFormInitial = {
  plateNumber: "",
  vehicleType: "TRUCK" as VehicleType,
  brand: "",
  model: "",
  year: "",
  color: "",
  insuranceExpiry: "",
  taxExpiry: "",
  inspectionExpiry: "",
  status: "AVAILABLE" as Vehicle["status"],
  note: "",
}

const fuelFormInitial = {
  driverId: "",
  liters: "",
  fuelDate: new Date().toISOString().slice(0, 10),
  note: "",
}

const stockInFormInitial = {
  recordedAt: new Date().toISOString().slice(0, 10),
  liters: "",
  companyName: "",
  employeeId: "",
}

const stockAdjustmentFormInitial = {
  balanceLiters: "",
  note: "",
}

const maintenanceFormInitial = {
  type: "REPAIR",
  description: "",
  cost: "0",
  odometer: "",
  shop: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
}

const statusText = {
  AVAILABLE: "ว่าง",
  IN_USE: "กำลังใช้งาน",
  MAINTENANCE: "ซ่อมอยู่",
}

const typeText: Record<VehicleType, string> = {
  TRUCK: "รถบรรทุก",
  PICKUP: "รถกระบะ",
  MOTORCYCLE: "มอเตอร์ไซค์",
  LIFT: "รถยกของ",
  FORKLIFT: "โฟคลิฟท์",
  LOADER: "รถตักทราย/หิน",
  OTHER: "รถอื่น ๆ",
}

const alertText = {
  insurance: "ประกัน",
  tax: "ภาษี",
  inspection: "ตรวจสภาพ",
}

export function VehiclesClient({
  initialVehicles,
  initialDrivers,
  initialDieselStock,
  canManageVehicles,
}: {
  initialVehicles: Vehicle[]
  initialDrivers: Employee[]
  initialDieselStock: DieselStock
  canManageVehicles: boolean
}) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [employees] = useState(initialDrivers)
  const [dieselStock, setDieselStock] = useState(initialDieselStock)
  const [query, setQuery] = useState("")
  const [vehicleForm, setVehicleForm] = useState(vehicleFormInitial)
  const [fuelForm, setFuelForm] = useState(fuelFormInitial)
  const [stockInForm, setStockInForm] = useState(stockInFormInitial)
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState(stockAdjustmentFormInitial)
  const [maintenanceForm, setMaintenanceForm] = useState(maintenanceFormInitial)
  const [modal, setModal] = useState<"vehicle" | "fuel" | "maintenance" | "stockIn" | "stockAdjustment" | "history" | "stockHistory" | "deleteConfirm" | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [dieselHistory, setDieselHistory] = useState<DieselHistoryLog[]>([])
  const [dieselHistoryLoading, setDieselHistoryLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "IN_USE" | "MAINTENANCE">("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")

  const counts = useMemo(() => {
    return {
      ALL: vehicles.length,
      AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
      IN_USE: vehicles.filter((v) => v.status === "IN_USE").length,
      MAINTENANCE: vehicles.filter((v) => v.status === "MAINTENANCE").length,
    }
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return vehicles.filter((vehicle) => {
      if (statusFilter !== "ALL" && vehicle.status !== statusFilter) return false
      if (typeFilter !== "ALL" && vehicle.vehicleType !== typeFilter) return false
      if (!keyword) return true
      return [vehicle.vehicleCode, vehicle.plateNumber, vehicle.brand, vehicle.model, vehicle.status, typeText[vehicle.vehicleType]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
  }, [query, statusFilter, typeFilter, vehicles])

  const alerts = vehicles.flatMap((vehicle) => (vehicle.alerts || []).map((alert) => ({ ...alert, vehicle })))
  const stockPct = dieselStock.capacityLiters > 0 ? Math.max(0, Math.min(100, (dieselStock.balanceLiters / dieselStock.capacityLiters) * 100)) : 0

  const reloadDieselStock = async () => {
    const res = await fetch("/api/diesel-stock")
    if (!res.ok) return
    setDieselStock(await res.json())
  }

  const openDieselHistory = async () => {
    setDieselHistory([])
    setDieselHistoryLoading(true)
    setModal("stockHistory")
    try {
      const res = await fetch("/api/diesel-stock/history")
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "โหลดประวัติสต็อกน้ำมันไม่สำเร็จ")
      setDieselHistory(json)
    } catch (error) {
      alert(error instanceof Error ? error.message : "โหลดประวัติสต็อกน้ำมันไม่สำเร็จ")
      setModal(null)
    } finally {
      setDieselHistoryLoading(false)
    }
  }

  const saveVehicle = async (event: React.FormEvent) => {
    event.preventDefault()
    const res = await fetch(editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles", {
      method: editingVehicle ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...vehicleForm,
        year: vehicleForm.year || null,
        insuranceExpiry: vehicleForm.insuranceExpiry || null,
        taxExpiry: vehicleForm.taxExpiry || null,
        inspectionExpiry: vehicleForm.inspectionExpiry || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "บันทึกรถไม่สำเร็จ")
      return
    }
    setVehicles((prev) => editingVehicle
      ? prev.map((vehicle) => vehicle.id === editingVehicle.id ? { ...json, alerts: vehicle.alerts || [], fuelSummary: vehicle.fuelSummary } : vehicle)
      : [{ ...json, alerts: [], fuelSummary: { totalLiters: 0, count: 0 } }, ...prev])
    setVehicleForm(vehicleFormInitial)
    setEditingVehicle(null)
    setModal(null)
  }

  const openCreateVehicle = () => {
    setEditingVehicle(null)
    setVehicleForm(vehicleFormInitial)
    setModal("vehicle")
  }

  const editVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setVehicleForm({
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year ? String(vehicle.year) : "",
      color: vehicle.color || "",
      insuranceExpiry: toDateInput(vehicle.insuranceExpiry),
      taxExpiry: toDateInput(vehicle.taxExpiry),
      inspectionExpiry: toDateInput(vehicle.inspectionExpiry),
      status: vehicle.status,
      note: vehicle.note || "",
    })
    setModal("vehicle")
  }

  const deleteVehicle = async () => {
    if (!editingVehicle) return
    const res = await fetch(`/api/vehicles/${editingVehicle.id}`, { method: "DELETE" })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "ลบรถไม่สำเร็จ")
      return
    }
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== editingVehicle.id))
    setEditingVehicle(null)
    setVehicleForm(vehicleFormInitial)
    setModal(null)
  }

  const createFuelLog = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedVehicle) return
    const liters = Number(fuelForm.liters || 0)
    const res = await fetch(`/api/vehicles/${selectedVehicle.id}/fuel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: fuelForm.driverId,
        liters,
        fuelDate: fuelForm.fuelDate,
        note: fuelForm.note || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "บันทึกน้ำมันไม่สำเร็จ")
      return
    }
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === selectedVehicle.id
          ? {
              ...vehicle,
              fuelSummary: {
                totalLiters: (vehicle.fuelSummary?.totalLiters || 0) + liters,
                count: (vehicle.fuelSummary?.count || 0) + 1,
              },
            }
          : vehicle
      )
    )
    await reloadDieselStock()
    setFuelForm(fuelFormInitial)
    setModal(null)
    alert("บันทึกเติมน้ำมันแล้ว")
  }

  const createStockIn = async (event: React.FormEvent) => {
    event.preventDefault()
    const res = await fetch("/api/diesel-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordedAt: stockInForm.recordedAt,
        liters: Number(stockInForm.liters || 0),
        companyName: stockInForm.companyName,
        employeeId: stockInForm.employeeId,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "เติมน้ำมันเข้าสต็อกไม่สำเร็จ")
      return
    }
    setDieselStock(json)
    setStockInForm(stockInFormInitial)
    setModal(null)
    alert("เติมน้ำมันเข้าสต็อกแล้ว")
  }

  const adjustStock = async (event: React.FormEvent) => {
    event.preventDefault()
    const res = await fetch("/api/diesel-stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balanceLiters: Number(stockAdjustmentForm.balanceLiters), note: stockAdjustmentForm.note || null }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "ปรับยอดสต็อกน้ำมันไม่สำเร็จ")
      return
    }
    setDieselStock(json)
    setStockAdjustmentForm(stockAdjustmentFormInitial)
    setModal(null)
  }

  const createMaintenance = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedVehicle) return
    const res = await fetch(`/api/vehicles/${selectedVehicle.id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...maintenanceForm,
        odometer: maintenanceForm.odometer || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "แจ้งซ่อมไม่สำเร็จ")
      return
    }
    setVehicles((prev) => prev.map((vehicle) => (vehicle.id === selectedVehicle.id ? { ...vehicle, status: "MAINTENANCE" } : vehicle)))
    setMaintenanceForm(maintenanceFormInitial)
    setModal(null)
  }

  const openAction = (vehicle: Vehicle, nextModal: "fuel" | "maintenance") => {
    setSelectedVehicle(vehicle)
    setModal(nextModal)
  }

  const openHistory = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setVehicleHistory(null)
    setHistoryLoading(true)
    setModal("history")
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "โหลดประวัติไม่สำเร็จ")
      setVehicleHistory({ fuelLogs: json.fuelLogs || [], maintenanceLogs: json.maintenanceLogs || [] })
    } catch (error) {
      alert(error instanceof Error ? error.message : "โหลดประวัติไม่สำเร็จ")
      setModal(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">สต็อกน้ำมันดีเซลกลาง</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {formatNumber(dieselStock.balanceLiters)} / {formatNumber(dieselStock.capacityLiters)} ลิตร
            </p>
          </div>
          <div className="w-full min-w-0 md:w-auto md:min-w-[220px]">
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${stockPct}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">ใช้เดือนนี้ {formatNumber(dieselStock.usedThisMonthLiters)} ลิตร</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void openDieselHistory()}>
              <History className="h-4 w-4 mr-1" /> ประวัติสต็อก
            </Button>
            {canManageVehicles ? <Button type="button" variant="outline" onClick={() => { setStockAdjustmentForm({ balanceLiters: String(dieselStock.balanceLiters), note: "" }); setModal("stockAdjustment") }}>ปรับยอดคงเหลือ</Button> : null}
            <Button type="button" variant="secondary" onClick={() => setModal("stockIn")}>
              <Plus className="h-4 w-4" /> เติมสต็อก
            </Button>
          </div>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            เอกสารรถที่ต้องดำเนินการ
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.slice(0, 6).map((alert) => (
              <div key={`${alert.vehicleId}-${alert.type}`} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700">
                <b>{alert.vehicle.plateNumber}</b> - {alertText[alert.type]}{" "}
                {alert.daysLeft < 0 ? `หมดแล้ว ${Math.abs(alert.daysLeft)} วัน` : `หมดใน ${alert.daysLeft} วัน`}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหารถหรือเครื่องจักร..."
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-auto text-sm"
            >
              <option value="ALL">ทุกประเภทรถ</option>
              {Object.entries(typeText).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ทั้งหมด ({counts.ALL})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("AVAILABLE")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "AVAILABLE"
                    ? "bg-emerald-600 text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                ว่าง ({counts.AVAILABLE})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("IN_USE")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "IN_USE"
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-blue-700"
                }`}
              >
                ใช้งานอยู่ ({counts.IN_USE})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("MAINTENANCE")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "MAINTENANCE"
                    ? "bg-amber-600 text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-amber-700"
                }`}
              >
                ซ่อมอยู่ ({counts.MAINTENANCE})
              </button>
            </div>

            <Button type="button" onClick={openCreateVehicle}>
              <Plus className="h-4 w-4" /> เพิ่มรถ/เครื่องจักร
            </Button>
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="py-12 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
            <Truck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">ไม่พบรายการรถหรือเครื่องจักรที่ค้นหา</p>
            <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
            {(query || statusFilter !== "ALL" || typeFilter !== "ALL") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setQuery("")
                  setStatusFilter("ALL")
                  setTypeFilter("ALL")
                }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredVehicles.map((vehicle) => (
              <article key={vehicle.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-slate-500">{vehicle.vehicleCode}</p>
                      <h3 className="mt-1 font-bold text-slate-900">{vehicle.plateNumber}</h3>
                      <p className="text-sm text-slate-600">
                        {vehicle.brand || "-"} {vehicle.model || ""} {vehicle.year || ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={vehicle.status === "AVAILABLE" ? "success" : vehicle.status === "IN_USE" ? "info" : "warning"}>
                    {statusText[vehicle.status]}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <Row label="ประเภท" value={typeText[vehicle.vehicleType]} />
                  <Row label="เติมน้ำมันรวม" value={`${formatNumber(vehicle.fuelSummary?.totalLiters || 0)} ลิตร`} />
                  <Row label="จำนวนครั้ง" value={`${vehicle.fuelSummary?.count || 0} ครั้ง`} />
                  <Row label="ประกัน" value={formatDate(vehicle.insuranceExpiry)} />
                  <Row label="ภาษี" value={formatDate(vehicle.taxExpiry)} />
                </div>

                {vehicle.alerts && vehicle.alerts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {vehicle.alerts.map((alert) => (
                      <Badge key={alert.type} variant={alert.severity === "expired" ? "danger" : "warning"}>
                        {alertText[alert.type]} {alert.daysLeft < 0 ? "หมดแล้ว" : `${alert.daysLeft} วัน`}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openAction(vehicle, "fuel")}>
                    <Fuel className="h-4 w-4" /> เติมน้ำมัน
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openAction(vehicle, "maintenance")}>
                    <Wrench className="h-4 w-4" /> แจ้งซ่อม
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void openHistory(vehicle)}><History className="h-4 w-4" /> ประวัติ</Button>
                  {canManageVehicles ? <Button size="sm" variant="ghost" onClick={() => editVehicle(vehicle)}><Pencil className="h-4 w-4" /> แก้ไข</Button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modal === "stockIn" && (
        <Modal title="เติมน้ำมันเข้าสต็อก" onClose={() => setModal(null)}>
          <form onSubmit={createStockIn} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="วันที่เติม">
                <Input
                  required
                  type="date"
                  value={stockInForm.recordedAt}
                  onChange={(event) => setStockInForm({ ...stockInForm, recordedAt: event.target.value })}
                />
              </Field>
              <Field label="จำนวนลิตร">
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockInForm.liters}
                  onChange={(event) => setStockInForm({ ...stockInForm, liters: event.target.value })}
                />
              </Field>
              <Field label="บริษัทที่มาเติม">
                <Input
                  required
                  value={stockInForm.companyName}
                  onChange={(event) => setStockInForm({ ...stockInForm, companyName: event.target.value })}
                />
              </Field>
              <Field label="คนตรวจเช็ค">
                <Select
                  required
                  value={stockInForm.employeeId}
                  onChange={(event) => setStockInForm({ ...stockInForm, employeeId: event.target.value })}
                >
                  <option value="">เลือกพนักงาน</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nickname || employee.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              ยอดนี้จะบวกเข้าสต็อกดีเซลกลาง คงเหลือปัจจุบัน {formatNumber(dieselStock.balanceLiters)} ลิตร
            </div>
            <ModalActions onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === "stockAdjustment" && (
        <Modal title="ปรับยอดคงเหลือน้ำมันดีเซล" onClose={() => setModal(null)}>
          <form onSubmit={adjustStock} className="space-y-4">
            <Field label="ยอดคงเหลือจริง (ลิตร)">
              <Input required type="number" min="0" max="1000" step="0.01" value={stockAdjustmentForm.balanceLiters} onChange={(event) => setStockAdjustmentForm({ ...stockAdjustmentForm, balanceLiters: event.target.value })} />
            </Field>
            <Field label="เหตุผลการปรับยอด">
              <Input value={stockAdjustmentForm.note} onChange={(event) => setStockAdjustmentForm({ ...stockAdjustmentForm, note: event.target.value })} placeholder="เช่น ตรวจนับถังน้ำมันจริง" />
            </Field>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">ระบบจะเก็บรายการปรับยอดไว้ในประวัติสต็อก โดยไม่แก้ไขรายการเติมหรือจ่ายน้ำมันเดิม</p>
            <ModalActions onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === "stockHistory" && (
        <Modal title="ประวัติสต็อกน้ำมันดีเซลกลาง" onClose={() => setModal(null)}>
          {dieselHistoryLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลดประวัติสต็อก...</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {!dieselHistory.length ? (
                <p className="text-sm text-slate-500 text-center py-4">ยังไม่มีรายการประวัติในระบบ</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dieselHistory.map((log) => {
                    let typeBadge = null
                    let changeText = ""
                    switch (log.type) {
                      case "OPENING":
                        typeBadge = <Badge variant="info">ยอดตั้งต้น</Badge>
                        changeText = `ตั้งต้น: ${formatNumber(log.liters)} ลิตร`
                        break
                      case "IN":
                        typeBadge = <Badge variant="success">เติมสต็อก</Badge>
                        changeText = `+${formatNumber(log.liters)} ลิตร`
                        break
                      case "OUT":
                        typeBadge = <Badge variant="danger">จ่ายออก</Badge>
                        changeText = `-${formatNumber(log.liters)} ลิตร`
                        break
                      case "ADJUST":
                        typeBadge = <Badge variant="warning">ปรับยอด</Badge>
                        changeText = log.liters >= 0 ? `+${formatNumber(log.liters)} ลิตร` : `${formatNumber(log.liters)} ลิตร`
                        break
                      default:
                        typeBadge = <Badge variant="neutral">{log.type}</Badge>
                        changeText = `${formatNumber(log.liters)} ลิตร`
                    }

                    return (
                      <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{formatDateTime(log.recordedAt)}</span>
                            {typeBadge}
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {log.companyName && <div>ผู้ให้บริการ/บริษัท: <span className="font-semibold">{log.companyName}</span></div>}
                            {log.employeeName && <div>ผู้ดำเนินรายการ/พนักงานตรวจเช็ค: <span className="font-semibold">{log.employeeName}</span></div>}
                            {log.vehiclePlate && <div>รถที่เติมน้ำมัน: <span className="font-semibold text-blue-700">{log.vehiclePlate}</span></div>}
                            {log.note && <div className="italic text-slate-500">หมายเหตุ: {log.note}</div>}
                          </div>
                        </div>
                        <div className="text-right sm:self-center">
                          <span className={`font-mono font-bold text-base ${log.type === "IN" ? "text-emerald-600" : log.type === "OUT" ? "text-rose-600" : "text-slate-700"}`}>
                            {changeText}
                          </span>
                          <div className="text-xs text-slate-500">คงเหลือหลังทำรายการ: {formatNumber(log.balanceAfter)} ลิตร</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {modal === "history" && selectedVehicle && (
        <Modal title={`ประวัติ ${selectedVehicle.plateNumber}`} onClose={() => setModal(null)}>
          {historyLoading ? <p className="text-sm text-slate-500">กำลังโหลดประวัติ...</p> : null}
          {!historyLoading && vehicleHistory ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900"><Fuel className="h-4 w-4 text-blue-600" /> ประวัติเติมน้ำมัน</h3>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {!vehicleHistory.fuelLogs.length ? <p className="text-sm text-slate-500">ยังไม่มีรายการเติมน้ำมัน</p> : null}
                  {vehicleHistory.fuelLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex justify-between gap-3"><b>{formatDateTime(log.fuelDate)}</b><span className="font-bold text-blue-700">{formatNumber(log.liters)} ลิตร</span></div>
                      <p className="mt-1 text-slate-600">ผู้บันทึก: {log.driver?.nickname || log.driver?.name || "-"}</p>
                      {log.note ? <p className="mt-1 text-slate-500">{log.note}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900"><Wrench className="h-4 w-4 text-amber-600" /> ประวัติซ่อมบำรุง</h3>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {!vehicleHistory.maintenanceLogs.length ? <p className="text-sm text-slate-500">ยังไม่มีรายการซ่อมบำรุง</p> : null}
                  {vehicleHistory.maintenanceLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex justify-between gap-3"><b>{formatDateTime(log.date)}</b><span className="font-bold text-amber-700">{formatNumber(log.cost)} บาท</span></div>
                      <p className="mt-1 font-semibold text-slate-700">{log.description}</p>
                      <p className="mt-1 text-slate-600">{maintenanceTypeText(log.type)}{log.shop ? ` · ${log.shop}` : ""}{log.odometer ? ` · ${formatNumber(log.odometer)} กม.` : ""}</p>
                      {log.note ? <p className="mt-1 text-slate-500">{log.note}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </Modal>
      )}

      {modal === "vehicle" && (
        <Modal title={editingVehicle ? "แก้ไขข้อมูลรถ/เครื่องจักร" : "เพิ่มรถ/เครื่องจักร"} onClose={() => setModal(null)}>
          <form onSubmit={saveVehicle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="ทะเบียน/รหัสเรียก">
                <Input required value={vehicleForm.plateNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, plateNumber: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="ประเภท">
                <Select value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleType: event.target.value as VehicleType })}>
                  {Object.entries(typeText).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ยี่ห้อ">
                <Input value={vehicleForm.brand} onChange={(event) => setVehicleForm({ ...vehicleForm, brand: event.target.value })} />
              </Field>
              <Field label="รุ่น">
                <Input value={vehicleForm.model} onChange={(event) => setVehicleForm({ ...vehicleForm, model: event.target.value })} />
              </Field>
              <Field label="ปี">
                <Input type="number" value={vehicleForm.year} onChange={(event) => setVehicleForm({ ...vehicleForm, year: event.target.value })} />
              </Field>
              <Field label="สี">
                <Input value={vehicleForm.color} onChange={(event) => setVehicleForm({ ...vehicleForm, color: event.target.value })} />
              </Field>
              <Field label="วันหมดประกัน">
                <Input type="date" value={vehicleForm.insuranceExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, insuranceExpiry: event.target.value })} />
              </Field>
              <Field label="วันต่อภาษี">
                <Input type="date" value={vehicleForm.taxExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, taxExpiry: event.target.value })} />
              </Field>
              <Field label="วันตรวจสภาพ">
                <Input type="date" value={vehicleForm.inspectionExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, inspectionExpiry: event.target.value })} />
              </Field>
              <Field label="หมายเหตุ">
                <Input value={vehicleForm.note} onChange={(event) => setVehicleForm({ ...vehicleForm, note: event.target.value })} />
              </Field>
              {editingVehicle ? <Field label="สถานะ"><Select value={vehicleForm.status} onChange={(event) => setVehicleForm({ ...vehicleForm, status: event.target.value as Vehicle["status"] })}><option value="AVAILABLE">ว่าง</option><option value="IN_USE">กำลังใช้งาน</option><option value="MAINTENANCE">ซ่อมอยู่</option></Select></Field> : null}
            </div>
            <ModalActions onClose={() => { setEditingVehicle(null); setVehicleForm(vehicleFormInitial); setModal(null) }} leading={editingVehicle ? <Button type="button" variant="danger" onClick={() => setModal("deleteConfirm")}><Trash2 className="h-4 w-4" /> ลบรถ</Button> : null} />
          </form>
        </Modal>
      )}

      {modal === "deleteConfirm" && editingVehicle && (
        <Modal title="ยืนยันการลบรถ/เครื่องจักร" onClose={() => setModal("vehicle")}>
          <div className="space-y-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-bold flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                คุณต้องการลบรถทะเบียน {editingVehicle.plateNumber} ใช่หรือไม่?
              </p>
              <p className="mt-2 text-xs text-rose-700">
                รายการลบนี้จะยกเลิกการเปิดใช้งานรถคันนี้ในหน้าหลัก แต่ประวัติการเติมน้ำมันและการซ่อมบำรุงย้อนหลังทั้งหมดจะยังคงถูกบันทึกไว้อย่างปลอดภัยในระบบ
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" variant="ghost" onClick={() => setModal("vehicle")}>
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void deleteVehicle()}
              >
                ยืนยันลบข้อมูลรถ
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "fuel" && selectedVehicle && (
        <Modal title={`บันทึกเติมน้ำมัน ${selectedVehicle.plateNumber}`} onClose={() => setModal(null)}>
          <form onSubmit={createFuelLog} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="วันที่เติม">
                <Input required type="date" value={fuelForm.fuelDate} onChange={(event) => setFuelForm({ ...fuelForm, fuelDate: event.target.value })} />
              </Field>
              <Field label="พนักงาน">
                <Select required value={fuelForm.driverId} onChange={(event) => setFuelForm({ ...fuelForm, driverId: event.target.value })}>
                  <option value="">เลือกพนักงาน</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nickname || employee.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="จำนวนลิตร">
                <Input required type="number" step="0.01" min="0" value={fuelForm.liters} onChange={(event) => setFuelForm({ ...fuelForm, liters: event.target.value })} />
              </Field>
              <Field label="หมายเหตุ">
                <Input value={fuelForm.note} onChange={(event) => setFuelForm({ ...fuelForm, note: event.target.value })} />
              </Field>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
              จะตัดจากสต็อกดีเซลกลาง คงเหลือปัจจุบัน {formatNumber(dieselStock.balanceLiters)} ลิตร
            </div>
            <ModalActions onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}

      {modal === "maintenance" && selectedVehicle && (
        <Modal title={`แจ้งซ่อม ${selectedVehicle.plateNumber}`} onClose={() => setModal(null)}>
          <form onSubmit={createMaintenance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="ประเภท">
                <Select value={maintenanceForm.type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })}>
                  <option value="REPAIR">ซ่อม</option>
                  <option value="SERVICE">บริการตามระยะ</option>
                  <option value="TIRE">ยาง</option>
                  <option value="OTHER">อื่น ๆ</option>
                </Select>
              </Field>
              <Field label="วันที่">
                <Input type="date" value={maintenanceForm.date} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, date: event.target.value })} />
              </Field>
              <Field label="รายละเอียด">
                <Input required value={maintenanceForm.description} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })} />
              </Field>
              <Field label="ค่าใช้จ่าย">
                <Input type="number" step="0.01" value={maintenanceForm.cost} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })} />
              </Field>
              <Field label="เลขไมล์">
                <Input type="number" value={maintenanceForm.odometer} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, odometer: event.target.value })} />
              </Field>
              <Field label="อู่/ศูนย์บริการ">
                <Input value={maintenanceForm.shop} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, shop: event.target.value })} />
              </Field>
            </div>
            <ModalActions onClose={() => setModal(null)} />
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal max-w-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="ปิด">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ModalActions({ onClose, leading }: { onClose: () => void; leading?: React.ReactNode }) {
  return (
    <div className="flex gap-2 border-t border-slate-200 pt-4">
      {leading}
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  )
}

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString("th-TH") : "-"
}

function formatDateTime(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "-"
}

function maintenanceTypeText(type: string) {
  return ({ REPAIR: "ซ่อม", SERVICE: "บริการตามระยะ", TIRE: "ยาง", OTHER: "อื่น ๆ" } as Record<string, string>)[type] || type
}

function toDateInput(value?: string | Date | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : ""
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0)
}
