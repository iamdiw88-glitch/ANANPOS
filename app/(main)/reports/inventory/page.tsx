import { prisma } from "@/lib/prisma"
import { InventoryClient } from "@/components/reports/inventory-client"


export const dynamic = "force-dynamic"

export default async function InventoryReportPage() {
  const products = await prisma.product.findMany({
    where: { isStockItem: true, isActive: true },
    include: {
      baseUnit: true,
      stockBalance: true,
      stockMovements: {
        where: { movementType: "PURCHASE_IN" },
        orderBy: { createdAt: "desc" },
        take: 10 // Calculate moving average from last 10 purchases
      }
    }
  })

  // Format data for the client
  const inventoryData = products.map(p => {
    const qty = p.stockBalance?.quantityOnHand || 0
    
    // Calculate simple moving average cost from recent purchases
    let avgCost = 0
    if (p.stockMovements.length > 0) {
      const totalCost = p.stockMovements.reduce((sum, m) => sum + (m.unitCost * m.quantityBase), 0)
      const totalQty = p.stockMovements.reduce((sum, m) => sum + m.quantityBase, 0)
      avgCost = totalQty > 0 ? totalCost / totalQty : 0
    }

    const value = qty * avgCost
    const isBelowReorder = qty <= p.reorderPoint

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      baseUnit: p.baseUnit.name,
      quantityOnHand: qty,
      reorderPoint: p.reorderPoint,
      avgCost,
      totalValue: value,
      status: isBelowReorder ? "URGENT" : "OK"
    }
  })

  // Sort: URGENT first, then by value descending
  inventoryData.sort((a, b) => {
    if (a.status === "URGENT" && b.status !== "URGENT") return -1
    if (a.status !== "URGENT" && b.status === "URGENT") return 1
    return b.totalValue - a.totalValue
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">รายงานสินค้าคงคลัง</h1>
          <p className="text-slate-500 mt-1">ตรวจสอบยอดคงเหลือ จุดสั่งซื้อ และมูลค่าสต็อก</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <InventoryClient initialData={inventoryData} />
      </div>
    </div>
  )
}
