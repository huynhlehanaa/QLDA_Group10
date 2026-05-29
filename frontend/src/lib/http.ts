import axios, { type InternalAxiosRequestConfig } from 'axios'
import { clearStoredSession, getStoredSession, setStoredSession } from './storage'

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000/api/v1'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const publicPaths = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/otp/send',
  '/auth/otp/verify',
])

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
})

http.interceptors.request.use((config) => {
  const session = getStoredSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryConfig | undefined
    const status = error.response?.status
    const requestUrl = (originalRequest?.url || '').toString()

    if (!originalRequest || originalRequest._retry || status !== 401) {
      return Promise.reject(error)
    }

    const normalizedUrl = requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`
    if (publicPaths.has(normalizedUrl)) {
      return Promise.reject(error)
    }

    const session = getStoredSession()
    if (!session?.refreshToken) {
      clearStoredSession()
      return Promise.reject(error)
    }

    originalRequest._retry = true
    try {
      const refreshed = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: session.refreshToken },
        { timeout: 12000 },
      )

      const nextSession = {
        ...session,
        accessToken: refreshed.data.access_token,
        refreshToken: refreshed.data.refresh_token,
      }
      setStoredSession(nextSession)

      originalRequest.headers.Authorization = `Bearer ${nextSession.accessToken}`
      return http(originalRequest)
    } catch (refreshErr) {
      clearStoredSession()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(refreshErr)
    }
  },
)
