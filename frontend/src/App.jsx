import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { HistoryProvider } from './context/HistoryContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import PricingPage from './pages/PricingPage'
import FeedbackPublicPage from './pages/FeedbackPublicPage'
import PaymentStatusPage from './pages/PaymentStatusPage'
import PaymentCancelPage from './pages/PaymentCancelPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage'
import AccessDeniedPage from './pages/AccessDeniedPage'

function AdminOnlyRoute({ children }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Layout>
        <div className="rounded-3xl border border-surface-border bg-surface-raised/70 p-8 text-center text-slate-300">
          Checking permissions...
        </div>
      </Layout>
    )
  }

  if (!isAdmin) {
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
        <AuthProvider>
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
                path="/feedbacks"
                element={
                  <Layout>
                    <FeedbackPublicPage />
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
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
)
}

export default App
