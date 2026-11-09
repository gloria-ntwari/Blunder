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
  Shield,
  Settings,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Music2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export default function Sidebar({ isOpen = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
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
    `relative flex items-center gap-3 ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : 'px-3.5'} py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
      isActive ? 'bg-[#1a2b49] text-white shadow-xs' : 'text-[rgb(52,58,64)] hover:bg-slate-50'
    }`;

  const indicator = (
    <span className={`absolute ${collapsed ? 'left-0' : '-left-3'} top-1/2 -translate-y-1/2 h-5 w-1 bg-[#1a2b49] rounded-r-sm`} />
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
      <aside className={`fixed inset-y-0 left-0 w-[min(18rem,calc(100vw-2rem))] bg-white flex flex-col justify-between select-none z-40 font-['Outfit'] rounded-r-lg overflow-hidden border border-slate-200/60 shadow-xl transition-all duration-200 lg:relative lg:inset-auto lg:z-20 lg:overflow-visible ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'} lg:h-full lg:rounded-lg lg:shadow-none lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 lg:hidden">
          <span className="text-sm font-semibold text-[#0f172a]">Navigation</span>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      <div>
        <div className={`px-3 py-4 space-y-1 ${collapsed ? 'lg:px-2' : ''}`}>

          {/* Overview — everyone */}
          <div className="relative">
            <NavLink to="/dashboard" onClick={onClose} title={t('nav.overview', 'Dashboard')} className={({ isActive }) => navLinkClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && indicator}
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.overview', 'Dashboard')}</span>
                </>
              )}
            </NavLink>
            {/* <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              className="absolute -right-6 top-1/2 z-50 hidden h-7 w-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-[#1a2b49] shadow-none transition-colors hover:text-[#2383c9] lg:flex"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button> */}
          </div>

          {/* Everyone can view the food menu; management controls are role-gated on the page. */}
          <NavLink to="/food-menu" onClick={onClose} title={t('nav.foodMenu', 'Food menu')} className={({ isActive }) => navLinkClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && indicator}
                  <UtensilsCrossed className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.foodMenu', 'Food menu')}</span>
                </>
              )}
          </NavLink>

          {/* Announcements — everyone */}
          <NavLink to="/announcements" onClick={onClose} title={t('nav.announcements', 'Announcements')} className={({ isActive }) =>
            `relative flex items-center gap-3 ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : 'justify-between px-3.5'} py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-all ${
              isActive ? 'bg-[#1a2b49] text-white shadow-xs' : 'text-[rgb(52,58,64)] hover:bg-slate-50'
            }`
          }>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center lg:gap-0' : ''}`}>
                  <Bell className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.announcements', 'Announcements')}</span>
                </div>
                {unreadAnnouncementCount > 0 && (
                    <span className={`flex items-center justify-center font-bold bg-[#f97316] text-white rounded-full h-4 w-4 text-[11px] animate-pulse ${collapsed ? 'lg:absolute lg:-right-1 lg:-top-1' : ''}`}>
                    {unreadAnnouncementCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Lost & Found — everyone */}
          <NavLink to="/lost-found" onClick={onClose} title={t('nav.lostFound', 'Lost & found')} className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Search className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.lostFound', 'Lost & found')}</span>
              </>
            )}
          </NavLink>

          {/* Calendar — everyone */}
          <NavLink to="/calendar" onClick={onClose} title={t('nav.calendar', 'Calendar')} className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Calendar className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.calendar', 'Calendar')}</span>
              </>
            )}
          </NavLink>

          {/* Deadlines — everyone */}
          <NavLink to="/deadlines" onClick={onClose} title={t('nav.deadlines', 'Deadlines')} className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && indicator}
                <Clock className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.deadlines', 'Deadlines')}</span>
              </>
            )}
          </NavLink>

          {['student', 'student_leader', 'sv_committee', 'committee', 'mentor', 'super_admin'].includes(role) && (
            <NavLink to="/guilds" onClick={onClose} title={t('nav.guilds', 'Guilds')} className={({ isActive }) => navLinkClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && indicator}
                  <Shield className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.guilds', 'Guilds')}</span>
                </>
              )}
            </NavLink>
          )}

          {role !== 'teacher' && (
            <NavLink to="/schuelerhaus" onClick={onClose} title={t('schulhaus.title', 'Schülerhaus')} className={({ isActive }) => navLinkClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && indicator}
                  <Music2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{t('schulhaus.title', 'Schülerhaus')}</span>
                </>
              )}
            </NavLink>
          )}

          {/* User Management — super_admin only */}
          {showUserMgmt && (
            <div className="pt-0.5 gap-y-1 flex flex-col">
              <NavLink to="/admin/users" onClick={onClose} title={t('nav.userManagement', 'User Management')} className={() => navLinkClass(userManagementActive)}>
                {() => (
                  <>
                    {userManagementActive && indicator}
                    <Users className={`w-4 h-4 shrink-0 ${userManagementActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.userManagement', 'User Management')}</span>
                  </>
                )}
              </NavLink>
              <NavLink to="/admin/users?section=mentor-groups" onClick={onClose} title={t('nav.mentorGroups', 'Mentor Groups')} className={() => navLinkClass(mentorGroupsActive)}>
                {() => (
                  <>
                    {mentorGroupsActive && indicator}
                    <UsersRound className={`w-4 h-4 shrink-0 ${mentorGroupsActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.mentorGroups', 'Mentor Groups')}</span>
                  </>
                )}
              </NavLink>
            </div>
            
          )}
          
        </div>
      </div>

      {/* Footer */}
      <div className={`p-3 border-t border-slate-100 space-y-1 ${collapsed ? 'lg:px-2' : ''}`}>
        <NavLink to="/profile" onClick={onClose} title={t('nav.settings', 'Settings')} className={({ isActive }) =>
          `flex items-center gap-3 ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : 'px-3.5'} py-2.5 rounded-lg text-[16px] font-medium leading-[24px] transition-colors ${
            isActive ? 'bg-slate-100 text-[#0f172a]' : 'text-[rgb(52,58,64)] hover:bg-slate-50'
          }`
        }>
          <Settings className="w-4 h-4 text-slate-500 shrink-0" />
          <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.settings', 'Settings')}</span>
        </NavLink>

        <button onClick={handleLogout} title={t('nav.signOut', 'Sign Out')}
          className={`w-full flex items-center gap-3 ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : 'px-3.5'} py-2.5 rounded-lg text-[16px] font-medium leading-[24px] text-[rgb(52,58,64)] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left`}>
          <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
          <span className={collapsed ? 'lg:hidden' : ''}>{t('nav.signOut', 'Sign Out')}</span>
        </button>
      </div>
      </aside>
    </>
  );
}
