import { prisma } from "@/lib/prisma"
import { InventoryClient } from "@/components/inventory/inventory-client"

export const dynamic = "force-dynamic"


export default async function InventoryPage() {
  const products = await prisma.product.findMany({
    where: { isStockItem: true, isActive: true },
    include: {
      category: true,
      baseUnit: true,
      stockBalance: true
    },
    orderBy: { name: 'asc' }
  })

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">จัดการสต็อกสินค้า</h1>
      </div>
      <InventoryClient products={products} categories={categories} />
    </div>
  )
}
