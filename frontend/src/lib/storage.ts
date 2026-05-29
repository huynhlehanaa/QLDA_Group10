import type { SessionState } from '../types/auth'

const SESSION_KEY = 'kpi.staff.session'

export function getStoredSession(): SessionState | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as SessionState
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function setStoredSession(session: SessionState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
