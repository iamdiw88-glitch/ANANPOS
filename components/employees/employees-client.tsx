"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Clock3, Phone, Plus, Search, Truck, UserRound, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"

type Employee = {
  id: number
  employeeCode: string
  name: string
  nickname?: string | null
  role: string
  position?: string | null
  employeeType: string
  phone?: string | null
  startDate?: string | Date | null
  avatarColor: string
  isActive: boolean
}

const initialForm = {
  name: "",
  nickname: "",
  role: "STAFF",
  employeeType: "fulltime",
  position: "",
  phone: "",
  startDate: "",
  note: "",
}

export function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"active" | "drivers" | "inactive">("active")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const filteredEmployees = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return employees.filter((employee) => {
      const matchesTab =
        tab === "drivers"
          ? employee.isActive && (employee.role === "DRIVER" || employee.employeeType === "driver")
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
    drivers: employees.filter((employee) => employee.isActive && (employee.role === "DRIVER" || employee.employeeType === "driver")).length,
    inactive: employees.filter((employee) => !employee.isActive).length,
  }

  const createEmployee = async (event: React.FormEvent) => {
    event.preventDefault()
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate || null,
        employeeType: form.role === "DRIVER" ? "driver" : form.employeeType,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json?.error || "บันทึกพนักงานไม่สำเร็จ")
      return
    }
    setEmployees((prev) => [json, ...prev])
    setForm(initialForm)
    setIsModalOpen(false)
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

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard icon={Users} label="พนักงานใช้งาน" value={`${totals.active} คน`} />
        <SummaryCard icon={Truck} label="คนขับรถ" value={`${totals.drivers} คน`} />
        <SummaryCard icon={CalendarClock} label="ไม่ได้ทำงาน" value={`${totals.inactive} คน`} />
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-2">
            {[
              ["active", "พนักงานทั้งหมด", totals.active],
              ["drivers", "คนขับรถ", totals.drivers],
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
          <div className="flex gap-2">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาพนักงาน" className="pl-9" />
            </div>
            <Button type="button" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" /> เพิ่มพนักงาน
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredEmployees.map((employee) => (
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
                    <h3 className="mt-1 font-bold text-slate-900">{employee.name}</h3>
                    <p className="text-sm text-slate-600">{employee.position || employee.role}</p>
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
              </div>

              {employee.isActive && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => recordAttendance(employee.id, "check_in")} disabled={loadingId === employee.id}>
                    เข้า
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => recordAttendance(employee.id, "check_out")} disabled={loadingId === employee.id}>
                    ออก
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deactivateEmployee(employee.id)}>
                    ระงับ
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={createEmployee} className="modal max-w-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">เพิ่มพนักงาน</h2>
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
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
        </div>
      )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  )
}
