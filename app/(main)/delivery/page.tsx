import { prisma } from "@/lib/prisma"
import { DeliveryBoard } from "@/components/delivery/delivery-board"
import { PageHeader } from "@/components/ui/page-header"


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
      driver: { select: { id: true, name: true, nickname: true, phone: true, avatarColor: true } },
      assignedVehicle: { select: { id: true, vehicleCode: true, plateNumber: true, vehicleType: true, brand: true, model: true } },
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
    <div className="flex flex-col h-full gap-4">
      <PageHeader title="คิวจัดส่ง (Delivery Board)" description="จัดการสถานะการจัดส่งสินค้า" />

      <div className="flex-1 overflow-hidden">
        <DeliveryBoard initialDeliveries={deliveries} />
      </div>
    </div>
  )
}
