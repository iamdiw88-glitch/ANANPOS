"use client"

import { useMemo, useState } from "react"
import { PackagePlus, X } from "lucide-react"
import type { CartItem } from "./pos-client"

type CustomItemDialogProps = {
  initialName: string
  miscProduct: any
  onClose: () => void
  onAdd: (item: CartItem) => void
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

export function CustomItemDialog({ initialName, miscProduct, onClose, onAdd }: CustomItemDialogProps) {
  const defaultUnit = useMemo(
    () => miscProduct?.productUnits?.find((unit: any) => unit.isDefaultSale) || miscProduct?.productUnits?.[0],
    [miscProduct]
  )
  const [name, setName] = useState(initialName.trim())
  const [unitName, setUnitName] = useState(defaultUnit?.unit?.name || "รายการ")
  const [quantity, setQuantity] = useState<number | string>(1)
  const [unitPrice, setUnitPrice] = useState<number | string>("")

  const qty = Number(quantity)
  const price = Number(unitPrice)
  const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? roundMoney(qty * price) : 0
  const canAdd = !!defaultUnit && name.trim().length > 0 && qty > 0 && price >= 0 && Number.isFinite(qty) && Number.isFinite(price)

  const handleAdd = () => {
    if (!canAdd) return

    onAdd({
      id: Math.random().toString(36).slice(2, 11),
      productId: miscProduct.id,
      productUnitId: defaultUnit.id,
      customName: name.trim(),
      customUnitName: unitName.trim() || defaultUnit.unit.name,
      name: name.trim(),
      unitName: unitName.trim() || defaultUnit.unit.name,
      quantity: qty,
      quantityBase: qty * defaultUnit.conversionRate,
      unitPrice: price,
      lineTotal,
      isStockItem: false,
      isCustomItem: true,
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal flex max-w-md flex-col p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-heading font-bold text-slate-800">เพิ่มสินค้านอกระบบ</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">ชื่อสินค้า</label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input h-11"
              placeholder="เช่น ค่าแรงยกของ, ของจิปาถะ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">จำนวน</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="input h-11"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">หน่วย</label>
              <input
                value={unitName}
                onChange={(event) => setUnitName(event.target.value)}
                className="input h-11"
                placeholder="รายการ"
                list="custom-sale-units"
              />
              <datalist id="custom-sale-units">
                {["รายการ", "ชิ้น", "งาน", "เที่ยว", "ชุด", "เมตร"].map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">ราคาต่อหน่วย</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="input h-11 text-lg font-bold text-primary"
              placeholder="0.00"
            />
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">รวมรายการนี้</span>
              <span className="text-lg font-bold text-slate-900">฿{lineTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">รายการนี้ไม่ตัดสต็อก และจะแสดงชื่อที่กรอกบนบิล</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-md bg-primary text-lg font-heading font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          เพิ่มลงบิล
        </button>
      </div>
    </div>
  )
}
