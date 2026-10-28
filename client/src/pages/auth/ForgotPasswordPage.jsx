import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

const validatePassword = (pw) => {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
};

export default function ForgotPasswordPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('en') ? 'de' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('blunder_lang', nextLang);
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If the email is registered, a reset code was sent.');
      setStep(2);
    } catch {
      toast.error('Could not request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const err = validatePassword(newPassword);
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      toast.success('Password reset successfully. You can now log in.');
      navigate('/login');
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
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('/assets/image2.jpeg')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b6b]/95 via-[#1a3a8a]/10 to-transparent" />
        <div className="relative z-10 flex items-center gap-3">
          <img src="/assets/louisenlund_logo.png" alt="Louisenlund" className="w-11 h-11 object-contain rounded-full bg-white/10 p-1 backdrop-blur-xs" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">B- Lunder</h1>
            <p className="text-[10px] text-white/70 tracking-widest uppercase">The Louisenlund Community</p>
          </div>
        </div>
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight md:leading-[1.15]">
            Reset Your<br /><span className="text-[#e4f2fe]">Password</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/80 max-w-md font-light leading-relaxed">
            We'll send a verification code to your email so you can get back in quickly.
          </p>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60">
          <span>Stiftung Louisenlund</span>
          <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white backdrop-blur-xs text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase font-semibold">{i18n.language?.substring(0, 2) || 'EN'}</span>
          </button>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-16 bg-[#f8fafb]">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-10 md:p-14 space-y-8 animate-fade-in">
          <div>

            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] tracking-tight">
              {step === 1 ? 'Reset your password' : 'Enter reset code'}
            </h2>
            <p className="mt-1.5 text-[16px] text-gray-500">
              {step === 1 ? "Enter your email and we'll send you a verification code." : `Enter the code sent to ${email} and set your new password.`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-[16px] font-semibold text-gray-700 mb-1.5">Email address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@louisenlund.de or you@gmail.com"
                  className="w-full bg-white text-[15px] text-gray-800 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-[15px] rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Send Reset Code</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[16px] font-semibold text-gray-700 mb-1.5">6-Digit Code</label>
                <input type="text" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full bg-white text-center tracking-widest text-lg font-bold text-[#1a1a2e] px-4 py-3 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-[16px] font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, letters & numbers"
                    className="w-full bg-white text-[15px] text-gray-800 px-4 py-3 pr-10 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#64748b] mt-1">Must be 8+ characters with at least one letter and one number.</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-[15px] rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Update Password</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <p className="text-center text-[15px] text-gray-500">
            <Link to="/login" className="text-[#1a1a2e] font-semibold hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
