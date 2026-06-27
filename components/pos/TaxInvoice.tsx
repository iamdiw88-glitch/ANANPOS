"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'
import { format } from 'date-fns'

// Register Thai Font
Font.register({
  family: 'Sarabun',
  src: 'https://fonts.gstatic.com/s/sarabun/v14/DtVjJx26TKEr37c9aAFJn2EN.ttf'
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Sarabun',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  shopInfo: {
    flex: 1,
  },
  docTitleInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 10,
  },
  docBox: {
    width: '35%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#000',
    padding: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 5,
  },
  colNo: { width: '5%', textAlign: 'center' },
  colDesc: { width: '45%' },
  colQty: { width: '10%', textAlign: 'center' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryBox: {
    width: '40%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  bold: {
    fontWeight: 'bold',
  }
})

interface TaxInvoiceProps {
  sale: any;
}

const TaxInvoiceDocument = ({ sale }: TaxInvoiceProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.shopInfo}>
          <Text style={styles.title}>ANAN POS</Text>
          <Text>ร้านอนันต์วัสดุก่อสร้าง</Text>
          <Text>123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110</Text>
          <Text>เลขประจำตัวผู้เสียภาษี: 0105555555555</Text>
          <Text>โทร. 02-123-4567</Text>
        </View>
        <View style={styles.docTitleInfo}>
          <Text style={[styles.title, { color: '#333' }]}>ใบกำกับภาษี / ใบเสร็จรับเงิน</Text>
          <Text style={styles.subtitle}>(ต้นฉบับ)</Text>
        </View>
      </View>

      {/* Customer & Doc Info */}
      <View style={styles.customerSection}>
        <View style={styles.customerBox}>
          <Text style={styles.bold}>ลูกค้า:</Text>
          <Text>{sale.customer?.name || 'ลูกค้าทั่วไป'}</Text>
          <Text>{sale.customer?.address || '-'}</Text>
          <Text>เลขประจำตัวผู้เสียภาษี: {sale.customer?.taxId || '-'}</Text>
          <Text>โทร: {sale.customer?.phone || '-'}</Text>
        </View>
        <View style={styles.docBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.bold}>เลขที่เอกสาร:</Text>
            <Text>{sale.billNo}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={styles.bold}>วันที่:</Text>
            <Text>{sale.saleDate ? format(new Date(sale.saleDate), 'dd/MM/yyyy') : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={styles.bold}>พนักงานขาย:</Text>
            <Text>{sale.createdBy?.name || '-'}</Text>
          </View>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colNo}>ลำดับ</Text>
          <Text style={styles.colDesc}>รายการสินค้า</Text>
          <Text style={styles.colQty}>จำนวน</Text>
          <Text style={styles.colUnit}>หน่วย</Text>
          <Text style={styles.colPrice}>ราคา/หน่วย</Text>
          <Text style={styles.colTotal}>จำนวนเงิน</Text>
        </View>
        
        {sale.items?.map((item: any, index: number) => (
          <View style={styles.tableRow} key={item.id}>
            <Text style={styles.colNo}>{index + 1}</Text>
            <Text style={styles.colDesc}>{item.product?.name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colUnit}>{item.productUnit?.unit?.name}</Text>
            <Text style={styles.colPrice}>{item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.colTotal}>{item.lineTotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text>รวมเป็นเงิน:</Text>
            <Text>{sale.subtotal?.toFixed(2) || '0.00'}</Text>
          </View>
          {sale.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text>หักส่วนลด:</Text>
              <Text>{sale.discountAmount?.toFixed(2) || '0.00'}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text>มูลค่าสินค้ายกเว้นภาษี / หลังหักส่วนลด:</Text>
            <Text>{((sale.subtotal || 0) - (sale.discountAmount || 0)).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>ภาษีมูลค่าเพิ่ม (7%):</Text>
            <Text>{sale.vatAmount?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#000', marginTop: 5, paddingTop: 5 }]}>
            <Text style={styles.bold}>จำนวนเงินรวมทั้งสิ้น:</Text>
            <Text style={styles.bold}>{sale.grandTotal?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>

    </Page>
  </Document>
)

export function TaxInvoice({ sale }: TaxInvoiceProps) {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return <div>Loading PDF...</div>

  return (
    <div className="w-full h-screen max-h-[800px]">
      <PDFViewer style={{ width: '100%', height: '100%' }}>
        <TaxInvoiceDocument sale={sale} />
      </PDFViewer>
    </div>
  )
}
