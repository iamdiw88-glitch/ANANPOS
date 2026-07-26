"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FolderPlus, LoaderCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "@/components/ui/image-upload"

export function CategoryCreateButton({ className = "" }: { className?: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState("")
  const [sortOrder, setSortOrder] = useState(0)
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")

  const close = () => {
    if (isSaving) return
    setIsOpen(false)
    setError("")
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError("")

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder, imageUrl: imageUrl || null }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || "ไม่สามารถเพิ่มหมวดหมู่ได้")
        return
      }

      setName("")
      setSortOrder(0)
      setImageUrl("")
      setIsOpen(false)
      router.refresh()
    } catch {
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={() => setIsOpen(true)}>
        <FolderPlus className="h-4 w-4" />
        เพิ่มหมวดหมู่
      </Button>

      {isOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close()
        }}>
          <form
            onSubmit={handleSubmit}
            className="modal max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 id="category-dialog-title" className="font-heading text-lg font-extrabold text-slate-900">
                  เพิ่มหมวดหมู่ใหม่
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">รูปนี้จะแสดงบนหน้าขายและหน้าสต็อก</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="ปิด"
                className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="รูปหมวดหมู่"
                helpText="แนะนำรูปแนวนอนหรือสี่เหลี่ยม ระบบจะครอบให้พอดีกับการ์ด"
              />

              <div>
                <label htmlFor="category-name" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  ชื่อหมวดหมู่
                </label>
                <input
                  id="category-name"
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="เช่น ปูนซีเมนต์, เครื่องมือช่าง"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="category-sort" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  ลำดับการแสดง
                </label>
                <input
                  id="category-sort"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(Number(event.target.value))}
                  className="input"
                />
                <p className="mt-1.5 text-xs text-slate-600">เลขน้อยจะแสดงก่อน</p>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {error}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <Button type="button" variant="ghost" onClick={close} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSaving || !name.trim()}>
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                {isSaving ? "กำลังบันทึก..." : "บันทึกหมวดหมู่"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
