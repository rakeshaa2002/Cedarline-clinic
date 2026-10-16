import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, toApiError } from '@/services/api'

/**
 * Minimal data-fetching hook with an in-memory cache.
 *
 * - `key` identifies the request; identical keys share one in-flight promise and a cached result,
 *   so moving between pages that need the same doctors/services list is instant.
 * - Pass `null` as the key to skip fetching (e.g. until a dependent value is chosen).
 * - While a new key loads, the previous data stays visible (with `loading: true`) to avoid flicker.
 */
const cache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
}

interface Result<T> {
  key: string | null
  version: number
  data: T | undefined
  error: ApiError | null
}

export function useApi<T>(key: string | null, fetcher: () => Promise<T>, options: { cache?: boolean } = {}) {
  const useCache = options.cache ?? true
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result<T>>({ key: null, version: -1, data: undefined, error: null })
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher // always call the latest closure
  })

  const servedFromCache = key !== null && useCache && version === 0 && cache.has(key)

  useEffect(() => {
    if (key === null || servedFromCache) return
    let cancelled = false
    let promise = inflight.get(key) as Promise<T> | undefined
    if (!promise) {
      promise = fetcherRef.current()
      inflight.set(key, promise)
      promise.finally(() => inflight.delete(key)).catch(() => {})
    }
    promise
      .then((data) => {
        if (useCache) cache.set(key, data)
        if (!cancelled) setResult({ key, version, data, error: null })
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, version, data: undefined, error: toApiError(err) })
      })
    return () => {
      cancelled = true
    }
  }, [key, version, useCache, servedFromCache])

  const reload = useCallback(() => {
    if (key) cache.delete(key)
    setVersion((v) => v + 1)
  }, [key])

  // Derive what to show from whether the stored result belongs to the current request.
  if (key === null) return { data: undefined, error: null, loading: false, reload }
  if (servedFromCache) return { data: cache.get(key) as T, error: null, loading: false, reload }
  const settled = result.key === key && result.version === version
  return {
    data: result.data, // previous data stays visible while the next request loads
    error: settled ? result.error : null,
    loading: !settled,
    reload,
  }
}
