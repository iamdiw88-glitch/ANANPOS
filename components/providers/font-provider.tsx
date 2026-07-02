"use client"

import { useEffect } from "react"

export function FontProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedSize = localStorage.getItem("ananpos_fontSize") || "text-base"
    document.documentElement.classList.remove("text-sm", "text-base", "text-lg", "text-xl")
    document.documentElement.classList.add(savedSize)
  }, [])

  // To avoid hydration mismatch, you could render children only after mount, 
  // but for pure HTML class changes it's fine.
  return <>{children}</>
}
