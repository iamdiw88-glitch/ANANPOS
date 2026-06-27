import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"

const deliverySchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "FAILED"]),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession()
    const { id } = await params
    const deliveryId = parsePositiveId(id, "delivery ID")
    const { status } = await parseJsonBody(req, deliverySchema)

    const dataToUpdate: any = { status }
    if (status === "DELIVERED") {
      dataToUpdate.deliveredAt = new Date()
    } else {
      dataToUpdate.deliveredAt = null
    }

    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: dataToUpdate,
    })

    return NextResponse.json(delivery)
  } catch (error) {
    return apiErrorResponse(error, "Error updating delivery")
  }
}

