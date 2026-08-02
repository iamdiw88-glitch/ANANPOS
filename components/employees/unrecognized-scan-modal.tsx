"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/input"

type EmployeeOption = { id: number; name: string; employeeCode: string }

export function UnrecognizedScanModal({ scanId, employees, onClose, onResolved }: { scanId: string; employees: EmployeeOption[]; onClose: () => void; onResolved: () => void }) {
  const [employeeId, setEmployeeId] = useState("")
  const [saving, setSaving] = useState(false)
  const resolve = async (action: "assign" | "ignore") => {
    if (action === "assign" && !employeeId) return
    setSaving(true)
    try {
      const response = await fetch(`/api/attendance/unrecognized/${scanId}/resolve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, employeeId: action === "assign" ? Number(employeeId) : undefined }) })
      if (!response.ok) throw new Error("resolve failed")
      onResolved()
    } catch {
      alert("ไม่สามารถบันทึกผลการตรวจสอบได้")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md space-y-4 p-5">
        <h2 className="text-base font-bold text-slate-900">ตรวจสอบใบหน้าที่ไม่รู้จัก</h2>
        <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          <option value="">เลือกพนักงานเพื่อบันทึกเวลาเข้างาน</option>
          {employees.filter((employee) => employee.id).map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.name}</option>)}
        </Select>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => void resolve("ignore")}>เพิกเฉย</Button>
          <Button type="button" disabled={saving || !employeeId} onClick={() => void resolve("assign")}>ยืนยันพนักงาน</Button>
        </div>
      </div>
    </div>
  )
}
