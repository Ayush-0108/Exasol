"use client"

import React from "react"
import { LoadingSkeleton } from "./loading-skeleton"
import { ErrorState } from "./error-state"
import { EmptyState } from "./empty-state"

interface ApiWrapperProps<T> {
  loading: boolean
  error: Error | null
  data: T | null
  isEmpty?: (data: T) => boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  skeletonVariant?: "table" | "cards" | "detail" | "bento"
  skeletonRows?: number
  children: (data: T) => React.ReactNode
}

export function ApiWrapper<T>({
  loading,
  error,
  data,
  isEmpty = (d) => Array.isArray(d) && d.length === 0,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no events or telemetry matching this filter.",
  skeletonVariant = "table",
  skeletonRows = 4,
  children,
}: ApiWrapperProps<T>) {
  if (loading && !data) {
    return <LoadingSkeleton variant={skeletonVariant} rows={skeletonRows} />
  }

  if (error && !data) {
    return (
      <ErrorState
        message={error.message || "Failed to fetch operator telemetry"}
        onRetry={onRetry}
      />
    )
  }

  if (!data || isEmpty(data)) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        onAction={onRetry}
        actionLabel={onRetry ? "Refresh data" : undefined}
      />
    )
  }

  return <>{children(data)}</>
}
