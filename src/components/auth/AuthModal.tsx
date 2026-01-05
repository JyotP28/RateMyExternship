"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Mail, Lock, GraduationCap, ArrowRight, KeyRound, ChevronLeft } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        // --- 1. SIGN UP ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Account created! Check your email to confirm.");
        setMode('login'); // Switch to login view after success
      } 
      else if (mode === 'login') {
        // --- 2. LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose(); // Close modal on success
      } 
      else if (mode === 'forgot') {
        // --- 3. FORGOT PASSWORD ---
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/update-password` : undefined,
        });
        if (error) throw error;
        setMessage("Password reset link sent! Check your email.");
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-10 bg-[#0f0f0f] border border-white/10 rounded-[2rem] shadow-2xl">
        
        <button onClick={onClose} className="absolute right-6 top-6 text-white/40 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center mb-6 rounded-2xl bg-[#64d2b1]/10 border border-[#64d2b1]/20 text-[#64d2b1]">
            {mode === 'forgot' ? <KeyRound size={32} /> : <GraduationCap size={32} />}
          </div>
          
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">
            {mode === 'signup' ? 'Join Community' : mode === 'forgot' ? 'Reset Password' : 'Student Login'}
          </h2>
          
          <p className="text-xs text-white/40 mb-8 font-medium">
            {mode === 'signup' ? 'Requires a verified .edu email address.' 
             : mode === 'forgot' ? 'Enter your email to receive a reset link.' 
             : 'Welcome back to RateMyExternship.'}
          </p>
          
          <form onSubmit={handleAuth} className="w-full space-y-4">
            <div className="relative group text-left">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#64d2b1] transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="university-email@wsu.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#64d2b1]/50 transition-all text-sm placeholder:text-white/10"
                required
              />
            </div>

            {/* Password input is hidden in Forgot Password mode */}
            {mode !== 'forgot' && (
              <div className="relative group text-left">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#64d2b1] transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#64d2b1]/50 transition-all text-sm placeholder:text-white/10"
                  required
                />
              </div>
            )}

            {/* Forgot Password Link (Only in Login mode) */}
            {mode === 'login' && (
                <div className="text-right">
                    <button type="button" onClick={() => { setMode('forgot'); setMessage(''); }} className="text-[10px] font-bold text-white/40 hover:text-white transition-colors">
                        Forgot Password?
                    </button>
                </div>
            )}

            <button 
              disabled={loading}
              className="w-full py-4 bg-[#64d2b1] text-[#0f0f0f] font-black rounded-2xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-xs shadow-lg shadow-[#64d2b1]/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Link' : 'Login'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Bottom Navigation */}
          <div className="mt-6 flex flex-col gap-2">
            {mode === 'forgot' ? (
                <button 
                    onClick={() => { setMode('login'); setMessage(''); }}
                    className="text-[10px] text-white/40 hover:text-[#64d2b1] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                    <ChevronLeft size={12} /> Back to Login
                </button>
            ) : (
                <button 
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}
                    className="text-[10px] text-white/40 hover:text-[#64d2b1] font-bold uppercase tracking-widest transition-colors"
                >
                    {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Login'}
                </button>
            )}
          </div>

          {message && (
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl w-full text-left animate-in fade-in slide-in-from-top-2">
               <p className="text-[10px] text-[#64d2b1] font-bold uppercase tracking-widest leading-normal">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}