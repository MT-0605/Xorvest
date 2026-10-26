import React from 'react';
import { 
  Receipt, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  ArrowDownLeft, 
  Clock 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function MoneyTable({ moneyRecords, loans, users }) {
  const loanMap = new Map((loans || []).map((l) => [String(l._id), l]));
  const userMap = new Map((users || []).map((u) => [String(u._id), u]));

  // Sort by date descending
  const sortedRecords = [...(moneyRecords || [])].sort(
    (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-8">
      {/* Table Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              Payments & Collections (Money Model)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
              Money Model ({moneyRecords.length})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Realized cash inflows: Recorded payments, installment sequences, and transaction timestamps.
          </p>
        </div>

        <div className="text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          <span>Total Collected:</span>
          <span className="font-bold text-emerald-400">
            {formatCurrency(moneyRecords.reduce((acc, m) => acc + Number(m.amount || 0), 0))}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase font-bold tracking-wider text-slate-400">
              <th className="py-3.5 px-4">Receipt ID</th>
              <th className="py-3.5 px-4">Payment Date</th>
              <th className="py-3.5 px-4">Borrower Name</th>
              <th className="py-3.5 px-4">Linked Loan</th>
              <th className="py-3.5 px-4 text-center">Installment # (count)</th>
              <th className="py-3.5 px-4 text-right">Amount Received</th>
              <th className="py-3.5 px-4 text-center">Verification</th>
              <th className="py-3.5 px-4 text-center">Recorded Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">
                  No payment records found yet.
                </td>
              </tr>
            ) : (
              sortedRecords.map((m) => {
                const loan = loanMap.get(String(m.loan_id));
                const user = loan ? userMap.get(String(loan.user_id)) : null;

                return (
                  <tr key={m._id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Receipt ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-300 whitespace-nowrap">
                      {m._id}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{formatDate(m.date)}</div>
                    </td>

                    {/* Borrower */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">
                        {user?.user_name || 'Borrower'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {user?.email || ''}
                      </div>
                    </td>

                    {/* Loan ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                        {m.loan_id}
                      </span>
                      {loan && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {loan.frequency} • {formatCurrency(loan.amount)}
                        </div>
                      )}
                    </td>

                    {/* Installment count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700">
                        #{m.count}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-bold text-emerald-400 text-sm">
                        {formatCurrency(m.amount)}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-center text-slate-400 whitespace-nowrap text-xs">
                      {new Date(m.createdAt || m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {formatDate(m.createdAt || m.date)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
