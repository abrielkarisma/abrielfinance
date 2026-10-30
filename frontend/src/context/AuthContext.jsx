import { createContext, useContext, useEffect, useState } from 'react'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    const onLogout = () => setProfile(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  const login = (d) => {
    localStorage.setItem('access_token', d.access_token)
    localStorage.setItem('refresh_token', d.refresh_token)
    localStorage.setItem('user', JSON.stringify(d.user))
    setProfile(d.user)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setProfile(null)
  }

  return <AuthCtx.Provider value={{ profile, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
