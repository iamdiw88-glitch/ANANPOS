import { auth } from "@/lib/auth"
import { getRoleHomePath } from "@/lib/role-home"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  redirect(getRoleHomePath(session.user.role))
}
