import React from 'react';
import { CheckCircle2, ShieldCheck, LogOut, ArrowRight, User } from 'lucide-react';
import authService from '../api/auth';

export default function WelcomeModal({ user, onLogout, onProceed }) {
  const handleLogout = () => {
    authService.logout();
    if (onLogout) onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Success badge */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-amber-400" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-1">
          Welcome to <span className="text-amber-400">XorVest</span>!
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Your credentials have been securely verified and authenticated.
        </p>

        {/* User Card */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-left space-y-2.5 mb-6">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="text-zinc-400 font-medium">Username:</span>
            <span className="text-amber-400 font-bold">{user?.username || user?.user_name || 'User'}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="text-zinc-400 font-medium">Email Address:</span>
            <span className="text-white font-mono">{user?.email || 'user@example.com'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Account Role:</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 inline" />
              <span>{user?.role === 'admin' ? 'Administrator' : 'Client Borrower'}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (onProceed) onProceed(user);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <span>Proceed to Client Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
