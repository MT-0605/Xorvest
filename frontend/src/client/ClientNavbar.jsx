import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calculator, History, LogOut, UserCheck } from 'lucide-react';

export default function ClientNavbar({ user, onLogout }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const displayName = user?.user_name || user?.username || user?.email || 'Rahul Patel';

  return (
    <header className="sticky top-0 z-30 bg-[#121316]/95 backdrop-blur-md border-b border-[#2b2c2f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-white tracking-tight">
                    Xorvest
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    Borrower Portal
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-[#1b1c1f] p-1 rounded-xl border border-[#2b2c2f]">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition ${
                currentPath === '/' || currentPath.startsWith('/plan') || currentPath.startsWith('/approved')
                  ? 'bg-[#2888e8] text-white shadow-sm'
                  : 'text-[#92939a] hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Loan Planner</span>
            </Link>
            <Link
              to="/history"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition ${
                currentPath === '/history'
                  ? 'bg-[#2888e8] text-white shadow-sm'
                  : 'text-[#92939a] hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Loan History</span>
            </Link>
          </nav>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs text-[#92939a] bg-[#1d1e20] py-1.5 px-3 rounded-lg border border-[#2b2c2f]">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-200 font-medium truncate max-w-[140px]">{displayName}</span>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg text-slate-300 hover:text-rose-400 bg-[#1d1e20] hover:bg-[#252629] border border-[#2b2c2f] transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
