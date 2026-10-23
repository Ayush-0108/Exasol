export function formatEur(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === null || num === undefined || isNaN(num)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatEurCompact(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === null || num === undefined || isNaN(num)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
}

// Alias for explicit naming
export const formatInr = formatEur
export const formatInrCompact = formatEurCompact

export function formatPercent(value: number | string | null | undefined, isRatio = false): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (num === null || num === undefined || isNaN(num)) return '0.0%'
  const numeric = isRatio ? num * 100 : num
  return `${numeric.toFixed(1)}%`
}

export function formatRelativeTime(dateStringOrTimestamp: string | number | Date | null | undefined): string {
  if (!dateStringOrTimestamp) return 'just now'
  if (typeof window === 'undefined') return 'recently'
  const date = typeof dateStringOrTimestamp === 'object' ? dateStringOrTimestamp : new Date(dateStringOrTimestamp)
  if (isNaN(date.getTime())) return 'recently'
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 0 || diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDays = Math.floor(diffHour / 24)
  return `${diffDays}d ago`
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0'
  return new Intl.NumberFormat('en-US').format(value)
}
