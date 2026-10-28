import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('en') ? 'de' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('blunder_lang', nextLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please verify credentials.', { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafb] text-[#1a1a2e] font-['Outfit']">

      {/* ── Left Hero Panel ── */}
      <div className="relative md:w-1/2 min-h-[340px] md:min-h-screen bg-[#1a1a2e] flex flex-col justify-between p-8 md:p-14 text-white overflow-hidden">

        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url('/assets/image2.jpeg')` }}
        />

        {/* Gradient: clear at top, deep blue builds from bottom — like image 1 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b6b]/95 via-[#1a3a8a]/10 to-transparent" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/assets/louisenlund_logo.png"
            alt="Louisenlund"
            className="w-11 h-11 object-contain rounded-full bg-white/10 p-1 backdrop-blur-xs"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">B- Lunder</h1>
            <p className="text-[10px] text-white/70 tracking-widest uppercase">The Louisenlund Community</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight md:leading-[1.15]">
            Own Your Campus<br />
            <span className="text-[#e4f2fe]">Life From Here</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/80 max-w-md font-light leading-relaxed">
            The official platform for staying connected with your campus — from announcements to daily life.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60">
          <span>Stiftung Louisenlund</span>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white backdrop-blur-xs text-xs"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase font-semibold">{i18n.language?.substring(0, 2) || 'EN'}</span>
          </button>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-16 bg-[#f8fafb]">

        {/* White card wrapping the form */}
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-10 md:p-14 space-y-8 animate-fade-in">

          {/* Welcome heading — no icon */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] tracking-tight">
              {t('auth.loginTitle', 'Welcome back!!!')}
            </h2>
            <p className="mt-1.5 text-[16px] text-gray-500">
              {t('auth.loginSubtitle', "A new day, new possibilities. Let's get you signed in.")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] font-semibold text-gray-700 mb-1.5">
                {t('auth.email', 'Email address')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@louisenlund.de or you@gmail.com"
                className="w-full bg-white text-[15px] text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e]  focus:outline-hidden transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[16px] font-semibold text-gray-700">
                  {t('auth.password', 'Password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#1a1a2e] hover:underline font-medium"
                >
                  {t('auth.forgotPassword', 'Forgot password?')}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder', 'At least 8 characters')}
                  className="w-full bg-white text-[15px] text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e]  focus:ring-[#2383c9]/20 focus:outline-hidden transition-all pr-10 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-[15px] rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{t('auth.signIn', 'Sign in →')}</span>
              )}
            </button>
          </form>

          {/* No account link & invitation activation */}
          <div className="space-y-2 text-center text-[15px] text-gray-500">
            <p>
              {t('auth.noAccount', 'No B- Lunder account yet?')}{' '}
              <Link to="/register" className="text-[#1a1a2e] font-semibold hover:underline">
                {t('auth.createAccount', 'Create an account')}
              </Link>
            </p>
            {/* <p>
              Received an invitation code?{' '}
              <Link to="/verify-otp" className="text-[#2383c9] font-semibold hover:underline">
                Enter code to activate account
              </Link>
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}
