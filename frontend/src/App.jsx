import { BrowserRouter } from 'react-router-dom'
import { AuthGate } from './Auth/AuthGate'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AuthGate>
              <AppRoutes />
            </AuthGate>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}