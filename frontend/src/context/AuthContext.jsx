import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, clearApiCache, subscriptionsApi } from '../utils/api'

const AuthContext = createContext(null)

function normalizePlanValue(value) {
  if (!value && value !== 0) return 'Free'
  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return 'Free'
  if (normalized.includes('max')) return 'Max'
  if (normalized.includes('pro')) return 'Pro'
  if (normalized.includes('free')) return 'Free'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tier, setTier] = useState('free')
  const [maxFolders, setMaxFolders] = useState(0)
  const [subscriptionDetails, setSubscriptionDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async (force = true) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setTier('free')
      setMaxFolders(0)
      setSubscriptionDetails(null)
      setIsLoading(false)
      return
    }

    try {
      const [meRes, subRes] = await Promise.all([
        authApi.me(force).catch((err) => {
          if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('rememberMe')
          }
          return null
        }),
        subscriptionsApi.me(force).catch(() => null),
      ])

      const mePayload = meRes?.data || meRes || {}
      const currentUser = mePayload?.user || mePayload || null

      if (!currentUser || !localStorage.getItem('accessToken')) {
        setUser(null)
        setIsAuthenticated(false)
        setIsAdmin(false)
        setTier('free')
        setMaxFolders(0)
        setSubscriptionDetails(null)
        setIsLoading(false)
        return
      }

      const rawRole = String(currentUser?.role || currentUser?.role_name || currentUser?.roleName || '').trim().toLowerCase()
      const resolvedIsAdmin = rawRole === 'admin' || rawRole === 'administrator' || rawRole.includes('admin')

      const subData = subRes?.data || subRes || {}
      const planObj = subData?.plan || subData?.subscription?.plan || subData?.subscription || {}

      const rawTier =
        subData?.tier ||
        subData?.tier_name ||
        planObj?.tier ||
        planObj?.name ||
        currentUser?.current_tier ||
        currentUser?.currentTier ||
        currentUser?.tier ||
        'free'

      const normalizedTier = String(rawTier).toLowerCase()

      let resolvedFolders =
        subData?.max_folders ??
        subData?.maxFolders ??
        planObj?.max_folders ??
        planObj?.maxFolders ??
        (normalizedTier.includes('max') ? 50 : normalizedTier.includes('pro') ? 10 : 0)

      setUser({
        ...currentUser,
        displayName: currentUser?.full_name || currentUser?.fullName || currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
        email: currentUser?.email || '',
        role: currentUser?.role || 'Member',
        plan: normalizePlanValue(rawTier),
      })
      setIsAuthenticated(true)
      setIsAdmin(resolvedIsAdmin)
      setTier(normalizedTier)
      setMaxFolders(Number(resolvedFolders) || 0)
      setSubscriptionDetails(subData)
    } catch {
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setTier('free')
      setMaxFolders(0)
      setSubscriptionDetails(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser(false)

    const handleAuthUpdate = () => {
      refreshUser(true)
    }

    window.addEventListener('auth:updated', handleAuthUpdate)
    return () => window.removeEventListener('auth:updated', handleAuthUpdate)
  }, [])

  const login = async (token, remember = false) => {
    if (token) {
      localStorage.setItem('accessToken', token)
      if (remember) {
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberMe')
      }
    }
    clearApiCache()
    await refreshUser(true)
    window.dispatchEvent(new Event('auth:updated'))
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('Logout API error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('rememberMe')
      clearApiCache()
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setTier('free')
      setMaxFolders(0)
      setSubscriptionDetails(null)
      window.dispatchEvent(new Event('auth:updated'))
    }
  }

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    tier,
    maxFolders,
    subscriptionDetails,
    isLoading,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
