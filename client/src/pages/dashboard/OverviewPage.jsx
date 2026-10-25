import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellRing,
  Calendar,
  Clock,
  Users,
  UtensilsCrossed,
  ArrowRight,
  Plus,
  Sparkles,
  Search,
  CheckCircle2,
  FileText,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Modal from '../../components/layout/Modal.jsx';

export default function OverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = useSocket();

  const [announcements, setAnnouncements] = useState([]);
  const [todayMenu, setTodayMenu] = useState([]);
  const [events, setEvents] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [lostFoundCount, setLostFoundCount] = useState(0);
  const [activeSnackAlerts, setActiveSnackAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSnackModal, setShowSnackModal] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackExpires, setSnackExpires] = useState(60);
  const [postingSnack, setPostingSnack] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleSnackAlert = (newAlert) => {
      setActiveSnackAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
    };
    socket.on('snack_alert', handleSnackAlert);
    const handleDataChanged = () => fetchDashboardData();
    window.addEventListener('blunder:data-changed', handleDataChanged);
    return () => {
      socket.off('snack_alert', handleSnackAlert);
      window.removeEventListener('blunder:data-changed', handleDataChanged);
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [annRes, menuRes, eventRes, deadRes, lfRes, snackRes] = await Promise.allSettled([
        api.get('/announcements?limit=4'),
        api.get('/food/today'),
        api.get('/events?limit=4'),
        api.get('/deadlines'),
        api.get('/lost-found?status=unclaimed'),
        api.get('/food/snack-alerts')
      ]);

      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data.announcements || []);
      if (menuRes.status === 'fulfilled') setTodayMenu(menuRes.value.data || []);
      if (eventRes.status === 'fulfilled') setEvents(eventRes.value.data || []);
      if (deadRes.status === 'fulfilled') setDeadlines(deadRes.value.data || []);
      if (lfRes.status === 'fulfilled') setLostFoundCount((lfRes.value.data.items || []).length);
      if (snackRes.status === 'fulfilled') setActiveSnackAlerts(snackRes.value.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissSnackAlert = (id) => {
    setActiveSnackAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handlePostSnackAlert = async (e) => {
    e.preventDefault();
    if (!snackMessage) return;
    setPostingSnack(true);
    try {
      const res = await api.post('/food/snack-alert', {
        message: snackMessage,
        expires_minutes: Number(snackExpires)
      });
      toast.success('Snack alert broadcasted to everyone!');
      setSnackMessage('');
      setShowSnackModal(false);
      if (res.data) {
        setActiveSnackAlerts((prev) => [res.data, ...prev.filter((a) => a.id !== res.data.id)]);
      }
    } catch (err) {
      toast.error('Could not post snack alert');
    } finally {
      setPostingSnack(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.morning', 'Good morning');
    if (hour < 18) return t('dashboard.afternoon', 'Good afternoon');
    return t('dashboard.evening', 'Good evening');
  };

  const getMealItemsSummary = (items) => {
    if (!items) return 'Daily Buffet';
    let list = items;
    if (typeof list === 'string') {
      try {
        const parsed = JSON.parse(list);
        list = parsed;
      } catch {
        list = list.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      }
    }
    if (Array.isArray(list) && list.length > 0) {
      return list
        .map((i) => (typeof i === 'object' && i !== null ? i.name || i.item || JSON.stringify(i) : String(i)))
        .join(', ');
    }
    return 'Daily Buffet';
  };

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Bruno';

  const statCards = [
    {
      label: t('dashboard.newAnnouncements', 'New announcements'),
      value: announcements.length,
      href: '/announcements',
      icon: Bell,
      iconClass: 'bg-[#e4f2fe] text-[#2383c9]',
      hoverClass: 'hover:border-[#2383c9]/40',
    },
    {
      label: t('dashboard.upcomingEvents', 'Upcoming events'),
      value: events.length,
      href: '/calendar',
      icon: Calendar,
      iconClass: 'bg-emerald-50 text-emerald-600',
      hoverClass: 'hover:border-emerald-300',
    },
    {
      label: t('dashboard.yourDeadlines', 'Your deadlines'),
      value: deadlines.length,
      href: '/deadlines',
      icon: Clock,
      iconClass: 'bg-[#fff7ed] text-[#f97316]',
      hoverClass: 'hover:border-[#f97316]/40',
    },
    {
      label: t('dashboard.lostFound', 'Lost & Found'),
      value: lostFoundCount,
      href: '/lost-found',
      icon: Search,
      iconClass: 'bg-purple-50 text-purple-600',
      hoverClass: 'hover:border-purple-300',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Active Snack Alert Banner */}
      {activeSnackAlerts.length > 0 && (
        <div className="bg-[#fff7ed] border border-[#f97316]/30 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-[#f97316] text-white flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#c2410c] uppercase tracking-wider">
                Real-Time Snack Alert!
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
              <span className="text-[11px] text-[#f97316] font-medium">Available right now </span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-[#0f172a] mt-0.5">
              {activeSnackAlerts[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Top Header Row (Matching User Typography Specifications) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Welcoming Topic: 30px, 700, 37.5px line-height, lab(7.78673 1.82345 -15.0537) => #0f172a */}
          <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
            {getGreeting()}, {firstName}!
          </h1>
          {/* Subtitle: 16px, 400, 24px line-height, lab(48.0876 -2.03595 -16.5814) => #64748b */}
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            {t('dashboard.subtitle', 'A little less catching up. A little more campus life.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Edit Profile</span>
          </Link>


          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('Quick add')}</span>
          </button>
        </div>
      </div>

      {/* Seamless infinite stats marquee */}
      <div className="w-full overflow-hidden relative">
        <div className="flex w-max animate-marquee ">
          {[...statCards, ...statCards].map((card, index) => {
            const Icon = card.icon;
            const duplicate = index >= statCards.length;
            return (
              <Link
                key={`${card.href}-${index}`}
                to={card.href}
                aria-hidden={duplicate}
                tabIndex={duplicate ? -1 : undefined}
                className={`w-[min(78vw,17rem)] sm:w-64 lg:w-72 shrink-0 mr-4 bg-white p-5 rounded-xl border border-slate-200/70 shadow-xs ${card.hoverClass} hover:shadow-sm transition-all group/card`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-[14px] font-medium leading-[20px] text-[#64748b]">{card.label}</p>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.iconClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-2 text-[30px] font-bold text-[#0f172a] leading-none">{card.value}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Campus Life Castle Hero Banner (Reduced Curvature to rounded-xl) */}
      <div className="relative rounded-xl overflow-hidden min-h-[170px] md:min-h-[190px] flex flex-col justify-end p-5 md:p-7 shadow-xs border border-slate-200/70">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/assets/image1.jpeg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/15" />

        <div className="relative z-10 space-y-2 max-w-2xl text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#e4f2fe]" />
            <span className="text-[10px] md:text-xs font-semibold tracking-widest uppercase text-white/80">
              WHERE CAMPUS LIFE CLICKS.
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
            {t('dashboard.heroTitle', 'Campus life, all in one place.')}
          </h2>

          {/* User Tags */}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-medium text-white border border-white/20">
              Louisenlund Campus
            </span>
{user?.class_year && (
  <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-medium text-white border border-white/20">
    {user.class_year}
  </span>
)}
{user?.academic_track && (
  <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-medium text-white border border-white/20">
    {user.academic_track}
  </span>
)}

          </div>
        </div>
      </div>

      {/* Main Content Grid: Campus Buzz (Left) + Quick Actions & Food (Right) (Image 1 Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campus Buzz (Recent Assignments style from Image 1) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              {/* Content Topic: 20px, 700, 28px, lab(7.78673 1.82345 -15.0537) */}
              <h3 className="text-[20px] font-bold leading-[28px] text-[#0f172a]">
                {t('dashboard.campusBuzz', 'The Campus Buzz')}
              </h3>
              <p className="text-[14px] font-normal leading-[20px] text-[#64748b]">
                Latest announcements and school notices
              </p>
            </div>

            <Link
              to="/announcements"
              className="text-xs font-semibold text-[#0f172a] hover:text-[#2383c9] flex items-center gap-1 transition-colors"
            >
              <span>View All Announcements</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {announcements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl my-4">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No new announcements right now</p>
              </div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5 group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#e4f2fe] text-[#2383c9] capitalize">
                      {ann.scope.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {ann.created_at ? format(new Date(ann.created_at), 'd MMM yyyy') : ''}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#0f172a] group-hover:text-[#2383c9] transition-colors">
                    {ann.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {ann.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions (Image 1 Style) + Food Menu Preview */}
        <div className="space-y-6">
          {/* Quick Actions (Matching Image 1) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-[20px] font-bold leading-[28px] text-[#0f172a]">
              Quick Actions
            </h3>

            <div className="space-y-2.5">
              <Link
                to="/lost-found?action=new"
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#1a2b49] text-white hover:bg-[#14223b] transition-colors text-xs font-medium shadow-xs"
              >
                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                  <Search className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Report Found Item</span>
              </Link>

              <Link
                to="/deadlines?action=new"
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-800 transition-colors text-xs font-medium"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span>Add Personal Deadline</span>
              </Link>

              <Link
                to="/food-menu"
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-800 transition-colors text-xs font-medium"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <span>Check Today's Menu</span>
              </Link>
            </div>
          </div>

          {/* Today's Food Preview */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-slate-600" />
                <h4 className="text-[16px] font-bold text-[#0f172a]">
                  {t('dashboard.whatsCooking', "What's cooking?")}
                </h4>
              </div>
              <Link to="/food-menu" className="text-xs font-semibold text-[#0f172a] hover:underline">
                View Menu →
              </Link>
            </div>

            {todayMenu.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Menu for today is being prepared.
              </p>
            ) : (
              <div className="space-y-2.5">
                {todayMenu.slice(0, 2).map((meal) => (
                  <div key={meal.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-[#2383c9] uppercase text-[10px] tracking-wider block">
                      {meal.meal_type}
                    </span>
                    <p className="text-slate-700 font-medium mt-0.5 truncate">
                      {getMealItemsSummary(meal.items)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <Modal onClose={() => setShowQuickAdd(false)} maxWidth="max-w-sm">
          <div className="p-6 space-y-4">
            <h3 className="font-bold text-[18px] text-[#0f172a]">Quick Action</h3>
            <p className="text-xs text-[#64748b]">Select what you want to create:</p>

            <div className="space-y-2">
              <button
                onClick={() => { setShowQuickAdd(false); navigate('/lost-found?action=new'); }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-semibold text-[#0f172a]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <p>Report a Found Item</p>
                  <p className="text-[11px] font-normal text-[#64748b]">Add something to Lost & Found</p>
                </div>
              </button>

              <button
                onClick={() => { setShowQuickAdd(false); navigate('/deadlines?action=new'); }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-semibold text-[#0f172a]"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#f97316] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p>Add Personal Deadline</p>
                  <p className="text-[11px] font-normal text-[#64748b]">Set a study reminder</p>
                </div>
              </button>

              {['super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee', 'mentor'].includes(user?.role) && (
                <button
                  onClick={() => { setShowQuickAdd(false); navigate('/announcements?action=new'); }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-semibold text-[#0f172a]"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p>Post Announcement</p>
                    <p className="text-[11px] font-normal text-[#64748b]">Publish school update</p>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowQuickAdd(false)}
              className="w-full py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
