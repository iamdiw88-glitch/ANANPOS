import { prisma } from "@/lib/prisma"
import { POSClient } from "@/components/pos/pos-client"

export const dynamic = "force-dynamic"

async function ensureMiscSaleProduct() {
  const [category, unit] = await Promise.all([
    prisma.category.upsert({
      where: { name: "อื่นๆ" },
      update: { isActive: true },
      create: { name: "อื่นๆ", sortOrder: 999, isActive: true },
    }),
    prisma.unit.upsert({
      where: { name: "รายการ" },
      update: {},
      create: { name: "รายการ", abbreviation: "รายการ" },
    }),
  ])

  const product = await prisma.product.upsert({
    where: { code: "MISC-001" },
    update: {
      name: "สินค้านอกระบบ",
      searchTags: "สินค้าทั่วไป จิปาถะ อื่นๆ misc",
      categoryId: category.id,
      baseUnitId: unit.id,
      reorderPoint: 0,
      isStockItem: false,
      isActive: true,
    },
    create: {
      code: "MISC-001",
      name: "สินค้านอกระบบ",
      searchTags: "สินค้าทั่วไป จิปาถะ อื่นๆ misc",
      categoryId: category.id,
      baseUnitId: unit.id,
      reorderPoint: 0,
      isStockItem: false,
      isActive: true,
    },
  })

  await prisma.productUnit.updateMany({
    where: { productId: product.id },
    data: { isDefaultSale: false },
  })

  const productUnit = await prisma.productUnit.findFirst({
    where: { productId: product.id, unitId: unit.id },
    select: { id: true },
  })

  if (productUnit) {
    await prisma.productUnit.update({
      where: { id: productUnit.id },
      data: {
        conversionRate: 1,
        price: 0,
        contractorPrice: null,
        isDefaultSale: true,
        isActive: true,
      },
    })
  } else {
    await prisma.productUnit.create({
      data: {
        productId: product.id,
        unitId: unit.id,
        conversionRate: 1,
        price: 0,
        contractorPrice: null,
        isDefaultSale: true,
        isActive: true,
      },
    })
  }
}


export default async function POSPage() {
  await ensureMiscSaleProduct()

  const [products, miscProduct, categories, customers, rawSettings] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, code: { not: "MISC-001" } },
      select: {
        id: true,
        code: true,
        name: true,
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
      where: { code: "MISC-001" },
      select: {
        id: true,
        code: true,
        name: true,
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
      orderBy: { sortOrder: 'asc' }
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
    <div className="h-full bg-slate-50 flex -m-4 md:-m-8">
      <POSClient 
        initialProducts={posProducts} 
        categories={categories} 
        customers={customers} 
        settings={settings}
      />
    </div>
  )
}
