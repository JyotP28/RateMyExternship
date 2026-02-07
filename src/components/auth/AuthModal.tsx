"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- 1. ADD YOUR EXCEPTIONS HERE ---
const ALLOWED_DOMAINS = [
  'uoguelph.ca',
  'usask.ca',
  'upei.ca',
  'ucalgary.ca',
  'umontreal.ca',
  'rvc.ac.uk',
  // Add other international vet school domains here
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean; 
}

export default function AuthModal({ isOpen, onClose, isDarkMode }: AuthModalProps) {
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
        // --- 2. UPDATED VALIDATION LOGIC ---
        const lowerEmail = email.trim().toLowerCase();
        const domain = lowerEmail.split('@')[1]; // Get the part after @
        
        const isEdu = lowerEmail.endsWith('.edu');
        const isAllowedDomain = ALLOWED_DOMAINS.includes(domain);

        if (!isEdu && !isAllowedDomain) {
            throw new Error("Must use a .edu email or an approved university domain (e.g. uoguelph.ca).");
        }
        // -----------------------------------

        const { error } = await supabase.auth.signUp({
          email: lowerEmail,
          password,
        });
        if (error) throw error;
        setMessage("Success! Check your email for the confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
        window.location.reload(); 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Styles based on isDarkMode prop
  const bgClass = isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-black/5';
  const textTitle = isDarkMode ? 'text-vet-mint' : 'text-emerald-600';
  const inputBg = isDarkMode ? 'bg-white/5' : 'bg-slate-50';
  const inputBorder = isDarkMode ? 'border-white/10 focus:border-vet-mint' : 'border-slate-200 focus:border-emerald-500';
  const inputText = isDarkMode ? 'text-white' : 'text-slate-900';
  const subText = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const headerBg = isDarkMode ? 'bg-white/5' : 'bg-gray-50/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border ${bgClass} ${borderClass}`}>
        
        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center ${headerBg} ${borderClass}`}>
            <h2 className={`text-xl font-black italic uppercase tracking-tighter ${textTitle}`}>
                {isSignUp ? 'Join the Community' : 'Welcome Back'}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-500'}`}>
                <X size={20} />
            </button>
        </div>

        {/* Body */}
        <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-5">
                
                {/* Error Banner */}
                {error && (
                    <div className={`p-4 rounded-xl border flex items-start gap-2 leading-relaxed text-xs font-bold ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {message && (
                    <div className={`p-4 rounded-xl border text-xs font-bold text-center ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-vet-mint' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {message}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ml-1 ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                        School Email {isSignUp && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${subText}`} />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isSignUp ? "student@university.edu" : "name@example.com"}
                            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl outline-none border transition-all text-base md:text-sm font-medium ${inputBg} ${inputBorder} ${inputText}`}
                            required
                        />
                    </div>
                    {isSignUp && (
                        // --- 3. UPDATED HELPER TEXT ---
                        <p className={`text-[10px] ml-1 ${subText}`}>
                            * Must be a <strong>.edu</strong> or approved university domain.
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ml-1 ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>Password</label>
                    <div className="relative">
                        <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${subText}`} />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl outline-none border transition-all text-base md:text-sm font-medium ${inputBg} ${inputBorder} ${inputText}`}
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01]'} 
                    ${isSignUp 
                        ? (isDarkMode ? 'bg-vet-mint text-charcoal shadow-vet-mint/20 hover:bg-white' : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700') 
                        : (isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-black')
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (isSignUp ? 'Create Student Account' : 'Sign In')}
                </button>
            </form>
        </div>

        {/* Footer Toggle */}
        <div className={`p-6 border-t text-center ${headerBg} ${borderClass}`}>
            <p className={`text-xs font-medium ${subText}`}>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                    className={`ml-2 font-bold hover:underline ${textTitle}`}
                >
                    {isSignUp ? "Sign In" : "Sign Up"}
                </button>
            </p>
        </div>

      </div>
    </div>
  );
}