import React from 'react';
import { 
  X, 
  CreditCard, 
  User, 
  Percent, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Receipt
} from 'lucide-react';
import { generateLoanSchedule } from '../utils/loanCalculations';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/formatters';

export default function LoanDetailsModal({ loanId, loans, users, moneyRecords, onClose, onRecordPayment }) {
  const loan = (loans || []).find((l) => String(l._id) === String(loanId));
  const user = loan ? (users || []).find((u) => String(u._id) === String(loan.user_id)) : null;

  if (!loan) return null;

  const schedule = generateLoanSchedule(loan, moneyRecords, user);
  const total = Number(loan.total) || 0;
  const remaining = Number(loan.remaining) || 0;
  const repaid = Math.max(0, total - remaining);
  const percentRepaid = total > 0 ? Math.min(100, Math.round((repaid / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Loan Breakdown</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                  {loan._id}
                </span>
              </div>
              <p className="text-xs text-slate-400">Borrower: {user?.user_name || 'Borrower'} ({user?.email})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loan Metrics Strip */}
        <div className="p-6 bg-slate-950/30 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Principal</span>
              <div className="text-lg font-extrabold text-white mt-0.5">{formatCurrency(loan.amount)}</div>
              <span className="text-xs text-teal-400 font-medium">@ {loan.rate}% interest</span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Payable</span>
              <div className="text-lg font-extrabold text-white mt-0.5">{formatCurrency(loan.total)}</div>
              <span className="text-xs text-slate-400">{loan.frequency} • {loan.total_day} days</span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Repaid So Far</span>
              <div className="text-lg font-extrabold text-emerald-400 mt-0.5">{formatCurrency(repaid)}</div>
              <span className="text-xs text-emerald-400 font-medium">{percentRepaid}% completed</span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Remaining Balance</span>
              <div className="text-lg font-extrabold text-amber-400 mt-0.5">{formatCurrency(loan.remaining)}</div>
              <span className="text-xs text-slate-400">{schedule.filter((s) => s.status !== 'paid').length} payments left</span>
            </div>
          </div>
        </div>

        {/* Schedule Table Container */}
        <div className="overflow-y-auto p-6 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Complete Repayment & Interest Schedule
          </h4>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Interest Due</th>
                  <th className="py-2.5 px-3 text-right">Principal Due</th>
                  <th className="py-2.5 px-3 text-right">Total Installment</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {schedule.map((item) => {
                  const badge = getStatusBadge(item.status);
                  const isPaid = item.status === 'paid';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-300">
                        #{item.installment_number}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-200">
                        {formatDate(item.due_date)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-400 whitespace-nowrap">
                        +{formatCurrency(item.interest_to_pay)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">
                        {formatCurrency(item.principal_to_pay)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white whitespace-nowrap">
                        {formatCurrency(item.total_to_pay)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        ) : (
                          <button
                            onClick={() => onRecordPayment(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
                          >
                            <Receipt className="w-3 h-3" />
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
