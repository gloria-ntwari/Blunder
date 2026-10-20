import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  Globe,
  Check,
  CheckCheck,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

export default function Topbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const notifRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('blunder_lang', lang);
    setShowLangMenu(false);
  };

  return (
    <header className="h-14 bg-white border border-slate-200/60 px-4 flex items-center justify-between shrink-0 relative z-10 font-['Outfit'] rounded-lg">
      {/* Brand + Search grouped together on the left */}
      <div className="flex items-center gap-4">
        {/* B.Lunder brand */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/assets/louisenlund_logo.png"
            alt="Stiftung Louisenlund"
            className="w-8 h-8 object-contain rounded-full"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-[#0f172a]">B.Lunder</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
          </div>
        </div>

        {/* Search Input */}
        <div className="w-[250px] md:w-[350px] lg:w-[450px] relative">
          <div className="relative left-30">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search', 'Search...')}
              className="w-full bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white text-xs md:text-sm text-[#0f172a] pl-9 pr-4 py-2 rounded-2xl border border-slate-200/60 focus:border-[#2383c9] focus:outline-hidden transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Right Actions: Language, Notification Bell, User profile */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
            title="Switch Language"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="uppercase">{i18n.language?.substring(0, 2) || 'EN'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-30 animate-fade-in text-xs">
              <button
                onClick={() => changeLanguage('en')}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 ${
                  i18n.language?.startsWith('en') ? 'text-[#2383c9] font-semibold' : 'text-slate-700'
                }`}
              >
                <span>English</span>
                {i18n.language?.startsWith('en') && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => changeLanguage('de')}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 ${
                  i18n.language?.startsWith('de') ? 'text-[#2383c9] font-semibold' : 'text-slate-700'
                }`}
              >
                <span>Deutsch</span>
                {i18n.language?.startsWith('de') && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:rounded-full hover:bg-slate-100 transition-all relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f97316] rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 z-30 overflow-hidden animate-fade-in">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#0f172a]">
                    {t('notifications.title', 'Notifications')}
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-[#f97316] text-white rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-[11px] text-[#2383c9] hover:underline font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t('notifications.markAllRead', 'Mark all as read')}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Bell className="w-7 h-7 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                    <p>{t('notifications.noNotifications', "You're all caught up!")}</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs ${
                        !n.is_read ? 'bg-[#e4f2fe]/20 font-medium' : 'text-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#0f172a]">{n.title}</p>
                          <p className="text-slate-500 text-[11px] leading-relaxed">{n.body}</p>
                          <span className="text-[10px] text-slate-400 block pt-0.5">
                            {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#f97316] shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical separator */}
        <div className="h-6 w-px bg-slate-200 shrink-0" />

        {/* User Profile Pill (Matching Image 1: Name + Role + Avatar) */}
        <Link
          to="/profile"
          className="flex items-center gap-3 pl-3 pr-2 py-1 rounded-lg   transition-colors"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-bold text-[#0f172a] leading-tight">
              {user?.full_name || 'Bruno MUGISHA'}
            </p>
            <p className="text-[11px] text-[#64748b] leading-tight capitalize mt-0.5">
              {user?.role?.replace('_', ' ') || 'Student'}
            </p>
          </div>
          {/* <div className="w-8 h-8 rounded-full bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0) || 'U'
            )}
          </div> */}
        </Link>
      </div>
    </header>
  );
}
