import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  if (process.env.VERCEL) {
    return NextResponse.json({
      error: "การสำรองข้อมูลผ่าน pg_dump ใช้ไม่ได้บน Vercel (serverless ไม่มี pg_dump ติดตั้งและไฟล์ระบบเป็น read-only) กรุณาใช้ฟีเจอร์ Backup / Point-in-Time Recovery ของ Supabase แทน",
    }, { status: 501 })
  }

  try {
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL is not defined" }, { status: 500 })
    }

    // Try to run pg_dump. This requires pg_dump to be installed on the server.
    // For local Windows environments, make sure PostgreSQL bin folder is in PATH.
    try {
      // Clean URL just in case, though usually works directly
      const { stdout, stderr } = await execAsync(`pg_dump "${dbUrl}" --clean --if-exists --no-owner`, { maxBuffer: 1024 * 1024 * 50 }) // 50MB buffer
      
      const fileName = `ananpos_backup_${new Date().toISOString().slice(0, 10)}.sql`
      
      return new NextResponse(stdout, {
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="${fileName}"`
        }
      })
    } catch (execError: any) {
      console.error("pg_dump failed:", execError)
      return NextResponse.json({ 
        error: "การสำรองข้อมูลล้มเหลว (pg_dump error). ตรวจสอบว่าได้ติดตั้ง PostgreSQL Tools และเพิ่มใน PATH ของ Windows แล้ว",
        details: execError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("Backup API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
