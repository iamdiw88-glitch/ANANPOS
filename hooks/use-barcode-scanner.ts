"use client"

import { useEffect, useRef } from "react"

export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options?: { enabled?: boolean; maxIntervalMs?: number }
) {
  const maxIntervalMs = options?.maxIntervalMs ?? 50
  const bufferRef = useRef<{ char: string; time: number }[]>([])

  useEffect(() => {
    if (options?.enabled === false) return

    function handleKeyDown(e: KeyboardEvent) {
      // 1. Skip if user is actively typing in a standard input or textarea
      const target = e.target as HTMLElement | null
      if (target) {
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        const isScannerTarget = target.hasAttribute("data-barcode-scanner")

        if (isInput && !isScannerTarget) {
          // Normal input field, don't intercept barcode scanner
          return
        }
      }

      const now = performance.now()

      if (e.key === "Enter") {
        const buffer = bufferRef.current
        if (buffer.length >= 3) {
          // Check average interval between keypresses
          let totalDiff = 0
          for (let i = 1; i < buffer.length; i++) {
            totalDiff += buffer[i].time - buffer[i - 1].time
          }
          const avgInterval = totalDiff / (buffer.length - 1)

          if (avgInterval <= maxIntervalMs) {
            const scannedCode = buffer.map((item) => item.char).join("")
            e.preventDefault()
            onScan(scannedCode)
          }
        }
        bufferRef.current = []
        return
      }

      // Ignore modifier keys like Shift, Control, Alt
      if (e.key.length === 1) {
        // Clear buffer if time since last char is too long
        if (bufferRef.current.length > 0) {
          const lastTime = bufferRef.current[bufferRef.current.length - 1].time
          if (now - lastTime > maxIntervalMs * 3) {
            bufferRef.current = []
          }
        }
        bufferRef.current.push({ char: e.key, time: now })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onScan, options?.enabled, maxIntervalMs])
}
