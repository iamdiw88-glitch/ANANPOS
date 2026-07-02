import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"

const deliverySchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "FAILED"]),
  scheduledDate: z.coerce.date().nullable().optional(),
  driverName: z.string().trim().nullable().optional(),
  vehicle: z.string().trim().nullable().optional(),
  driverId: z.coerce.number().int().positive().nullable().optional(),
  vehicleId: z.coerce.number().int().positive().nullable().optional(),
  deliveryCustomerId: z.coerce.number().int().positive().nullable().optional(),
  deliveryAddress: z.string().trim().min(1).optional(),
  recipientName: z.string().trim().nullable().optional(),
  recipientPhone: z.string().trim().nullable().optional(),
  recipientPhone2: z.string().trim().nullable().optional(),
  subdistrictId: z.string().trim().nullable().optional(),
  subdistrictName: z.string().trim().nullable().optional(),
  moo: z.coerce.number().int().positive().nullable().optional(),
  villageName: z.string().trim().nullable().optional(),
  landmark: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  cashActualAmount: z.coerce.number().min(0).nullable().optional(),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiSession()
    const { id } = await params
    const deliveryId = parsePositiveId(id, "delivery ID")
    const {
      status,
      scheduledDate,
      driverName,
      vehicle,
      driverId,
      vehicleId,
      deliveryCustomerId,
      deliveryAddress,
      recipientName,
      recipientPhone,
      recipientPhone2,
      subdistrictId,
      subdistrictName,
      moo,
      villageName,
      landmark,
      note,
      cashActualAmount,
    } = await parseJsonBody(req, deliverySchema)

    const currentDelivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        sale: { select: { id: true, grandTotal: true, paidAmount: true } },
        driver: { select: { id: true, name: true, nickname: true } },
        assignedVehicle: { select: { id: true, plateNumber: true, vehicleCode: true } },
      },
    })

    if (!currentDelivery) {
      throw new ApiError("Delivery not found", 404)
    }
    if (
      currentDelivery.isCOD &&
      currentDelivery.status === "DELIVERED" &&
      currentDelivery.cashSettledAt &&
      status !== "DELIVERED"
    ) {
      throw new ApiError("บิล COD นี้ส่งสำเร็จและรับเงินแล้ว ไม่สามารถย้อนสถานะได้ กรุณาทำรายการยกเลิก/คืนสินค้าแทน", 409)
    }

    const selectedDriver = driverId
      ? await prisma.employee.findFirst({
          where: { id: driverId, isActive: true },
          select: { id: true, name: true, nickname: true },
        })
      : null
    if (driverId && !selectedDriver) {
      throw new ApiError("ไม่พบคนขับที่ใช้งานอยู่", 404)
    }

    const selectedVehicle = vehicleId
      ? await prisma.vehicle.findFirst({
          where: { id: vehicleId, isActive: true },
          select: { id: true, plateNumber: true, vehicleCode: true, status: true },
        })
      : null
    if (vehicleId && !selectedVehicle) {
      throw new ApiError("ไม่พบรถที่ใช้งานอยู่", 404)
    }
    if (
      selectedVehicle &&
      selectedVehicle.status !== "AVAILABLE" &&
      selectedVehicle.id !== currentDelivery.vehicleId
    ) {
      throw new ApiError("รถคันนี้ไม่ว่างสำหรับจัดส่ง", 409)
    }

    if (recipientPhone && !/^\d{10}$/.test(recipientPhone)) {
      throw new ApiError("เบอร์ผู้รับต้องเป็นตัวเลข 10 หลัก", 400)
    }
    if (recipientPhone2 && !/^\d{10}$/.test(recipientPhone2)) {
      throw new ApiError("เบอร์สำรองต้องเป็นตัวเลข 10 หลัก", 400)
    }

    const selectedDeliveryCustomer = deliveryCustomerId
      ? await prisma.deliveryCustomer.findFirst({
          where: { id: deliveryCustomerId, isActive: true },
          select: { id: true },
        })
      : null
    if (deliveryCustomerId && !selectedDeliveryCustomer) {
      throw new ApiError("ไม่พบข้อมูลผู้รับที่เลือก", 404)
    }

    const dataToUpdate: any = {
      status,
      scheduledDate: scheduledDate ?? null,
      driverId: driverId ?? null,
      vehicleId: vehicleId ?? null,
      deliveryCustomerId:
        deliveryCustomerId === undefined ? currentDelivery.deliveryCustomerId : selectedDeliveryCustomer?.id ?? null,
      deliveryAddress: deliveryAddress ?? currentDelivery.deliveryAddress,
      recipientName: recipientName === undefined ? currentDelivery.recipientName : recipientName || null,
      recipientPhone: recipientPhone === undefined ? currentDelivery.recipientPhone : recipientPhone || null,
      recipientPhone2: recipientPhone2 === undefined ? currentDelivery.recipientPhone2 : recipientPhone2 || null,
      subdistrictId: subdistrictId === undefined ? currentDelivery.subdistrictId : subdistrictId || null,
      subdistrictName: subdistrictName === undefined ? currentDelivery.subdistrictName : subdistrictName || null,
      moo: moo === undefined ? currentDelivery.moo : moo ?? null,
      villageName: villageName === undefined ? currentDelivery.villageName : villageName || null,
      landmark: landmark === undefined ? currentDelivery.landmark : landmark || null,
      driverName: selectedDriver ? selectedDriver.nickname || selectedDriver.name : driverName || null,
      vehicle: selectedVehicle ? selectedVehicle.plateNumber : vehicle || null,
      note: note || null,
    }

    if (currentDelivery.isCOD && cashActualAmount != null) {
      dataToUpdate.cashActualAmount = roundMoney(cashActualAmount)
    }

    if (status === "DELIVERED") {
      if (currentDelivery.isCOD) {
        const expectedAmount = roundMoney(currentDelivery.cashExpectedAmount ?? currentDelivery.sale.grandTotal - currentDelivery.sale.paidAmount)
        const actualAmount = roundMoney(cashActualAmount ?? 0)

        if (actualAmount < expectedAmount) {
          throw new ApiError("กรุณากรอกยอดเงินปลายทางให้ครบก่อนจัดส่งสำเร็จ", 400)
        }

        dataToUpdate.cashSettledAt = new Date()
        dataToUpdate.cashSettledById = userId
        dataToUpdate.cashExpectedAmount = expectedAmount
        dataToUpdate.cashActualAmount = actualAmount
        dataToUpdate.cashDifference = roundMoney(actualAmount - expectedAmount)
      }
      dataToUpdate.deliveredAt = new Date()
    } else {
      dataToUpdate.deliveredAt = null
    }

    const delivery = await prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: dataToUpdate,
        include: {
          driver: { select: { id: true, name: true, nickname: true, phone: true, avatarColor: true } },
          assignedVehicle: { select: { id: true, vehicleCode: true, plateNumber: true, vehicleType: true, brand: true, model: true } },
        },
      })

      if (currentDelivery.vehicleId && currentDelivery.vehicleId !== vehicleId) {
        await tx.vehicle.update({
          where: { id: currentDelivery.vehicleId },
          data: { status: "AVAILABLE" },
        })
      }

      if (vehicleId) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: status === "DELIVERED" || status === "FAILED" ? "AVAILABLE" : "IN_USE" },
        })
      }

      if (status === "DELIVERED" && currentDelivery.isCOD) {
        await tx.sale.update({
          where: { id: currentDelivery.sale.id },
          data: {
            paidAmount: currentDelivery.sale.grandTotal,
            status: "PAID",
          },
        })
      }

      return updatedDelivery
    })

    return NextResponse.json(delivery)
  } catch (error) {
    return apiErrorResponse(error, "Error updating delivery")
  }
}
