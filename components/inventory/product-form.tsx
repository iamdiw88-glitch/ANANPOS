"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, ArrowLeft } from "lucide-react"

type ProductUnitForm = {
  id?: number
  unitId: number | string
  conversionRate: number
  price: number
  isDefaultSale: boolean
}

type ProductFormState = {
  code: string
  name: string
  categoryId: number | string
  baseUnitId: number | string
  reorderPoint: number
  isStockItem: boolean
  productUnits: ProductUnitForm[]
}

export function ProductForm({ initialData, categories, units }: { initialData?: any, categories: any[], units: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProductFormState>({
    code: initialData?.code || "",
    name: initialData?.name || "",
    categoryId: initialData?.categoryId || categories[0]?.id || "",
    baseUnitId: initialData?.baseUnitId || units[0]?.id || "",
    reorderPoint: initialData?.reorderPoint || 0,
    isStockItem: initialData !== undefined ? initialData.isStockItem : true,
    productUnits: initialData?.productUnits?.map((pu: any) => ({
      id: pu.id,
      unitId: pu.unitId,
      conversionRate: pu.conversionRate,
      price: pu.price,
      isDefaultSale: pu.isDefaultSale
    })) || []
  })

  const addUnit = () => {
    setFormData(prev => ({
      ...prev,
      productUnits: [
        ...prev.productUnits,
        { unitId: units[0]?.id || "", conversionRate: 1, price: 0, isDefaultSale: prev.productUnits.length === 0 }
      ]
    }))
  }

  const removeUnit = (index: number) => {
    setFormData(prev => {
      const newUnits = [...prev.productUnits]
      newUnits.splice(index, 1)
      if (newUnits.length > 0 && !newUnits.some(u => u.isDefaultSale)) {
        newUnits[0].isDefaultSale = true
      }
      return { ...prev, productUnits: newUnits }
    })
  }

  const updateUnit = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newUnits = [...prev.productUnits]
      if (field === 'isDefaultSale' && value === true) {
        newUnits.forEach(u => u.isDefaultSale = false)
      }
      newUnits[index] = { ...newUnits[index], [field]: value }
      return { ...prev, productUnits: newUnits }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const url = initialData ? `/api/products/${initialData.id}` : '/api/products'
      const method = initialData ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      if (data.success) {
        router.push('/inventory/products')
        router.refresh()
      } else {
        alert(data.error || 'Something went wrong')
      }
    } catch (error) {
      alert('Error saving product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl bg-white p-6 rounded-lg shadow-sm border border-border">
      <div className="flex items-center gap-4 mb-6">
        <Button type="button" variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> กลับ</Button>
        <h2 className="text-xl font-bold font-heading">{initialData ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">รหัสสินค้า</label>
          <input required type="text" className="w-full border rounded-md p-2" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อสินค้า</label>
          <input required type="text" className="w-full border rounded-md p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">หมวดหมู่</label>
          <select required className="w-full border rounded-md p-2" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: Number(e.target.value)})}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">หน่วยฐาน (Base Unit)</label>
          <select required className="w-full border rounded-md p-2" value={formData.baseUnitId} onChange={e => setFormData({...formData, baseUnitId: Number(e.target.value)})}>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">จุดสั่งซื้อ (Reorder Point)</label>
          <input type="number" min="0" step="0.01" className="w-full border rounded-md p-2" value={formData.reorderPoint} onChange={e => setFormData({...formData, reorderPoint: Number(e.target.value)})} />
        </div>
        <div className="flex items-center mt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 rounded" checked={formData.isStockItem} onChange={e => setFormData({...formData, isStockItem: e.target.checked})} />
            <span className="font-medium">เป็นสินค้าตัดสต็อก (มีจำนวน)</span>
          </label>
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">หน่วยขาย และ ราคา (Product Units)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addUnit}>
            <Plus className="w-4 h-4 mr-1" /> เพิ่มหน่วยขาย
          </Button>
        </div>
        
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">หน่วย</th>
              <th className="p-2 text-left">อัตราส่วน (ต่อหน่วยฐาน)</th>
              <th className="p-2 text-left">ราคาขาย (บาท)</th>
              <th className="p-2 text-center">ค่าเริ่มต้นขาย</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {formData.productUnits.map((pu, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">
                  <select className="w-full border rounded p-1" value={pu.unitId} onChange={e => updateUnit(i, 'unitId', Number(e.target.value))}>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input type="number" step="0.01" min="0.01" className="w-full border rounded p-1" value={pu.conversionRate} onChange={e => updateUnit(i, 'conversionRate', Number(e.target.value))} />
                </td>
                <td className="p-2">
                  <input type="number" step="0.01" min="0" className="w-full border rounded p-1" value={pu.price} onChange={e => updateUnit(i, 'price', Number(e.target.value))} />
                </td>
                <td className="p-2 text-center">
                  <input type="radio" name="isDefaultSale" checked={pu.isDefaultSale} onChange={() => updateUnit(i, 'isDefaultSale', true)} />
                </td>
                <td className="p-2 text-center">
                  <button type="button" onClick={() => removeUnit(i)} className="text-destructive p-1 hover:bg-destructive/10 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {formData.productUnits.length === 0 && (
              <tr><td colSpan={5} className="text-center p-4 text-slate-500">ยังไม่มีหน่วยขาย กรุณาเพิ่มอย่างน้อย 1 หน่วย</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
        <Button type="submit" disabled={loading || formData.productUnits.length === 0}>บันทึกข้อมูล</Button>
      </div>
    </form>
  )
}
