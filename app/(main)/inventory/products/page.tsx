import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      baseUnit: true,
      productUnits: {
        include: { unit: true }
      },
      stockBalance: true
    },
    orderBy: { id: 'desc' }
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-heading">จัดการข้อมูลสินค้า (Product Master)</h1>
        <Link href="/inventory/products/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="text-left p-4 font-semibold">รหัสสินค้า</th>
              <th className="text-left p-4 font-semibold">ชื่อสินค้า</th>
              <th className="text-left p-4 font-semibold">หมวดหมู่</th>
              <th className="text-left p-4 font-semibold">หน่วยฐาน</th>
              <th className="text-right p-4 font-semibold">สต็อกปัจจุบัน</th>
              <th className="text-center p-4 font-semibold">หน่วยขาย (อัตราส่วน)</th>
              <th className="text-center p-4 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-b border-border hover:bg-slate-50">
                <td className="p-4">{product.code}</td>
                <td className="p-4 font-medium">{product.name}</td>
                <td className="p-4">{product.category?.name}</td>
                <td className="p-4">{product.baseUnit?.name}</td>
                <td className="p-4 text-right">
                  <span className={product.stockBalance?.quantityOnHand! <= product.reorderPoint ? 'text-destructive font-bold' : ''}>
                    {product.stockBalance?.quantityOnHand || 0}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col gap-1 text-xs">
                    {product.productUnits.map(pu => (
                      <span key={pu.id} className="bg-slate-100 px-2 py-1 rounded">
                        {pu.unit.name} (1 = {pu.conversionRate} {product.baseUnit?.name}) : ฿{pu.price}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <Link href={`/inventory/products/${product.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Edit className="w-4 h-4 mr-1" /> แก้ไข
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-8 text-slate-500">ไม่มีข้อมูลสินค้า</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
