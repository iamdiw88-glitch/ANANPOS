"use client"

import { PackagePlus, ShoppingCart, Trash2 } from "lucide-react"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function CartPanel({
  cart,
  onRemove,
  customers,
  selectedCustomer,
  onSelectCustomer,
  subtotal,
  roundingDiscount,
  roundingDiscountEnabled,
  onRoundingDiscountChange,
  grandTotal,
  onCreateCustomItem,
  onCheckout,
}: any) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-border relative">
      <div className="p-3 border-b border-border bg-slate-50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm text-slate-600">บิลขายใหม่</span>
          <span className="text-slate-400 text-xs">{new Date().toLocaleDateString("th-TH")}</span>
        </div>

        <select
          id="customer-selector"
          className="select font-semibold text-slate-700 w-full h-10"
          value={selectedCustomer?.id || ""}
          onChange={(event) => {
            const value = event.target.value
            onSelectCustomer(value ? customers.find((customer: any) => customer.id === Number(value)) : null)
          }}
        >
          <option value="">+ ลูกค้าทั่วไป (เงินสด)</option>
          {customers.map((customer: any) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} {customer.type === "CREDIT" ? "(เครดิต)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">ยังไม่มีรายการสินค้า</p>
          </div>
        ) : (
          cart.map((item: any) => (
            <div key={item.id} className="card p-3 flex gap-3 relative group overflow-visible min-h-[44px]">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 line-clamp-1">{item.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.quantity} {item.unitName} x ฿{formatBaht(item.unitPrice)}
                </div>
              </div>
              <div className="font-bold text-base text-slate-800 self-center">฿{formatBaht(item.lineTotal)}</div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="absolute -right-2 -top-2 w-7 h-7 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-colors shadow-md cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-border bg-white space-y-2">
        <button
          type="button"
          onClick={onCreateCustomItem}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 text-sm font-bold text-primary transition-colors hover:bg-blue-100 cursor-pointer"
        >
          <PackagePlus className="h-4 w-4" />
          เพิ่มสินค้าอื่นๆ
        </button>

        <div className="flex justify-between text-sm text-slate-500">
          <span>รวมเป็นเงิน</span>
          <span className="font-semibold">฿{formatBaht(subtotal)}</span>
        </div>

        <label className="flex justify-between items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-pointer">
          <span className="font-semibold">ปัดเศษให้ลงท้าย 5 หรือ 0</span>
          <input
            type="checkbox"
            checked={roundingDiscountEnabled}
            onChange={(event) => onRoundingDiscountChange(event.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
        </label>

        {roundingDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>ส่วนลดปัดเศษ</span>
            <span className="font-semibold">-฿{formatBaht(roundingDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between items-end pt-2 border-t border-border">
          <span className="text-base font-semibold text-slate-800">ยอดสุทธิ</span>
          <span className="text-2xl font-heading font-bold text-primary">฿{formatBaht(grandTotal)}</span>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={onCheckout}
          className="w-full h-12 bg-accent hover:bg-accent/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-lg font-bold font-heading transition-colors shadow-sm mt-2 flex justify-center gap-2 items-center active:scale-[0.98] cursor-pointer"
        >
          เก็บเงิน
        </button>
      </div>
    </div>
  )
}
