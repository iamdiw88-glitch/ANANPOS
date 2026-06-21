import { prisma } from "@/lib/prisma"
import { SettingsClient } from "@/components/settings/settings-client"
import { PageHeader } from "@/components/ui/page-header"


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
    <div className="flex flex-col h-full gap-4">
      <PageHeader title="ตั้งค่าระบบ (Settings)" description="จัดการข้อมูลร้าน ผู้ใช้งาน และระบบต่างๆ" />

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
