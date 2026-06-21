import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customerId, amount, method, reference, note, paymentDate, createdById, allocations, invoiceId } = body

    if (!customerId || !amount || !method || !createdById || !allocations || allocations.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate Payment Number (REC-YYMMDD-XXXX)
    const today = new Date()
    const yy = String(today.getFullYear()).slice(2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const prefix = `REC${yy}${mm}${dd}`

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate Payment No
      const lastPayment = await tx.payment.findFirst({
        where: { paymentNo: { startsWith: prefix } },
        orderBy: { paymentNo: 'desc' }
      })
      
      let nextNum = 1
      if (lastPayment) {
        nextNum = parseInt(lastPayment.paymentNo.slice(-4)) + 1
      }
      const paymentNo = `${prefix}${String(nextNum).padStart(4, '0')}`

      // 2. Create Payment Record
      const payment = await tx.payment.create({
        data: {
          paymentNo,
          customerId,
          invoiceId: invoiceId || null,
          amount,
          method,
          reference,
          note,
          paymentDate: new Date(paymentDate),
          createdById
        }
      })

      // 3. Apply Allocations to Sales
      for (const alloc of allocations) {
        const { saleId, applyAmount } = alloc
        
        // Fetch current sale to calculate new paidAmount
        const sale = await tx.sale.findUnique({ where: { id: saleId } })
        if (!sale) throw new Error(`Sale ID ${saleId} not found`)
        
        const newPaidAmount = sale.paidAmount + applyAmount
        const status = newPaidAmount >= sale.grandTotal ? "PAID" : "PARTIAL"

        await tx.sale.update({
          where: { id: saleId },
          data: {
            paidAmount: newPaidAmount,
            status
          }
        })
      }

      // 4. Update Invoice if provided
      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({ 
          where: { id: invoiceId },
          include: { invoiceSales: { include: { sale: true } } }
        })
        if (invoice) {
          // Recalculate invoice paid amount based on its sales
          let totalInvoicePaid = 0
          for (const is of invoice.invoiceSales) {
            // A sale might be paid more than just this invoice, but typically for this simple logic
            // we assume the sale's paidAmount applies to the invoice up to the invoiceSale amount
            // To be safe, just sum up what we've allocated in THIS payment towards THIS invoice
            // Actually, a better way is to update invoice.paidAmount directly
          }
          const newInvoicePaidAmount = invoice.paidAmount + amount
          const invStatus = newInvoicePaidAmount >= invoice.totalAmount ? "PAID" : "PARTIAL"
          
          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newInvoicePaidAmount,
              balance: invoice.totalAmount - newInvoicePaidAmount,
              status: invStatus
            }
          })
        }
      }

      // 5. Recalculate Customer Balance
      // To ensure accuracy, we recalculate customer balance by summing unpaid sales
      const unpaidSales = await tx.sale.findMany({
        where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } }
      })
      const newBalance = unpaidSales.reduce((sum, s) => sum + (s.grandTotal - s.paidAmount), 0)

      await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance }
      })

      return payment
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
