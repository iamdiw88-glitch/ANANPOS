import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { adjustDieselStock, getDieselStockSummary, recordDieselIn } from "@/lib/diesel-stock"

const dieselStockInSchema = z.object({
  recordedAt: z.coerce.date(),
  liters: z.coerce.number().positive("จำนวนลิตรต้องมากกว่า 0"),
  companyName: z.string().trim().min(1, "กรุณากรอกบริษัทที่มาเติม"),
  employeeId: z.coerce.number().int().positive(),
})

const dieselStockAdjustmentSchema = z.object({
  balanceLiters: z.coerce.number().min(0, "ยอดคงเหลือต้องไม่น้อยกว่า 0").max(1000, "ยอดคงเหลือต้องไม่เกินความจุ 1,000 ลิตร"),
  note: z.string().trim().max(500).nullable().optional(),
  recordedAt: z.coerce.date().optional(),
})

export async function GET() {
  try {
    await requireApiSession(["OWNER", "STAFF"])
    const summary = await getDieselStockSummary()
    return NextResponse.json(summary)
  } catch (error) {
    return apiErrorResponse(error, "Error loading diesel stock")
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireApiSession(["OWNER", "STAFF"])
    const body = await parseJsonBody(req, dieselStockInSchema)

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: body.employeeId },
        select: { id: true, isActive: true },
      })
      if (!employee?.isActive) {
        throw new ApiError("ไม่พบพนักงานที่ตรวจเช็ค", 404)
      }

      await recordDieselIn({
        tx,
        liters: new Prisma.Decimal(body.liters),
        companyName: body.companyName,
        employeeId: body.employeeId,
        recordedAt: body.recordedAt,
        createdById: userId,
      })
    })

    const summary = await getDieselStockSummary()
    return NextResponse.json(summary, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Error adding diesel stock")
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireApiSession(["OWNER"])
    const body = await parseJsonBody(req, dieselStockAdjustmentSchema)

    await prisma.$transaction(async (tx) => {
      await adjustDieselStock({
        tx,
        balanceLiters: new Prisma.Decimal(body.balanceLiters),
        note: body.note,
        recordedAt: body.recordedAt || new Date(),
        createdById: userId,
      })
    })

    return NextResponse.json(await getDieselStockSummary())
  } catch (error) {
    return apiErrorResponse(error, "Error adjusting diesel stock")
  }
}
