import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import LoanPerksSidebar from '../components/LoanPerksSidebar';
import LoginForm from '../components/LoginForm';
import SignupForm from '../components/SignupForm';
import WelcomeModal from '../components/WelcomeModal';
import { Lock, UserPlus, Sparkles, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [currentUser, setCurrentUser] = useState(null);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col relative overflow-hidden selection:bg-amber-500 selection:text-black">
      {/* Background Ambient Glows and Grid Effect */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-yellow-600/5 rounded-full blur-[130px] pointer-events-none" />
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" 
      />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Split Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Column: Loan Purpose & Interactive Showcase (55% width) */}
          <div className="lg:col-span-7 space-y-6">
            <LoanPerksSidebar />
          </div>

          {/* Right Column: Sleek Auth Card (45% width) */}
          <div className="lg:col-span-5 w-full">
            <div className="w-full bg-zinc-950/85 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_-15px_rgba(245,158,11,0.15)] relative">
              
              {/* Subtle top edge border gradient highlight */}
              <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              {/* Toggle Switch between Login and Signup */}
              <div className="flex p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Form Render */}
              <div className="transition-all duration-300">
                {activeTab === 'login' ? (
                  <LoginForm
                    onSuccess={handleAuthSuccess}
                    onSwitchToSignup={() => setActiveTab('signup')}
                  />
                ) : (
                  <SignupForm
                    onSuccess={handleAuthSuccess}
                    onSwitchToLogin={() => setActiveTab('login')}
                  />
                )}
              </div>

              {/* Footer Trust Note inside the Card */}
              <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>SOC-2 & KYC Compliant</span>
                </span>
                <span>Powered by XorVest Engine</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="w-full border-t border-zinc-900/80 py-4 text-center text-xs text-zinc-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div>
            © 2026 <span className="text-zinc-300 font-semibold">XorVest Financial Technologies</span>. All rights reserved.
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <a href="#" className="hover:text-amber-400 transition">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-amber-400 transition">Loan Disclosures</a>
            <span>•</span>
            <a href="#" className="hover:text-amber-400 transition">API Documentation</a>
          </div>
        </div>
      </footer>

      {/* Welcome / Dashboard Preview Modal on Successful Login or Signup */}
      {currentUser && (
        <WelcomeModal user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
