import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { CreateReturnClient } from "@/components/returns/create-return-client"

export const dynamic = "force-dynamic"

export default async function NewReturnPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!hasPermission(session.user.role, "return:create")) redirect("/pos")

  return (
    <div className="flex flex-col h-full gap-4">
      <CreateReturnClient currentUserId={parseInt(session.user.id)} />
    </div>
  )
}
