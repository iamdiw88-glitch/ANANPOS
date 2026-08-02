import { prisma } from "@/lib/prisma"
import { BarcodeLabelsClient } from "@/components/barcode/barcode-labels-client"

export const dynamic = "force-dynamic"

export default async function BarcodeLabelsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        productUnits: {
          include: { unit: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return <BarcodeLabelsClient products={products} categories={categories} />
}
