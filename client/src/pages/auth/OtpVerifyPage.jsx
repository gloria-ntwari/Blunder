import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, KeyRound, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function OtpVerifyPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('en') ? 'de' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('blunder_lang', nextLang);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !code) {
      toast.error('Email and code are required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, code });
      toast.success('Code verified! Please create your password.');
      navigate('/set-password', {
        state: { tempToken: res.data.tempToken, email }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafb] text-[#1a1a2e] font-['Outfit']">

      {/* ── Left Hero Panel ── */}
      <div className="relative md:w-1/2 min-h-[340px] md:min-h-screen bg-[#1a1a2e] flex flex-col justify-between p-8 md:p-14 text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url('/assets/louisenlund_castle.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b6b]/95 via-[#1a3a8a]/50 to-transparent" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/assets/louisenlund_logo.png"
            alt="Louisenlund"
            className="w-11 h-11 object-contain rounded-full bg-white/10 p-1 backdrop-blur-xs"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">B.Lunder</h1>
            <p className="text-[10px] text-white/70 tracking-widest uppercase">The Louisenlund Community</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight md:leading-[1.15]">
            Verify Your<br />
            <span className="text-[#e4f2fe]">Invitation</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/80 max-w-md font-light leading-relaxed">
            Enter the one-time code sent to your email to activate your campus account.
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
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-10 md:p-14 space-y-8 animate-fade-in">

          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center mb-5">
              <KeyRound className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] tracking-tight">
              Verify your invitation
            </h2>
            <p className="mt-1.5 text-xs md:text-sm text-gray-500">
              Enter the 6-digit OTP code sent to your email to activate your account.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@louisenlund.de"
                className="w-full bg-white text-xs text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder="123456"
                className="w-full bg-white text-center tracking-widest text-lg font-bold text-[#1a1a2e] px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400 placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-xs md:text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500">
            <Link to="/login" className="text-[#1a1a2e] font-semibold hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
