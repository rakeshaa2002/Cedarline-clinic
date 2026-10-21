import axios, { AxiosError } from 'axios'

/**
 * Single Axios instance for the whole app.
 * - In development VITE_API_URL is empty and Vite proxies /api to FastAPI.
 * - In production it points at the deployed API origin (CORS is restricted server-side).
 * No secrets ever live in the frontend: AI keys stay on the server.
 */
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  timeout: 30_000,
})

/**
 * Images uploaded through the admin panel are served by the API ("/api/v1/media/12"). In production
 * the API lives on its own origin, so those paths get its prefix; every other URL passes through.
 */
export function assetUrl(url: string): string
export function assetUrl(url: string | null | undefined): string | undefined
export function assetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('/api/') ? `${import.meta.env.VITE_API_URL ?? ''}${url}` : url
}

const TOKEN_KEY = 'cedarline.admin.token'

export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token: string) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable (private mode): session lasts until refresh */
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && config.url?.startsWith('/admin')) config.headers.Authorization = `Bearer ${token}`
  if (token && config.url === '/auth/me') config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Normalised error shape used by every component. */
export class ApiError extends Error {
  status: number
  code: string
  fieldErrors: Record<string, string>

  constructor(message: string, status = 0, code = 'network_error', fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

interface ErrorBody {
  error?: { code: string; message: string; details?: { field: string; message: string }[] | null }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED') return new ApiError('The request timed out. Please try again.', 0, 'timeout')
    const body = err.response?.data as ErrorBody | undefined
    if (err.response && body?.error) {
      const fields: Record<string, string> = {}
      for (const d of body.error.details ?? []) fields[d.field] = d.message
      return new ApiError(body.error.message, err.response.status, body.error.code, fields)
    }
    if (err.response) return new ApiError('Something went wrong. Please try again.', err.response.status, 'http_error')
    return new ApiError('We could not reach the server. Check your connection and try again.')
  }
  return new ApiError('Something unexpected happened.', 0, 'unknown')
}

/** Notify the app when an admin session expires so it can redirect to login. */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error instanceof AxiosError && error.response?.status === 401 && error.config?.url?.startsWith('/admin')) {
      tokenStore.clear()
      window.dispatchEvent(new Event('auth:expired'))
    }
    return Promise.reject(toApiError(error))
  },
)
