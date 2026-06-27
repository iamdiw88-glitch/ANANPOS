import { prisma } from "@/lib/prisma"
import { ProductForm } from "@/components/inventory/product-form"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      productUnits: { where: { isActive: true } }
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
