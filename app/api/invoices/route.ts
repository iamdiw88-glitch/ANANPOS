import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customerId, saleIds, invoiceDate, dueDate, createdById } = body

    if (!customerId || !saleIds || saleIds.length === 0 || !createdById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Fetch the sales to ensure they are UNPAID/PARTIAL and calculate total
    const sales = await prisma.sale.findMany({
      where: {
        id: { in: saleIds },
        customerId: customerId,
        status: { in: ["UNPAID", "PARTIAL"] }
      }
    })

    if (sales.length !== saleIds.length) {
      return NextResponse.json({ error: "Some sales are not eligible or belong to another customer" }, { status: 400 })
    }

    let totalAmount = 0
    const invoiceSalesData = sales.map(sale => {
      const remaining = sale.grandTotal - sale.paidAmount
      totalAmount += remaining
      return {
        saleId: sale.id,
        amount: remaining
      }
    })

    // Generate Invoice Number (INV-YYMMDD-XXXX)
    const today = new Date()
    const yy = String(today.getFullYear()).slice(2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const prefix = `INV${yy}${mm}${dd}`
    
    // Using transaction for generating bill no and creating the invoice
    const invoice = await prisma.$transaction(async (tx) => {
      const lastInvoice = await tx.invoice.findFirst({
        where: { invoiceNo: { startsWith: prefix } },
        orderBy: { invoiceNo: 'desc' }
      })
      
      let nextNum = 1
      if (lastInvoice) {
        nextNum = parseInt(lastInvoice.invoiceNo.slice(-4)) + 1
      }
      const invoiceNo = `${prefix}${String(nextNum).padStart(4, '0')}`

      // Create Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNo,
          customerId,
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          totalAmount,
          balance: totalAmount,
          status: "OPEN",
          createdById,
          invoiceSales: {
            create: invoiceSalesData
          }
        }
      })

      return newInvoice
    })

    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId")
  const status = searchParams.get("status")

  const where: any = {}
  if (customerId) where.customerId = parseInt(customerId)
  if (status) where.status = status

  try {
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: {
        customer: true,
        invoiceSales: {
          include: {
            sale: true
          }
        }
      }
    })
    return NextResponse.json(invoices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
