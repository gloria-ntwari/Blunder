import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import { useNotificationStore } from './store/notificationStore.js';
import { enablePushNotifications } from './services/pushNotifications.js';
import { SocketProvider } from './context/SocketContext.jsx';
import './i18n/index.js';

// Layouts
import MainLayout from './components/layout/MainLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import OtpVerifyPage from './pages/auth/OtpVerifyPage.jsx';
import SetPasswordPage from './pages/auth/SetPasswordPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';

// App pages
import OverviewPage from './pages/dashboard/OverviewPage.jsx';
import FoodMenuPage from './pages/food/FoodMenuPage.jsx';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage.jsx';
import LostFoundPage from './pages/lostandfound/LostFoundPage.jsx';
import CalendarPage from './pages/calendar/CalendarPage.jsx';
import DeadlinesPage from './pages/deadlines/DeadlinesPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';

function AppInner() {
  const { initialize, isLoading, isAuthenticated, user } = useAuthStore();
  const { fetchNotifications } = useNotificationStore();

  useEffect(() => { initialize(); }, []);
  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    enablePushNotifications().catch((err) => console.warn('[Web Push]', err.message));
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafb]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 border-3 border-[#2383c9] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6b7280] font-medium">Loading B.Lunder...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/verify-otp" element={<OtpVerifyPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/food-menu" element={<FoodMenuPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/lost-found" element={<LostFoundPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/deadlines" element={<DeadlinesPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin-only */}
          <Route
            path="/admin/users"
            element={
              ['super_admin', 'student_leader'].includes(user?.role)
                ? <AdminUsersPage />
                : <Navigate to="/dashboard" replace />
            }
          />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Toaster position="top-right" />
        <AppInner />
      </SocketProvider>
    </BrowserRouter>
  );
}
