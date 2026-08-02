// components/delivery/delivery-note-pdf.tsx
import React from "react"
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
  },
  section: {
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
  },
  infoCol: {
    width: "48%",
  },
  label: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    fontWeight: "bold",
  },
  colIndex: { width: "10%", textAlign: "center" },
  colName: { width: "60%" },
  colQty: { width: "15%", textAlign: "right" },
  colUnit: { width: "15%", textAlign: "center" },
  footer: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 8,
  },
})

export type DeliveryNoteData = {
  deliveryNo: string
  deliveryDate: string
  customerName: string
  address: string
  phone?: string
  driverName?: string
  vehiclePlate?: string
  saleNo: string
  items: { name: string; qty: string; unit: string }[]
}

export function DeliveryNoteDocument({ data }: { data: DeliveryNoteData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ร้านอนันตกิจการค้า</Text>
            <Text style={styles.subtitle}>ใบส่งสินค้า / Delivery Note</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.label}>เลขที่เอกสาร</Text>
            <Text style={styles.value}>{data.deliveryNo}</Text>
            <Text style={[styles.label, { marginTop: 4 }]}>วันที่</Text>
            <Text style={styles.value}>{data.deliveryDate}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>ข้อมูลลูกค้า / จัดส่ง</Text>
            <Text style={styles.value}>{data.customerName}</Text>
            <Text style={{ marginTop: 2 }}>{data.address}</Text>
            {data.phone && <Text style={{ marginTop: 2 }}>โทร: {data.phone}</Text>}
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>ข้อมูลอ้างอิงการจัดส่ง</Text>
            <Text style={styles.value}>เลขที่ใบเสร็จ: {data.saleNo}</Text>
            {data.driverName && <Text style={{ marginTop: 2 }}>พนักงานขับรถ: {data.driverName}</Text>}
            {data.vehiclePlate && <Text style={{ marginTop: 2 }}>ทะเบียนรถ: {data.vehiclePlate}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>รายการสินค้าที่จัดส่ง</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colIndex}>#</Text>
              <Text style={styles.colName}>รายการสินค้า</Text>
              <Text style={styles.colQty}>จำนวน</Text>
              <Text style={styles.colUnit}>หน่วย</Text>
            </View>
            {data.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colIndex}>{idx + 1}</Text>
                <Text style={styles.colName}>{item.name}</Text>
                <Text style={styles.colQty}>{item.qty}</Text>
                <Text style={styles.colUnit}>{item.unit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <Text style={{ marginBottom: 25 }}></Text>
            <Text>ลงชื่อ......................................................ผู้จัดส่ง</Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>วันที่ ......../......../............</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ marginBottom: 25 }}></Text>
            <Text>ลงชื่อ......................................................ผู้รับสินค้า</Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>วันที่ ......../......../............</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function generateDeliveryNotePdfBuffer(data: DeliveryNoteData): Promise<Buffer> {
  const instance = pdf(<DeliveryNoteDocument data={data} />)
  const blob = await instance.toBuffer()
  return blob as unknown as Buffer
}
