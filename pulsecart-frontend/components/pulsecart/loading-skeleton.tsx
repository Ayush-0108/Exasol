import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  rows?: number
  variant?: "table" | "cards" | "detail" | "bento"
}

export function LoadingSkeleton({
  className,
  rows = 4,
  variant = "table",
}: LoadingSkeletonProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-5 rounded-lg bg-zinc-900/40 space-y-3">
            <Skeleton className="h-3 w-24 bg-zinc-800" />
            <Skeleton className="h-8 w-36 bg-zinc-800" />
            <Skeleton className="h-3 w-48 bg-zinc-800" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === "bento") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
        <div className="md:col-span-2 p-6 rounded-lg bg-zinc-900/40 space-y-4">
          <Skeleton className="h-4 w-32 bg-zinc-800" />
          <Skeleton className="h-12 w-48 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
        </div>
        <div className="md:col-span-2 p-6 rounded-lg bg-zinc-900/40 space-y-4">
          <Skeleton className="h-4 w-28 bg-zinc-800" />
          <Skeleton className="h-12 w-40 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
        </div>
      </div>
    )
  }

  if (variant === "detail") {
    return (
      <div className={cn("space-y-4 p-6 bg-zinc-900/30 rounded-lg", className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full bg-zinc-800" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 bg-zinc-800" />
            <Skeleton className="h-3 w-28 bg-zinc-800" />
          </div>
        </div>
        <Skeleton className="h-10 w-full bg-zinc-800" />
        <Skeleton className="h-24 w-full bg-zinc-800" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-4 p-3 bg-zinc-900/60 rounded">
        <Skeleton className="h-4 w-24 bg-zinc-800" />
        <Skeleton className="h-4 w-32 bg-zinc-800" />
        <Skeleton className="h-4 w-20 bg-zinc-800" />
        <Skeleton className="h-4 flex-1 bg-zinc-800" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-zinc-900/20 rounded">
          <Skeleton className="h-4 w-24 bg-zinc-800/80" />
          <Skeleton className="h-4 w-32 bg-zinc-800/80" />
          <Skeleton className="h-4 w-20 bg-zinc-800/80" />
          <Skeleton className="h-4 flex-1 bg-zinc-800/80" />
        </div>
      ))}
    </div>
  )
}
