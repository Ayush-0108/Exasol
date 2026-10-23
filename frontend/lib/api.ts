const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) {
    let errMessage = `HTTP error ${res.status}`
    try {
      const errJson = await res.json()
      errMessage = errJson.error || errJson.detail || errMessage
    } catch {
      // ignore
    }
    throw new Error(errMessage)
  }
  const json = await res.json()
  if (json.ok === false) throw new Error(json.error || 'API request failed')
  return (json.data !== undefined ? json.data : json) as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let errMessage = `HTTP error ${res.status}`
    try {
      const errJson = await res.json()
      errMessage = errJson.error || errJson.detail || errMessage
    } catch {
      // ignore
    }
    throw new Error(errMessage)
  }
  const json = await res.json()
  if (json.ok === false) throw new Error(json.error || 'API request failed')
  return (json.data !== undefined ? json.data : json) as T
}
