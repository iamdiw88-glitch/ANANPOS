"use client"

import { useState } from "react"
import { AlertTriangle, Minus, Plus, X } from "lucide-react"

export function UnitDialog({ product, customer, onClose, onAdd }: any) {
  const getPrice = (unit: any) => (
    customer?.priceTier === "CONTRACTOR" && unit?.contractorPrice != null
      ? unit.contractorPrice
      : unit?.price
  )

  const defaultUnit = product.productUnits.find((unit: any) => unit.isDefaultSale) || product.productUnits[0]
  const [selectedUnit, setSelectedUnit] = useState<any>(defaultUnit)
  const [quantity, setQuantity] = useState<number | string>(1)

  const quantityNum = Number(quantity)
  const requestedBaseQty = selectedUnit && Number.isFinite(quantityNum)
    ? quantityNum * selectedUnit.conversionRate
    : 0
  const isStockInsufficient = product.isStockItem && ((product.stockBalance?.quantityOnHand || 0) - requestedBaseQty < 0)
  const hasSaleUnit = !!selectedUnit

  const handleAdd = () => {
    const qty = Number(quantity)
    if (!hasSaleUnit) return
    if (Number.isNaN(qty) || qty <= 0) return
    if (isStockInsufficient) return

    const price = Number(getPrice(selectedUnit))
    if (!Number.isFinite(price) || price < 0) return

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productUnitId: selectedUnit.id,
      name: product.name,
      unitName: selectedUnit.unit.name,
      quantity: qty,
      quantityBase: qty * selectedUnit.conversionRate,
      unitPrice: price,
      lineTotal: qty * price,
      isStockItem: product.isStockItem,
      stockWarning: product.isStockItem && ((product.stockBalance?.quantityOnHand || 0) - (qty * selectedUnit.conversionRate) < 0),
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal flex flex-col p-5 max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-heading font-bold text-slate-800 tracking-tight">{product.name}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-500 font-medium mb-2">เลือกหน่วยขาย</label>
            <div className="grid grid-cols-2 gap-2">
              {product.productUnits.map((unit: any) => (
                <button
                  type="button"
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  className={`p-3 rounded-md border-2 text-left transition-all min-h-[44px] ${
                    selectedUnit?.id === unit.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border hover:border-slate-300"
                  }`}
                >
                  <div className="font-heading font-bold text-base">{unit.unit.name}</div>
                  <div className="text-sm text-slate-500 font-medium mt-0.5">
                    ฿{getPrice(unit)}
                    {customer?.priceTier === "CONTRACTOR" && unit.contractorPrice != null && (
                      <span className="ml-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                        ราคาช่าง
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 font-medium mb-2">
                จำนวน ({selectedUnit?.unit?.name || "-"})
              </label>
              <div className="flex items-center rounded-md overflow-hidden border border-border">
                <button
                  type="button"
                  onClick={() => setQuantity(Number(quantity) > 1 ? Number(quantity) - 1 : 1)}
                  className="w-11 h-11 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full h-11 text-center text-xl font-heading font-bold border-x border-border focus:outline-none focus:bg-primary/5"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Number(quantity) + 1)}
                  className="w-11 h-11 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {!hasSaleUnit && (
            <div className="badge-warning rounded-md p-3 font-medium flex gap-2 items-center text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>สินค้านี้ยังไม่มีหน่วยขาย กรุณาเพิ่มหน่วยขายในหน้าสินค้าก่อน</span>
            </div>
          )}

          {isStockInsufficient && (
            <div className="badge-warning rounded-md p-3 font-medium flex gap-2 items-center text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                สต็อกไม่พอ (มีอยู่ {product.stockBalance?.quantityOnHand || 0} {product.baseUnit.name}) ไม่สามารถเพิ่มลงบิลได้
              </span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!hasSaleUnit || isStockInsufficient}
            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-lg font-heading font-bold transition-colors active:scale-[0.98] shadow-sm flex justify-center items-center gap-2"
          >
            เพิ่มลงบิล
          </button>
        </div>
      </div>
    </div>
  )
}
