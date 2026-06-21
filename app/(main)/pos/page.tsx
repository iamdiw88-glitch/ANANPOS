import { prisma } from "@/lib/prisma"
import { POSClient } from "@/components/pos/pos-client"

export const dynamic = "force-dynamic"


export default async function POSPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      baseUnit: true,
      productUnits: {
        include: { unit: true }
      },
      stockBalance: true
    }
  })

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  const customers = await prisma.customer.findMany({
    where: { isActive: true }
  })

  return (
    <div className="h-full bg-slate-50 flex -m-4 md:-m-8">
      <POSClient 
        initialProducts={products} 
        categories={categories} 
        customers={customers} 
      />
    </div>
  )
}
