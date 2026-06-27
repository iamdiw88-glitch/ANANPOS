"use client"

import { useState } from "react"
import { X, Receipt, FileText } from "lucide-react"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function PaymentDialog({ 
  cart, 
  customer, 
  subtotal, 
  discount, 
  vatAmount, 
  grandTotal, 
  onClose, 
  onSuccess 
}: any) {
  const [tab, setTab] = useState<'CASH' | 'CREDIT' | 'PARTIAL'>('CASH')
  const [docType, setDocType] = useState<'RECEIPT' | 'TAX_INVOICE'>('RECEIPT')
  const [receivedAmount, setReceivedAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const handleNumpad = (val: string) => {
    if (val === 'C') setReceivedAmount("")
    else if (val === 'B') setReceivedAmount(prev => prev.slice(0, -1))
    else setReceivedAmount(prev => prev + val)
  }

  const handleQuickAmount = (amount: number) => {
    setReceivedAmount(amount.toString())
  }

  const receivedNum = Number(receivedAmount) || 0
  const change = tab === 'CASH' && receivedNum >= grandTotal ? receivedNum - grandTotal : 0

  const handleConfirm = async () => {
    if (tab === 'CASH' && receivedNum < grandTotal) {
      alert("รับเงินไม่พอ!")
      return
    }
    if ((tab === 'CREDIT' || tab === 'PARTIAL') && !customer) {
      alert("ต้องเลือกลูกค้าสำหรับการขายเชื่อ!")
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
          vatAmount,
          grandTotal,
          paymentType: tab,
          paidAmount: tab === 'CASH' ? grandTotal : (tab === 'PARTIAL' ? receivedNum : 0),
          docType,
          items: cart.map((i: any) => ({
            productId: i.productId,
            productUnitId: i.productUnitId,
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
      onSuccess()
    } catch (e: any) {
      alert(e.message || "เกิดข้อผิดพลาดในการบันทึกบิล")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal flex w-full max-w-3xl h-[640px]">

        {/* LEFT: Payment Methods */}
        <div className="w-1/2 border-r border-border flex flex-col bg-slate-50">
          <div className="p-4 border-b border-border bg-white">
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

          <div className="p-4 flex-1 flex flex-col justify-center overflow-y-auto">
            {tab === 'CASH' || tab === 'PARTIAL' ? (
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
                      <div className="flex justify-between items-center text-sm text-blue-600 font-bold bg-blue-50 p-2.5 rounded-md">
                        <span>บิลนี้เพิ่ม</span>
                        <span className="text-base">+ ฿{formatBaht(grandTotal)}</span>
                      </div>
                      <div className="border-t border-border pt-3 flex justify-between items-center">
                        <span className="text-sm text-slate-600 font-medium">ยอดหนี้สุทธิ</span>
                        <span className="font-bold text-lg text-slate-900">฿{formatBaht(customer.balance + grandTotal)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Summary & Actions */}
        <div className="w-1/2 p-5 flex flex-col bg-white">
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

          {tab === 'CASH' && (
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
              <p className="text-slate-400 text-sm font-medium mb-1 relative z-10">ค้างชำระเพิ่ม (ลงบัญชี)</p>
              <p className="text-3xl font-bold text-amber-400 relative z-10 tracking-tight">
                ฿{formatBaht(Math.max(0, grandTotal - receivedNum))}
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
            <button
              onClick={handleConfirm}
              disabled={loading}
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
