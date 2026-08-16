import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { HistoryProvider } from './context/HistoryContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import PricingPage from './pages/PricingPage'
import PaymentStatusPage from './pages/PaymentStatusPage'
import PaymentCancelPage from './pages/PaymentCancelPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage'
import AccessDeniedPage from './pages/AccessDeniedPage'
import { authApi } from './utils/api'

const ThemeContext = createContext(null)
const THEME_STORAGE_KEY = 'theme-preference'

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark'
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

function AdminOnlyRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let isMounted = true

    const checkRole = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        if (isMounted) setStatus('denied')
        return
      }

      try {
        const response = await authApi.me()
        const user = response?.user || response?.data?.user || response?.data || response
        const role = String(user?.role || user?.role_name || user?.roleName || '').trim().toLowerCase()
        const isAdmin = role === 'admin' || role === 'administrator' || role.includes('admin')
        if (isMounted) setStatus(isAdmin ? 'allowed' : 'denied')
      } catch {
        if (isMounted) setStatus('denied')
      }
    }

    checkRole()
    return () => {
      isMounted = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <Layout>
        <div className="rounded-3xl border border-surface-border bg-surface-raised/70 p-8 text-center text-slate-300">
          Checking permissions...
        </div>
      </Layout>
    )
  }

  if (status === 'denied') {
    return (
      <Layout>
        <AccessDeniedPage />
      </Layout>
    )
  }

  return children
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <HistoryProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Layout>
                    <HomePage />
                  </Layout>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <AdminOnlyRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <Layout>
                    <ProfilePage />
                  </Layout>
                }
              />
              <Route
                path="/pricing"
                element={
                  <Layout>
                    <PricingPage />
                  </Layout>
                }
              />
              <Route
                path="/payments/status"
                element={
                  <Layout>
                    <PaymentStatusPage />
                  </Layout>
                }
              />
              <Route
                path="/payments/cancel"
                element={
                  <Layout>
                    <PaymentCancelPage />
                  </Layout>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/reset-password/confirm" element={<ResetPasswordConfirmPage />} />
            </Routes>
          </BrowserRouter>
        </HistoryProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
