import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"

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

  return (
    <AppShell
      userName={session.user.name || "ผู้ใช้งาน"}
      role={(session.user.role as string) || "CASHIER"}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  )
}
