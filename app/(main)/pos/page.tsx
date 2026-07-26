import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { POSClient } from "@/components/pos/pos-client"

export const dynamic = "force-dynamic"

export default async function POSPage() {
  const session = await auth()
  const canCreateCatalog = hasPermission(session?.user?.role || "", "catalog:create")

  const [products, miscProduct, categories, customers, rawSettings] = await Promise.all([
    prisma.product.findMany({
      relationLoadStrategy: "join",
      where: { isActive: true, code: { not: "MISC-001" } },
      select: {
        id: true,
        code: true,
        name: true,
        imageUrl: true,
        searchTags: true,
        soldCount: true,
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
      },
      orderBy: [{ soldCount: "desc" }, { name: "asc" }],
      take: 48,
    }),
    prisma.product.findUnique({
      relationLoadStrategy: "join",
      where: { code: "MISC-001" },
      select: {
        id: true,
        code: true,
        name: true,
        imageUrl: true,
        searchTags: true,
        soldCount: true,
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
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true, code: { not: "MISC-001" } },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.customer.findMany({
      where: { isActive: true }
    }),
    prisma.setting.findMany({
      where: { key: { in: ["isVatEnabled", "vatRate"] } }
    })
  ])

  const settings = rawSettings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)
  const posProducts = miscProduct ? [...products, miscProduct] : products

  return (
    <div className="-m-3 flex h-[calc(100dvh-4rem)] bg-slate-50 sm:-m-4 lg:-m-6 xl:-m-8">
      <POSClient 
        initialProducts={posProducts} 
        categories={categories} 
        customers={customers} 
        settings={settings}
        canCreateCatalog={canCreateCatalog}
      />
    </div>
  )
}
