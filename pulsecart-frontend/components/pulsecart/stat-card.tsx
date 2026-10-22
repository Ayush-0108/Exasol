"use client"

import React, { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  trend?: {
    value: string
    isPositive?: boolean
    neutral?: boolean
  }
  accentColor?: string
  numericValue?: number
  prefix?: string
  suffix?: string
  className?: string
  isHero?: boolean
}

export function StatCard({
  label,
  value,
  sublabel,
  trend,
  accentColor,
  numericValue,
  prefix = "",
  suffix = "",
  className,
  isHero = false,
}: StatCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [displayNumber, setDisplayNumber] = useState<number | null>(
    typeof numericValue === "number" && !prefersReducedMotion ? 0 : null
  )

  useEffect(() => {
    if (typeof numericValue !== "number" || prefersReducedMotion) {
      setDisplayNumber(null)
      return
    }

    const duration = 800
    const steps = 24
    const stepDuration = duration / steps
    const stepIncrement = numericValue / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayNumber(numericValue)
        clearInterval(timer)
      } else {
        setDisplayNumber(Math.round(stepIncrement * currentStep * 100) / 100)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [numericValue, prefersReducedMotion])

  const formattedDisplay =
    displayNumber !== null
      ? `${prefix}${displayNumber.toLocaleString()}${suffix}`
      : value

  return (
    <div
      role="region"
      aria-label={`${label}: ${formattedDisplay}`}
      className={cn(
        "flex flex-col justify-between p-5 rounded-lg transition-colors",
        isHero
          ? "bg-zinc-900/90 border-l-2 border-emerald-500"
          : "bg-zinc-900/40 hover:bg-zinc-900/70",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider font-mono text-zinc-400">
          {label}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-mono px-1.5 py-0.5 rounded",
              trend.neutral
                ? "text-zinc-400 bg-zinc-800"
                : trend.isPositive
                ? "text-emerald-400 bg-emerald-950/60"
                : "text-rose-400 bg-rose-950/60"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="my-1">
        <div
          className={cn(
            "font-mono font-semibold tracking-tight text-zinc-100",
            isHero ? "text-4xl md:text-5xl text-emerald-400" : "text-2xl md:text-3xl"
          )}
          style={accentColor ? { color: accentColor } : undefined}
        >
          {formattedDisplay}
        </div>
      </div>

      {sublabel && (
        <p className="text-xs text-zinc-400 mt-2 font-mono leading-relaxed">
          {sublabel}
        </p>
      )}
    </div>
  )
}
