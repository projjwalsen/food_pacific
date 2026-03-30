import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authCredentials, demoUsers } from '../data/dummyData'
import { loadSession, saveSession } from '../utils/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') return null
    const session = loadSession()
    return session?.user ?? null
  })

  useEffect(() => {
    if (currentUser) {
      saveSession({ user: currentUser })
    } else {
      saveSession(null)
    }
  }, [currentUser])

  function login(email, password) {
    const cred = authCredentials.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
    )

    if (!cred) {
      return { success: false, message: 'Invalid email or password.' }
    }

    const user = demoUsers.find((u) => u.id === cred.userId) ?? {
      id: cred.userId,
      name: cred.email,
      email: cred.email,
      role: cred.role,
    }

    setCurrentUser(user)
    return { success: true, user }
  }

  function logout() {
    setCurrentUser(null)
  }

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      logout,
    }),
    [currentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
