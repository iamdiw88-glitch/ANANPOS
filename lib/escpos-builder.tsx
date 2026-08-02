// lib/escpos-builder.tsx
import React from "react"
import { render, Printer, Text, Line, Cut, Row, Br } from "react-thermal-printer"

export type ReceiptData = {
  shopName: string
  saleNo: string
  createdAt: Date
  cashierName: string
  customerName?: string
  items: { name: string; qty: string; unit: string; price: string; lineTotal: string }[]
  subtotal: string
  discount?: string
  total: string
  paymentMethod: string
  fulfillment: "pickup" | "delivery"
  openCashDrawer?: boolean
}

function formatThaiDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

export async function buildReceiptCommands(data: ReceiptData): Promise<Uint8Array> {
  const jsx = (
    <Printer type="epson" width={42}>
      <Text align="center" bold size={{ width: 2, height: 2 }}>
        {data.shopName || "ANANPOS"}
      </Text>
      <Text align="center">ใบเสร็จรับเงิน / Receipt</Text>
      <Line />
      <Text>เลขที่: {data.saleNo}</Text>
      <Text>วันที่: {formatThaiDateTime(data.createdAt)}</Text>
      <Text>พนักงาน: {data.cashierName}</Text>
      {data.customerName && <Text>ลูกค้า: {data.customerName}</Text>}
      <Line />
      {data.items.map((item, i) => (
        <Row key={i} left={`${item.name} x${item.qty} ${item.unit}`} right={item.lineTotal} />
      ))}
      <Line />
      <Row left="รวมเป็นเงิน" right={data.subtotal} />
      {data.discount && <Row left="ส่วนลด" right={`-${data.discount}`} />}
      <Row left="จำนวนเงินสุทธิ" right={data.total} />
      <Text>วิธีชำระเงิน: {data.paymentMethod}</Text>
      <Br />
      <Text align="center">ขอบคุณที่ใช้บริการ</Text>
      <Cut />
    </Printer>
  )

  const printBytes = await render(jsx)

  // Open cash drawer command (ESC p 0 25 250) -> 0x1B, 0x70, 0x00, 0x19, 0xFA
  if (data.openCashDrawer) {
    const drawerKick = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa])
    const combined = new Uint8Array(printBytes.length + drawerKick.length)
    combined.set(printBytes, 0)
    combined.set(drawerKick, printBytes.length)
    return combined
  }

  return printBytes
}
