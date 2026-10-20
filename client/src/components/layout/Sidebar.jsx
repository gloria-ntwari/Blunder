import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  Search,
  Calendar,
  Clock,
  Users,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);

  return (
    <aside className="border border-slate-200/60 w-64 bg-white flex flex-col justify-between shrink-0 h-full select-none z-20 font-['Outfit'] rounded-lg overflow-hidden">
      <div>
        {/* Navigation Links */}
        <div className="px-3 py-4 space-y-1">
          {/* Overview */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                isActive
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'text-[rgb(52,58,64)] hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                )}
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.overview', 'Dashboard')}</span>
              </>
            )}
          </NavLink>

          {/* Food Menu */}
          <NavLink
            to="/food-menu"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                isActive
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'text-[rgb(52,58,64)] hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                )}
                <UtensilsCrossed className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.foodMenu', 'Food menu')}</span>
              </>
            )}
          </NavLink>

          {/* Announcements */}
          <NavLink
            to="/announcements"
            className={({ isActive }) =>
              `relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                isActive
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'text-[rgb(52,58,64)] hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                )}
                <div className="flex items-center gap-3">
                  <Bell className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{t('nav.announcements', 'Announcements')}</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[11px] font-bold bg-[#f97316] text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Lost & Found */}
          <NavLink
            to="/lost-found"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                isActive
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'text-[rgb(52,58,64)]  hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                )}
                <Search className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.lostFound', 'Lost & found')}</span>
              </>
            )}
          </NavLink>

          {/* Calendar */}
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                isActive
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'text-[rgb(52,58,64)] hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                )}
                <Calendar className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.calendar', 'Calendar')}</span>
              </>
            )}
          </NavLink>

          {/* Deadlines */}
          <NavLink
            to="/deadlines"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                isActive
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'text-[rgb(52,58,64)] hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                )}
                <Clock className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.deadlines', 'Deadlines')}</span>
              </>
            )}
          </NavLink>

          {/* Admin Management */}
          {isAdmin && (
            <div className="pt-2">
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
                    isActive
                      ? 'bg-[#1a2b49] text-white shadow-xs'
                      : 'text-[rgb(52,58,64)] hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
                    )}
                    <Users className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>User Management</span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* Footer Area: Settings & Sign Out (Matching Image 1) */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-colors ${
              isActive
                ? 'bg-slate-100 text-[#0f172a]'
                : 'text-[rgb(52,58,64)] hover:bg-slate-50'
            }`
          }
        >
          <Settings className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Settings</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] text-[rgb(52,58,64)] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
