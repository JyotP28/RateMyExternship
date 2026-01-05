"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  // Redirect if no session found (user didn't click the link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setMessage({ text: "Invalid or expired link. Please try resetting your password again.", type: 'error' });
      }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
    } else {
      setMessage({ text: "Password updated successfully! Redirecting...", type: 'success' });
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f0f] text-white font-sans p-4">
      <div className="w-full max-w-md p-8 bg-black/40 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[#64d2b1] mb-2">
            Set New Password
          </h1>
          <p className="text-xs text-white/40">
            Enter your new password below to secure your account.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#64d2b1] transition-colors" size={18} />
            <input 
              type="password" 
              placeholder="New Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#64d2b1]/50 transition-all text-sm placeholder:text-white/10"
              required
              minLength={6}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-[#64d2b1] text-[#0f0f0f] font-black rounded-2xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-xs shadow-lg shadow-[#64d2b1]/20 flex items-center justify-center gap-2"
          >
            {loading ? 'Updating...' : 'Update Password'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-[#64d2b1]/10 border-[#64d2b1]/20 text-[#64d2b1]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
             {message.type === 'success' ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
             <p className="text-[11px] font-bold leading-relaxed">{message.text}</p>
          </div>
        )}

      </div>
    </div>
  );
}