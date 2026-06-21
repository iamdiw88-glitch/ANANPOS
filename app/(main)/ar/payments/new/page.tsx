import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PaymentClient } from "@/components/ar/payment-client"


export default async function NewPaymentPage({
  searchParams
}: {
  searchParams: { customerId?: string, invoiceId?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const customers = await prisma.customer.findMany({
    where: { balance: { gt: 0 } },
    include: {
      sales: {
        where: { status: { in: ["UNPAID", "PARTIAL"] } },
        orderBy: { saleDate: 'asc' } // Oldest first for FIFO
      },
      invoices: {
        where: { status: { in: ["OPEN", "PARTIAL"] } },
        orderBy: { invoiceDate: 'asc' },
        include: { invoiceSales: true }
      }
    }
  })

  const defaultCustomerId = searchParams.customerId ? parseInt(searchParams.customerId) : undefined
  const defaultInvoiceId = searchParams.invoiceId ? parseInt(searchParams.invoiceId) : undefined

  // Make sure the default customer is included even if balance is 0
  if (defaultCustomerId && !customers.find(c => c.id === defaultCustomerId)) {
    const defaultCustomer = await prisma.customer.findUnique({
      where: { id: defaultCustomerId },
      include: {
        sales: {
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          orderBy: { saleDate: 'asc' }
        },
        invoices: {
          where: { status: { in: ["OPEN", "PARTIAL"] } },
          orderBy: { invoiceDate: 'asc' },
          include: { invoiceSales: true }
        }
      }
    })
    if (defaultCustomer) {
      customers.push(defaultCustomer)
    }
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <PaymentClient 
        customers={customers} 
        defaultCustomerId={defaultCustomerId} 
        defaultInvoiceId={defaultInvoiceId}
        currentUserId={parseInt(session.user.id)}
      />
    </div>
  )
}
