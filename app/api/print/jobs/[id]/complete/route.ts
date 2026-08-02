import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

const completeSchema = z.object({
  status: z.enum(["printed", "failed"]),
  errorMessage: z.string().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession()
    const { id } = await params
    const data = await parseJsonBody(request, completeSchema)

    const updatedJob = await prisma.printJob.update({
      where: { id },
      data: {
        status: data.status,
        errorMessage: data.errorMessage || null,
        printedAt: data.status === "printed" ? new Date() : null,
        printedById: session.userId ? String(session.userId) : null,
      },
    })

    return NextResponse.json({ success: true, data: updatedJob })
  } catch (error) {
    return apiErrorResponse(error, "Failed to complete print job")
  }
}
