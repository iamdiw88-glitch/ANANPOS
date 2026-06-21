import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 })
    }

    // Upsert each setting
    const promises = Object.keys(settings).map(key => {
      return prisma.setting.upsert({
        where: { key },
        create: { key, value: String(settings[key]) },
        update: { value: String(settings[key]) }
      })
    })

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error saving settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
