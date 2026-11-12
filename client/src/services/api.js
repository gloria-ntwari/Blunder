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
let refreshTimer = null;

const scheduleTokenRefresh = (token) => {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const refreshIn = Math.max(1000, payload.exp * 1000 - Date.now() - 60_000);
    refreshTimer = window.setTimeout(() => {
      const refreshToken = localStorage.getItem('blunder_refresh_token');
      if (!refreshToken) return;
      axios.post(`${apiOrigin}/api/auth/refresh`, { refreshToken })
        .then(({ data }) => {
          localStorage.setItem('blunder_access_token', data.accessToken);
          localStorage.setItem('blunder_refresh_token', data.refreshToken);
          scheduleTokenRefresh(data.accessToken);
        })
        .catch(() => {
          localStorage.removeItem('blunder_access_token');
          localStorage.removeItem('blunder_refresh_token');
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        });
    }, refreshIn);
  } catch {
    // The normal request path will handle invalid access tokens.
  }
};

const refreshSession = async () => {
  const refreshToken = localStorage.getItem('blunder_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${apiOrigin}/api/auth/refresh`, { refreshToken });
  localStorage.setItem('blunder_access_token', data.accessToken);
  localStorage.setItem('blunder_refresh_token', data.refreshToken);
  scheduleTokenRefresh(data.accessToken);
  return data.accessToken;
};

// Refresh immediately at startup if the stored access token has expired.
const currentToken = localStorage.getItem('blunder_access_token');
if (currentToken) {
  try {
    const payload = JSON.parse(atob(currentToken.split('.')[1]));
    if (payload.exp * 1000 <= Date.now()) refreshSession().catch(() => {});
    else scheduleTokenRefresh(currentToken);
  } catch {
    // Malformed tokens will be cleared by the normal 401 recovery path.
  }
}

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
        const newAccessToken = await refreshSession();

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('blunder_access_token');
        localStorage.removeItem('blunder_refresh_token');
        if (refreshTimer) window.clearTimeout(refreshTimer);
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
