import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parsePositiveId, requireApiSession } from "@/lib/api"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession()
    const { id: idParam } = await params
    const id = parsePositiveId(idParam, "product ID")

    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(movements)
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch stock movements")
  }
}

