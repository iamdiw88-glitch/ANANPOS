import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CreateInvoiceClient } from "@/components/ar/create-invoice-client"


export default async function NewInvoicePage({
  searchParams
}: {
  searchParams: { customerId?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const customers = await prisma.customer.findMany({
    where: {
      type: "CREDIT",
    },
    include: {
      sales: {
        where: {
          status: { in: ["UNPAID", "PARTIAL"] },
          paymentType: { in: ["CREDIT", "PARTIAL"] }
        },
        orderBy: { saleDate: "asc" }
      }
    }
  })

  // Filter out customers that don't have unpaid sales, unless it's the pre-selected one
  const defaultCustomerId = searchParams.customerId ? parseInt(searchParams.customerId) : undefined
  const eligibleCustomers = customers.filter(c => c.sales.length > 0 || c.id === defaultCustomerId)

  return (
    <div className="flex flex-col h-full gap-6">
      <CreateInvoiceClient 
        customers={eligibleCustomers} 
        defaultCustomerId={defaultCustomerId} 
        currentUserId={parseInt(session.user.id)}
      />
    </div>
  )
}
