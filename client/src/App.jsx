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

// App pages
import OverviewPage from './pages/dashboard/OverviewPage.jsx';
import FoodMenuPage from './pages/food/FoodMenuPage.jsx';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage.jsx';
import LostFoundPage from './pages/lostandfound/LostFoundPage.jsx';
import CalendarPage from './pages/calendar/CalendarPage.jsx';
import DeadlinesPage from './pages/deadlines/DeadlinesPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import GuildsPage from './pages/guilds/GuildsPage.jsx';

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
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafb] overflow-hidden">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-[5px] border-[#1a2b49]/10 border-t-[#1a2b49] animate-spin" />
            <span className="absolute inset-3 rounded-full border-[4px] border-[#2383c9]/15 border-b-[#1a2b49] animate-[spin_1.8s_linear_infinite_reverse]" />
            <span className="absolute inset-7 rounded-full bg-[#e4f2fe] animate-pulse" />
            <img src="/assets/louisenlund_logo.png" alt="" className="relative z-10 w-12 h-12 object-contain rounded-full" />
          </div>
          <span className="text-sm text-[#1a2b49] font-semibold tracking-wide">Loading B- Lunder...</span>
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
          <Route
            path="/guilds"
            element={['student', 'student_leader', 'sv_committee', 'committee', 'mentor', 'super_admin'].includes(user?.role)
              ? <GuildsPage /> : <Navigate to="/dashboard" replace />}
          />

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
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 10000 }}
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              opacity: 1,
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
            },
          }}
        />
        <AppInner />
      </SocketProvider>
    </BrowserRouter>
  );
}
