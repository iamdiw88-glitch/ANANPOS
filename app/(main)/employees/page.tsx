import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { EmployeesClient } from "@/components/employees/employees-client"
import { employeeSelect } from "@/lib/hr-fleet"

export const dynamic = "force-dynamic"

export default async function EmployeesPage() {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    redirect("/dashboard")
  }

  const employees = await prisma.employee.findMany({
    select: employeeSelect,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  })

  return (
    <div className="space-y-5">
      <PageHeader title="พนักงาน" description="จัดการข้อมูลพนักงาน คนขับรถ และบันทึกเวลาเข้าออกงาน" />
      <EmployeesClient initialEmployees={employees} />
    </div>
  )
}
