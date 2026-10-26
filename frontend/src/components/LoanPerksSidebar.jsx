import React from 'react';
import { ShieldCheck, Zap, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function LoanPerksSidebar() {
  return (
    <div className="flex flex-col space-y-8 text-slate-100 max-w-xl">
      {/* Brand Hero Heading */}
      <div className="space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold tracking-wide uppercase">
          <span>Smart Financing Platform</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">Logic Meets Profit</span>.
        </h1>
        
        <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
          Welcome to XorVest. Access intelligent loan solutions engineered with algorithmic precision, complete transparency, and bank-grade security.
        </p>
      </div>

      {/* Clean Feature List */}
      <div className="space-y-4 pt-2">
        <div className="flex items-start space-x-3.5">
          <div className="mt-1 p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Streamlined Loan Access</h4>
            <p className="text-xs text-zinc-400 mt-0.5">Quick application and transparent repayment structures.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3.5">
          <div className="mt-1 p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">High-Standard Security</h4>
            <p className="text-xs text-zinc-400 mt-0.5">Encrypted authentication and protected borrower data.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3.5">
          <div className="mt-1 p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Logic-Driven Financial Growth</h4>
            <p className="text-xs text-zinc-400 mt-0.5">Built to empower personal and enterprise capital needs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
