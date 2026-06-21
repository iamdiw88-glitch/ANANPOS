import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CreatePurchaseClient } from "@/components/purchases/create-purchase-client"


export default async function NewPurchasePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  // Pre-fetch all products with units to easily add to PO
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name: true } },
      productUnits: {
        include: { unit: true }
      }
    }
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <CreatePurchaseClient 
        suppliers={suppliers} 
        products={products}
        currentUserId={parseInt(session.user.id)}
      />
    </div>
  )
}
