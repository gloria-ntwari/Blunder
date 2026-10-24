import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  Search,
  Calendar,
  Clock,
  Users,
  UsersRound,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { notifications } = useNotificationStore();
  const unreadAnnouncementCount = notifications.filter(
    (notification) => notification.type === 'announcement' && !notification.is_read
  ).length;

  const role = user?.role;

  // Role groups
  const canManageUsers = ['super_admin', 'student_leader'].includes(role);
  const showUserMgmt   = canManageUsers;
  const mentorGroupsActive = location.pathname === '/admin/users' && location.search.includes('section=mentor-groups');
  const userManagementActive = location.pathname === '/admin/users' && !mentorGroupsActive;

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
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/30 z-30 lg:hidden cursor-default"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 w-[min(18rem,calc(100vw-2rem))] bg-white flex flex-col justify-between select-none z-40 font-['Outfit'] rounded-r-lg overflow-hidden border border-slate-200/60 shadow-xl transition-transform duration-200 lg:relative lg:inset-auto lg:z-20 lg:w-64 lg:h-full lg:rounded-lg lg:shadow-none lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 lg:hidden">
          <span className="text-sm font-semibold text-[#0f172a]">Navigation</span>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      <div>
        <div className="px-3 py-4 space-y-1">

          {/* Overview — everyone */}
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => navLinkClass(isActive)}>
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
            <NavLink to="/food-menu" onClick={onClose} className={({ isActive }) => navLinkClass(isActive)}>
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
          <NavLink to="/announcements" onClick={onClose} className={({ isActive }) =>
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
                {unreadAnnouncementCount > 0 && (
                  <span className="flex items-center justify-center font-bold bg-[#f97316] text-white rounded-full h-4 w-4 text-[11px] animate-pulse">
                    {unreadAnnouncementCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Lost & Found — everyone */}
          <NavLink to="/lost-found" onClick={onClose} className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Search className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.lostFound', 'Lost & found')}</span>
              </>
            )}
          </NavLink>

          {/* Calendar — everyone */}
          <NavLink to="/calendar" onClick={onClose} className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Calendar className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t('nav.calendar', 'Calendar')}</span>
              </>
            )}
          </NavLink>

          {/* Deadlines — everyone */}
          <NavLink to="/deadlines" onClick={onClose} className={({ isActive }) => navLinkClass(isActive)}>
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
            <div className="pt-0.5 gap-y-1 flex flex-col">
              <NavLink to="/admin/users" onClick={onClose} className={() => navLinkClass(userManagementActive)}>
                {() => (
                  <>
                    {userManagementActive && indicator}
                    <Users className={`w-4 h-4 shrink-0 ${userManagementActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>User Management</span>
                  </>
                )}
              </NavLink>
              <NavLink to="/admin/users?section=mentor-groups" onClick={onClose} className={() => navLinkClass(mentorGroupsActive)}>
                {() => (
                  <>
                    {mentorGroupsActive && indicator}
                    <UsersRound className={`w-4 h-4 shrink-0 ${mentorGroupsActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>Mentor Groups</span>
                  </>
                )}
              </NavLink>
            </div>
            
          )}
          
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <NavLink to="/profile" onClick={onClose} className={({ isActive }) =>
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
    </>
  );
}
