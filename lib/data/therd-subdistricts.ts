export type Village = {
  moo: number
  name: string
}

export type Subdistrict = {
  id: string
  name: string
  villages: Village[]
}

export type DeliveryAddress = {
  subdistrictId: string
  subdistrictName: string
  moo: number
  villageName: string
  landmark?: string
  fullAddress: string
}

export const THERD_SUBDISTRICTS: Subdistrict[] = [
  {
    id: "wiang",
    name: "เวียง",
    villages: [
      { moo: 1, name: "บ้านเวียงเทิง" },
      { moo: 2, name: "บ้านตั้งข้าว" },
      { moo: 3, name: "บ้านห้วยไคร้" },
      { moo: 4, name: "บ้านร่องแช่" },
      { moo: 5, name: "บ้านทุ่งโห้ง" },
      { moo: 6, name: "บ้านห้วยไคร้ใหม่" },
      { moo: 7, name: "บ้านทุ่งขันไชย" },
      { moo: 8, name: "บ้านห้วยไคร้เก่า" },
      { moo: 9, name: "บ้านร่องขามป้อม" },
      { moo: 10, name: "บ้านใหม่" },
      { moo: 11, name: "บ้านห้วยผึ้ง" },
      { moo: 12, name: "บ้านร่องริว" },
      { moo: 13, name: "บ้านห้วยหลวง" },
      { moo: 14, name: "บ้านพระเกิด" },
      { moo: 15, name: "บ้านเวียงใต้" },
      { moo: 16, name: "บ้านม่วงไพรวัลย์" },
      { moo: 17, name: "บ้านห้วยไคร้สันติสุข" },
      { moo: 18, name: "บ้านริมอิง" },
      { moo: 19, name: "บ้านทุ่งเฉลิมพระเกียรติ" },
      { moo: 20, name: "บ้านเวียงจอมจ้อ" },
      { moo: 21, name: "บ้านห้วยไคร้เหนือ" },
      { moo: 22, name: "บ้านทุ่งโห้งเหนือ" },
      { moo: 23, name: "บ้านห้วยระเมด" },
      { moo: 24, name: "บ้านห้วยไคร้ใต้" },
      { moo: 25, name: "บ้านห้วยไคร้ลานทอง" },
    ],
  },
  {
    id: "ngio",
    name: "งิ้ว",
    villages: [
      { moo: 1, name: "บ้านป่าติ้ว" },
      { moo: 2, name: "บ้านสว่าน" },
      { moo: 3, name: "บ้านสักใต้" },
      { moo: 4, name: "บ้านขอนซุง" },
      { moo: 5, name: "บ้านสันเชียงใหม่" },
      { moo: 6, name: "บ้านป่าไผ่" },
      { moo: 7, name: "บ้านงิ้วเก่า" },
      { moo: 8, name: "บ้านตุ้มเหนือ" },
      { moo: 9, name: "บ้านตุ้มใต้" },
      { moo: 10, name: "บ้านโนนสมบูรณ์" },
      { moo: 11, name: "บ้านสักเหนือ" },
      { moo: 12, name: "บ้านงิ้วใหม่" },
      { moo: 13, name: "บ้านงิ้วพัฒนา" },
      { moo: 14, name: "บ้านทุ่งลานนา" },
      { moo: 15, name: "บ้านใหม่รุ่งเรือง" },
      { moo: 16, name: "บ้านห้วยตุ้มสันติภาพ" },
      { moo: 17, name: "บ้านใหม่สันติสุข" },
      { moo: 18, name: "บ้านตุ้มเชียงทอง" },
      { moo: 19, name: "บ้านม่อนพญาอินทร์" },
      { moo: 20, name: "บ้านศรีภูมิ" },
      { moo: 21, name: "บ้านสักพัฒนา" },
      { moo: 22, name: "บ้านใหม่สันทราย" },
      { moo: 23, name: "บ้านงิ้วบุญเรือง" },
      { moo: 24, name: "บ้านตุ้มรวงทอง" },
      { moo: 25, name: "บ้านทุ่งรวงทอ" },
    ],
  },
  {
    id: "plong",
    name: "ปล้อง",
    villages: [
      { moo: 1, name: "บ้านเหล่า" },
      { moo: 2, name: "บ้านจำไฮ" },
      { moo: 3, name: "บ้านปล้องใต้" },
      { moo: 4, name: "บ้านปล้องเหนือ" },
      { moo: 5, name: "บ้านปล้องตลาด" },
      { moo: 6, name: "บ้านดอนดินแดง" },
      { moo: 7, name: "บ้านปล้องกลาง" },
      { moo: 8, name: "บ้านปล้องส้าน" },
      { moo: 9, name: "บ้านป่ามื่น" },
      { moo: 10, name: "บ้านสันป่าสัก" },
      { moo: 11, name: "บ้านปล้องน้ำล้อม" },
      { moo: 12, name: "บ้านทุ่งเจริญ" },
    ],
  },
  {
    id: "mae-loi",
    name: "แม่ลอย",
    villages: [
      { moo: 1, name: "บ้านหนองข่วง" },
      { moo: 2, name: "บ้านเกี๋ยงดอย" },
      { moo: 3, name: "บ้านเกี๋ยงใต้" },
      { moo: 4, name: "บ้านห้วยน่าน" },
      { moo: 5, name: "บ้านแม่ลอยไร่" },
      { moo: 6, name: "บ้านแม่ลอยไร่ใต้" },
      { moo: 7, name: "บ้านเกี๋ยงกลาง" },
      { moo: 8, name: "บ้านสันเจริญ" },
      { moo: 9, name: "บ้านจำไคร้" },
      { moo: 10, name: "บ้านเกี๋ยงดอยสูงเนิน" },
      { moo: 11, name: "บ้านใหม่สุขสันต์" },
      { moo: 12, name: "บ้านศรีมงคล" },
      { moo: 13, name: "บ้านเกี่ยงดอยเจริญราษฎร์" },
    ],
  },
  {
    id: "nong-raed",
    name: "หนองแรด",
    villages: [
      { moo: 1, name: "บ้านหนองแรด" },
      { moo: 2, name: "บ้านหนองแรดเหนือ (ที่ตั้งที่ทำการ อบต.หนองแรด)" },
      { moo: 3, name: "บ้านราษฎร์ภักดี" },
      { moo: 4, name: "บ้านร่องขุ่น" },
      { moo: 5, name: "บ้านดอนตัน" },
      { moo: 6, name: "บ้านร่องบอน" },
      { moo: 7, name: "บ้านใหม่พัฒนา" },
    ],
  },
  {
    id: "sri-don-chai",
    name: "ศรีดอนไชย",
    villages: [
      { moo: 1, name: "บ้านป่ารวก" },
      { moo: 2, name: "บ้านใหม่แม่ลอย" },
      { moo: 3, name: "บ้านแม่ลอยหลวง" },
      { moo: 4, name: "บ้านทุ่งสง่า" },
      { moo: 5, name: "บ้านทุ่งต้อม" },
      { moo: 6, name: "บ้านม่อนมะปราง" },
      { moo: 7, name: "บ้านหนองเลียบ" },
      { moo: 8, name: "บ้านม่อนหลวง" },
      { moo: 9, name: "บ้านป่าตึงงาม" },
      { moo: 10, name: "บ้านม่อนหินแก้ว" },
    ],
  },
  {
    id: "san-sai-ngam",
    name: "สันทรายงาม",
    villages: [
      { moo: 1, name: "บ้านสันทรายมูล" },
      { moo: 2, name: "บ้านสันทรายงาม" },
      { moo: 3, name: "บ้านชวา" },
      { moo: 4, name: "บ้านหนองสามัคคี" },
      { moo: 5, name: "บ้านหนองบัว" },
      { moo: 6, name: "บ้านสันทรายทอง" },
      { moo: 7, name: "บ้านใหม่สันทราย" },
    ],
  },
]

export const LANDMARK_TAGS = [
  "หน้างานก่อสร้าง",
  "ริมถนนหลวง",
  "หลังวัด",
  "ใกล้โรงเรียน",
  "ใกล้ตลาด",
  "ปากซอย",
  "บ้านลูกค้า",
]

export function composeDeliveryAddress(address: Omit<DeliveryAddress, "fullAddress">) {
  const base = `หมู่ ${address.moo} ${address.villageName} ต.${address.subdistrictName} อ.เทิง จ.เชียงราย`
  return address.landmark ? `${base} (${address.landmark})` : base
}
