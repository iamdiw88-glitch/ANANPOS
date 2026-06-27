import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const data = await request.json()
    // data: { customerId, invoiceId (nullable), amount, method }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          paymentNo: `PM${new Date().getTime()}`,
          customerId: data.customerId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          note: data.note,
          createdById: Number(session.user.id)
        }
      })

      // Decrease customer balance
      await tx.customer.update({
        where: { id: data.customerId },
        data: { balance: { decrement: data.amount } }
      })

      // Update invoice if linked
      if (data.invoiceId) {
        const inv = await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { paidAmount: { increment: data.amount } }
        })
        if (inv.paidAmount >= inv.totalAmount) {
          await tx.invoice.update({ where: { id: inv.id }, data: { status: 'PAID' } })
        } else if (inv.paidAmount > 0) {
          await tx.invoice.update({ where: { id: inv.id }, data: { status: 'PARTIAL' } })
        }
      }

      return p
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
