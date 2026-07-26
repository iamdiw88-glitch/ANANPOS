import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { ProductForm } from "@/components/inventory/product-form"

export const dynamic = "force-dynamic"

export default async function NewProductPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!hasPermission(session.user.role, "catalog:create")) redirect("/inventory")

  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="p-6 flex justify-center">
      <div className="w-full max-w-4xl">
        <ProductForm categories={categories} units={units} />
      </div>
    </div>
  )
}
