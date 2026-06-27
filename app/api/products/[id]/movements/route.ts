import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      include: {
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(movements)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
