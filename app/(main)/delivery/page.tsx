import { prisma } from "@/lib/prisma"
import { DeliveryBoard } from "@/components/delivery/delivery-board"


// Disable caching to always show the latest delivery statuses
export const dynamic = "force-dynamic"

export default async function DeliveryPage() {
  // Fetch active deliveries (not delivered/failed within the last 2 days)
  const deliveries = await prisma.delivery.findMany({
    where: {
      OR: [
        { status: { in: ["PENDING", "IN_TRANSIT"] } },
        { 
          status: { in: ["DELIVERED", "FAILED"] },
          updatedAt: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } // Last 48 hours
        }
      ]
    },
    include: {
      customer: { select: { name: true, phone: true } },
      sale: {
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              productUnit: { include: { unit: { select: { name: true } } } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">คิวจัดส่ง (Delivery Board)</h1>
          <p className="text-slate-500 mt-1">จัดการสถานะการจัดส่งสินค้า</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <DeliveryBoard initialDeliveries={deliveries} />
      </div>
    </div>
  )
}
