import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"

const invoiceSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  saleIds: z.array(z.coerce.number().int().positive()).min(1, "กรุณาเลือกบิลขาย"),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

export async function POST(req: Request) {
  try {
    const { userId } = await requireApiSession()
    const body = await parseJsonBody(req, invoiceSchema)

    const invoice = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: body.customerId, isActive: true },
        select: { id: true },
      })
      if (!customer) throw new ApiError("ไม่พบข้อมูลลูกค้า", 400)

      const sales = await tx.sale.findMany({
        where: {
          id: { in: body.saleIds },
          customerId: body.customerId,
          status: { in: ["UNPAID", "PARTIAL"] },
          paymentType: { in: ["CREDIT", "PARTIAL"] },
        },
        include: { invoiceSales: true },
      })

      if (sales.length !== body.saleIds.length) {
        throw new ApiError("บางบิลไม่พร้อมวางบิลหรือไม่ใช่ของลูกค้ารายนี้", 400)
      }
      if (sales.some((sale) => sale.invoiceSales.length > 0)) {
        throw new ApiError("บางบิลถูกนำไปวางบิลแล้ว", 400)
      }

      let totalAmount = 0
      const invoiceSalesData = sales.map((sale) => {
        const remaining = roundMoney(sale.grandTotal - sale.paidAmount)
        if (remaining <= 0) throw new ApiError("พบยอดค้างที่ไม่ถูกต้อง", 400)
        totalAmount = roundMoney(totalAmount + remaining)
        return { saleId: sale.id, amount: remaining }
      })

      const todayStr = yymmdd()
      const prefix = `INV${todayStr}`
      await lockDocumentSeries(tx, `invoice:${todayStr}`)
      const lastInvoice = await tx.invoice.findFirst({
        where: { invoiceNo: { startsWith: prefix } },
        orderBy: { invoiceNo: "desc" },
        select: { invoiceNo: true },
      })
      const invoiceNo = `${prefix}${String(nextSequenceFrom(lastInvoice?.invoiceNo, prefix)).padStart(4, "0")}`

      return tx.invoice.create({
        data: {
          invoiceNo,
          customerId: body.customerId,
          invoiceDate: body.invoiceDate,
          dueDate: body.dueDate,
          totalAmount,
          balance: totalAmount,
          status: "OPEN",
          createdById: userId,
          invoiceSales: { create: invoiceSalesData },
        },
      })
    })

    return NextResponse.json(invoice)
  } catch (error) {
    return apiErrorResponse(error, "Error creating invoice")
  }
}

export async function GET(req: Request) {
  try {
    await requireApiSession()

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")

    const where: any = {}
    if (customerId) where.customerId = Number(customerId)
    if (status) where.status = status

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      include: {
        customer: true,
        invoiceSales: { include: { sale: true } },
      },
    })
    return NextResponse.json(invoices)
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch invoices")
  }
}

