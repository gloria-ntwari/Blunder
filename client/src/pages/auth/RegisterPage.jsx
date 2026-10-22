import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowRight, CheckCircle2, User, BookOpen, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { getClassesForTrack } from '../../utils/academicTracks';

const validatePassword = (pw) => {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
};

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const [academicTrack, setAcademicTrack] = useState('IB');
  const [classYear, setClassYear] = useState('DP1');
  const [mentors, setMentors] = useState([]);
  const [mentorId, setMentorId] = useState('');
  const [loadingMentors, setLoadingMentors] = useState(false);

  useEffect(() => {
    const classes = getClassesForTrack(academicTrack);
    const firstClass = classes[0]?.value || 'DP1';
    setClassYear(firstClass);
    fetchMentors(academicTrack, firstClass);
  }, [academicTrack]);

  useEffect(() => {
    fetchMentors(academicTrack, classYear);
  }, [classYear]);

  const fetchMentors = async (track, classYr) => {
    setLoadingMentors(true);
    try {
      const res = await api.get(`/users/mentors?academic_track=${track}&class_year=${encodeURIComponent(classYr)}`);
      const list = res.data || [];
      setMentors(list);
      setMentorId(list.length > 0 ? list[0].id : '');
    } catch {
      setMentors([]);
      setMentorId('');
    } finally {
      setLoadingMentors(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('en') ? 'de' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('blunder_lang', nextLang);
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register/step1', { full_name: fullName, email, password });
      setTempToken(res.data.tempToken);
      setStep(2);
      toast.success(res.data.message || 'Step 1 complete! Now choose your class & track.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register/step2', {
        tempToken,
        academic_track: academicTrack,
        class_year: classYear,
        mentor_id: mentorId || null
      });
      localStorage.setItem('blunder_access_token', res.data.accessToken);
      localStorage.setItem('blunder_refresh_token', res.data.refreshToken);
      updateUser(res.data.user);
      toast.success('Registration completed! Welcome to Louisenlund.');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafb] text-[#1a1a2e] font-['Outfit']">
      {/* ── Left Hero Panel ── */}
      <div className="relative md:w-1/2 min-h-[340px] md:min-h-screen bg-[#1a1a2e] flex flex-col justify-between p-8 md:p-14 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('/assets/louisenlund_castle.jpg')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b6b]/95 via-[#1a3a8a]/50 to-transparent" />
        <div className="relative z-10 flex items-center gap-3">
          <img src="/assets/louisenlund_logo.png" alt="Louisenlund" className="w-11 h-11 object-contain rounded-full bg-white/10 p-1 backdrop-blur-xs" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">B.Lunder</h1>
            <p className="text-[10px] text-white/70 tracking-widest uppercase">The Louisenlund Community</p>
          </div>
        </div>
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight md:leading-[1.15]">
            Own Your Campus<br /><span className="text-[#e4f2fe]">Life From Here</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/80 max-w-md font-light leading-relaxed">
            The official platform for staying connected with your campus — from announcements to daily life.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === 1 ? 'bg-white text-[#1a1a2e]' : 'bg-white/20 text-white'}`}>
              <span>1</span><span>Account</span>
            </div>
            <div className="w-6 h-0.5 bg-white/30" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === 2 ? 'bg-white text-[#1a1a2e]' : 'bg-white/20 text-white'}`}>
              <span>2</span><span>Academics</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60">
          <span>Stiftung Louisenlund • Student Portal</span>
          <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white backdrop-blur-xs text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase font-semibold">{i18n.language?.substring(0, 2) || 'EN'}</span>
          </button>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-14 bg-[#f8fafb]">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-10 md:p-14 space-y-8 animate-fade-in">
          {step === 1 ? (
            <>
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold text-[#1a1a2e] tracking-tight">{t('auth.step1Title', 'Create your account')}</h2>
                <p className="mt-1.5 text-xs md:text-sm text-gray-500">{t('auth.step1Subtitle', 'Start with your name and login details.')}</p>
              </div>
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('auth.fullName', 'Full name')}</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Linden"
                    className="w-full bg-white text-xs text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('auth.email', 'Email address')}</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@louisenlund.de or you@gmail.com"
                    className="w-full bg-white text-xs text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('auth.password', 'Password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, letters & numbers"
                      className="w-full bg-white text-xs text-gray-800 px-4 py-3 pr-10 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748b] mt-1">Must be 8+ characters with at least one letter and one number.</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-xs md:text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>{t('common.next', 'Next: Academic Details')}</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] tracking-tight">{t('auth.step2Title', 'Tell us about you')}</h2>
                <p className="mt-1.5 text-xs md:text-sm text-gray-500">{t('auth.step2Subtitle', 'Select your academic track, class, and mentor.')}</p>
              </div>
              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">{t('auth.academicTrack', '1. Academic Track')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['IB', 'MINT', 'Abitur'].map((track) => (
                      <button key={track} type="button" onClick={() => setAcademicTrack(track)}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${academicTrack === track ? 'bg-[#1a2b49] text-white border-[#1a2b49] shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                        {track}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('auth.classYear', '2. Class / Year Level')}</label>
                  <select value={classYear} onChange={(e) => setClassYear(e.target.value)}
                    className="w-full bg-white text-xs text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all">
                    {getClassesForTrack(academicTrack).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('auth.mentor', '3. Select Your Mentor')}</label>
                  {loadingMentors ? (
                    <div className="text-xs text-gray-400 py-2">Loading mentors...</div>
                  ) : mentors.length > 0 ? (
                    <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}
                      className="w-full bg-white text-xs text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all">
                      {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  ) : (
                    <div className="bg-[#e4f2fe]/40 border border-[#1a1a2e]/10 p-3 rounded-lg text-xs text-gray-600">
                      No mentor assigned for {academicTrack} / {classYear} yet. You can be assigned later.
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="py-3 px-4 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-600 transition-colors">Back</button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-xs md:text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Complete Registration</span></>}
                  </button>
                </div>
              </form>
            </>
          )}
          <p className="text-center text-xs text-gray-500">
            {t('auth.haveAccount', 'Already have an account?')}{' '}
            <Link to="/login" className="text-[#1a1a2e] font-semibold hover:underline">{t('auth.login', 'Sign in')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
