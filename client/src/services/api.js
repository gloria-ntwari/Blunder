import axios from 'axios';

// In production the API is often deployed separately from the Vite frontend.
// Falling back to localhost makes the built browser app call the visitor's
// computer instead of the deployed API.
const apiOrigin = (import.meta.env.VITE_API_URL || window.location.origin)
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

const api = axios.create({
  baseURL: `${apiOrigin}/api`,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('blunder_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('blunder_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${apiOrigin}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('blunder_access_token', data.accessToken);
        localStorage.setItem('blunder_refresh_token', data.refreshToken);

        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('blunder_access_token');
        const authPaths = ['/login', '/register', '/verify-otp', '/set-password', '/forgot-password'];
        if (!authPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
