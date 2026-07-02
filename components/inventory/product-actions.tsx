"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ProductActions({ productId, productName }: { productId: number; productName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const ok = confirm(`ต้องการลบสินค้า "${productName}" หรือไม่?`)
    if (!ok) return

    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "ลบสินค้าไม่สำเร็จ")
      }
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "ลบสินค้าไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        onClick={() => router.push(`/inventory/products/${productId}`)}
      >
        <Edit className="w-4 h-4" />
        แก้ไข
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className="w-4 h-4" />
        {loading ? "กำลังลบ" : "ลบ"}
      </Button>
    </div>
  )
}
