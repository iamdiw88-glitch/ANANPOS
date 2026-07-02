import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { ProductForm } from "@/components/inventory/product-form"
import { notFound, redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!hasPermission(session.user.role, "product:manage")) redirect("/inventory")

  const { id: idParam } = await params
  const id = Number(idParam)
  if (isNaN(id)) notFound()

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      productUnits: { where: { isActive: true } },
      stockBalance: true,
      _count: {
        select: {
          stockMovements: true,
          saleItems: true,
          purchaseItems: true,
          returnItems: true,
        },
      },
    }
  })

  if (!product) notFound()

  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="p-6 flex justify-center">
      <div className="w-full max-w-4xl">
        <ProductForm initialData={product} categories={categories} units={units} />
      </div>
    </div>
  )
}
