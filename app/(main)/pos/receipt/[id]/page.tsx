import { notFound } from "next/navigation"
import { ReceiptClient } from "./receipt-client"
import { prisma } from "@/lib/prisma"

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sale = await prisma.sale.findUnique({
    where: { id: Number(id) },
    include: {
      items: {
        include: {
          product: true,
          productUnit: {
            include: { unit: true }
          }
        }
      },
      customer: true,
      createdBy: true
    }
  })

  if (!sale) notFound()

  return <ReceiptClient sale={sale} />
}
