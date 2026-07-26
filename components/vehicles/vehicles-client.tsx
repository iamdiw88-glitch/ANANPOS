"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Fuel, Plus, Search, Settings, Truck, Wrench } from "lucide-react"
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
}: {
  initialVehicles: Vehicle[]
  initialDrivers: Employee[]
  initialDieselStock: DieselStock
}) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [employees] = useState(initialDrivers)
  const [dieselStock, setDieselStock] = useState(initialDieselStock)
  const [query, setQuery] = useState("")
  const [vehicleForm, setVehicleForm] = useState(vehicleFormInitial)
  const [fuelForm, setFuelForm] = useState(fuelFormInitial)
  const [stockInForm, setStockInForm] = useState(stockInFormInitial)
  const [maintenanceForm, setMaintenanceForm] = useState(maintenanceFormInitial)
  const [modal, setModal] = useState<"vehicle" | "fuel" | "maintenance" | "stockIn" | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

  const filteredVehicles = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return vehicles.filter((vehicle) => {
      if (!keyword) return true
      return [vehicle.vehicleCode, vehicle.plateNumber, vehicle.brand, vehicle.model, vehicle.status, typeText[vehicle.vehicleType]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
  }, [query, vehicles])

  const alerts = vehicles.flatMap((vehicle) => (vehicle.alerts || []).map((alert) => ({ ...alert, vehicle })))
  const stockPct = dieselStock.capacityLiters > 0 ? Math.max(0, Math.min(100, (dieselStock.balanceLiters / dieselStock.capacityLiters) * 100)) : 0

  const reloadDieselStock = async () => {
    const res = await fetch("/api/diesel-stock")
    if (!res.ok) return
    setDieselStock(await res.json())
  }

  const createVehicle = async (event: React.FormEvent) => {
    event.preventDefault()
    const res = await fetch("/api/vehicles", {
      method: "POST",
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
    setVehicles((prev) => [{ ...json, alerts: [], fuelSummary: { totalLiters: 0, count: 0 } }, ...prev])
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
          <Button type="button" variant="secondary" onClick={() => setModal("stockIn")}>
            <Plus className="h-4 w-4" /> เติมสต็อก
          </Button>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative min-w-0 flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารถหรือเครื่องจักร" className="pl-9" />
          </div>
          <Button type="button" onClick={() => setModal("vehicle")}>
            <Plus className="h-4 w-4" /> เพิ่มรถ/เครื่องจักร
          </Button>
        </div>

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
              </div>
            </article>
          ))}
        </div>
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

      {modal === "vehicle" && (
        <Modal title="เพิ่มรถ/เครื่องจักร" onClose={() => setModal(null)}>
          <form onSubmit={createVehicle} className="space-y-4">
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
            </div>
            <ModalActions onClose={() => setModal(null)} />
          </form>
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
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 cursor-pointer">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ModalActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
      <Button type="button" variant="ghost" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button type="submit">บันทึก</Button>
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0)
}
