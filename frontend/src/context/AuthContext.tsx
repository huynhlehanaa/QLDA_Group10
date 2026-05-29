/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  changePassword,
  getProfile,
  login,
  logoutAll,
  logoutCurrent,
  refreshToken,
  verifyOtp,
} from '../lib/api'
import { clearStoredSession, getStoredSession, setStoredSession } from '../lib/storage'
import type { SessionState, UserProfile, UserRole } from '../types/auth'

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000
const SESSION_WARNING_MS = 5 * 60 * 1000
const REFRESH_INTERVAL_MS = 50 * 60 * 1000

interface AuthContextValue {
  session: SessionState | null
  profile: UserProfile | null
  isAuthenticated: boolean
  sessionWarning: boolean
  isBootstrapping: boolean
  signIn: (email: string, password: string) => Promise<SessionState>
  signInWithOtp: (email: string, otp: string) => Promise<void>
  refreshSession: () => Promise<void>
  logoutThisDevice: () => Promise<void>
  logoutEverywhere: () => Promise<void>
  updateProfileLocally: (next: UserProfile) => void
  clearWarning: () => void
  forcePasswordChange: (oldPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwtPayload(token: string): { sub?: string; role?: UserRole } {
  try {
    const parts = token.split('.')
    if (parts.length < 2) {
      return {}
    }
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payload) as { sub?: string; role?: UserRole }
  } catch {
    return {}
  }
}

function clearSessionState(
  setSession: (value: SessionState | null) => void,
  setSessionWarning: (value: boolean) => void,
) {
  clearStoredSession()
  setSessionWarning(false)
  setSession(null)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sessionWarning, setSessionWarning] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    const boot = async () => {
      const stored = getStoredSession()
      if (!stored) {
        setIsBootstrapping(false)
        return
      }

      setSession(stored)
      try {
        const me = await getProfile()
        setProfile(me)
      } catch {
        clearSessionState(setSession, setSessionWarning)
      } finally {
        setIsBootstrapping(false)
      }
    }

    void boot()
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    const elapsed = Date.now() - session.loginAt
    const remain = SESSION_DURATION_MS - elapsed
    if (remain <= 0) {
      const expiredTimer = window.setTimeout(() => {
        clearSessionState(setSession, setSessionWarning)
        setProfile(null)
      }, 0)
      return () => clearTimeout(expiredTimer)
    }

    const warningDelay = Math.max(remain - SESSION_WARNING_MS, 0)
    const warningTimer = window.setTimeout(() => setSessionWarning(true), warningDelay)
    const logoutTimer = window.setTimeout(() => {
      clearSessionState(setSession, setSessionWarning)
      setProfile(null)
    }, remain)

    return () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      return
    }

    const interval = window.setInterval(async () => {
      try {
        const refreshed = await refreshToken(session.refreshToken)
        const next = {
          ...session,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
        }
        setSession(next)
        setStoredSession(next)
      } catch {
        clearSessionState(setSession, setSessionWarning)
        setProfile(null)
      }
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isAuthenticated: !!session,
      sessionWarning,
      isBootstrapping,
      signIn: async (email, password) => {
        const data = await login(email, password)
        const nextSession: SessionState = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          role: data.role,
          userId: data.user_id,
          fullName: data.full_name,
          avatarUrl: data.avatar_url ?? null,
          mustChangePassword: data.must_change_pw,
          loginAt: Date.now(),
        }
        setStoredSession(nextSession)
        setSession(nextSession)

        const me = await getProfile()
        setProfile(me)
        return nextSession
      },
      signInWithOtp: async (email, otp) => {
        const data = await verifyOtp(email, otp)
        const payload = decodeJwtPayload(data.access_token)
        const nextSession: SessionState = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          role: payload.role ?? 'staff',
          userId: payload.sub ?? '',
          fullName: email,
          avatarUrl: null,
          mustChangePassword: false,
          loginAt: Date.now(),
        }
        setStoredSession(nextSession)
        setSession(nextSession)

        const me = await getProfile()
        setProfile(me)
        setSession((current) => {
          if (!current) {
            return current
          }
          const enriched = {
            ...current,
            fullName: me.full_name,
            avatarUrl: me.avatar_url ?? null,
            mustChangePassword: me.must_change_pw,
          }
          setStoredSession(enriched)
          return enriched
        })
      },
      refreshSession: async () => {
        if (!session) {
          return
        }

        const refreshed = await refreshToken(session.refreshToken)
        const next = {
          ...session,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          loginAt: Date.now(),
        }
        setSession(next)
        setStoredSession(next)
        setSessionWarning(false)
      },
      logoutThisDevice: async () => {
        if (session?.refreshToken) {
          try {
            await logoutCurrent(session.refreshToken)
          } catch {
            // no-op
          }
        }
        clearSessionState(setSession, setSessionWarning)
        setProfile(null)
      },
      logoutEverywhere: async () => {
        if (session) {
          await logoutAll()
        }
        clearSessionState(setSession, setSessionWarning)
        setProfile(null)
      },
      updateProfileLocally: (next) => {
        setProfile(next)
        setSession((current) => {
          if (!current) {
            return null
          }

          const updated = {
            ...current,
            fullName: next.full_name,
            avatarUrl: next.avatar_url ?? null,
            mustChangePassword: next.must_change_pw,
          }
          setStoredSession(updated)
          return updated
        })
      },
      clearWarning: () => setSessionWarning(false),
      forcePasswordChange: async (oldPassword, newPassword) => {
        await changePassword(oldPassword, newPassword)
        setSession((current) => {
          if (!current) {
            return current
          }
          const next = { ...current, mustChangePassword: false }
          setStoredSession(next)
          return next
        })
      },
    }),
    [isBootstrapping, profile, session, sessionWarning],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
