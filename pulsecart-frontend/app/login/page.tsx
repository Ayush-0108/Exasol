"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Clear any existing session cookie when visiting login page so sign-in is always required
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.cookie = "pulsecart_auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Set auth cookie for 1 day
    const oneDayInSeconds = 60 * 60 * 24
    document.cookie = `pulsecart_auth=true; path=/; max-age=${oneDayInSeconds}; SameSite=Lax`

    // Small delay for smooth transition and screen reader notice
    setTimeout(() => {
      router.push("/dashboard")
    }, 400)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      {/* Left panel: Context / Brand */}
      <div className="order-2 md:order-1 flex-1 bg-zinc-950 border-r border-zinc-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors mb-12 focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 -mx-1"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to landing
          </Link>

          <div className="max-w-md">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Operational Intelligence
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50 mt-3">
              Pulse<span className="text-emerald-400">Cart</span>
            </h1>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed font-mono">
              Real-time dark store operations console. Catch promo fraud, predict 6-hour stockouts, triage customer churn with Groq LLM, and protect return margins on Exasol.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-900 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
            <span className="text-zinc-300">Exasol In-Memory Columnar Database</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Connected to 5 streaming quick-commerce data sources.
          </p>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="order-1 md:order-2 flex-1 bg-zinc-900/60 p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Operator sign in
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Authenticate operator console session
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="operator-email" className="text-xs font-mono text-zinc-300">
                Operator email
              </Label>
              <Input
                id="operator-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500 font-mono text-xs"
                placeholder="operator@pulsecart.io"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="operator-password" className="text-xs font-mono text-zinc-300">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="operator-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500 font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium text-xs py-2.5 transition-colors focus-visible:ring-emerald-400"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
                  Entering operator console…
                </>
              ) : (
                "Sign in to console"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
