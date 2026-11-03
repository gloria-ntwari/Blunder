import { create } from 'zustand';
import api from '../services/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    // Migrate away from persistent tokens so a prior browser session cannot silently log in.
    localStorage.removeItem('blunder_access_token');
    localStorage.removeItem('blunder_refresh_token');
    const token = sessionStorage.getItem('blunder_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await api.get('/users/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('blunder_access_token', data.accessToken);
    sessionStorage.setItem('blunder_refresh_token', data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
    return data.user;
  },

  logout: async () => {
    const refreshToken = sessionStorage.getItem('blunder_refresh_token');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    sessionStorage.removeItem('blunder_access_token');
    sessionStorage.removeItem('blunder_refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));
