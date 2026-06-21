import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deliveryId = parseInt(id)
    if (isNaN(deliveryId)) {
      return NextResponse.json({ error: "Invalid delivery ID" }, { status: 400 })
    }

    const body = await req.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const dataToUpdate: any = { status }
    if (status === "DELIVERED") {
      dataToUpdate.deliveredAt = new Date()
    }

    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: dataToUpdate
    })

    return NextResponse.json(delivery)
  } catch (error: any) {
    console.error("Error updating delivery:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
