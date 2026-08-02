// lib/thermal-printer-client.ts
// Client-side WebUSB helper for ESC/POS thermal printers

declare global {
  interface Navigator {
    usb?: {
      requestDevice(options?: any): Promise<any>
      getDevices(): Promise<any[]>
    }
  }
}

export type USBDevice = any

export const KNOWN_PRINTER_VENDORS = [
  { vendorId: 0x04b8, name: "Epson" },
  { vendorId: 0x0483, name: "Xprinter / STMicroelectronics" },
  { vendorId: 0x0fe6, name: "Generic ESC/POS" },
  { vendorId: 0x1fc9, name: "NXP / Thermal Printer" },
  { vendorId: 0x0519, name: "Star Micronics" },
]

export async function pairThermalPrinter(): Promise<USBDevice> {
  if (!isWebUSBSupported()) {
    throw new Error("เบราว์เซอร์นี้ไม่รองรับ WebUSB API")
  }

  const device = await navigator.usb!.requestDevice({
    filters: KNOWN_PRINTER_VENDORS.map((v) => ({ vendorId: v.vendorId })),
  })

  await device.open()
  if (device.configuration === null) {
    await device.selectConfiguration(1)
  }
  await device.claimInterface(0)
  return device
}

export async function getPairedPrinters(): Promise<USBDevice[]> {
  if (!isWebUSBSupported()) return []
  try {
    return await navigator.usb!.getDevices()
  } catch {
    return []
  }
}

export async function sendToThermalPrinter(device: USBDevice, data: Uint8Array): Promise<void> {
  if (!device.opened) {
    await device.open()
  }
  if (device.configuration === null) {
    await device.selectConfiguration(1)
  }
  try {
    await device.claimInterface(0)
  } catch {
    // Interface might already be claimed
  }

  let endpointNumber = 1
  if (device.configuration?.interfaces?.[0]?.alternate?.endpoints) {
    const outEndpoint = device.configuration.interfaces[0].alternate.endpoints.find(
      (e: any) => e.direction === "out"
    )
    if (outEndpoint) {
      endpointNumber = outEndpoint.endpointNumber
    }
  }

  await device.transferOut(endpointNumber, data)
}

export function isWebUSBSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.usb !== "undefined"
}
