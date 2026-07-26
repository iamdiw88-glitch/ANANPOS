import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductActions } from "@/components/inventory/product-actions"
import { Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const session = await auth()
  const canManageProducts = hasPermission(session?.user?.role || "", "product:manage")
  const canCreateCatalog = hasPermission(session?.user?.role || "", "catalog:create")

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      searchTags: true,
      soldCount: true,
      reorderPoint: true,
      isStockItem: true,
      category: { select: { id: true, name: true } },
      baseUnit: { select: { id: true, name: true } },
      productUnits: {
        where: { isActive: true },
        select: {
          id: true,
          conversionRate: true,
          price: true,
          contractorPrice: true,
          isDefaultSale: true,
          barcode: true,
          unit: { select: { id: true, name: true } },
        },
        orderBy: [{ isDefaultSale: "desc" }, { id: "asc" }],
      },
      stockBalance: { select: { quantityOnHand: true } },
    },
    orderBy: [{ soldCount: "desc" }, { name: "asc" }]
  })

  return (
    <div>
      <div className="mb-5 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold font-heading">จัดการข้อมูลสินค้า (Product Master)</h1>
        {canCreateCatalog && (
          <Link href="/inventory/products/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
            </Button>
          </Link>
        )}
      </div>

      <div className="touch-scroll overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="text-left p-4 font-semibold">รหัสสินค้า</th>
              <th className="text-left p-4 font-semibold">ชื่อสินค้า</th>
              <th className="text-left p-4 font-semibold">หมวดหมู่</th>
              <th className="text-left p-4 font-semibold">หน่วยฐาน</th>
              <th className="text-right p-4 font-semibold">สต็อก</th>
              <th className="text-center p-4 font-semibold">หน่วยขาย / ราคา</th>
              <th className="text-center p-4 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-b border-border hover:bg-slate-50">
                <td className="p-4">{product.code}</td>
                <td className="p-4">
                  <div className="font-medium">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    ขายแล้ว {product.soldCount} | คำค้น: {product.searchTags || "-"}
                  </div>
                </td>
                <td className="p-4">{product.category?.name}</td>
                <td className="p-4">{product.baseUnit?.name}</td>
                <td className="p-4 text-right">
                  {product.isStockItem ? (
                    (() => {
                      const qty = product.stockBalance?.quantityOnHand ?? 0
                      if (qty <= 0) {
                        return <span className="font-bold text-red-700">{qty} / หมด</span>
                      }
                      if (qty <= product.reorderPoint) {
                        return <span className="font-bold text-amber-600">{qty} / ใกล้หมด</span>
                      }
                      return <span>{qty}</span>
                    })()
                  ) : (
                    <span className="text-slate-400">ไม่ตัดสต็อก</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col gap-1 text-xs">
                    {product.productUnits.map(pu => (
                      <span key={pu.id} className={`px-2 py-1 rounded ${pu.isDefaultSale ? "bg-blue-50 text-blue-700" : "bg-slate-100"}`}>
                        {pu.unit.name} (1 = {pu.conversionRate} {product.baseUnit?.name}) : ปลีก ฿{pu.price}
                        {pu.contractorPrice != null ? ` / ช่าง ฿${pu.contractorPrice}` : ""}
                        {pu.isDefaultSale ? " / ค่าเริ่มต้น" : ""}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {canManageProducts ? (
                    <ProductActions productId={product.id} productName={product.name} />
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
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
