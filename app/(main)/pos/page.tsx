import { prisma } from "@/lib/prisma"
import { POSClient } from "@/components/pos/pos-client"

export const dynamic = "force-dynamic"


export default async function POSPage() {
  const [products, categories, customers] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        baseUnitId: true,
        reorderPoint: true,
        isStockItem: true,
        category: { select: { id: true, name: true } },
        baseUnit: { select: { id: true, name: true } },
        productUnits: {
          where: { isActive: true },
          select: {
            id: true,
            unitId: true,
            conversionRate: true,
            price: true,
            contractorPrice: true,
            isDefaultSale: true,
            barcode: true,
            unit: { select: { id: true, name: true } },
          }
        },
        stockBalance: { select: { quantityOnHand: true } }
      }
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.customer.findMany({
      where: { isActive: true }
    })
  ])

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
