import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';
import api from '../../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('token') ? 'loading' : 'pending');
  const [message, setMessage] = useState('Check your inbox for the verification link.');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This verification link is invalid or expired.');
      });
  }, [searchParams]);

  const handleResend = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setResending(true);
    try {
      const response = await api.post('/auth/resend-verification', { email: email.trim() });
      setMessage(response.data.message);
      setResent(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to resend the verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? XCircle : Mail;
  const iconClass = status === 'success'
    ? 'text-emerald-600 bg-emerald-50'
    : status === 'error' ? 'text-red-600 bg-red-50' : 'text-[#2383c9] bg-[#e4f2fe]';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafb] p-6 font-['Outfit']">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200/70 shadow-sm p-8 text-center space-y-5">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${iconClass}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">
            {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : status === 'loading' ? 'Verifying your email' : 'Check your email'}
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">{status === 'loading' ? 'Please wait while we confirm your email address.' : message}</p>
        </div>
        {status === 'error' && (
          <form onSubmit={handleResend} className="space-y-3 text-left">
            <label htmlFor="verification-email" className="block text-sm font-semibold text-[#1a1a2e]">
              Enter your registered email
            </label>
            <input
              id="verification-email"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setResent(false); }}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9] focus:ring-2 focus:ring-[#2383c9]/20"
            />
            <button
              type="submit"
              disabled={resending || resent}
              className="w-full rounded-lg bg-[#1a2b49] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#14223b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Sending…' : resent ? 'Verification email sent' : 'Resend verification email'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
