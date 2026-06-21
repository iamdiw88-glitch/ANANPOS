"use client"

import { useState } from "react"
import { Save, Store, Users, Scale, Database, Plus, Trash2, Edit2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
          <div className="p-8 flex flex-col h-full overflow-y-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">ตั้งค่าข้อมูลร้าน (Shop Information)</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อร้าน / ชื่อบริษัท</label>
                <input 
                  type="text" 
                  value={settings.shopName}
                  onChange={(e) => handleSettingChange("shopName", e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ที่อยู่</label>
                <textarea 
                  value={settings.shopAddress}
                  onChange={(e) => handleSettingChange("shopAddress", e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เบอร์โทรศัพท์</label>
                  <input 
                    type="text" 
                    value={settings.shopPhone}
                    onChange={(e) => handleSettingChange("shopPhone", e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เลขประจำตัวผู้เสียภาษี</label>
                  <input 
                    type="text" 
                    value={settings.taxId}
                    onChange={(e) => handleSettingChange("taxId", e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เปิดใช้งาน VAT?</label>
                  <select 
                    value={settings.isVatEnabled}
                    onChange={(e) => handleSettingChange("isVatEnabled", e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">เปิดใช้งาน (มี VAT)</option>
                    <option value="false">ปิดใช้งาน (ไม่มี VAT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">อัตรา VAT (%)</label>
                  <input 
                    type="number" 
                    value={settings.vatRate}
                    onChange={(e) => handleSettingChange("vatRate", e.target.value)}
                    disabled={settings.isVatEnabled === "false"}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="mt-8 pt-4">
                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Save className="w-5 h-5" /> {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === "users" && (
          <div className="p-8 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน (Users)</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> เพิ่มพนักงาน
              </button>
            </div>
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4">ชื่อผู้ใช้</th>
                    <th className="p-4">ตำแหน่ง (Role)</th>
                    <th className="p-4">สถานะ</th>
                    <th className="p-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u: any) => (
                    <tr key={u.id}>
                      <td className="p-4 font-bold text-slate-800">{u.name}</td>
                      <td className="p-4 text-slate-600">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">{u.role}</span>
                      </td>
                      <td className="p-4">
                        {u.isActive ? (
                          <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> ปกติ
                          </span>
                        ) : (
                          <span className="text-red-500 font-medium text-sm">ระงับการใช้งาน</span>
                        )}
                      </td>
                      <td className="p-4 flex gap-2 justify-center">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: UNITS */}
        {activeTab === "units" && (
          <div className="p-8 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-800">จัดการหน่วยนับ (Units)</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> เพิ่มหน่วยนับ
              </button>
            </div>
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4">ชื่อหน่วยนับ</th>
                    <th className="p-4">ตัวย่อ</th>
                    <th className="p-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((u: any) => (
                    <tr key={u.id}>
                      <td className="p-4 font-bold text-slate-800">{u.name}</td>
                      <td className="p-4 text-slate-600">{u.abbreviation || "-"}</td>
                      <td className="p-4 flex gap-2 justify-center">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP */}
        {activeTab === "backup" && (
          <div className="p-8 flex flex-col h-full max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">สำรองฐานข้อมูล (Database Backup)</h2>
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">ส่งออกข้อมูลเป็นไฟล์ SQL</h3>
                  <p className="text-slate-600 mt-2">
                    คุณสามารถดาวน์โหลดฐานข้อมูลทั้งหมด (สต็อก, บิลขาย, ลูกค้า) ออกมาเป็นไฟล์ `.sql` เพื่อเก็บไว้เป็นหลักฐาน หรือกู้คืนข้อมูลในกรณีฉุกเฉินได้
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    * ต้องมีการติดตั้งเครื่องมือ `pg_dump` ในเครื่องเซิร์ฟเวอร์
                  </p>
                  
                  <button 
                    onClick={handleBackup}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <Save className="w-5 h-5" /> สำรองข้อมูลตอนนี้ (Download .sql)
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">การตั้งค่าสำรองข้อมูลอัตโนมัติ</h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-bold text-slate-700">สำรองข้อมูลทุกเที่ยงคืน (Daily Backup)</p>
                  <p className="text-sm text-slate-500">ระบบจะทำการส่งไฟล์เข้าอีเมล หรือบันทึกลงในเครื่องเซิร์ฟเวอร์ทุกวัน</p>
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
