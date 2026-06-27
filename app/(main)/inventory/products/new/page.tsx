import { prisma } from "@/lib/prisma"
import { ProductForm } from "@/components/inventory/product-form"

export const dynamic = "force-dynamic"

export default async function NewProductPage() {
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
