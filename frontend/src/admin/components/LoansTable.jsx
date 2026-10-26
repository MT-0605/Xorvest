import React from 'react';
import { 
  CreditCard, 
  User, 
  Calendar, 
  Percent, 
  Eye, 
  PlusCircle, 
  TrendingDown, 
  Clock 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function LoansTable({ loans, users, onViewLoan, onOpenAddLoan }) {
  const userMap = new Map((users || []).map((u) => [String(u._id), u]));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-8">
      {/* Table Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-400" />
              Loans Master Table
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
              Loan Model ({loans.length})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full view of loan contracts: Principal, interest rate, tenure, total amount, and remaining balance.
          </p>
        </div>

        <button
          onClick={onOpenAddLoan}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add New Loan
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase font-bold tracking-wider text-slate-400">
              <th className="py-3.5 px-4">Loan ID</th>
              <th className="py-3.5 px-4">Borrower (User Model)</th>
              <th className="py-3.5 px-4 text-right">Principal Amount</th>
              <th className="py-3.5 px-4 text-center">Interest Rate</th>
              <th className="py-3.5 px-4 text-center">Frequency</th>
              <th className="py-3.5 px-4 text-center">Duration (Total Days)</th>
              <th className="py-3.5 px-4 text-right">Total Payable</th>
              <th className="py-3.5 px-4 text-right">Remaining Balance</th>
              <th className="py-3.5 px-4 text-center">Repaid %</th>
              <th className="py-3.5 px-4 text-center">Created Date</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
            {loans.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-8 text-center text-slate-400">
                  No loans found.
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const user = userMap.get(String(loan.user_id));
                const total = Number(loan.total) || 0;
                const remaining = Number(loan.remaining) || 0;
                const repaid = Math.max(0, total - remaining);
                const percentRepaid = total > 0 ? Math.min(100, Math.round((repaid / total) * 100)) : 0;
                const isFullyPaid = remaining <= 0;

                return (
                  <tr key={loan._id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Loan ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400 whitespace-nowrap">
                      {loan._id}
                    </td>

                    {/* Borrower */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-teal-300">
                          {user?.user_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{user?.user_name || 'Unknown'}</div>
                          <div className="text-[10px] text-slate-500">{user?.email || loan.user_id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Principal Amount */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-100 whitespace-nowrap">
                      {formatCurrency(loan.amount)}
                    </td>

                    {/* Interest Rate */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-semibold text-xs border border-emerald-500/20">
                        {loan.rate}%
                      </span>
                    </td>

                    {/* Frequency */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="capitalize px-2 py-0.5 rounded-md text-xs bg-slate-800 text-slate-300 border border-slate-700">
                        {loan.frequency}
                      </span>
                    </td>

                    {/* Total Days */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-300 font-medium">
                      {loan.total_day} days
                    </td>

                    {/* Total Payable */}
                    <td className="py-3.5 px-4 text-right font-semibold text-white whitespace-nowrap">
                      {formatCurrency(loan.total)}
                    </td>

                    {/* Remaining */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-semibold ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {formatCurrency(loan.remaining)}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="w-24 mx-auto">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>{percentRepaid}%</span>
                          <span>{isFullyPaid ? 'Done' : 'Active'}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-teal-400'}`}
                            style={{ width: `${percentRepaid}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-center text-slate-400 whitespace-nowrap text-xs">
                      {formatDate(loan.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onViewLoan(loan._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-400" />
                        Details
                      </button>
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
