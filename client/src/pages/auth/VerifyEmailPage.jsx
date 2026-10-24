import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';
import api from '../../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('token') ? 'loading' : 'pending');
  const [message, setMessage] = useState('Check your inbox for the verification link.');

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
        {status !== 'loading' && (
          <Link to="/login" className="inline-flex px-5 py-2.5 rounded-lg bg-[#1a2b49] text-white text-sm font-semibold hover:bg-[#14223b]">
            Go to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
