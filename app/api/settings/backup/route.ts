import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

const execFileAsync = promisify(execFile)

export async function GET() {
  try {
    await requireApiSession(["OWNER"])

    if (process.env.VERCEL) {
      return NextResponse.json({
        error: "การสำรองข้อมูลผ่าน pg_dump ใช้ไม่ได้บน Vercel (serverless ไม่มี pg_dump ติดตั้งและไฟล์ระบบเป็น read-only) กรุณาใช้ฟีเจอร์ Backup / Point-in-Time Recovery ของ Supabase แทน",
      }, { status: 501 })
    }

    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL is not defined" }, { status: 500 })
    }

    try {
      const { stdout } = await execFileAsync(
        "pg_dump",
        [dbUrl, "--clean", "--if-exists", "--no-owner"],
        { maxBuffer: 1024 * 1024 * 50 }
      )

      const fileName = `ananpos_backup_${new Date().toISOString().slice(0, 10)}.sql`

      return new NextResponse(stdout, {
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    } catch (execError: any) {
      console.error("pg_dump failed:", execError)
      return NextResponse.json({
        error: "การสำรองข้อมูลล้มเหลว (pg_dump error). ตรวจสอบว่าได้ติดตั้ง PostgreSQL Tools และเพิ่มใน PATH ของ Windows แล้ว",
        details: execError.message,
      }, { status: 500 })
    }
  } catch (error) {
    return apiErrorResponse(error, "Backup API Error")
  }
}

