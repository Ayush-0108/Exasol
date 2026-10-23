import { useState, useEffect, useCallback, useRef } from 'react'

export interface UsePollingResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  isPaused: boolean
  togglePause: () => void
  lastUpdated: Date | null
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const isPausedRef = useRef(isPaused)
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const result = await fetcher()
      setData(result)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (intervalMs <= 0) return

    const id = setInterval(() => {
      if (!isPausedRef.current) {
        refresh()
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return { data, loading, error, refresh, isPaused, togglePause, lastUpdated }
}
