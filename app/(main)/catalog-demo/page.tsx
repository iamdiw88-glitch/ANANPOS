"use client"

import React, { useState, useMemo } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  SlidersHorizontal,
  Home,
  Star,
  RefreshCw
} from "lucide-react"

// ==========================================
// MOCK DATA
// ==========================================

interface Product {
  id: string
  code: string
  name: string
  brand: string
  priceMin: number
  priceMax: number
  unit: string
  imageUrl: string
  discountBadge?: string
  rating: number
  type: string
}

interface SubCategory {
  id: string
  name: string
  description: string
  imageUrl: string
  productCount: number
  itemsList: string[]
  products: Product[]
}

interface MainCategory {
  id: string
  name: string
  icon: string
  imageUrl: string
  subCategories: SubCategory[]
}

const MOCK_CATEGORIES: MainCategory[] = [
  {
    id: "cement-con",
    name: "ปูนซีเมนต์ และงานก่อสร้าง",
    icon: "🏗️",
    imageUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=400",
    subCategories: [
      {
        id: "portland",
        name: "ปูนซีเมนต์ปอร์ตแลนด์",
        description: "สำหรับงานโครงสร้าง ฐานราก เสา คาน คอนกรีตทั่วไป",
        imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=300",
        productCount: 15,
        itemsList: ["ปูนตราช้าง", "ปูนทีพีไอ", "ปูนดอกบัว"],
        products: []
      },
      {
        id: "mortar",
        name: "ปูนสำเร็จรูป (มอร์ตาร์)",
        description: "ปูนก่อ ปูนฉาบ ปูนเทปรับระดับ ใช้งานง่ายเพียงผสมน้ำ",
        imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=300",
        productCount: 28,
        itemsList: ["ปูนก่อทั่วไป", "ปูนฉาบรักษ์โลก", "ปูนกาวปูกระเบื้อง"],
        products: []
      },
      {
        id: "bricks",
        name: "อิฐบล็อก และอิฐมอญ",
        description: "อิฐก่อผนังคุณภาพสูง ทนทาน กันความร้อนได้ดี",
        imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=300",
        productCount: 12,
        itemsList: ["อิฐมวลเบา", "อิฐบล็อกคอนกรีต", "อิฐมอญแดง"],
        products: []
      }
    ]
  },
  {
    id: "roof-wall",
    name: "หลังคา ผนังฝ้า และอุปกรณ์",
    icon: "🏠",
    imageUrl: "https://images.unsplash.com/photo-1628744507167-40cb319ae5e2?auto=format&fit=crop&q=80&w=400",
    subCategories: [
      {
        id: "concrete-tile",
        name: "กระเบื้องหลังคาคอนกรีต",
        description: "กระเบื้องแผ่นเรียบและแบบลอน แข็งแรงทนทาน สีสันสวยงามยาวนาน",
        imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=300",
        productCount: 24,
        itemsList: ["แผ่นเรียบโมเดิร์น", "แบบลอนเซ็นจูรี", "ครอบหลังคาและอุปกรณ์"],
        products: [
          {
            id: "p1",
            code: "RC-001",
            name: "กระเบื้องคอนกรีต แผ่นเรียบ ตราห้าห่วง รุ่นโมเดิร์นคลาสสิก สีเทาพลาตินัม",
            brand: "ตราห้าห่วง",
            priceMin: 23.0,
            priceMax: 33.5,
            unit: "แผ่น",
            imageUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&q=80&w=300",
            discountBadge: "-19%",
            rating: 4.8,
            type: "แบบเรียบ"
          },
          {
            id: "p2",
            code: "RC-002",
            name: "กระเบื้องซีแพคโมเนีย ตราช้าง แบบลอน สีส้มประกายทอง",
            brand: "SCG (ตราช้าง)",
            priceMin: 18.5,
            priceMax: 24.0,
            unit: "แผ่น",
            imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=300",
            rating: 4.5,
            type: "แบบลอน"
          },
          {
            id: "p3",
            code: "RC-003",
            name: "แผ่นสะท้อนความร้อนหลังคา อลูมิเนียมฟอยล์แท้ 2 ด้าน",
            brand: "SCG (ตราช้าง)",
            priceMin: 650.0,
            priceMax: 890.0,
            unit: "ม้วน",
            imageUrl: "https://images.unsplash.com/photo-1615876234886-fd9a39fda97f?auto=format&fit=crop&q=80&w=300",
            discountBadge: "-10%",
            rating: 4.6,
            type: "อุปกรณ์เสริม"
          },
          {
            id: "p4",
            code: "RC-004",
            name: "กระเบื้องคอนกรีต แผ่นเรียบ ทีพีไอ รุ่นลักเซอรี สีชาร์โคลพรีเมียม",
            brand: "TPI (ทีพีไอ)",
            priceMin: 29.0,
            priceMax: 35.0,
            unit: "แผ่น",
            imageUrl: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&q=80&w=300",
            rating: 4.9,
            type: "แบบเรียบ"
          }
        ]
      },
      {
        id: "fiber-tile",
        name: "กระเบื้องหลังคาลอนคู่",
        description: "น้ำหนักเบา ประหยัดโครงสร้าง เหมาะกับบ้านทุกสไตล์",
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300",
        productCount: 16,
        itemsList: ["ลอนคู่ 4 มม.", "ลอนคู่ 5 มม.", "สีธรรมชาติ"],
        products: []
      },
      {
        id: "ceiling-gypsum",
        name: "ฝ้าเพดาน และแผ่นยิปซัม",
        description: "ผนังเบา ฝ้าเพดานฉาบเรียบและทีบาร์ ทนชื้น กันความร้อน",
        imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=300",
        productCount: 20,
        itemsList: ["แผ่นยิปซัมทนชื้น", "โครงคร่าวฝ้าทีบาร์", "ช่องเซอร์วิสสำเร็จรูป"],
        products: []
      }
    ]
  },
  {
    id: "steel-metal",
    name: "เหล็ก รูปพรรณ และเหล็กเส้น",
    icon: "🔩",
    imageUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400",
    subCategories: []
  },
  {
    id: "paint-tools",
    name: "สี เคมีภัณฑ์ และเครื่องมือช่าง",
    icon: "🎨",
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=400",
    subCategories: []
  },
  {
    id: "door-window",
    name: "ประตู หน้าต่าง และลูกบิด",
    icon: "🚪",
    imageUrl: "https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&q=80&w=400",
    subCategories: []
  }
]

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function CatalogDemoPage() {
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1)
  const [selectedMainCat, setSelectedMainCat] = useState<MainCategory>(MOCK_CATEGORIES[1]) // Default to Roof/Wall
  const [selectedSubCat, setSelectedSubCat] = useState<SubCategory>(MOCK_CATEGORIES[1].subCategories[0]) // Default to Concrete Tile
  
  // Carousel states for Level 1
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Filter States for Level 3
  const [selectedPill, setSelectedPill] = useState<string>("ทั้งหมด")
  const [activeBrands, setActiveBrands] = useState<string[]>([])
  const [activePrices, setActivePrices] = useState<string[]>([])
  const [expandedFilters, setExpandedFilters] = useState({ brand: true, price: true, type: true })

  // Shopping cart popup preview
  const [cartCount, setCartCount] = useState(0)

  // Carousel slide handlers
  const nextSlide = () => {
    if (carouselIndex < MOCK_CATEGORIES.length - 3) {
      setCarouselIndex(prev => prev + 1)
    }
  }

  const prevSlide = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1)
    }
  }

  // Handle Accordion toggles
  const toggleFilter = (key: "brand" | "price" | "type") => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Handle checkboxes
  const handleBrandChange = (brand: string) => {
    setActiveBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    )
  }

  const handlePriceChange = (priceRange: string) => {
    setActivePrices(prev => 
      prev.includes(priceRange) ? prev.filter(p => p !== priceRange) : [...prev, priceRange]
    )
  }

  // Filter products dynamically
  const filteredProducts = useMemo(() => {
    let list = selectedSubCat.products

    // 1. Pill Category Filter
    if (selectedPill !== "ทั้งหมด") {
      list = list.filter(p => p.type === selectedPill)
    }

    // 2. Brand Checkbox Filter
    if (activeBrands.length > 0) {
      list = list.filter(p => activeBrands.includes(p.brand))
    }

    // 3. Price Range Filter
    if (activePrices.length > 0) {
      list = list.filter(p => {
        return activePrices.some(priceRange => {
          if (priceRange === "low") return p.priceMin < 20
          if (priceRange === "mid") return p.priceMin >= 20 && p.priceMin <= 50
          if (priceRange === "high") return p.priceMin > 50
          return true
        })
      })
    }

    return list
  }, [selectedSubCat, selectedPill, activeBrands, activePrices])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      
      {/* Top Interactive Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-white p-2.5 rounded-xl font-black text-xl shadow-md tracking-wider">
            ANAN
          </div>
          <div>
            <h1 className="font-heading text-lg font-black text-slate-800 leading-none">อนันต์ คอนสตรัคชั่น</h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Interactive UI/UX Catalog Demo</p>
          </div>
        </div>



        {/* Cart Preview Badge */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveBrands([])
              setActivePrices([])
              setSelectedPill("ทั้งหมด")
              setCurrentLevel(1)
            }}
            className="p-2 bg-slate-100 hover:bg-slate-200 transition text-slate-600 rounded-lg"
            title="รีเซ็ตเดโม"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="relative cursor-pointer bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* ========================================================================= */}
        {/* LEVEL 1: Main Category Screen                                             */}
        {/* ========================================================================= */}
        {currentLevel === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black font-heading text-slate-800">เลือกหมวดหมู่สินค้าหลัก</h2>
                <p className="text-sm text-slate-500 mt-1">สินค้าคุณภาพมาตรฐานสำหรับช่างมืออาชีพ</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={prevSlide}
                  disabled={carouselIndex === 0}
                  className="p-3 rounded-full border border-slate-200 bg-white shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextSlide}
                  disabled={carouselIndex >= MOCK_CATEGORIES.length - 3}
                  className="p-3 rounded-full border border-slate-200 bg-white shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slider / Grid Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {MOCK_CATEGORIES.slice(carouselIndex, carouselIndex + 4).map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => {
                    setSelectedMainCat(cat)
                    if (cat.subCategories.length > 0) {
                      setSelectedSubCat(cat.subCategories[0])
                      setCurrentLevel(2)
                    } else {
                      alert(`หมวดหมู่ ${cat.name} ยังไม่มีข้อมูลย่อยจำลองใน Mockup`)
                    }
                  }}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 border border-slate-200 hover:-translate-y-1"
                >
                  {/* Category Image Cover */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs p-2 rounded-xl text-2xl shadow-xs">
                      {cat.icon}
                    </div>
                  </div>
                  {/* Category Label */}
                  <div className="p-5 text-center bg-white border-t border-slate-100">
                    <h3 className="font-heading font-extrabold text-base text-slate-800 group-hover:text-amber-500 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      {cat.subCategories.length} หมวดหมู่ย่อย
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 2: Sub-Category Screen                                              */}
        {/* ========================================================================= */}
        {currentLevel === 2 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span 
                className="hover:text-amber-500 cursor-pointer flex items-center gap-1"
                onClick={() => setCurrentLevel(1)}
              >
                <Home className="w-3.5 h-3.5" /> หน้าแรก
              </span>
              <span>/</span>
              <span className="text-slate-800">{selectedMainCat.name}</span>
            </nav>

            {/* Top Tab Menu (Horizontal Tabs for Switch Main Categories) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
              {MOCK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedMainCat(cat)
                    if (cat.subCategories.length > 0) {
                      setSelectedSubCat(cat.subCategories[0])
                    }
                  }}
                  className={`px-5 py-3 whitespace-nowrap rounded-xl text-sm font-extrabold transition-all ${
                    selectedMainCat.id === cat.id 
                      ? "bg-slate-900 text-white shadow-md" 
                      : "bg-white text-slate-650 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Header Title */}
            <div className="text-center py-6">
              <span className="text-4xl">{selectedMainCat.icon}</span>
              <h2 className="text-2xl font-black font-heading text-slate-800 mt-2">{selectedMainCat.name}</h2>
              <p className="text-sm text-slate-500">เลือกประเภทสินค้าที่ต้องการสั่งซื้อ</p>
            </div>

            {/* Sub-Category Grid */}
            {selectedMainCat.subCategories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedMainCat.subCategories.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubCat(sub)
                      setCurrentLevel(3)
                    }}
                    className="group flex flex-col sm:flex-row cursor-pointer bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 border border-slate-200"
                  >
                    {/* Left: Image */}
                    <div className="relative aspect-video sm:aspect-square w-full sm:w-44 bg-slate-150 shrink-0">
                      <img 
                        src={sub.imageUrl} 
                        alt={sub.name} 
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-103"
                      />
                    </div>
                    {/* Right: Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between relative">
                      <div>
                        <h3 className="font-heading font-extrabold text-lg text-slate-900 leading-tight">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {sub.description}
                        </p>
                        {/* Sub Category Items list (e.g. ตราสินค้า หรือประเภทหลัก) */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {sub.itemsList.map((item, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] bg-slate-100 text-slate-650 px-2.5 py-1 rounded-md font-bold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Shop Now Yellow Button Bottom Right */}
                      <div className="flex justify-end items-end mt-4 sm:mt-0">
                        <span className="bg-amber-400 group-hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs">
                          ช้อปเลย <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border rounded-2xl p-12 text-center text-slate-550 font-bold">
                ยังไม่มีข้อมูลหมวดหมู่ย่อยในหมวดนี้
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 3: Product Listing Screen                                           */}
        {/* ========================================================================= */}
        {currentLevel === 3 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span 
                className="hover:text-amber-500 cursor-pointer"
                onClick={() => setCurrentLevel(1)}
              >
                หน้าแรก
              </span>
              <span>/</span>
              <span 
                className="hover:text-amber-500 cursor-pointer"
                onClick={() => setCurrentLevel(2)}
              >
                {selectedMainCat.name}
              </span>
              <span>/</span>
              <span className="text-slate-800 font-bold">{selectedSubCat.name}</span>
            </nav>

            {/* Pill Filters Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
                {["ทั้งหมด", "แบบเรียบ", "แบบลอน", "อุปกรณ์เสริม"].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setSelectedPill(pill)}
                    className={`px-5 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap ${
                      selectedPill === pill
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-650 hover:bg-slate-100 border border-slate-250"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>
              <span className="hidden sm:block text-xs font-bold text-slate-550 bg-white border px-3 py-1.5 rounded-lg shadow-xs">
                พบสินค้า {filteredProducts.length} รายการ
              </span>
            </div>

            {/* 2-Column Layout (Sidebar 25% : Product Grid 75%) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Sidebar Filters Accordion */}
              <aside className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-heading font-black text-base text-slate-850 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-amber-500" /> ตัวกรองสินค้า
                  </span>
                  {(activeBrands.length > 0 || activePrices.length > 0 || selectedPill !== "ทั้งหมด") && (
                    <button 
                      onClick={() => {
                        setActiveBrands([])
                        setActivePrices([])
                        setSelectedPill("ทั้งหมด")
                      }} 
                      className="text-[11px] text-amber-600 hover:text-amber-700 font-black cursor-pointer"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                </div>

                {/* Brand Accordion */}
                <div className="space-y-2">
                  <button 
                    onClick={() => toggleFilter("brand")}
                    className="w-full flex items-center justify-between font-extrabold text-sm text-slate-800"
                  >
                    <span>แบรนด์สินค้า</span>
                    {expandedFilters.brand ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedFilters.brand && (
                    <div className="space-y-2.5 pt-2 pl-1 animate-slideDown">
                      {[
                        { name: "ตราห้าห่วง", count: 8 },
                        { name: "SCG (ตราช้าง)", count: 12 },
                        { name: "TPI (ทีพีไอ)", count: 4 }
                      ].map((brand) => (
                        <label key={brand.name} className="flex items-center justify-between text-xs font-bold text-slate-650 cursor-pointer group">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={activeBrands.includes(brand.name)}
                              onChange={() => handleBrandChange(brand.name)}
                              className="w-4 h-4 rounded-sm accent-amber-500 border-slate-300 text-white" 
                            />
                            <span className="group-hover:text-slate-900 transition-colors">{brand.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md font-bold">{brand.count}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Range Accordion */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => toggleFilter("price")}
                    className="w-full flex items-center justify-between font-extrabold text-sm text-slate-800"
                  >
                    <span>ช่วงราคา (บาท)</span>
                    {expandedFilters.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedFilters.price && (
                    <div className="space-y-2.5 pt-2 pl-1 animate-slideDown">
                      {[
                        { label: "ต่ำกว่า 20 บาท", key: "low" },
                        { label: "20 - 50 บาท", key: "mid" },
                        { label: "50 บาทขึ้นไป", key: "high" }
                      ].map((range) => (
                        <label key={range.key} className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={activePrices.includes(range.key)}
                            onChange={() => handlePriceChange(range.key)}
                            className="w-4 h-4 rounded-sm accent-amber-500 border-slate-300" 
                          />
                          <span className="group-hover:text-slate-900 transition-colors">{range.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Type Accordion */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => toggleFilter("type")}
                    className="w-full flex items-center justify-between font-extrabold text-sm text-slate-800"
                  >
                    <span>ประเภทการใช้งาน</span>
                    {expandedFilters.type ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedFilters.type && (
                    <div className="space-y-2 pt-2 pl-1 animate-slideDown">
                      {["แบบเรียบ", "แบบลอน", "อุปกรณ์เสริม"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedPill(t)}
                          className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                            selectedPill === t 
                              ? "bg-amber-100 text-amber-900" 
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </aside>

              {/* Product Grid Area (75% / columns layout) */}
              <div className="lg:col-span-3 space-y-6">
                
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredProducts.map((prod) => {
                      
                      return (
                        <div 
                          key={prod.id}
                          className="group relative flex flex-col justify-between bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 border border-slate-200"
                        >
                          
                          {/* Sale discount badge top left */}
                          {prod.discountBadge && (
                            <span className="absolute top-3.5 left-3.5 z-10 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                              {prod.discountBadge}
                            </span>
                          )}

                          {/* Image Container */}
                          <div className="relative aspect-square w-full bg-slate-50 p-6 overflow-hidden flex items-center justify-center">
                            <img 
                              src={prod.imageUrl} 
                              alt={prod.name} 
                              className="object-contain max-h-full max-w-full transition-transform duration-500 group-hover:scale-105"
                            />
                            
                            {/* Stars rating overlay */}
                            <div className="absolute bottom-2.5 left-2.5 bg-black/65 backdrop-blur-xs text-[10px] text-amber-400 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" /> {prod.rating}
                            </div>
                          </div>

                          {/* Details Content */}
                          <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                            <div>
                              {/* Brand Tag Blue */}
                              <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-100 uppercase">
                                {prod.brand}
                              </span>
                              
                              {/* Product Name (line clamp 2) */}
                              <h4 className="mt-2 line-clamp-2 font-heading font-bold text-sm text-slate-800 leading-snug group-hover:text-amber-500 transition-colors">
                                {prod.name}
                              </h4>

                              {/* Region Price Warning Info */}
                              <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>ราคาต่างกันตามพื้นที่จัดส่ง</span>
                              </div>
                            </div>

                            {/* Price and Cart Button row */}
                            <div className="mt-4 flex items-end justify-between border-t border-slate-50 pt-3">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold">ราคาเริ่มต้น</span>
                                <div className="text-base sm:text-lg font-black text-red-600 leading-none">
                                  ฿{prod.priceMin.toLocaleString()} - {prod.priceMax.toLocaleString()}
                                  <span className="text-[11px] font-semibold text-slate-500 font-sans"> /{prod.unit}</span>
                                </div>
                              </div>

                              {/* Cart Button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCartCount(prev => prev + 1)
                                }}
                                className="bg-amber-400 hover:bg-amber-500 text-slate-900 p-3 rounded-xl transition-all shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                                title="ใส่ตะกร้า"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-white border rounded-2xl p-16 text-center shadow-xs">
                    <SlidersHorizontal className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-heading font-black text-base text-slate-750 mt-4">ไม่พบรายการสินค้าที่ตรงตามเงื่อนไข</h3>
                    <p className="text-xs text-slate-400 mt-1">กรุณาล้างตัวกรองหรือเลือกตัวเลือกใหม่</p>
                    <button 
                      onClick={() => {
                        setActiveBrands([])
                        setActivePrices([])
                        setSelectedPill("ทั้งหมด")
                      }} 
                      className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
