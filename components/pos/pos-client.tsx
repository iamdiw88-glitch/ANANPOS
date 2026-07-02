"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProductSearch } from "./product-search"
import { CartPanel } from "./cart-panel"
import { UnitDialog } from "./unit-dialog"
import { PaymentDialog } from "./payment-dialog"
import { CustomItemDialog } from "./custom-item-dialog"

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

export function POSClient({ initialProducts, categories, customers }: any) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [customItemName, setCustomItemName] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [roundingDiscountEnabled, setRoundingDiscountEnabled] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)

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
        document.getElementById("customer-selector")?.focus()
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
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cart, isPaymentOpen, selectedProduct, clearCart])

  const subtotal = roundMoney(cart.reduce((sum, item) => sum + item.lineTotal, 0))
  const roundedTotal = roundDownToNearestFive(subtotal)
  const roundingDiscount = roundingDiscountEnabled ? roundMoney(Math.max(0, subtotal - roundedTotal)) : 0
  const vatAmount = 0
  const grandTotal = roundMoney(subtotal - roundingDiscount)
  const miscProduct = initialProducts.find((product: any) => product.code === "MISC-001")

  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* LEFT 60% */}
      <div className="w-3/5 border-r border-border flex flex-col h-full bg-white z-0">
        <ProductSearch
          products={initialProducts}
          categories={categories}
          onSelectProduct={setSelectedProduct}
          onCreateCustomItem={setCustomItemName}
        />
      </div>

      {/* RIGHT 40% */}
      <div className="w-2/5 flex flex-col h-full z-10 shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.06)]">
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
          onCreateCustomItem={() => setCustomItemName("")}
          onCheckout={() => setIsPaymentOpen(true)}
        />
      </div>

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
            setIsPaymentOpen(false)
            router.refresh()
            // print receipt will trigger here in the future
          }}
        />
      )}
    </div>
  )
}
