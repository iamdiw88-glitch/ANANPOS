import { prisma } from "@/lib/prisma"
import { LoginClient } from "./login-client"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true }
  })

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex min-h-[600px]">
        {/* Left side - Welcome */}
        <div className="w-1/2 bg-slate-900 text-white p-12 flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">ระบบจัดการร้านวัสดุก่อสร้าง</h1>
          <p className="text-slate-400 text-lg">เข้าสู่ระบบเพื่อเริ่มการขายและจัดการข้อมูล</p>
        </div>
        
        {/* Right side - Login */}
        <div className="w-1/2 p-12 bg-white flex flex-col justify-center">
          <LoginClient users={users} />
        </div>
      </div>
    </div>
  )
}
