import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

const customerSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสลูกค้า"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อลูกค้า"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  type: z.enum(["CASH", "CREDIT"]).default("CASH"),
  creditLimit: z.coerce.number().min(0).default(0),
  creditTermDays: z.coerce.number().int().min(0).default(0),
  priceTier: z.enum(["RETAIL", "CONTRACTOR"]).default("RETAIL"),
})

export async function GET(request: Request) {
  try {
    await requireApiSession()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    if (type && type !== "CASH" && type !== "CREDIT") {
      throw new ApiError("ประเภทลูกค้าไม่ถูกต้อง", 400)
    }
    const customerType = type === "CASH" || type === "CREDIT" ? type : undefined

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ...(customerType ? { type: customerType } : {}),
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ success: true, data: customers })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch customers")
  }
}

export async function POST(request: Request) {
  try {
    await requireApiSession()
    const data = await parseJsonBody(request, customerSchema)

    const exists = await prisma.customer.findUnique({ where: { code: data.code } })
    if (exists) throw new ApiError("รหัสลูกค้านี้มีอยู่ในระบบแล้ว", 400)

    const customer = await prisma.customer.create({
      data: {
        code: data.code,
        name: data.name,
        phone: data.phone,
        address: data.address,
        taxId: data.taxId,
        type: data.type,
        creditLimit: data.creditLimit,
        creditTermDays: data.creditTermDays,
        priceTier: data.priceTier,
      },
    })
    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create customer")
  }
}
