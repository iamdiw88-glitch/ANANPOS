import { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-lg font-bold tracking-tight text-slate-800 sm:text-xl">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </div>
  )
}
