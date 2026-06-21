"use client"

import { useState } from "react"
import { Save, Store, Users, Scale, Database, Plus, Trash2, Edit2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function SettingsClient({ initialUsers, initialUnits, initialSettings }: any) {
  const [activeTab, setActiveTab] = useState("info")
  const [settings, setSettings] = useState(initialSettings)
  const [users, setUsers] = useState(initialUsers)
  const [units, setUnits] = useState(initialUnits)
  const [isSaving, setIsSaving] = useState(false)

  // Handlers for Info
  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      })
      if (!res.ok) throw new Error("Failed to save settings")
      alert("บันทึกการตั้งค่าสำเร็จ")
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackup = () => {
    window.location.href = "/api/settings/backup"
  }

  const tabs = [
    { key: "info", label: "ข้อมูลร้าน", icon: Store },
    { key: "users", label: "ผู้ใช้งาน (Users)", icon: Users },
    { key: "units", label: "หน่วยนับ (Units)", icon: Scale },
    { key: "backup", label: "สำรองข้อมูล (Backup)", icon: Database },
  ]

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Sidebar Tabs */}
      <div className="w-56 card p-2 flex flex-col gap-1 shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors",
                activeTab === tab.key ? "bg-blue-50 text-primary" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 card p-0 overflow-hidden flex flex-col">

        {/* TAB 1: INFO */}
        {activeTab === "info" && (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-base font-bold text-slate-800">ตั้งค่าข้อมูลร้าน (Shop Information)</h2>
            </div>
            <div className="p-4 max-w-2xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อร้าน / ชื่อบริษัท</label>
                <Input
                  type="text"
                  value={settings.shopName}
                  onChange={(e) => handleSettingChange("shopName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label>
                <textarea
                  value={settings.shopAddress}
                  onChange={(e) => handleSettingChange("shopAddress", e.target.value)}
                  className="input h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <Input
                    type="text"
                    value={settings.shopPhone}
                    onChange={(e) => handleSettingChange("shopPhone", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขประจำตัวผู้เสียภาษี</label>
                  <Input
                    type="text"
                    value={settings.taxId}
                    onChange={(e) => handleSettingChange("taxId", e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">เปิดใช้งาน VAT?</label>
                  <Select
                    value={settings.isVatEnabled}
                    onChange={(e) => handleSettingChange("isVatEnabled", e.target.value)}
                  >
                    <option value="true">เปิดใช้งาน (มี VAT)</option>
                    <option value="false">ปิดใช้งาน (ไม่มี VAT)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">อัตรา VAT (%)</label>
                  <Input
                    type="number"
                    value={settings.vatRate}
                    onChange={(e) => handleSettingChange("vatRate", e.target.value)}
                    disabled={settings.isVatEnabled === "false"}
                    className="disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={saveSettings} disabled={isSaving}>
                  <Save className="w-4 h-4" /> {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === "users" && (
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-slate-800">จัดการผู้ใช้งาน (Users)</h2>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4" /> เพิ่มพนักงาน
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>ชื่อผู้ใช้</TH>
                    <TH>ตำแหน่ง (Role)</TH>
                    <TH>สถานะ</TH>
                    <TH className="text-center">จัดการ</TH>
                  </TR>
                </THead>
                <TBody>
                  {users.map((u: any) => (
                    <TR key={u.id}>
                      <TD className="font-semibold text-slate-800">{u.name}</TD>
                      <TD>
                        <Badge variant="neutral">{u.role}</Badge>
                      </TD>
                      <TD>
                        {u.isActive ? (
                          <span className="text-emerald-600 font-medium text-sm flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> ปกติ
                          </span>
                        ) : (
                          <span className="text-red-500 font-medium text-sm">ระงับการใช้งาน</span>
                        )}
                      </TD>
                      <TD className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="icon" className="text-primary"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 3: UNITS */}
        {activeTab === "units" && (
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-slate-800">จัดการหน่วยนับ (Units)</h2>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4" /> เพิ่มหน่วยนับ
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>ชื่อหน่วยนับ</TH>
                    <TH>ตัวย่อ</TH>
                    <TH className="text-center">จัดการ</TH>
                  </TR>
                </THead>
                <TBody>
                  {units.map((u: any) => (
                    <TR key={u.id}>
                      <TD className="font-semibold text-slate-800">{u.name}</TD>
                      <TD className="text-slate-600">{u.abbreviation || "-"}</TD>
                      <TD className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="icon" className="text-primary"><Edit2 className="w-4 h-4" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP */}
        {activeTab === "backup" && (
          <div className="p-4 flex flex-col h-full max-w-2xl overflow-y-auto">
            <h2 className="text-base font-bold text-slate-800 mb-3">สำรองฐานข้อมูล (Database Backup)</h2>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-primary text-white rounded-md shadow-sm shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">ส่งออกข้อมูลเป็นไฟล์ SQL</h3>
                  <p className="text-sm text-slate-600 mt-1.5">
                    คุณสามารถดาวน์โหลดฐานข้อมูลทั้งหมด (สต็อก, บิลขาย, ลูกค้า) ออกมาเป็นไฟล์ `.sql` เพื่อเก็บไว้เป็นหลักฐาน หรือกู้คืนข้อมูลในกรณีฉุกเฉินได้
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    * ต้องมีการติดตั้งเครื่องมือ `pg_dump` ในเครื่องเซิร์ฟเวอร์
                  </p>

                  <Button onClick={handleBackup} className="mt-4">
                    <Save className="w-4 h-4" /> สำรองข้อมูลตอนนี้ (Download .sql)
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">การตั้งค่าสำรองข้อมูลอัตโนมัติ</h3>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-border">
                <div>
                  <p className="font-semibold text-sm text-slate-700">สำรองข้อมูลทุกเที่ยงคืน (Daily Backup)</p>
                  <p className="text-xs text-slate-500">ระบบจะทำการส่งไฟล์เข้าอีเมล หรือบันทึกลงในเครื่องเซิร์ฟเวอร์ทุกวัน</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 transition-transform duration-200 ease-in-out" />
                  <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-300 cursor-pointer"></label>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">* ฟีเจอร์สำรองข้อมูลอัตโนมัติอยู่ระหว่างการพัฒนา</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
