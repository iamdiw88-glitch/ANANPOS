"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, Clock3, Phone, Plus, Search, Truck, UserRound, Users, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { formatDuration } from "@/lib/attendance-utils"
import { AttendanceActivityFeed } from "@/components/employees/attendance-activity-feed"
import { UnrecognizedScanModal } from "@/components/employees/unrecognized-scan-modal"

type Employee = {
  id: number
  employeeCode: string
  name: string
  nickname?: string | null
  role: string
  department: string
  position?: string | null
  employeeType: string
  payType: string
  payRate: number
  note?: string | null
  phone?: string | null
  startDate?: string | Date | null
  avatarColor: string
  isActive: boolean
}

type AttendanceSummary = {
  totalEmployees: number
  checkedInCount: number
  lateCount: number
  notYetCount: number
  employees: Array<{ id: number; attendanceStatus: string; checkInTime: string | null; elapsedMinutes: number | null }>
}

type Device = { id: string; name: string; location: string | null; status: string; lastPingAt: string | null }

const initialForm = {
  name: "",
  nickname: "",
  role: "STAFF",
  department: "SALES_CASHIER",
  employeeType: "fulltime",
  payType: "monthly",
  payRate: "0",
  position: "",
  phone: "",
  startDate: "",
  note: "",
}

export function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"all" | "sales" | "drivers" | "warehouse" | "inactive">("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)
  const [elapsedTick, setElapsedTick] = useState(0)

  const loadAttendance = useCallback(async () => {
    try {
      const [summaryResponse, deviceResponse] = await Promise.all([
        fetch("/api/attendance/today-summary", { cache: "no-store" }),
        fetch("/api/face-scan-device/status", { cache: "no-store" }),
      ])
      if (summaryResponse.ok) setAttendance(await summaryResponse.json())
      if (deviceResponse.ok) setDevices(await deviceResponse.json())
    } catch {
      // The next polling cycle will retry if the network is temporarily unavailable.
    }
  }, [])

  useEffect(() => {
    void loadAttendance()
    const timer = window.setInterval(() => void loadAttendance(), 30000)
    const elapsedTimer = window.setInterval(() => setElapsedTick((value) => value + 1), 60000)
    return () => { window.clearInterval(timer); window.clearInterval(elapsedTimer) }
  }, [loadAttendance])

  const refreshAttendance = () => {
    void loadAttendance()
    setElapsedTick((value) => value + 1)
  }

  const closeEmployeeModal = () => {
    setIsModalOpen(false)
    setEditingEmployeeId(null)
    setForm(initialForm)
  }

  const openCreateEmployee = () => {
    setEditingEmployeeId(null)
    setForm(initialForm)
    setIsModalOpen(true)
  }

  const filteredEmployees = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return employees.filter((employee) => {
      const matchesTab =
        tab === "drivers"
          ? employee.isActive && (employee.role === "DRIVER" || employee.employeeType === "driver")
          : tab === "sales"
            ? employee.isActive && employee.department === "SALES_CASHIER"
            : tab === "warehouse"
              ? employee.isActive && employee.department === "WAREHOUSE"
          : tab === "inactive"
            ? !employee.isActive
            : employee.isActive
      const matchesKeyword =
        !keyword ||
        [employee.employeeCode, employee.name, employee.nickname, employee.position, employee.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      return matchesTab && matchesKeyword
    })
  }, [employees, query, tab])

  const totals = {
    active: employees.filter((employee) => employee.isActive).length,
    sales: employees.filter((employee) => employee.isActive && employee.department === "SALES_CASHIER").length,
    drivers: employees.filter((employee) => employee.isActive && (employee.role === "DRIVER" || employee.employeeType === "driver")).length,
    warehouse: employees.filter((employee) => employee.isActive && employee.department === "WAREHOUSE").length,
    inactive: employees.filter((employee) => !employee.isActive).length,
  }

  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault()
    const res = await fetch(editingEmployeeId ? `/api/employees/${editingEmployeeId}` : "/api/employees", {
      method: editingEmployeeId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate || null,
        employeeType: form.department === "DRIVER" ? "driver" : form.employeeType,
        payRate: Number(form.payRate) || 0,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "บันทึกพนักงานไม่สำเร็จ")
      return
    }
    setEmployees((prev) => editingEmployeeId ? prev.map((employee) => employee.id === editingEmployeeId ? json : employee) : [json, ...prev])
    setForm(initialForm)
    setEditingEmployeeId(null)
    setIsModalOpen(false)
    void loadAttendance()
  }

  const editEmployee = (employee: Employee) => {
    setEditingEmployeeId(employee.id)
    setForm({ name: employee.name, nickname: employee.nickname || "", role: employee.role, department: employee.department || "SALES_CASHIER", employeeType: employee.employeeType, payType: employee.payType || "monthly", payRate: String(employee.payRate || 0), position: employee.position || "", phone: employee.phone || "", startDate: employee.startDate ? new Date(employee.startDate).toISOString().slice(0, 10) : "", note: employee.note || "" })
    setIsModalOpen(true)
  }

  const recordAttendance = async (employeeId: number, action: "check_in" | "check_out") => {
    setLoadingId(employeeId)
    try {
      const res = await fetch(`/api/employees/${employeeId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || "บันทึกเวลาไม่สำเร็จ")
      await loadAttendance()
      alert(action === "check_in" ? "บันทึกเวลาเข้าแล้ว" : "บันทึกเวลาออกแล้ว")
    } catch (error) {
      alert(error instanceof Error ? error.message : "บันทึกเวลาไม่สำเร็จ")
    } finally {
      setLoadingId(null)
    }
  }

  const deactivateEmployee = async (employeeId: number) => {
    if (!confirm("ระงับพนักงานคนนี้ใช่ไหม")) return
    const res = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "ระงับพนักงานไม่สำเร็จ")
      return
    }
    setEmployees((prev) => prev.map((employee) => (employee.id === employeeId ? json : employee)))
  }

  const deleteFromEdit = async () => {
    if (!editingEmployeeId) return
    if (!confirm("ยืนยันลบพนักงานรายนี้ออกจากการใช้งานหรือไม่? ประวัติการเข้างานจะยังคงอยู่")) return
    const res = await fetch(`/api/employees/${editingEmployeeId}`, { method: "DELETE" })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "ไม่สามารถลบพนักงานได้")
      return
    }
    setEmployees((prev) => prev.map((employee) => (employee.id === editingEmployeeId ? json : employee)))
    setIsModalOpen(false)
    setEditingEmployeeId(null)
    setForm(initialForm)
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard icon={Users} label="เข้างานแล้ว" value={`${attendance?.checkedInCount ?? 0} / ${attendance?.totalEmployees ?? totals.active} คน`} />
        <SummaryCard icon={Clock3} label="มาสาย" value={`${attendance?.lateCount ?? 0} คน`} />
        <SummaryCard icon={CalendarClock} label="ยังไม่เข้างาน" value={`${attendance?.notYetCount ?? totals.active} คน`} />
      </section>
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <Wifi className="h-5 w-5 text-emerald-600" />
        <div className="flex-1"><p className="font-bold text-slate-900">สถานะกล้องสแกนหน้า</p><p className="text-xs text-slate-500">ตรวจสอบ heartbeat ล่าสุดของอุปกรณ์</p></div>
        {devices.length ? devices.map((device) => <Badge key={device.id} variant={device.status === "online" ? "success" : "danger"}>{device.status === "online" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {device.name}: {device.status === "online" ? "ออนไลน์" : "ออฟไลน์"}</Badge>) : <Badge variant="neutral">ยังไม่มีอุปกรณ์</Badge>}
      </section>
      <AttendanceActivityFeed onUnrecognized={setSelectedScanId} />
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard icon={Users} label="พนักงานใช้งาน" value={`${totals.active} คน`} />
        <SummaryCard icon={Truck} label="คนขับรถ" value={`${totals.drivers} คน`} />
        <SummaryCard icon={CalendarClock} label="ไม่ได้ทำงาน" value={`${totals.inactive} คน`} />
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="touch-scroll flex gap-2 overflow-x-auto pb-1">
            {[
              ["all", "พนักงานทั้งหมด", totals.active],
              ["sales", "ฝ่ายขายหน้าร้าน / แคชเชียร์", totals.sales],
              ["drivers", "คนขับรถ", totals.drivers],
              ["warehouse", "คนจัดของ / ยกของ", totals.warehouse],
              ["inactive", "ไม่ได้ทำงาน", totals.inactive],
            ].map(([id, label, count]) => (
              <button
                key={String(id)}
                type="button"
                onClick={() => setTab(id as typeof tab)}
                className={`h-9 rounded-md border px-3 text-sm font-semibold transition-colors cursor-pointer ${
                  tab === id ? "border-primary bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label} <span className="text-xs text-slate-400">({count})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาพนักงาน" className="pl-9" />
            </div>
            <Button type="button" onClick={openCreateEmployee}>
              <Plus className="h-4 w-4" /> เพิ่มพนักงาน
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredEmployees.map((employee) => (
            (() => {
              const employeeAttendance = attendance?.employees.find((item) => item.id === employee.id)
              const isPresent = employeeAttendance && ["checked_in", "late"].includes(employeeAttendance.attendanceStatus)
              const elapsedMinutes = employeeAttendance?.checkInTime && isPresent
                ? Math.max(0, Math.floor((Date.now() - new Date(employeeAttendance.checkInTime).getTime()) / 60000))
                : employeeAttendance?.elapsedMinutes || 0
              void elapsedTick
              return (
            <article key={employee.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-lg text-white flex items-center justify-center font-bold"
                    style={{ backgroundColor: employee.avatarColor || "#6B7280" }}
                  >
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{employee.employeeCode}</span>
                      <Badge variant={employee.isActive ? "success" : "neutral"}>{employee.isActive ? "active" : "inactive"}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{employee.name}</h3>{employeeAttendance ? <Badge variant={isPresent ? (employeeAttendance.attendanceStatus === "late" ? "warning" : "success") : "neutral"}>{employeeAttendance.attendanceStatus === "late" ? "มาสาย" : isPresent ? `เข้างาน ${formatDuration(elapsedMinutes)}` : employeeAttendance.attendanceStatus === "checked_out" ? "ออกงานแล้ว" : "ยังไม่เข้างาน"}</Badge> : null}</div>
                    <p className="text-sm text-slate-600">{departmentLabel(employee.department)} · {employee.position || employee.role}</p>
                  </div>
                </div>
                <UserRound className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {employee.phone || "ยังไม่มีเบอร์โทร"}
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  เริ่มงาน {employee.startDate ? new Date(employee.startDate).toLocaleDateString("th-TH") : "-"}
                </div>
                <div className="font-semibold text-slate-700">{employee.payType === "daily" ? "รายวัน" : "เงินเดือน"}: {Number(employee.payRate || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</div>
              </div>

              {employee.isActive && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => recordAttendance(employee.id, "check_in")} disabled={loadingId === employee.id}>
                    เข้า
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => recordAttendance(employee.id, "check_out")} disabled={loadingId === employee.id}>
                    ออก
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => editEmployee(employee)}>แก้ไขข้อมูล</Button>
                  <Button size="sm" variant="ghost" onClick={() => deactivateEmployee(employee.id)}>
                    ระงับ
                  </Button>
                </div>
              )}
            </article>
              )
            })()
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={saveEmployee} className="modal max-w-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">{editingEmployeeId ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงาน"}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
              <Field label="ชื่อพนักงาน">
                <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
              <Field label="ชื่อเล่น">
                <Input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} />
              </Field>
              <Field label="บทบาท">
                <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  <option value="STAFF">พนักงาน</option>
                  <option value="DRIVER">คนขับรถ</option>
                  <option value="MANAGER">ผู้จัดการ</option>
                </Select>
              </Field>
              <Field label="แผนก">
                <Select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>
                  <option value="SALES_CASHIER">ฝ่ายขายหน้าร้าน / แคชเชียร์</option>
                  <option value="DRIVER">คนขับรถ</option>
                  <option value="WAREHOUSE">คนจัดของ / ยกของ</option>
                </Select>
              </Field>
              <Field label="ประเภทพนักงาน">
                <Select value={form.employeeType} onChange={(event) => setForm({ ...form, employeeType: event.target.value })}>
                  <option value="fulltime">ประจำ</option>
                  <option value="parttime">พาร์ทไทม์</option>
                  <option value="daily">รายวัน</option>
                  <option value="driver">คนขับรถ</option>
                </Select>
              </Field>
              <Field label="ตำแหน่ง">
                <Input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
              </Field>
              <Field label="เบอร์โทร">
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </Field>
              <Field label="วันเริ่มงาน">
                <Input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              </Field>
              <Field label="หมายเหตุ">
                <Input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </Field>
              <Field label="รูปแบบค่าจ้าง">
                <Select value={form.payType} onChange={(event) => setForm({ ...form, payType: event.target.value })}><option value="monthly">เงินเดือน</option><option value="daily">รายวัน</option></Select>
              </Field>
              <Field label={form.payType === "daily" ? "ค่าจ้างต่อวัน (บาท)" : "เงินเดือน (บาท)"}>
                <Input type="number" min="0" step="0.01" value={form.payRate} onChange={(event) => setForm({ ...form, payRate: event.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              {editingEmployeeId ? <Button type="button" variant="outline" className="mr-auto border-red-200 text-red-600 hover:bg-red-50" onClick={() => void deleteFromEdit()}>ลบพนักงาน</Button> : null}
              <Button type="button" variant="ghost" onClick={closeEmployeeModal}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
        </div>
      )}
      {selectedScanId ? <UnrecognizedScanModal scanId={selectedScanId} employees={employees.map(({ id, name, employeeCode }) => ({ id, name, employeeCode }))} onClose={() => setSelectedScanId(null)} onResolved={() => { setSelectedScanId(null); refreshAttendance() }} /> : null}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function departmentLabel(department?: string) {
  if (department === "DRIVER") return "คนขับรถ"
  if (department === "WAREHOUSE") return "คนจัดของ / ยกของ"
  return "ฝ่ายขายหน้าร้าน / แคชเชียร์"
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  )
}
