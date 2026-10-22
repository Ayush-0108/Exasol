import React from "react"
import { LucideIcon, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-lg bg-zinc-900/30 border border-dashed border-zinc-800",
        className
      )}
    >
      <div className="p-3 rounded-full bg-zinc-800/80 text-zinc-400 mb-3">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-medium text-zinc-200">{title}</h4>
      <p className="text-xs text-zinc-400 mt-1 max-w-sm font-mono leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          size="sm"
          onClick={onAction}
          className="mt-4 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
