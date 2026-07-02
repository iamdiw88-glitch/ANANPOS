import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error: "Face scan module ยังไม่พร้อมใช้งาน",
      message: "กรุณาบันทึกเวลาด้วยมือที่ /api/employees/[id]/attendance",
      availableAt: "Phase 2",
    },
    { status: 501 }
  )
}
