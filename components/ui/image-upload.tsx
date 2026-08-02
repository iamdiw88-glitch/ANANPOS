"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react"

type ImageUploadProps = {
  value?: string | null
  onChange: (value: string) => void
  label?: string
  helpText?: string
  fit?: "cover" | "contain"
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_EDGE = 900
const MAX_ENCODED_LENGTH = 700_000

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพนี้ได้"))
    }
    image.src = objectUrl
  })
}

async function resizeImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("กรุณาเลือกไฟล์รูปภาพเท่านั้น")
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("รูปภาพต้องมีขนาดไม่เกิน 10 MB")
  }

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) throw new Error("เบราว์เซอร์ไม่รองรับการปรับขนาดรูป")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.82
  let encoded = canvas.toDataURL("image/jpeg", quality)
  while (encoded.length > MAX_ENCODED_LENGTH && quality > 0.42) {
    quality -= 0.1
    encoded = canvas.toDataURL("image/jpeg", quality)
  }
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new Error("รูปนี้มีรายละเอียดสูงเกินไป กรุณาเลือกรูปที่เล็กลง")
  }
  return encoded
}

export function ImageUpload({
  value,
  onChange,
  label = "รูปภาพ",
  helpText = "รองรับ JPG, PNG และ WebP สูงสุด 10 MB ระบบจะย่อรูปให้อัตโนมัติ",
  fit = "cover",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const processFile = async (file?: File) => {
    if (!file) return
    setError("")
    setIsProcessing(true)
    try {
      onChange(await resizeImage(file))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "ไม่สามารถเพิ่มรูปภาพได้")
    } finally {
      setIsProcessing(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ลบรูป
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={isProcessing}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          void processFile(event.dataTransfer.files[0])
        }}
        className={`group relative flex min-h-56 w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-wait ${
          isDragging
            ? "border-primary bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-blue-50/50"
        }`}
        aria-label={value ? `เปลี่ยน${label}` : `เพิ่ม${label}`}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={`ตัวอย่าง${label}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 420px"
              className={fit === "contain" ? "bg-white object-contain p-3" : "object-cover"}
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Upload className="h-4 w-4" />
              เปลี่ยนรูป
            </span>
          </>
        ) : (
          <span className="m-auto flex flex-col items-center p-6 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-primary">
              {isProcessing ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
            </span>
            <span className="font-bold text-slate-800">
              {isProcessing ? "กำลังเตรียมรูป..." : "กดเลือกหรือลากรูปมาวาง"}
            </span>
            <span className="mt-1 text-xs text-slate-600">{helpText}</span>
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void processFile(event.target.files?.[0])}
      />
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  )
}
