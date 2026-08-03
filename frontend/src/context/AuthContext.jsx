import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../utils/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || '')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('accessToken')
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authApi.me()
        // Response format from GET /auth/me: { data: { user: {...}, current_tier: "free", ... } } or directly object
        const userData = response?.data?.user || response?.user || response?.data || response
        setUser(userData)
      } catch (err) {
        console.error('Failed to fetch user profile:', err)
        // If token is invalid or expired, clear it
        if (err?.status === 401 || err?.status === 403) {
          localStorage.removeItem('accessToken')
          setToken('')
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [token])

  const login = (newToken, userData) => {
    localStorage.setItem('accessToken', newToken)
    setToken(newToken)
    if (userData) {
      setUser(userData)
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    setToken('')
    setUser(null)
  }

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : updatedFields))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
