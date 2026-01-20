"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // --- 1. STRICT .EDU VALIDATION ---
        // Case-insensitive check for .edu domain
        if (!email.trim().toLowerCase().endsWith('.edu')) {
            throw new Error("You must have a .edu domain or request your school specific email domain in the feedback forum.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Success! Check your email for the confirmation link.");
      } else {
        // Login Logic
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Close and refresh to update UI state (show user logged in)
        onClose();
        window.location.reload(); 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0f0f0f] rounded-3xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-emerald-600 dark:text-vet-mint">
                {isSignUp ? 'Join the Community' : 'Welcome Back'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <X size={20} className="text-slate-500 dark:text-slate-400" />
            </button>
        </div>

        {/* Body */}
        <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-5">
                
                {/* Error Banner */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-start gap-2 leading-relaxed">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {message && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-vet-mint text-xs font-bold text-center">
                        {message}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 block ml-1">
                        School Email {isSignUp && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isSignUp ? "student@university.edu" : "name@example.com"}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-emerald-500 dark:focus:border-vet-mint transition-all text-base md:text-sm font-medium text-slate-900 dark:text-white"
                            required
                        />
                    </div>
                    {/* Visual Hint for Sign Up */}
                    {isSignUp && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                            * Must be a <strong>.edu</strong> address to verify student status.
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 block ml-1">Password</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-emerald-500 dark:focus:border-vet-mint transition-all text-base md:text-sm font-medium text-slate-900 dark:text-white"
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                        loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01]'
                    } ${
                        isSignUp 
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700 dark:bg-vet-mint dark:text-charcoal dark:shadow-vet-mint/20 dark:hover:bg-white' 
                        : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200'
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (isSignUp ? 'Create Student Account' : 'Sign In')}
                </button>
            </form>
        </div>

        {/* Footer Toggle */}
        <div className="p-6 border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                    className="ml-2 font-bold text-emerald-600 dark:text-vet-mint hover:underline"
                >
                    {isSignUp ? "Sign In" : "Sign Up"}
                </button>
            </p>
        </div>

      </div>
    </div>
  );
}