"use client"

import React, { useEffect, useState } from "react"
import { formatRelativeTime } from "@/lib/format"

export interface RelativeTimeProps extends React.HTMLAttributes<HTMLSpanElement> {
  date: string | number | Date | null | undefined
  fallback?: string
}

export function RelativeTime({
  date,
  fallback = "recently",
  className,
  ...props
}: RelativeTimeProps) {
  const [text, setText] = useState<string>(fallback)

  useEffect(() => {
    if (!date) return
    const update = () => setText(formatRelativeTime(date))
    update()
    const timer = setInterval(update, 30000)
    return () => clearInterval(timer)
  }, [date])

  return (
    <span className={className} suppressHydrationWarning {...props}>
      {text}
    </span>
  )
}
