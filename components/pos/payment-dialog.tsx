"use client"

import { useEffect, useMemo, useState } from "react"
import { X, Receipt, FileText, Truck } from "lucide-react"
import { DeliveryAddressPicker } from "./delivery-address-picker"
import type { DeliveryAddress } from "@/lib/data/therd-subdistricts"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function PaymentDialog({ 
  cart, 
  customer,
  customers = [],
  subtotal, 
  discount, 
  roundingDiscountEnabled = false,
  vatAmount, 
  grandTotal, 
  onClose, 
  onSuccess 
}: any) {
  const [tab, setTab] = useState<'CASH' | 'CREDIT' | 'PARTIAL'>('CASH')
  const [docType, setDocType] = useState<'RECEIPT' | 'TAX_INVOICE'>('RECEIPT')
  const [receivedAmount, setReceivedAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [deliveryEnabled, setDeliveryEnabled] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null)
  const [deliveryCustomers, setDeliveryCustomers] = useState<any[]>([])
  const [selectedRecipientKey, setSelectedRecipientKey] = useState("")
  const [deliveryCustomerId, setDeliveryCustomerId] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientPhone2, setRecipientPhone2] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")
  const [deliveryIsCOD, setDeliveryIsCOD] = useState(false)

  const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10)

  const recipientSuggestions = useMemo(() => {
    const suggestions = [
      ...deliveryCustomers.map((item) => ({
        key: `delivery:${item.id}`,
        source: "delivery",
        id: item.id,
        name: item.name || "",
        phone: item.phone || "",
        phone2: item.phone2 || "",
        data: item,
      })),
      ...customers.map((item: any) => ({
        key: `system:${item.id}`,
        source: "system",
        id: item.id,
        name: item.name || "",
        phone: item.phone || "",
        phone2: "",
        data: item,
      })),
    ]

    return suggestions.filter((item) => item.name.trim())
  }, [customers, deliveryCustomers])

  const hydrateAddress = (source: any) => {
    if (!source) return
    if (source.deliveryAddress) {
      setDeliveryAddress({
        subdistrictId: source.subdistrictId || "",
        subdistrictName: source.subdistrictName || "",
        moo: source.moo || 1,
        villageName: source.villageName || "",
        landmark: source.landmark || undefined,
        fullAddress: source.deliveryAddress,
      } as DeliveryAddress)
      return
    }
    if (source.address) {
      setDeliveryAddress({
        subdistrictId: "",
        subdistrictName: "",
        moo: 1,
        villageName: "",
        fullAddress: source.address,
      } as DeliveryAddress)
    }
  }

  useEffect(() => {
    if (!deliveryEnabled) return
    fetch("/api/delivery-customers")
      .then((res) => res.json())
      .then((rows) => setDeliveryCustomers(Array.isArray(rows) ? rows : []))
      .catch(() => setDeliveryCustomers([]))
  }, [deliveryEnabled])

  useEffect(() => {
    if (deliveryEnabled && customer) {
      setRecipientName((current) => current || customer.name || "")
      setRecipientPhone((current) => current || normalizePhone(customer.phone || ""))
      hydrateAddress(customer)
    }
  }, [customer, deliveryEnabled])

  useEffect(() => {
    if (deliveryIsCOD && tab === "CREDIT") {
      setTab("CASH")
    }
  }, [deliveryIsCOD, tab])

  const selectRecipient = (key: string) => {
    setSelectedRecipientKey(key)
    if (!key) {
      setDeliveryCustomerId(null)
      return
    }

    const [source, id] = key.split(":")
    if (source === "delivery") {
      const selected = deliveryCustomers.find((item) => item.id === Number(id))
      if (!selected) return
      setDeliveryCustomerId(selected.id)
      setRecipientName(selected.name || "")
      setRecipientPhone(normalizePhone(selected.phone || ""))
      setRecipientPhone2(normalizePhone(selected.phone2 || ""))
      hydrateAddress(selected)
      return
    }

    const selected = customers.find((item: any) => item.id === Number(id))
    if (!selected) return
    setDeliveryCustomerId(null)
    setRecipientName(selected.name || "")
    setRecipientPhone(normalizePhone(selected.phone || ""))
    setRecipientPhone2("")
    hydrateAddress(selected)
  }

  const handleRecipientNameChange = (name: string) => {
    setRecipientName(name)

    const normalizedName = name.trim().toLowerCase()
    const matchedRecipient = recipientSuggestions.find((item) => item.name.trim().toLowerCase() === normalizedName)

    if (!matchedRecipient) {
      setSelectedRecipientKey("")
      setDeliveryCustomerId(null)
      return
    }

    setSelectedRecipientKey(matchedRecipient.key)
    if (matchedRecipient.source === "delivery") {
      setDeliveryCustomerId(matchedRecipient.id)
      setRecipientPhone(normalizePhone(matchedRecipient.phone))
      setRecipientPhone2(normalizePhone(matchedRecipient.phone2))
      hydrateAddress(matchedRecipient.data)
      return
    }

    setDeliveryCustomerId(null)
    setRecipientPhone(normalizePhone(matchedRecipient.phone))
    setRecipientPhone2("")
    hydrateAddress(matchedRecipient.data)
  }

  const handleNumpad = (val: string) => {
    if (val === 'C') setReceivedAmount("")
    else if (val === 'B') setReceivedAmount(prev => prev.slice(0, -1))
    else setReceivedAmount(prev => prev + val)
  }

  const handleQuickAmount = (amount: number) => {
    setReceivedAmount(amount.toString())
  }

  const receivedNum = Number(receivedAmount) || 0
  const isCodSale = deliveryEnabled && deliveryIsCOD
  const canUseTypedDeliveryCustomer = deliveryEnabled && deliveryIsCOD
  const change = tab === 'CASH' && !isCodSale && receivedNum >= grandTotal ? receivedNum - grandTotal : 0
  const pendingAmount = tab === 'CREDIT' ? grandTotal : tab === 'PARTIAL' ? Math.max(0, grandTotal - receivedNum) : 0
  const creditAmount = isCodSale ? 0 : pendingAmount
  const isOverCreditLimit = !!customer?.creditLimit && creditAmount > 0 && customer.balance + creditAmount > customer.creditLimit

  const handleConfirm = async () => {
    if (tab === 'CASH' && !isCodSale && receivedNum < grandTotal) {
      alert("รับเงินไม่พอ!")
      return
    }
    if (tab === 'CREDIT' && !customer) {
      alert("ต้องเลือกลูกค้าสำหรับการขายเชื่อ!")
      return
    }
    if (tab === 'CREDIT' && isCodSale) {
      alert("บิลเก็บเงินปลายทางไม่สามารถใช้ประเภทขายเชื่อได้")
      return
    }
    if (tab === 'PARTIAL' && !customer && !canUseTypedDeliveryCustomer) {
      alert("ต้องเลือกลูกค้าหรือเปิดบิลจัดส่งพร้อมกรอกชื่อผู้รับ")
      return
    }
    if (tab === 'PARTIAL' && receivedNum <= 0) {
      alert("ยอดชำระบางส่วนต้องมากกว่า 0")
      return
    }
    if (deliveryEnabled && !deliveryAddress) {
      alert("กรุณาเลือกที่อยู่จัดส่ง")
      return
    }
    if (deliveryEnabled && !recipientName.trim()) {
      alert("กรุณาระบุชื่อผู้รับของ")
      return
    }
    if (deliveryEnabled && !recipientPhone.trim()) {
      alert("กรุณาระบุเบอร์ผู้รับของ")
      return
    }
    if (deliveryEnabled && !/^\d{10}$/.test(recipientPhone)) {
      alert("เบอร์ผู้รับต้องเป็นตัวเลข 10 หลัก")
      return
    }
    if (deliveryEnabled && recipientPhone2 && !/^\d{10}$/.test(recipientPhone2)) {
      alert("เบอร์สำรองต้องเป็นตัวเลข 10 หลัก")
      return
    }
    if (isOverCreditLimit) {
      alert("ยอดขายเชื่อนี้เกินวงเงินเครดิตของลูกค้า")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id || null,
          subtotal,
          discountAmount: discount,
          roundingDiscount: roundingDiscountEnabled,
          vatAmount,
          grandTotal,
          paymentType: tab,
          paidAmount: isCodSale && tab === 'CASH' ? 0 : tab === 'CASH' ? grandTotal : (tab === 'PARTIAL' ? receivedNum : 0),
          docType,
          delivery: deliveryEnabled && deliveryAddress ? {
            deliveryCustomerId,
            deliveryAddress: deliveryAddress.fullAddress,
            recipientName: recipientName.trim() || customer?.name || null,
            recipientPhone: recipientPhone.trim(),
            recipientPhone2: recipientPhone2.trim() || null,
            subdistrictId: deliveryAddress.subdistrictId,
            subdistrictName: deliveryAddress.subdistrictName,
            moo: deliveryAddress.moo,
            villageName: deliveryAddress.villageName,
            landmark: deliveryAddress.landmark || null,
            isCOD: deliveryIsCOD,
            note: deliveryNote.trim() || null,
          } : null,
          items: cart.map((i: any) => ({
            productId: i.productId,
            productUnitId: i.productUnitId,
            customName: i.customName || null,
            customUnitName: i.customUnitName || null,
            quantity: i.quantity,
            quantityBase: i.quantityBase,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal
          }))
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sale failed")
      }
      onSuccess(data.data?.id || data.sale?.id || data.id)
    } catch (e: any) {
      alert(e.message || "เกิดข้อผิดพลาดในการบันทึกบิล")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal flex h-[calc(100dvh-0.75rem)] w-full max-w-6xl flex-col overflow-y-auto lg:h-[min(760px,calc(100dvh-2rem))] lg:flex-row lg:overflow-hidden">

        {/* LEFT: Payment Methods */}
        <div className="flex w-full shrink-0 flex-col bg-slate-50 lg:w-2/5 lg:border-r lg:border-border">
          <div className="flex items-center justify-between border-b border-border bg-white p-4">
            <button
              type="button"
              onClick={onClose}
              className="order-2 ml-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
              aria-label="ปิดหน้าชำระเงิน"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-heading font-bold text-slate-800">การชำระเงิน</h2>
          </div>

          <div className="flex border-b border-border bg-white">
            <button
              onClick={() => setTab('CASH')}
              className={`flex-1 h-11 text-sm font-heading font-bold border-b-2 transition-colors ${tab === 'CASH' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
            >
              เงินสด
            </button>
            <button
              onClick={() => setTab('CREDIT')}
              disabled={isCodSale}
              className={`flex-1 h-11 text-sm font-heading font-bold border-b-2 transition-colors ${tab === 'CREDIT' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
            >
              เงินเชื่อ
            </button>
            <button
              onClick={() => setTab('PARTIAL')}
              className={`flex-1 h-11 text-sm font-heading font-bold border-b-2 transition-colors ${tab === 'PARTIAL' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
            >
              จ่ายบางส่วน
            </button>
          </div>

          <div className="flex flex-col justify-center p-4 lg:flex-1 lg:overflow-y-auto">
            {(tab === 'PARTIAL' || (tab === 'CASH' && !isCodSale)) ? (
              <div className="space-y-3">
                <div className="text-center mb-3">
                  <p className="text-sm text-slate-500 font-medium mb-1">ยอดที่ต้องชำระ</p>
                  <p className="text-3xl font-heading font-bold text-slate-800">฿{formatBaht(grandTotal)}</p>
                </div>

                <div className="card p-3 flex items-center justify-between">
                  <span className="text-slate-400 text-sm font-medium">รับเงินมา</span>
                  <input
                    type="text"
                    readOnly
                    value={receivedAmount}
                    placeholder="0"
                    className="text-right text-2xl font-heading font-bold text-primary outline-none w-2/3 bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[100, 500, 1000].map(amt => (
                    <button key={amt} onClick={() => handleQuickAmount(amt)} className="h-10 bg-secondary/10 text-secondary font-bold font-heading rounded-md border border-secondary/20 text-sm hover:bg-secondary/20 transition-colors">
                      +{amt}
                    </button>
                  ))}
                  <button onClick={() => handleQuickAmount(grandTotal)} className="h-10 bg-primary/10 text-primary font-bold font-heading rounded-md border border-primary/20 text-sm hover:bg-primary/20 transition-colors">
                    พอดี
                  </button>

                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handleNumpad(num.toString())} className="h-12 bg-white border border-border rounded-md text-xl font-heading font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm">
                      {num}
                    </button>
                  ))}
                  <button onClick={() => handleNumpad('C')} className="h-12 bg-red-50 text-destructive border border-red-200 rounded-md text-base font-bold hover:bg-red-100 transition-colors">
                    C
                  </button>
                  <button onClick={() => handleNumpad('0')} className="h-12 bg-white border border-border rounded-md text-xl font-heading font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm">
                    0
                  </button>
                  <button onClick={() => handleNumpad('B')} className="h-12 bg-slate-100 border border-border rounded-md text-base font-bold hover:bg-slate-200 transition-colors">
                    ⌫
                  </button>
                </div>
              </div>
            ) : isCodSale ? (
              <div className="text-center space-y-4">
                <div className="bg-amber-50 text-amber-800 p-5 rounded-lg border border-amber-200 shadow-sm">
                  <p className="text-base font-bold mb-1">เก็บเงินปลายทาง</p>
                  <p className="text-sm">ไม่ต้องกรอกช่องรับเงินตอนทำบิล ยอดนี้จะไปแสดงในหน้าจัดส่ง</p>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-lg shadow-md">
                  <p className="text-slate-400 text-sm font-medium mb-1">ยอดเก็บปลายทาง</p>
                  <p className="text-3xl font-bold text-amber-400">฿{formatBaht(grandTotal)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {!customer ? (
                  <div className="bg-red-50 text-destructive p-5 rounded-lg border border-red-200 shadow-sm">
                    <p className="text-base font-bold mb-1">ต้องเลือกลูกค้าสำหรับเงินเชื่อ!</p>
                    <p className="text-sm text-red-500">กรุณาปิดหน้าต่างนี้และเลือกลูกค้าในบิลก่อน</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold mx-auto border-2 border-white shadow-sm">
                      {customer.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{customer.name}</h3>
                    <div className="card p-4 text-left space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 font-medium">ยอดหนี้เดิม</span>
                        <span className="font-bold text-base text-slate-700">฿{formatBaht(customer.balance)}</span>
                      </div>
                      {customer.creditLimit > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500 font-medium">วงเงินเครดิต</span>
                          <span className="font-bold text-base text-slate-700">฿{formatBaht(customer.creditLimit)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm text-blue-600 font-bold bg-blue-50 p-2.5 rounded-md">
                        <span>บิลนี้เพิ่ม</span>
                        <span className="text-base">+ ฿{formatBaht(creditAmount)}</span>
                      </div>
                      <div className="border-t border-border pt-3 flex justify-between items-center">
                        <span className="text-sm text-slate-600 font-medium">ยอดหนี้สุทธิ</span>
                        <span className="font-bold text-lg text-slate-900">฿{formatBaht(customer.balance + creditAmount)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Summary & Actions */}
        <div className="flex w-full flex-col bg-white p-4 sm:p-5 lg:w-3/5 lg:overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-base font-bold text-slate-800">เอกสาร</h3>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setDocType('RECEIPT')}
              className={`flex-1 p-3 rounded-md border-2 flex flex-col items-center gap-2 transition-all ${docType === 'RECEIPT' ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-sm' : 'border-border text-slate-500 hover:border-slate-300'}`}
            >
              <Receipt className="w-6 h-6" />
              <span className="font-heading font-semibold text-sm">ใบเสร็จอย่างย่อ</span>
            </button>
            <button
              onClick={() => setDocType('TAX_INVOICE')}
              className={`flex-1 p-3 rounded-md border-2 flex flex-col items-center gap-2 transition-all ${docType === 'TAX_INVOICE' ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-sm' : 'border-border text-slate-500 hover:border-slate-300'}`}
            >
              <FileText className="w-6 h-6" />
              <span className="font-heading font-semibold text-sm">ใบกำกับภาษี</span>
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>รวมสินค้า</span>
              <span>฿{formatBaht(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="mt-1 flex justify-between text-emerald-700">
                <span>ส่วนลด</span>
                <span>-฿{formatBaht(discount)}</span>
              </div>
            )}
            {vatAmount > 0 && (
              <div className="mt-1 flex justify-between text-slate-600">
                <span>VAT</span>
                <span>฿{formatBaht(vatAmount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-heading font-extrabold text-slate-900">
              <span>ยอดสุทธิ</span>
              <span className="text-primary">฿{formatBaht(grandTotal)}</span>
            </div>
          </div>

          <div className="border border-border rounded-md p-3 mb-4 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                <Truck className="w-4 h-4 text-primary" />
                จัดส่งสินค้า
              </span>
              <input
                type="checkbox"
                checked={deliveryEnabled}
                onChange={(e) => setDeliveryEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            {deliveryEnabled && (
              <div className="space-y-2">
                <select
                  value={selectedRecipientKey}
                  onChange={(event) => selectRecipient(event.target.value)}
                  className="hidden"
                >
                  <option value="">กรอกผู้รับเอง หรือเลือกลูกค้าเดิม</option>
                  {deliveryCustomers.length > 0 && (
                    <optgroup label="ลูกค้าที่เคยจัดส่ง">
                      {deliveryCustomers.map((item) => (
                        <option key={`delivery-${item.id}`} value={`delivery:${item.id}`}>
                          {item.name} - {item.phone}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customers.length > 0 && (
                    <optgroup label="ลูกค้าในระบบ">
                      {customers.map((item: any) => (
                        <option key={`system-${item.id}`} value={`system:${item.id}`}>
                          {item.name} {item.phone ? `- ${item.phone}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    list="delivery-recipient-suggestions"
                    value={recipientName}
                    onChange={(e) => handleRecipientNameChange(e.target.value)}
                    placeholder="ชื่อผู้รับของ"
                    className="input h-10 px-2 text-sm"
                  />
                  <datalist id="delivery-recipient-suggestions">
                    {recipientSuggestions.map((item) => (
                      <option key={item.key} value={item.name}>
                        {item.phone ? `${item.name} - ${item.phone}` : item.name}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(normalizePhone(e.target.value))}
                    placeholder="เบอร์ผู้รับ 10 หลัก"
                    maxLength={10}
                    pattern="\d{10}"
                    className="input h-10 px-2 text-sm"
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={recipientPhone2}
                    onChange={(e) => setRecipientPhone2(normalizePhone(e.target.value))}
                    placeholder="เบอร์สำรอง 10 หลัก (ถ้ามี)"
                    maxLength={10}
                    pattern="\d{10}"
                    className="input h-10 px-2 text-sm"
                  />
                  <label className="h-10 px-2 border border-border rounded-md flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={deliveryIsCOD}
                      onChange={(e) => setDeliveryIsCOD(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    เก็บปลายทาง
                  </label>
                </div>
                <DeliveryAddressPicker
                  value={deliveryAddress}
                  onChange={setDeliveryAddress}
                />
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="หมายเหตุจัดส่ง"
                  className="input h-10 px-2 text-sm"
                />
              </div>
            )}
          </div>

          {tab === 'CASH' && !isCodSale && (
            <div className="bg-slate-900 text-white p-5 rounded-lg mb-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20" />
              <p className="text-slate-400 text-sm font-medium mb-1 relative z-10">เงินทอน</p>
              <p className={`text-4xl font-bold relative z-10 tracking-tight ${change > 0 ? 'text-emerald-400' : 'text-white'}`}>
                ฿{formatBaht(Math.max(0, change))}
              </p>
            </div>
          )}

          {tab === 'PARTIAL' && (
            <div className="bg-slate-900 text-white p-5 rounded-lg mb-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-3xl opacity-20" />
              <p className="text-slate-400 text-sm font-medium mb-1 relative z-10">{isCodSale ? "ยอดเก็บปลายทาง" : "ค้างชำระเพิ่ม (ลงบัญชี)"}</p>
              <p className="text-3xl font-bold text-amber-400 relative z-10 tracking-tight">
                ฿{formatBaht(pendingAmount)}
              </p>
            </div>
          )}

          {tab === 'CREDIT' && (
            <div className="bg-slate-900 text-white p-5 rounded-lg mb-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20" />
              <p className="text-slate-400 text-sm font-medium mb-1 relative z-10">บันทึกเป็นหนี้</p>
              <p className="text-3xl font-bold text-blue-400 relative z-10 tracking-tight">
                ฿{formatBaht(grandTotal)}
              </p>
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-border">
            {isOverCreditLimit && (
              <p className="mb-2 text-sm font-medium text-red-600">
                ยอดค้างหลังบิลนี้เกินวงเงินเครดิตของลูกค้า
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={loading || isOverCreditLimit}
              className="w-full h-14 bg-accent hover:bg-accent/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-lg font-heading font-bold transition-colors shadow-sm active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {loading ? "กำลังบันทึก..." : "ยืนยันการขาย"}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
