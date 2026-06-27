import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"

const allocationSchema = z.object({
  saleId: z.coerce.number().int().positive(),
  applyAmount: z.coerce.number().positive(),
})

const paymentSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  invoiceId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "TRANSFER", "CHEQUE"]),
  paymentDate: z.coerce.date().optional(),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
  allocations: z.array(allocationSchema).optional(),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

function nextInvoiceStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount >= totalAmount) return "PAID"
  if (paidAmount > 0) return "PARTIAL"
  return "OPEN"
}

function nextSaleStatus(grandTotal: number, paidAmount: number) {
  if (paidAmount >= grandTotal) return "PAID"
  if (paidAmount > 0) return "PARTIAL"
  return "UNPAID"
}

async function applyInvoicePayment(tx: Prisma.TransactionClient, invoiceId: number, amount: number) {
  if (amount <= 0) return

  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return

  const paidAmount = roundMoney(invoice.paidAmount + amount)
  const balance = roundMoney(Math.max(0, invoice.totalAmount - paidAmount))
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount,
      balance,
      status: nextInvoiceStatus(invoice.totalAmount, paidAmount),
    },
  })
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiSession()
    const data = await parseJsonBody(request, paymentSchema)
    const amount = roundMoney(data.amount)

    const payment = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, isActive: true },
      })
      if (!customer) throw new ApiError("ไม่พบข้อมูลลูกค้า", 400)
      if (amount > customer.balance + 0.01) {
        throw new ApiError("ยอดรับชำระมากกว่ายอดลูกหนี้คงค้าง", 400)
      }

      const invoice = data.invoiceId
        ? await tx.invoice.findFirst({
            where: { id: data.invoiceId, customerId: customer.id },
            include: { invoiceSales: true },
          })
        : null
      if (data.invoiceId && !invoice) throw new ApiError("ไม่พบใบวางบิลที่เลือก", 400)
      if (invoice && amount > invoice.balance + 0.01) {
        throw new ApiError("ยอดรับชำระมากกว่ายอดค้างในใบวางบิล", 400)
      }

      const todayStr = yymmdd()
      const prefix = `PM${todayStr}`
      await lockDocumentSeries(tx, `payment:${todayStr}`)
      const lastPayment = await tx.payment.findFirst({
        where: { paymentNo: { startsWith: prefix } },
        orderBy: { paymentNo: "desc" },
        select: { paymentNo: true },
      })
      const paymentNo = `${prefix}${String(nextSequenceFrom(lastPayment?.paymentNo, prefix)).padStart(4, "0")}`

      const p = await tx.payment.create({
        data: {
          paymentNo,
          customerId: customer.id,
          invoiceId: invoice?.id,
          amount,
          method: data.method,
          paymentDate: data.paymentDate || new Date(),
          reference: data.reference,
          note: data.note,
          createdById: userId,
        },
      })

      const targetSaleIds = invoice ? new Set(invoice.invoiceSales.map((link) => link.saleId)) : null
      const unpaidSales = await tx.sale.findMany({
        where: {
          customerId: customer.id,
          status: { in: ["UNPAID", "PARTIAL"] },
          paymentType: { in: ["CREDIT", "PARTIAL"] },
          ...(targetSaleIds ? { id: { in: [...targetSaleIds] } } : {}),
        },
        orderBy: { saleDate: "asc" },
      })
      const saleMap = new Map(unpaidSales.map((sale) => [sale.id, sale]))

      let allocations =
        data.allocations?.map((allocation) => ({
          saleId: allocation.saleId,
          applyAmount: roundMoney(allocation.applyAmount),
        })) || []

      if (allocations.length === 0) {
        let remaining = amount
        allocations = []
        for (const sale of unpaidSales) {
          if (remaining <= 0) break
          const remainingSaleBalance = roundMoney(sale.grandTotal - sale.paidAmount)
          if (remainingSaleBalance <= 0) continue

          const applyAmount = roundMoney(Math.min(remaining, remainingSaleBalance))
          allocations.push({ saleId: sale.id, applyAmount })
          remaining = roundMoney(remaining - applyAmount)
        }
      }

      const totalAllocated = roundMoney(allocations.reduce((sum, allocation) => sum + allocation.applyAmount, 0))
      if (Math.abs(totalAllocated - amount) > 0.01) {
        throw new ApiError("ยอดจัดสรรไม่ตรงกับยอดรับชำระ", 400)
      }

      for (const allocation of allocations) {
        const sale = saleMap.get(allocation.saleId)
        if (!sale) throw new ApiError("พบรายการขายที่ไม่สามารถรับชำระได้", 400)

        const remainingSaleBalance = roundMoney(sale.grandTotal - sale.paidAmount)
        if (allocation.applyAmount > remainingSaleBalance + 0.01) {
          throw new ApiError("ยอดจัดสรรมากกว่ายอดค้างของบิลขาย", 400)
        }

        const paidAmount = roundMoney(sale.paidAmount + allocation.applyAmount)
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            paidAmount,
            status: nextSaleStatus(sale.grandTotal, paidAmount),
          },
        })

        if (!invoice) {
          let remainingForInvoice = allocation.applyAmount
          const links = await tx.invoiceSale.findMany({
            where: { saleId: sale.id },
            include: { invoice: true },
            orderBy: { invoiceId: "asc" },
          })

          for (const link of links) {
            if (remainingForInvoice <= 0) break
            const invoiceOpenAmount = Math.min(link.invoice.balance, link.amount)
            const applyToInvoice = roundMoney(Math.min(remainingForInvoice, invoiceOpenAmount))
            await applyInvoicePayment(tx, link.invoiceId, applyToInvoice)
            remainingForInvoice = roundMoney(remainingForInvoice - applyToInvoice)
          }
        }
      }

      if (invoice) {
        await applyInvoicePayment(tx, invoice.id, amount)
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: { balance: { decrement: amount } },
      })

      return p
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create payment")
  }
}

