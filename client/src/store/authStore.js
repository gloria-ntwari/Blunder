import { create } from 'zustand';
import api from '../services/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    // Migrate existing tab-only sessions so sign-in survives browser restarts.
    for (const key of ['blunder_access_token', 'blunder_refresh_token']) {
      const legacyToken = sessionStorage.getItem(key);
      if (legacyToken && !localStorage.getItem(key)) localStorage.setItem(key, legacyToken);
      sessionStorage.removeItem(key);
    }
    let token = localStorage.getItem('blunder_access_token');
    const refreshToken = localStorage.getItem('blunder_refresh_token');
    if (!token && !refreshToken) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      if (refreshToken) {
        try {
          const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
          if (!payload || payload.exp * 1000 <= Date.now()) {
            const { data: refreshed } = await api.post('/auth/refresh', { refreshToken });
            localStorage.setItem('blunder_access_token', refreshed.accessToken);
            localStorage.setItem('blunder_refresh_token', refreshed.refreshToken);
            token = refreshed.accessToken;
          }
        } catch {
          const { data: refreshed } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('blunder_access_token', refreshed.accessToken);
          localStorage.setItem('blunder_refresh_token', refreshed.refreshToken);
          token = refreshed.accessToken;
        }
      }
      const { data } = await api.get('/users/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('blunder_access_token');
      localStorage.removeItem('blunder_refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('blunder_access_token', data.accessToken);
    localStorage.setItem('blunder_refresh_token', data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
    return data.user;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('blunder_refresh_token');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    localStorage.removeItem('blunder_access_token');
    localStorage.removeItem('blunder_refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));
