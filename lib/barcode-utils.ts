// lib/barcode-utils.ts

export function resolveBarcodeValue(product: {
  code?: string
  barcode?: string | null
  barcodeGenerated?: boolean
}): string {
  if (product.barcode && product.barcode.trim().length > 0) {
    return product.barcode.trim()
  }
  return product.code || ""
}

export function isValidBarcodeInput(value: string): boolean {
  if (!value) return false
  return /^[A-Za-z0-9\-]{3,30}$/.test(value.trim())
}
