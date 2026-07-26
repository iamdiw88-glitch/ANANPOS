import { Store } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { LoginClient } from "./login-client"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#edf4fb] p-3 sm:p-6">
      <main className="w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-900/10 sm:rounded-3xl">
        <header className="flex items-center justify-center gap-3 border-b border-slate-100 bg-white px-6 py-5 sm:py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading text-xl font-extrabold tracking-tight text-slate-900">ANAN POS</div>
            <div className="text-xs font-bold text-slate-500">เข้าสู่ระบบร้านค้า</div>
          </div>
        </header>

        <section className="flex min-h-0 items-center bg-slate-50/60 p-4 sm:min-h-[570px] sm:p-8 lg:p-10">
          <LoginClient users={users} />
        </section>
      </main>
    </div>
  )
}
