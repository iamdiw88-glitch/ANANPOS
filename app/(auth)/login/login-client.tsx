"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  ChevronRight,
  Crown,
  Delete,
  HardHat,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getRoleHomePath } from "@/lib/role-home"

type User = {
  id: number
  name: string
  role: string
}

type RoleVisual = {
  Icon: LucideIcon
  iconClass: string
  iconBackground: string
  borderClass: string
}

const ROLE_VISUALS: Record<string, RoleVisual> = {
  OWNER: {
    Icon: Crown,
    iconClass: "text-amber-700",
    iconBackground: "bg-amber-100",
    borderClass: "hover:border-amber-400 focus-visible:ring-amber-400/30",
  },
  STAFF: {
    Icon: HardHat,
    iconClass: "text-blue-700",
    iconBackground: "bg-blue-100",
    borderClass: "hover:border-blue-400 focus-visible:ring-blue-400/30",
  },
  CASHIER: {
    Icon: BadgeDollarSign,
    iconClass: "text-emerald-700",
    iconBackground: "bg-emerald-100",
    borderClass: "hover:border-emerald-400 focus-visible:ring-emerald-400/30",
  },
}

const DEFAULT_ROLE_VISUAL: RoleVisual = {
  Icon: UserRound,
  iconClass: "text-slate-700",
  iconBackground: "bg-slate-100",
  borderClass: "hover:border-slate-400 focus-visible:ring-slate-400/30",
}

function getRoleVisual(role: string) {
  return ROLE_VISUALS[role] || DEFAULT_ROLE_VISUAL
}

export function LoginClient({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setPin("")
    setError(false)
  }

  const handlePinInput = (number: string) => {
    if (pin.length >= 4 || loading) return
    setError(false)
    setPin((currentPin) => currentPin + number)
  }

  const handleDelete = () => {
    setError(false)
    setPin((currentPin) => currentPin.slice(0, -1))
  }

  const handleClear = () => {
    setError(false)
    setPin("")
  }

  const submitLogin = async () => {
    if (!selectedUser || pin.length !== 4 || loading) return
    setLoading(true)
    setError(false)

    try {
      const response = await signIn("credentials", {
        userId: selectedUser.id.toString(),
        pin,
        redirect: false,
      })

      if (response?.error) {
        setError(true)
        setPin("")
        return
      }

      router.replace(getRoleHomePath(selectedUser.role))
      router.refresh()
    } catch {
      setError(true)
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  if (!selectedUser) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-950 sm:text-3xl">
            เลือกผู้ใช้งาน
          </h2>
        </div>

        <div className="mt-6 grid max-h-[430px] grid-cols-1 gap-3 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2">
          {users.map((user) => {
            const roleVisual = getRoleVisual(user.role)
            const RoleIcon = roleVisual.Icon

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleUserSelect(user)}
                className={cn(
                  "group flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4",
                  roleVisual.borderClass
                )}
              >
                <span className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  roleVisual.iconBackground,
                  roleVisual.iconClass
                )}>
                  <RoleIcon className="h-7 w-7" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-base font-extrabold text-slate-900">
                    {user.name}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
              </button>
            )
          })}
        </div>

        {users.length === 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <UserRound className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 font-bold text-slate-800">ไม่พบผู้ใช้งานที่เปิดใช้งาน</p>
          </div>
        )}
      </div>
    )
  }

  const selectedRole = getRoleVisual(selectedUser.role)
  const SelectedRoleIcon = selectedRole.Icon

  return (
    <form
      className="mx-auto w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        void submitLogin()
      }}
    >
      <button
        type="button"
        onClick={() => setSelectedUser(null)}
        disabled={loading}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft className="h-4 w-4" />
        เปลี่ยนผู้ใช้งาน
      </button>

      <div className="mt-5 text-center">
        <div className={cn(
          "mx-auto flex h-20 w-20 items-center justify-center rounded-3xl shadow-sm",
          selectedRole.iconBackground,
          selectedRole.iconClass
        )}>
          <SelectedRoleIcon className="h-10 w-10" strokeWidth={2.2} />
        </div>
        <h2 className="mt-4 font-heading text-2xl font-extrabold text-slate-950">{selectedUser.name}</h2>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-700">
          <LockKeyhole className="h-4 w-4 text-primary" />
          กรอก PIN 4 หลัก
        </div>

        <div
          className={cn("flex justify-center gap-3", error && "animate-shake")}
          aria-label={`กรอก PIN แล้ว ${pin.length} จาก 4 หลัก`}
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all duration-200",
                pin.length > index
                  ? "border-primary bg-blue-50 shadow-sm shadow-primary/10"
                  : "border-slate-200 bg-slate-50"
              )}
            >
              {pin.length > index && <span className="h-3 w-3 rounded-full bg-primary" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 text-center" aria-live="polite">
            <p className="text-sm font-bold text-red-700">PIN ไม่ถูกต้อง กรุณาลองอีกครั้ง</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => handlePinInput(number.toString())}
            disabled={loading}
            className="h-14 cursor-pointer rounded-xl border border-slate-200 bg-white text-lg font-extrabold text-slate-800 shadow-sm transition-colors duration-150 hover:border-primary/40 hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 active:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          disabled={loading || pin.length === 0}
          aria-label="ล้าง PIN"
          title="ล้าง PIN"
          className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => handlePinInput("0")}
          disabled={loading}
          className="min-h-12 cursor-pointer rounded-xl border border-slate-200 bg-white text-lg font-extrabold text-slate-800 shadow-sm transition-colors duration-150 hover:border-primary/40 hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 active:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          aria-label="ลบตัวเลขล่าสุด"
          title="ลบตัวเลขล่าสุด"
          className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <button
        type="submit"
        disabled={pin.length !== 4 || loading}
        className="mt-4 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-extrabold text-white shadow-lg shadow-primary/20 transition-colors duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {loading ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" />
            กำลังเข้าสู่ระบบ...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            สำเร็จ
          </>
        )}
      </button>
    </form>
  )
}
