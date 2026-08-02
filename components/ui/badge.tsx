"use client"

import React, { HTMLAttributes, ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  MinusCircle,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        success: "bg-[#E7F5EE] text-[#0F7A4D] border border-[#0F7A4D]/20",
        warning: "bg-[#FDF2E3] text-[#A85B00] border border-[#A85B00]/20",
        danger: "bg-[#FCEDED] text-[#BE2A2A] border border-[#BE2A2A]/20",
        info: "bg-[#E8F1FD] text-[#0B63CE] border border-[#0B63CE]/20",
        neutral: "bg-[#F3F5F8] text-[#5D6B80] border border-[#DFE4EC]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs h-6",
        md: "px-2.5 py-1 text-[13px] h-7",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "sm",
    },
  }
)

const defaultIcons: Record<string, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: MinusCircle,
}

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: LucideIcon | ReactNode
}

export function Badge({ className, variant = "neutral", size, icon, children, ...props }: BadgeProps) {
  const IconComponent = icon || (variant ? defaultIcons[variant] : null)

  const renderIcon = () => {
    if (!IconComponent) return null
    if (React.isValidElement(IconComponent)) return IconComponent
    if (typeof IconComponent === "function" || (typeof IconComponent === "object" && IconComponent !== null)) {
      const Comp = IconComponent as any
      return <Comp className="h-3.5 w-3.5 shrink-0" />
    }
    return null
  }

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {renderIcon()}
      {children}
    </span>
  )
}
