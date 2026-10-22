"use client"

import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Telemetry connection interrupted",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "p-5 rounded-lg border border-rose-900/40 bg-rose-950/20 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 text-rose-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-medium text-rose-200">{title}</h4>
          <p className="text-xs text-rose-300/80 mt-1 font-mono leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-800 text-rose-200 hover:bg-rose-900/30 hover:text-rose-100 shrink-0 gap-1.5 text-xs"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry query
        </Button>
      )}
    </div>
  )
}
