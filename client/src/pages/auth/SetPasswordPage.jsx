import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const validatePassword = (pw) => {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
};

export default function SetPasswordPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const tempToken = location.state?.tempToken || searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('en') ? 'de' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('blunder_lang', nextLang);
  };

  if (!tempToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafb] p-6 font-['Outfit']">
        <div className="bg-white rounded-lg shadow-sm p-10 max-w-sm w-full space-y-4 text-center">
          <p className="text-sm text-gray-600">Invitation session expired or missing token.</p>
          <Link to="/login" className="inline-block text-xs font-semibold text-[#1a1a2e] underline">Return to login</Link>
        </div>
      </div>
    );
  }

  const handleSetPassword = async (e) => {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) { toast.error(err); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/set-password', { tempToken, password });
      toast.success('Password set! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not set password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafb] text-[#1a1a2e] font-['Outfit']">
      {/* ── Left Hero Panel ── */}
      <div className="relative md:w-1/2 min-h-[340px] md:min-h-screen bg-[#1a1a2e] flex flex-col justify-between p-8 md:p-14 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('/assets/image2.jpeg')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2b6b]/95 via-[#1a3a8a]/50 to-transparent" />
        <div className="relative z-10 flex items-center gap-3">
          <img src="/assets/louisenlund_logo.png" alt="Louisenlund" className="w-11 h-11 object-contain rounded-full bg-white/10 p-1 backdrop-blur-xs" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">B- Lunder</h1>
            <p className="text-[10px] text-white/70 tracking-widest uppercase">The Louisenlund Community</p>
          </div>
        </div>
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight md:leading-[1.15]">
            Almost<br /><span className="text-[#e4f2fe]">There</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/80 max-w-md font-light leading-relaxed">
            Create a strong password to secure your campus account and complete your setup.
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] tracking-tight">Create your password</h2>
            <p className="mt-1.5 text-[16px] text-gray-500">Must be 8+ characters with at least one letter and one number.</p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-[16px] font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, letters & numbers"
                  className="w-full bg-white text-[15px] text-gray-800 px-4 py-3 pr-10 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[16px] font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-white text-[15px] text-gray-800 px-4 py-3 pr-10 rounded-lg border border-gray-200 focus:border-[#1a1a2e] focus:outline-hidden transition-all placeholder:text-gray-400"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-[15px] rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Save Password & Sign in</span></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
