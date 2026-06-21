import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const movements = await prisma.stockMovement.findMany({
      where: { productId: Number(id) },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        createdBy: { select: { name: true } }
      }
    })

    return NextResponse.json(movements)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 })
  }
}
