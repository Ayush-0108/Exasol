"use client"

import React, { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ShieldAlert, ShieldCheck, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiPost } from "@/lib/api"
import { CheckoutRequest, CheckoutResult } from "@/lib/types"

interface FraudTesterProps {
  onEvaluationComplete?: () => void
}

export function FraudTester({ onEvaluationComplete }: FraudTesterProps) {
  const prefersReducedMotion = useReducedMotion()
  const [email, setEmail] = useState("aarav.sharma+spam@gmail.com")
  const [address, setAddress] = useState(
    "Flat 402, Sunshine Apartments, 5th Block, Koramangala, Bengaluru 560095"
  )
  const [promoCode, setPromoCode] = useState("$15OFF")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTestCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await apiPost<CheckoutResult>("/api/v1/checkout", {
        email,
        address,
        promo_code: promoCode,
      })
      setResult(res)
      if (onEvaluationComplete) onEvaluationComplete()
    } catch (err) {
      setError((err as Error).message || "Checkout evaluation failed")
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (presetEmail: string, presetAddress: string, presetPromo: string) => {
    setEmail(presetEmail)
    setAddress(presetAddress)
    setPromoCode(presetPromo)
    setResult(null)
    setError(null)
  }

  return (
    <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Promo abuse tester</h3>
          <p className="text-xs font-mono text-zinc-400">
            Real-time entity resolution &amp; fuzzy address comparison against Exasol Golden IDs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              applyPreset(
                "aarav.sharma+spam@gmail.com",
                "Flat 402, Sunshine Apartments, 5th Block, Koramangala, Bengaluru 560095",
                "$15OFF"
              )
            }
            className="text-[11px] font-mono h-7 px-2 border-zinc-800 text-violet-300 hover:bg-violet-950/30"
          >
            <Sparkles className="size-3 mr-1 text-violet-400" aria-hidden="true" />
            Abuse sample
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              applyPreset(
                "kavita.sharma@example.in",
                "Flat 101, Brigade Gateway, Malleshwaram, Bengaluru 560055",
                "WELCOME5"
              )
            }
            className="text-[11px] font-mono h-7 px-2 text-zinc-400 hover:text-zinc-200"
          >
            Legit sample
          </Button>
        </div>
      </div>

      <form onSubmit={handleTestCheckout} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-email" className="text-xs font-mono text-zinc-300">
              Checkout Email
            </Label>
            <Input
              id="checkout-email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-xs focus-visible:ring-violet-500"
              placeholder="e.g. user+sub@domain.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-promo" className="text-xs font-mono text-zinc-300">
              Promo Code
            </Label>
            <Select value={promoCode} onValueChange={(val) => val && setPromoCode(val)}>
              <SelectTrigger
                id="checkout-promo"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-xs focus:ring-violet-500"
              >
                <SelectValue placeholder="Select promo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-xs">
                <SelectItem value="$15OFF">$15OFF (First order credit)</SelectItem>
                <SelectItem value="WELCOME20">WELCOME20 (20% Dark store welcome)</SelectItem>
                <SelectItem value="FREEDELIVERY">FREEDELIVERY (Zero fee voucher)</SelectItem>
                <SelectItem value="FLASH50">FLASH50 (High discount promo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="checkout-address" className="text-xs font-mono text-zinc-300">
            Delivery Address (Street, Apt, City, Zip)
          </Label>
          <Input
            id="checkout-address"
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-xs focus-visible:ring-violet-500"
            placeholder="e.g. Apt 4B, 742 Evergreen Terrace..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] font-mono text-zinc-400">
            Evaluates similarity threshold &gt; 0.85 against customer address history
          </span>
          <Button
            type="submit"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 text-zinc-50 font-medium text-xs px-5 focus-visible:ring-violet-400"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 mr-2 animate-spin" aria-hidden="true" />
                Evaluating…
              </>
            ) : (
              "Test checkout"
            )}
          </Button>
        </div>
      </form>

      {/* Result Panel */}
      {error && (
        <div className="mt-5 p-4 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs font-mono">
          {error}
        </div>
      )}

      {result && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-5 p-5 rounded-lg border font-mono ${
            result.blocked
              ? "bg-rose-950/30 border-rose-800/80 text-rose-200"
              : "bg-emerald-950/30 border-emerald-800/80 text-emerald-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.blocked ? (
              <ShieldAlert className="size-6 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-6 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-semibold tracking-wide">
                  {result.blocked ? "BLOCKED — PROMO ABUSE PREVENTED" : "ALLOWED — VERIFIED ELIGIBLE"}
                </h4>
                {result.match_score !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${
                      result.blocked
                        ? "bg-rose-950 border-rose-800 text-rose-300"
                        : "bg-emerald-950 border-emerald-800 text-emerald-300"
                    }`}
                  >
                    Confidence: {(Number(result.match_score ?? 0) * 100).toFixed(1)}%
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed opacity-90">
                {result.reason ||
                  (result.blocked
                    ? "Burner email alias or physical address matches an existing Golden Customer record that previously claimed this new-user voucher."
                    : "No abusive identity patterns or address collisions detected. Order permitted.")}
              </p>

              {result.golden_id && (
                <div className="text-[11px] text-zinc-400 pt-1">
                  Matched Golden Record: <span className="text-zinc-200 font-semibold">{result.golden_id}</span> via{" "}
                  <span className="text-zinc-200">{result.match_method || "fuzzy_address_match"}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
