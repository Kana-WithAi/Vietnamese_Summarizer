import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { HistoryProvider } from './context/HistoryContext'
import { AuthProvider } from './context/AuthContext'
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

function App() {
  return (
    <AuthProvider>
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
                  <Layout>
                    <DashboardPage />
                  </Layout>
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
    </AuthProvider>
  )
}

export default App
