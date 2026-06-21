import { notFound } from "next/navigation"
import { CustomerDetailClient } from "@/components/ar/customer-detail-client"
import { prisma } from "@/lib/prisma"

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customerId = parseInt(id)
  if (isNaN(customerId)) return notFound()

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: {
        orderBy: { saleDate: 'desc' }
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        include: {
          createdBy: { select: { name: true } }
        }
      }
    }
  })

  if (!customer) return notFound()

  return <CustomerDetailClient customer={customer} />
}
