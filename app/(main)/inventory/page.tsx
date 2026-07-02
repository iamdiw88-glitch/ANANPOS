import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { InventoryClient } from "@/components/inventory/inventory-client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ListPlus, Plus } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"


export default async function InventoryPage() {
  const session = await auth()
  const canManageProducts = hasPermission(session?.user?.role || "", "product:manage")
  const canAdjustStock = hasPermission(session?.user?.role || "", "stock:adjust")

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
    <div className="flex flex-col gap-4">
      <PageHeader
        title="จัดการสต็อกสินค้า"
        actions={
          canManageProducts ? (
            <>
              <Link href="/inventory/products">
                <Button variant="outline">
                  <ListPlus className="w-4 h-4" />
                  จัดการสินค้า
                </Button>
              </Link>
              <Link href="/inventory/products/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  เพิ่มสินค้า
                </Button>
              </Link>
            </>
          ) : null
        }
      />
      <InventoryClient products={products} categories={categories} canAdjustStock={canAdjustStock} />
    </div>
  )
}
