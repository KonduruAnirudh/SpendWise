import { BrowserRouter } from 'react-router-dom'
import Auth0ProviderWrapper from './Auth/Auth0Provider'
import { AuthGate } from './Auth/AuthGate'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Auth0ProviderWrapper>
          <AuthProvider>
            <ToastProvider>
              <AuthGate>
                <AppRoutes />
              </AuthGate>
            </ToastProvider>
          </AuthProvider>
        </Auth0ProviderWrapper>
      </BrowserRouter>
    </ThemeProvider>
  )
}
