"use client"

import React, { ReactNode } from "react"
import { useDensity } from "@/hooks/use-density"
import { EmptyState, EmptyStateVariant } from "./empty-state"
import { cn } from "@/lib/utils"

export interface DataListColumn<T> {
  header: string
  accessor: (item: T) => ReactNode
  className?: string
  align?: "left" | "center" | "right"
}

interface DataListProps<T> {
  data: T[]
  columns: DataListColumn<T>[]
  renderRow: (item: T, index: number) => ReactNode
  keyExtractor: (item: T, index: number) => string | number
  summaryFooter?: {
    label: string
    value: ReactNode
  }
  emptyState?: ReactNode
  emptyVariant?: EmptyStateVariant
  onRowClick?: (item: T) => void
  className?: string
}

export function DataList<T>({
  data,
  columns,
  renderRow,
  keyExtractor,
  summaryFooter,
  emptyState,
  emptyVariant = "no-data",
  onRowClick,
  className,
}: DataListProps<T>) {
  const { isTouch } = useDensity()

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        {emptyState || <EmptyState variant={emptyVariant} />}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-[#DFE4EC] bg-white shadow-sm", className)}>
      {!isTouch ? (
        /* Compact Mode: Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-[#DFE4EC]">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={cn(
                      "px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#5D6B80]",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE4EC]">
              {data.map((item, idx) => (
                <tr
                  key={keyExtractor(item, idx)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "transition-colors hover:bg-blue-50/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={cn(
                        "px-4 py-3 text-[#2B3648]",
                        col.align === "right" && "text-right font-num tabular-nums",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Touch Mode: ActionRow Card List */
        <div className="space-y-3 p-3 bg-slate-50/50">
          {data.map((item, idx) => (
            <React.Fragment key={keyExtractor(item, idx)}>
              {renderRow(item, idx)}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Sticky Summary Footer */}
      {summaryFooter && (
        <div className="sticky bottom-0 flex items-center justify-between border-t-2 border-[#0B63CE]/30 bg-slate-900 px-5 py-3.5 text-white">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {summaryFooter.label}
          </span>
          <div className="text-right font-num font-bold text-[#F7F9FC]">
            {summaryFooter.value}
          </div>
        </div>
      )}
    </div>
  )
}
