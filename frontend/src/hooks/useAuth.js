import { useAuth } from '../context/AuthContext'

export function useAuthState() {
  return useAuth()
}
