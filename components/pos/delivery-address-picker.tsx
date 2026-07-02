"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import {
  composeDeliveryAddress,
  DeliveryAddress,
  LANDMARK_TAGS,
  THERD_SUBDISTRICTS,
} from "@/lib/data/therd-subdistricts"

type DeliveryAddressDraft = Omit<DeliveryAddress, "fullAddress">

type AddressFormDraft = {
  subdistrictId: string
  subdistrictName: string
  moo: string
  villageName: string
  landmark: string
}

const emptyDraft: AddressFormDraft = {
  subdistrictId: "",
  subdistrictName: "",
  moo: "",
  villageName: "",
  landmark: "",
}

function toFormDraft(address: DeliveryAddress | null): AddressFormDraft {
  if (!address) return emptyDraft
  return {
    subdistrictId: address.subdistrictId,
    subdistrictName: address.subdistrictName,
    moo: String(address.moo),
    villageName: address.villageName,
    landmark: address.landmark || "",
  }
}

function getManualSubdistrictId(name: string) {
  return `manual-${name.trim().replace(/\s+/g, "-")}`
}

function buildAddress(draft: AddressFormDraft): DeliveryAddress | null {
  const subdistrictName = draft.subdistrictName.trim()
  const villageName = draft.villageName.trim()
  const moo = Number(draft.moo)

  if (!subdistrictName || !villageName || !Number.isFinite(moo) || moo <= 0) return null

  const knownSubdistrict = THERD_SUBDISTRICTS.find((item) => item.name === subdistrictName)
  const addressDraft: DeliveryAddressDraft = {
    subdistrictId: draft.subdistrictId || knownSubdistrict?.id || getManualSubdistrictId(subdistrictName),
    subdistrictName,
    moo,
    villageName,
    landmark: draft.landmark.trim() || undefined,
  }

  return {
    ...addressDraft,
    fullAddress: composeDeliveryAddress(addressDraft),
  }
}

export function DeliveryAddressPicker({
  value,
  onChange,
}: {
  value: DeliveryAddress | null
  onChange: (address: DeliveryAddress | null) => void
}) {
  const [draft, setDraft] = useState<AddressFormDraft>(() => toFormDraft(value))

  useEffect(() => {
    if (value) setDraft(toFormDraft(value))
  }, [value])

  const selectedSubdistrict = useMemo(
    () =>
      THERD_SUBDISTRICTS.find((item) => item.id === draft.subdistrictId) ||
      THERD_SUBDISTRICTS.find((item) => item.name === draft.subdistrictName.trim()) ||
      null,
    [draft.subdistrictId, draft.subdistrictName],
  )

  const selectedVillageValue = useMemo(() => {
    if (!selectedSubdistrict) return ""
    const moo = Number(draft.moo)
    const village = selectedSubdistrict.villages.find((item) => item.moo === moo && item.name === draft.villageName)
    return village ? String(village.moo) : ""
  }, [draft.moo, draft.villageName, selectedSubdistrict])

  const previewAddress = buildAddress(draft)

  const updateDraft = (changes: Partial<AddressFormDraft>) => {
    const next = { ...draft, ...changes }
    const completeAddress = buildAddress(next)
    setDraft(next)
    if (completeAddress) onChange(completeAddress)
    else if (value) onChange(null)
  }

  const selectSubdistrict = (subdistrictId: string) => {
    if (!subdistrictId) {
      updateDraft({ subdistrictId: "", subdistrictName: "", moo: "", villageName: "" })
      return
    }

    const subdistrict = THERD_SUBDISTRICTS.find((item) => item.id === subdistrictId)
    if (!subdistrict) return

    const firstVillage = subdistrict.villages[0]
    updateDraft({
      subdistrictId: subdistrict.id,
      subdistrictName: subdistrict.name,
      moo: String(firstVillage.moo),
      villageName: firstVillage.name,
    })
  }

  const setManualSubdistrict = (subdistrictName: string) => {
    const knownSubdistrict = THERD_SUBDISTRICTS.find((item) => item.name === subdistrictName.trim())
    updateDraft({
      subdistrictId: knownSubdistrict?.id || "",
      subdistrictName,
    })
  }

  const selectVillage = (mooValue: string) => {
    if (!selectedSubdistrict || !mooValue) {
      updateDraft({ moo: "", villageName: "" })
      return
    }

    const village = selectedSubdistrict.villages.find((item) => String(item.moo) === mooValue)
    if (!village) return
    updateDraft({ moo: String(village.moo), villageName: village.name })
  }

  const appendLandmark = (tag: string) => {
    const current = draft.landmark.trim()
    const next = current ? `${current}, ${tag}` : tag
    updateDraft({ landmark: next })
  }

  const clearAddress = () => {
    setDraft(emptyDraft)
    onChange(null)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">ตำบล</div>
          <select
            value={selectedSubdistrict?.id || ""}
            onChange={(event) => selectSubdistrict(event.target.value)}
            className="input h-10 px-2 text-sm"
          >
            <option value="">เลือกตำบลจากรายการ</option>
            {THERD_SUBDISTRICTS.map((subdistrict) => (
              <option key={subdistrict.id} value={subdistrict.id}>
                ตำบล{subdistrict.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={draft.subdistrictName}
            onChange={(event) => setManualSubdistrict(event.target.value)}
            placeholder="พิมพ์ตำบลเอง"
            className="input h-10 px-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">หมู่บ้าน</div>
          <select
            value={selectedVillageValue}
            onChange={(event) => selectVillage(event.target.value)}
            disabled={!selectedSubdistrict}
            className="input h-10 px-2 text-sm disabled:bg-slate-50"
          >
            <option value="">เลือกหมู่บ้านจากรายการ</option>
            {(selectedSubdistrict?.villages || []).map((village) => (
              <option key={`${selectedSubdistrict?.id}-${village.moo}`} value={village.moo}>
                หมู่ {village.moo} {village.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
            <input
              type="number"
              min="1"
              value={draft.moo}
              onChange={(event) => updateDraft({ moo: event.target.value })}
              placeholder="หมู่"
              className="input h-10 px-2 text-sm"
            />
            <input
              type="text"
              value={draft.villageName}
              onChange={(event) => updateDraft({ villageName: event.target.value })}
              placeholder="พิมพ์หมู่บ้านเอง"
              className="input h-10 px-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500">จุดสังเกต</div>
            {(value || draft.subdistrictName || draft.moo || draft.villageName || draft.landmark) && (
              <button
                type="button"
                onClick={clearAddress}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                เคลียร์
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {LANDMARK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => appendLandmark(tag)}
                className="min-h-9 rounded-md border border-border bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-blue-300"
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={draft.landmark}
            onChange={(event) => updateDraft({ landmark: event.target.value })}
            placeholder="จุดสังเกตเพิ่มเติม"
            className="input h-10 px-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 min-h-[48px]">
        {previewAddress?.fullAddress || "เลือกหรือพิมพ์ตำบล หมู่ที่ และหมู่บ้านเพื่อสร้างที่อยู่จัดส่ง"}
      </div>
    </div>
  )
}
