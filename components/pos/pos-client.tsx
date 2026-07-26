"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { ProductSearch } from "./product-search"
import { CartPanel } from "./cart-panel"
import { UnitDialog } from "./unit-dialog"
import { PaymentDialog } from "./payment-dialog"
import { CustomItemDialog } from "./custom-item-dialog"
import { ChevronLeft, ShoppingCart } from "lucide-react"

export type CartItem = {
  id: string
  productId: number
  productUnitId: number
  customName?: string
  customUnitName?: string
  name: string
  unitName: string
  quantity: number
  quantityBase: number
  unitPrice: number
  lineTotal: number
  isStockItem: boolean
  isCustomItem?: boolean
  stockWarning?: boolean
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const roundDownToNearestFive = (value: number) => {
  if (value <= 0) return 0
  const wholeBaht = Math.floor(roundMoney(value))
  return Math.floor(wholeBaht / 5) * 5
}

export function POSClient({ initialProducts, categories, customers, canCreateCatalog = false }: any) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [customItemName, setCustomItemName] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [roundingDiscountEnabled, setRoundingDiscountEnabled] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isPortalReady, setIsPortalReady] = useState(false)

  useEffect(() => {
    setIsPortalReady(true)
  }, [])

  const addToCart = (item: CartItem) => {
    setCart((currentCart) => {
      const existingIndex = currentCart.findIndex((cartItem) =>
        cartItem.productId === item.productId &&
        cartItem.productUnitId === item.productUnitId &&
        cartItem.unitPrice === item.unitPrice &&
        (cartItem.customName || "") === (item.customName || "") &&
        (cartItem.customUnitName || "") === (item.customUnitName || "")
      )

      if (existingIndex === -1) return [...currentCart, item]

      return currentCart.map((cartItem, index) => {
        if (index !== existingIndex) return cartItem
        const quantity = cartItem.quantity + item.quantity
        return {
          ...cartItem,
          quantity,
          quantityBase: cartItem.quantityBase + item.quantityBase,
          lineTotal: quantity * cartItem.unitPrice,
        }
      })
    })
    setSelectedProduct(null)
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const clearCart = useCallback(() => {
    setCart([])
    setRoundingDiscountEnabled(false)
    setSelectedCustomer(null)
  }, [])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 = Focus Search
      if (e.key === "F1") {
        e.preventDefault()
        document.getElementById("product-search-input")?.focus()
      }
      // F2 = Focus Customer
      else if (e.key === "F2") {
        e.preventDefault()
        setIsCartOpen(true)
        window.setTimeout(() => document.getElementById("customer-selector")?.focus(), 50)
      }
      // F5 = New Bill (Clear Cart)
      else if (e.key === "F5") {
        e.preventDefault()
        if (confirm("ต้องการเริ่มบิลใหม่ใช่หรือไม่? ข้อมูลในตะกร้าจะถูกลบทั้งหมด")) {
          clearCart()
        }
      }
      // Enter = Checkout (if no dialogs are open and cart is not empty)
      else if (e.key === "Enter" && !isPaymentOpen && !selectedProduct && cart.length > 0) {
        // Prevent default if it's not focused on an input that handles Enter
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault()
          setIsPaymentOpen(true)
        }
      } else if (e.key === "Escape" && isCartOpen && !isPaymentOpen && !selectedProduct) {
        setIsCartOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cart, isCartOpen, isPaymentOpen, selectedProduct, clearCart])

  const subtotal = roundMoney(cart.reduce((sum, item) => sum + item.lineTotal, 0))
  const roundedTotal = roundDownToNearestFive(subtotal)
  const roundingDiscount = roundingDiscountEnabled ? roundMoney(Math.max(0, subtotal - roundedTotal)) : 0
  const vatAmount = 0
  const grandTotal = roundMoney(subtotal - roundingDiscount)
  const miscProduct = initialProducts.find((product: any) => product.code === "MISC-001")

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-background">
      {/* Product catalog */}
      <div className="z-0 flex h-full w-full flex-col bg-white">
        <ProductSearch
          products={initialProducts}
          categories={categories}
          canCreateCatalog={canCreateCatalog}
          onSelectProduct={setSelectedProduct}
          onCreateCustomItem={setCustomItemName}
        />
      </div>

      {/* Minimized cart bar */}
      {isPortalReady && !isCartOpen && createPortal(
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-[70] flex cursor-pointer items-center gap-3 rounded-2xl border border-blue-200 bg-white p-3 text-left shadow-xl shadow-slate-900/15 transition-colors duration-200 hover:border-primary hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 sm:left-auto sm:right-4 sm:min-w-64"
          aria-label={`เปิดตะกร้า มี ${cart.length} รายการ ยอดสุทธิ ${grandTotal} บาท`}
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-extrabold text-white">
                {cart.length}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-slate-900">
              {cart.length > 0 ? `${cart.length} รายการ` : "ตะกร้าสินค้า"}
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-500">กดเพื่อเปิดบิลขาย</span>
          </span>
          <span className="text-right">
            <span className="block font-heading text-lg font-extrabold text-primary">
              ฿{grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <ChevronLeft className="ml-auto mt-0.5 h-4 w-4 text-slate-400" />
          </span>
        </button>,
        document.body
      )}

      {/* Expanded cart drawer */}
      {isPortalReady && isCartOpen && createPortal(
        <div className="fixed inset-0 z-[90]" role="presentation">
          <button
            type="button"
            aria-label="ย่อตะกร้า"
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-950/30 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="ตะกร้าสินค้า"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <CartPanel
              cart={cart}
              onRemove={removeFromCart}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              subtotal={subtotal}
              roundingDiscount={roundingDiscount}
              roundingDiscountEnabled={roundingDiscountEnabled}
              onRoundingDiscountChange={setRoundingDiscountEnabled}
              grandTotal={grandTotal}
              onCreateCustomItem={() => {
                setIsCartOpen(false)
                setCustomItemName("")
              }}
              onCheckout={() => {
                setIsCartOpen(false)
                setIsPaymentOpen(true)
              }}
              onMinimize={() => setIsCartOpen(false)}
            />
          </aside>
        </div>,
        document.body
      )}

      {selectedProduct && (
        <UnitDialog 
          product={selectedProduct} 
          customer={selectedCustomer}
          onClose={() => setSelectedProduct(null)} 
          onAdd={addToCart} 
        />
      )}

      {customItemName !== null && miscProduct && (
        <CustomItemDialog
          initialName={customItemName}
          miscProduct={miscProduct}
          onClose={() => setCustomItemName(null)}
          onAdd={(item) => {
            addToCart(item)
            setCustomItemName(null)
          }}
        />
      )}

      {isPaymentOpen && (
        <PaymentDialog 
          cart={cart}
          customer={selectedCustomer}
          customers={customers}
          subtotal={subtotal}
          discount={roundingDiscount}
          roundingDiscountEnabled={roundingDiscountEnabled}
          vatAmount={vatAmount}
          grandTotal={grandTotal}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={() => {
            clearCart()
            setIsCartOpen(false)
            setIsPaymentOpen(false)
            router.refresh()
            // print receipt will trigger here in the future
          }}
        />
      )}
    </div>
  )
}
