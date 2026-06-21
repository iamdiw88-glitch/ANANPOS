import { prisma } from "@/lib/prisma"
import { SettingsClient } from "@/components/settings/settings-client"


export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" }
  })

  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" }
  })

  const rawSettings = await prisma.setting.findMany()
  const settings = rawSettings.reduce((acc: any, cur) => {
    acc[cur.key] = cur.value
    return acc
  }, {
    shopName: "ร้านวัสดุก่อสร้าง อนันต์",
    shopAddress: "",
    shopPhone: "",
    taxId: "",
    vatRate: "7",
    billPrefix: "INV",
    isVatEnabled: "true"
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">ตั้งค่าระบบ (Settings)</h1>
          <p className="text-slate-500 mt-1">จัดการข้อมูลร้าน ผู้ใช้งาน และระบบต่างๆ</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <SettingsClient 
          initialUsers={users}
          initialUnits={units}
          initialSettings={settings}
        />
      </div>
    </div>
  )
}
