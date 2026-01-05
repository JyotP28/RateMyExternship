"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Mail, Lock, GraduationCap, ArrowRight } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      // Create New Account
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created! You can now login.");
        setIsSignUp(false);
      }
    } else {
      // Login to Existing Account
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        onClose();
      }
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-10 bg-charcoal border border-white/10 rounded-4xl shadow-2xl">
        
        <button onClick={onClose} className="absolute right-6 top-6 text-white/40 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center mb-6 rounded-2xl bg-vet-mint/10 border border-vet-mint/20 text-vet-mint">
            <GraduationCap size={32} />
          </div>
          
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">
            {isSignUp ? 'Join Community' : 'Student Login'}
          </h2>
          <p className="text-xs text-white/40 mb-8 font-medium">
            {isSignUp ? 'Requires a verified .edu email address.' : 'Welcome back to VetReview.'}
          </p>
          
          <form onSubmit={handleAuth} className="w-full space-y-4">
            <div className="relative group text-left">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-vet-mint transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="university-email@wsu.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-vet-mint/50 transition-all text-sm placeholder:text-white/10"
                required
              />
            </div>

            <div className="relative group text-left">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-vet-mint transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-vet-mint/50 transition-all text-sm placeholder:text-white/10"
                required
              />
            </div>

            <button 
              disabled={loading}
              className="w-full py-4 bg-vet-mint text-charcoal font-black rounded-2xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-xs shadow-lg shadow-vet-mint/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Login'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-6 text-[10px] text-white/40 hover:text-vet-mint font-bold uppercase tracking-widest transition-colors"
          >
            {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </button>

          {message && (
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl w-full text-left">
               <p className="text-[10px] text-vet-mint font-bold uppercase tracking-widest leading-normal">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}