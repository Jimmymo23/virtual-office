import { create } from 'zustand'
import { authApi } from '../api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('vo_token'),
  loading: true,
  error: null,

  init: async () => {
    const token = localStorage.getItem('vo_token')
    if (!token) return set({ loading: false })
    try {
      const res = await authApi.me()
      set({ user: res.data.user, loading: false })
    } catch {
      localStorage.removeItem('vo_token')
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (username, password) => {
    set({ error: null })
    try {
      const res = await authApi.login({ username, password })
      const { token, user } = res.data
      localStorage.setItem('vo_token', token)
      set({ token, user, error: null })
      return { success: true }
    } catch (err) {
      const error = err.response?.data?.error || 'Login failed'
      set({ error })
      return { success: false, error }
    }
  },

  register: async (data) => {
    set({ error: null })
    try {
      const res = await authApi.register(data)
      const { token, user } = res.data
      localStorage.setItem('vo_token', token)
      set({ token, user, error: null })
      return { success: true }
    } catch (err) {
      const error = err.response?.data?.error || 'Registration failed'
      set({ error })
      return { success: false, error }
    }
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('vo_token')
    set({ user: null, token: null })
  },

  setUser: (user) => set({ user }),
}))
