"use client"

import { useState } from "react"
import { AlertTriangle, X, Minus, Plus } from "lucide-react"

export function UnitDialog({ product, customer, onClose, onAdd }: any) {
  const getPrice = (u: any) => customer?.priceTier === "CONTRACTOR" && u.contractorPrice ? u.contractorPrice : u.price

  const defaultUnit = product.productUnits.find((u:any) => u.isDefaultSale) || product.productUnits[0]
  const [selectedUnit, setSelectedUnit] = useState<any>(defaultUnit)
  const [quantity, setQuantity] = useState<number | string>(1)
  const [customPrice, setCustomPrice] = useState<number | string>(getPrice(defaultUnit) || 0)
  const quantityNum = Number(quantity)
  const requestedBaseQty = Number.isFinite(quantityNum) ? quantityNum * selectedUnit.conversionRate : 0
  const isStockInsufficient = product.isStockItem && ((product.stockBalance?.quantityOnHand || 0) - requestedBaseQty < 0)

  const handleAdd = () => {
    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) return
    if (isStockInsufficient) return

    const price = product.isStockItem ? getPrice(selectedUnit) : Number(customPrice)
    
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
      stockWarning: product.isStockItem && ((product.stockBalance?.quantityOnHand || 0) - (qty * selectedUnit.conversionRate) < 0)
    })
  }

  const handleUnitSelect = (u: any) => {
    setSelectedUnit(u)
    if (!product.isStockItem) setCustomPrice(getPrice(u))
  }

  return (
    <div className="modal-overlay">
      <div className="modal flex flex-col p-5 max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-heading font-bold text-slate-800 tracking-tight">{product.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Unit selection */}
          <div>
            <label className="block text-sm text-slate-500 font-medium mb-2">เลือกหน่วยขาย</label>
            <div className="grid grid-cols-2 gap-2">
              {product.productUnits.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => handleUnitSelect(u)}
                  className={`p-3 rounded-md border-2 text-left transition-all min-h-[44px] ${
                    selectedUnit.id === u.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border hover:border-slate-300'
                  }`}
                >
                  <div className="font-heading font-bold text-base">{u.unit.name}</div>
                  {product.isStockItem && (
                    <div className="text-sm text-slate-500 font-medium mt-0.5">
                      ฿{getPrice(u)}
                      {customer?.priceTier === "CONTRACTOR" && u.contractorPrice && (
                        <span className="ml-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">ราคาส่ง</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Price */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 font-medium mb-2">จำนวน ({selectedUnit.unit.name})</label>
              <div className="flex items-center rounded-md overflow-hidden border border-border">
                <button
                  onClick={() => setQuantity(Number(quantity) > 1 ? Number(quantity) - 1 : 1)}
                  className="w-11 h-11 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-11 text-center text-xl font-heading font-bold border-x border-border focus:outline-none focus:bg-primary/5"
                />
                <button
                  onClick={() => setQuantity(Number(quantity) + 1)}
                  className="w-11 h-11 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!product.isStockItem && (
              <div className="flex-1">
                <label className="block text-sm text-slate-500 font-medium mb-2">ราคา (บาท)</label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="input h-11 px-3 text-lg font-heading font-bold"
                />
              </div>
            )}
          </div>

          {isStockInsufficient && (
            <div className="badge-warning rounded-md p-3 font-medium flex gap-2 items-center text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>สต็อกไม่พอ (มีอยู่ {product.stockBalance?.quantityOnHand || 0} {product.baseUnit.name}) ไม่สามารถเพิ่มลงบิลได้</span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <button
            onClick={handleAdd}
            disabled={isStockInsufficient}
            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-lg font-heading font-bold transition-colors active:scale-[0.98] shadow-sm flex justify-center items-center gap-2"
          >
            เพิ่มลงบิล
          </button>
        </div>
      </div>
    </div>
  )
}
