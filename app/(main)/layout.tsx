import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { prisma } from "@/lib/prisma"

async function logoutAction() {
  "use server"
  await signOut()
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const logoSetting = await prisma.setting.findUnique({ where: { key: "logoUrl" }, select: { value: true } })

  return (
    <AppShell
      userName={session.user.name || "ผู้ใช้งาน"}
      role={(session.user.role as string) || "CASHIER"}
      logoUrl={logoSetting?.value || ""}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  )
}
