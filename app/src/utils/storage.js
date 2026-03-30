const STORAGE_KEY = 'foods-pacific-erp-state'
const SESSION_KEY = 'foods-pacific-erp-session'

export function loadErpState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveErpState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY)
    } else {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
  } catch {
    /* ignore */
  }
}

