"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type DensityMode = "touch" | "compact"

type DensityContextType = {
  density: DensityMode
  isTouch: boolean
  setDensity: (mode: DensityMode) => void
  toggleDensity: () => void
}

const DensityContext = createContext<DensityContextType>({
  density: "touch",
  isTouch: true,
  setDensity: () => {},
  toggleDensity: () => {},
})

const STORAGE_KEY = "ananpos.density"

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<DensityMode>("touch")

  useEffect(() => {
    // 1. Check user override in localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as DensityMode | null
    let initialMode: DensityMode = "touch"

    if (saved === "touch" || saved === "compact") {
      initialMode = saved
    } else {
      // 2. Auto-detect: pointer coarse -> touch, fine -> compact
      if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
        initialMode = "compact"
      }
    }

    setDensityState(initialMode)
    document.documentElement.setAttribute("data-density", initialMode)
  }, [])

  const setDensity = (mode: DensityMode) => {
    setDensityState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
    document.documentElement.setAttribute("data-density", mode)
  }

  const toggleDensity = () => {
    // No-op: feature removed
  }

  return (
    <DensityContext.Provider
      value={{
        density,
        isTouch: density === "touch",
        setDensity,
        toggleDensity,
      }}
    >
      {children}
    </DensityContext.Provider>
  )
}

export function useDensity() {
  return useContext(DensityContext)
}
