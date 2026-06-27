import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { apiErrorResponse, parsePositiveId, requireApiSession } from '@/lib/api';

// Optional: Register a Thai font here in production for proper Thai rendering
// Font.register({ family: 'Sarabun', src: 'path-to-sarabun-font.ttf' });

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: 'Helvetica' }, // Use registered font in prod
  header: { textAlign: 'center', marginBottom: 30 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#4b5563' },
  infoSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoColumn: { width: '48%' },
  row: { flexDirection: 'row', marginBottom: 4 },
  table: { width: '100%', marginTop: 20 },
  tableHeader: { 
    flexDirection: 'row', 
    borderBottomWidth: 2, 
    borderBottomColor: '#1e293b', 
    paddingBottom: 8, 
    marginBottom: 8,
    fontWeight: 'bold'
  },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totals: { marginTop: 20, paddingTop: 10, alignSelf: 'flex-end', width: '50%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { color: '#64748b' },
  totalValue: { fontWeight: 'bold' },
  grandTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8, 
    paddingTop: 8, 
    borderTopWidth: 2, 
    borderTopColor: '#1e293b',
  },
  grandTotalLabel: { fontSize: 14, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 14, fontWeight: 'bold' }
});

const InvoicePDF = ({ sale }: { sale: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>ใบกำกับภาษี / ใบเสร็จรับเงิน</Text>
        <Text style={styles.subtitle}>ANAN POS (ร้านอนันต์วัสดุก่อสร้าง)</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoColumn}>
          <View style={styles.row}>
            <Text>ลูกค้า: {sale.customer?.name || 'ลูกค้าทั่วไป'}</Text>
          </View>
          {sale.customer?.taxId && (
            <View style={styles.row}>
              <Text>เลขประจำตัวผู้เสียภาษี: {sale.customer.taxId}</Text>
            </View>
          )}
        </View>
        <View style={styles.infoColumn}>
          <View style={styles.row}>
            <Text>เลขที่เอกสาร: {sale.billNo}</Text>
          </View>
          <View style={styles.row}>
            <Text>วันที่: {new Date(sale.saleDate).toLocaleDateString('th-TH')}</Text>
          </View>
          <View style={styles.row}>
            <Text>พนักงานขาย: {sale.createdBy?.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>รายการ</Text>
          <Text style={styles.col2}>จำนวน</Text>
          <Text style={styles.col3}>ราคาต่อหน่วย</Text>
          <Text style={styles.col4}>จำนวนเงิน</Text>
        </View>

        {sale.items.map((item: any, i: number) => (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.col1}>{item.product.name}</Text>
            <Text style={styles.col2}>{item.quantity} {item.productUnit.unit.name}</Text>
            <Text style={styles.col3}>{item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.col4}>{item.lineTotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>รวมเป็นเงิน</Text>
          <Text style={styles.totalValue}>{sale.subtotal.toFixed(2)}</Text>
        </View>
        {sale.discountAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ส่วนลด</Text>
            <Text style={styles.totalValue}>-{sale.discountAmount.toFixed(2)}</Text>
          </View>
        )}
        {sale.vatAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ภาษีมูลค่าเพิ่ม 7%</Text>
            <Text style={styles.totalValue}>{sale.vatAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>ยอดสุทธิ</Text>
          <Text style={styles.grandTotalValue}>{sale.grandTotal.toFixed(2)}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession()
    const { id } = await params
    const saleId = parsePositiveId(id, "sale ID")
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true, productUnit: { include: { unit: true } } } },
        customer: true,
        createdBy: true
      }
    });

    if (!sale) {
      return new NextResponse('Not found', { status: 404 });
    }

    const stream = await renderToStream(<InvoicePDF sale={sale} />);
  
    // Convert Node readable stream to Web readable stream for Next.js response
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      }
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${sale.billNo}.pdf"`
      }
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to render invoice")
  }
}
