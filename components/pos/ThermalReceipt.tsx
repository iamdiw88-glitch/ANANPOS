import React from "react"
import { format } from "date-fns"

interface ThermalReceiptProps {
  sale: any;
}

export function ThermalReceipt({ sale }: ThermalReceiptProps) {
  return (
    <div className="bg-white text-black max-w-[80mm] mx-auto p-4 text-sm font-sans" style={{ fontFamily: 'monospace' }}>
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold">ANAN POS</h1>
        <p>ร้านอนันต์วัสดุก่อสร้าง</p>
        <p>โทร. 02-123-4567</p>
        <p>ใบเสร็จรับเงินอย่างย่อ</p>
      </div>
      
      <div className="mb-4 text-xs">
        <p>เลขที่บิล: {sale.billNo}</p>
        <p>วันที่: {sale.saleDate ? format(new Date(sale.saleDate), 'dd/MM/yyyy HH:mm') : ''}</p>
        <p>พนักงาน: {sale.createdBy?.name}</p>
        {sale.customer && <p>ลูกค้า: {sale.customer.name}</p>}
      </div>

      <div className="border-t border-black border-dashed my-2"></div>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="text-left py-1 w-1/2">รายการ</th>
            <th className="text-right py-1">จำนวน</th>
            <th className="text-right py-1">รวม</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item: any) => (
            <tr key={item.id}>
              <td className="py-1">
                <div className="line-clamp-1">{item.product.name}</div>
                <div className="text-[10px] text-gray-500">@{item.unitPrice.toFixed(2)}/{item.productUnit?.unit?.name}</div>
              </td>
              <td className="text-right py-1 align-top">{item.quantity}</td>
              <td className="text-right py-1 align-top">{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed my-2"></div>

      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>รวมเป็นเงิน</span>
          <span>{sale.subtotal?.toFixed(2) || '0.00'}</span>
        </div>
        {sale.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>ส่วนลด</span>
            <span>-{sale.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-2">
          <span>ยอดสุทธิ</span>
          <span>{sale.grandTotal?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      <div className="border-t border-black border-dashed my-2"></div>

      <div className="text-center text-xs mt-4 mb-4">
        <p>ชำระโดย: {sale.paymentType === 'CASH' ? 'เงินสด' : sale.paymentType === 'CREDIT' ? 'เงินเชื่อ' : 'อื่นๆ'}</p>
      </div>

      <div className="text-center text-xs mt-4">
        <p>ขอบคุณที่ใช้บริการ</p>
        <p>Please come again</p>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-\\[80mm\\], .max-w-\\[80mm\\] * {
            visibility: visible;
          }
          .max-w-\\[80mm\\] {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            width: 80mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
