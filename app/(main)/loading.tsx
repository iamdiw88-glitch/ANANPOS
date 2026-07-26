export default function MainLoading() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="กำลังโหลดข้อมูล"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-primary" />
        <p className="text-sm font-semibold text-slate-600">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  )
}
