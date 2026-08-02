import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { PrinterPairingCard } from "@/components/printer/printer-pairing-card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function PrintHistoryPage() {
  const session = await auth()

  const printJobs = await prisma.printJob.findMany({
    include: { device: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ระบบและประวัติการพิมพ์เอกสาร"
        description="จัดการการเชื่อมต่อเครื่องพิมพ์สลิป และตรวจสอบประวัติการพิมพ์ทั้งหมด"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PrinterPairingCard documentType="receipt" />
        </div>

        <div className="lg:col-span-2">
          <div className="card overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="font-heading text-base font-extrabold text-slate-900">
                ประวัติการสั่งพิมพ์ล่าสุด (50 รายการ)
              </h3>
            </div>

            <Table>
              <THead>
                <TR>
                  <TH>ประเภทเอกสาร</TH>
                  <TH>เลขที่อ้างอิง</TH>
                  <TH>รูปแบบ</TH>
                  <TH>สถานะ</TH>
                  <TH>เวลาที่สั่งพิมพ์</TH>
                </TR>
              </THead>
              <TBody>
                {printJobs.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="py-8 text-center text-slate-500">
                      ยังไม่มีประวัติการพิมพ์เอกสารในระบบ
                    </TD>
                  </TR>
                ) : (
                  printJobs.map((job) => (
                    <TR key={job.id}>
                      <TD className="font-medium text-slate-900">
                        {job.type === "receipt"
                          ? "สลิปใบเสร็จ"
                          : job.type === "delivery_note"
                            ? "ใบส่งของ A4"
                            : "ฉลากบาร์โค้ด"}
                      </TD>
                      <TD className="font-mono text-xs font-bold text-slate-700">{job.refId}</TD>
                      <TD>
                        <Badge variant="info">
                          {job.method === "webusb" ? "Direct WebUSB" : "Browser Print"}
                        </Badge>
                      </TD>
                      <TD>
                        {job.status === "printed" ? (
                          <Badge variant="success">สำเร็จ</Badge>
                        ) : job.status === "failed" ? (
                          <Badge variant="danger">ล้มเหลว</Badge>
                        ) : (
                          <Badge variant="warning">รอพิมพ์</Badge>
                        )}
                      </TD>
                      <TD className="text-xs text-slate-500">
                        {new Intl.DateTimeFormat("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(job.createdAt))}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
