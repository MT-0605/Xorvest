import React from 'react';
import { 
  Building2, 
  RotateCcw, 
  PlusCircle, 
  ShieldCheck, 
  Download,
  LogOut
} from 'lucide-react';

export default function AdminNavbar({ onOpenAddLoan, onResetData, onExportData, user, onLogout }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                  Xorvest
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Loan Management & Date-wise Repayment System
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onExportData}
              title="Export visible data to CSV"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onResetData}
              title="Synchronize and fetch live cloud data"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400" />
              <span className="hidden sm:inline">Sync Cloud</span>
            </button>

            <button
              onClick={onOpenAddLoan}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Create Loan</span>
            </button>

            {/* Admin Avatar & Logout */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 ring-2 ring-emerald-500/20">
                {user?.user_name ? user.user_name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user?.user_name || 'Admin Officer'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {user?.email || 'admin@xorvest.com'}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log out from Admin Panel"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
