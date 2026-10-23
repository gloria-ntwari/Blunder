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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const role = user?.role;

  // Role groups
  const canManageUsers = ['super_admin', 'student_leader'].includes(role);
  const showUserMgmt   = canManageUsers;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = (isActive) =>
    `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
      isActive ? 'bg-[#1a2b49] text-white shadow-xs' : 'text-[rgb(52,58,64)] hover:bg-slate-50'
    }`;

  const indicator = (
    <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm" />
  );

  return (
    <aside className="border border-slate-200/60 w-64 bg-white flex flex-col justify-between shrink-0 h-full select-none z-20 font-['Outfit'] rounded-lg overflow-hidden">
      <div>
        <div className="px-3 py-4 space-y-1">

          {/* Overview — everyone */}
          <NavLink to="/dashboard" className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.overview', 'Dashboard')}</span>
              </>
            )}
          </NavLink>

          {/* Food Menu — hidden for nobody (view is open to all, admin actions gated in page) */}
          {role !== 'teacher' && (
            <NavLink to="/food-menu" className={({ isActive }) => navLinkClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && indicator}
                  <UtensilsCrossed className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{t('nav.foodMenu', 'Food menu')}</span>
                </>
              )}
            </NavLink>
          )}

          {/* Announcements — everyone */}
          <NavLink to="/announcements" className={({ isActive }) =>
            `relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
              isActive ? 'bg-[#1a2b49] text-white shadow-xs' : 'text-[rgb(52,58,64)] hover:bg-slate-50'
            }`
          }>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <div className="flex items-center gap-3">
                  <Bell className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{t('nav.announcements', 'Announcements')}</span>
                </div>
                {unreadCount > 0 && (
                  <span className="flex items-center justify-center font-bold bg-[#f97316] text-white rounded-full h-4 w-4 text-[11px]">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Lost & Found — everyone */}
          <NavLink to="/lost-found" className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Search className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.lostFound', 'Lost & found')}</span>
              </>
            )}
          </NavLink>

          {/* Calendar — everyone */}
          <NavLink to="/calendar" className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Calendar className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.calendar', 'Calendar')}</span>
              </>
            )}
          </NavLink>

          {/* Deadlines — everyone */}
          <NavLink to="/deadlines" className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Clock className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.deadlines', 'Deadlines')}</span>
              </>
            )}
          </NavLink>

          {/* User Management — super_admin only */}
          {showUserMgmt && (
            <div className="pt-2">
              <NavLink to="/admin/users" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    {isActive && indicator}
                    <Users className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>User Management</span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <NavLink to="/profile" className={({ isActive }) =>
          `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-colors ${
            isActive ? 'bg-slate-100 text-[#0f172a]' : 'text-[rgb(52,58,64)] hover:bg-slate-50'
          }`
        }>
          <Settings className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Settings</span>
        </NavLink>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[16px] font-medium leading-[24px] text-[rgb(52,58,64)] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left">
          <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
