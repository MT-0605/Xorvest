import React from 'react';
import { 
  Percent, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  CreditCard 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function StatsCards({ kpis, selectedDate }) {
  const isDateAll = selectedDate === 'all';
  const displayDateStr = isDateAll ? 'All Time' : formatDate(selectedDate);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Date-specific Interest Due */}
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-emerald-950/20">
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Percent className="w-4 h-4" />
            {isDateAll ? 'Total Interest' : 'Interest Due on Date'}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
            {displayDateStr}
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {formatCurrency(isDateAll ? kpis.totalInterestExpected : kpis.dateTotalInterest)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>{isDateAll ? 'Across all loans' : `${kpis.dateItemsCount} payment(s) scheduled`}</span>
          {!isDateAll && (
            <span className="text-emerald-400 font-medium">
              {kpis.datePaidCount} paid / {kpis.datePendingCount} due
            </span>
          )}
        </div>
      </div>

      {/* 2. Total Collection Due (Principal + Interest) */}
      <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {isDateAll ? 'Total Receivable' : 'Total Collection Due'}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
            {isDateAll ? 'Grand Total' : 'Scheduled'}
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {formatCurrency(isDateAll ? kpis.totalPayable : kpis.dateTotalPayable)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Principal portion:</span>
          <span className="text-slate-200 font-medium">
            {formatCurrency(isDateAll ? kpis.totalDisbursed : kpis.dateTotalPrincipal)}
          </span>
        </div>
      </div>

      {/* 3. Total Collected to Date */}
      <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Total Collected
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-medium border border-blue-500/20">
            Money Model
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {formatCurrency(kpis.totalCollected)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Remaining to collect:</span>
          <span className="text-amber-400 font-medium">{formatCurrency(kpis.totalRemaining)}</span>
        </div>
      </div>

      {/* 4. Overdue Alerts or Total Loans */}
      <div className={`bg-slate-900/80 border ${kpis.overdueCount > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'} rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-slate-950/40`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${kpis.overdueCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            <AlertTriangle className="w-4 h-4" /> Overdue Installments
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${kpis.overdueCount > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {kpis.overdueCount} Alerts
          </span>
        </div>
        <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${kpis.overdueCount > 0 ? 'text-rose-300' : 'text-white'}`}>
          {formatCurrency(kpis.overdueAmount)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Active Borrowers:</span>
          <span className="text-slate-200 font-medium">{kpis.totalUsersCount} Users ({kpis.totalLoansCount} Loans)</span>
        </div>
      </div>
    </div>
  );
}
