import React from 'react';
import { 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Percent, 
  ArrowUpRight,
  Receipt,
  Eye,
  Check
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/formatters';

export default function DatewiseInterestTable({ 
  items, 
  onRecordPayment, 
  onViewLoan,
  selectedDate 
}) {
  const isDateAll = selectedDate === 'all';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-8">
      {/* Table Header / Banner */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Date-wise Interest & Repayment Schedule
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {items.length} records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking of borrowers, due dates, loan principal, interest rates, and exact interest payable.
          </p>
        </div>

        {/* Date Context Indicator */}
        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span>Active filter:</span>
          <span className="font-semibold text-white">
            {isDateAll ? 'All Scheduled Dates' : formatDate(selectedDate)}
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase font-bold tracking-wider text-slate-400">
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4">Borrower Name</th>
              <th className="py-3.5 px-4 text-right">Loan Principal</th>
              <th className="py-3.5 px-4 text-center">Interest Rate</th>
              <th className="py-3.5 px-4 text-right">Interest Due</th>
              <th className="py-3.5 px-4 text-right">Total Installment</th>
              <th className="py-3.5 px-4 text-center">Installment #</th>
              <th className="py-3.5 px-4 text-center">Frequency</th>
              <th className="py-3.5 px-4 text-right">Remaining Balance</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
            {items.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="font-medium text-slate-300">No scheduled dues found</p>
                    <p className="text-xs text-slate-500">
                      Try selecting another date, clearing filters, or create a new loan.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const statusBadge = getStatusBadge(item.status);
                const isPaid = item.status === 'paid';

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* 1. Due Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">
                        {formatDate(item.due_date)}
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize">
                        {item.status === 'due today' ? (
                          <span className="text-amber-400 font-medium">Due Today</span>
                        ) : item.status === 'overdue' ? (
                          <span className="text-rose-400 font-medium">Overdue</span>
                        ) : (
                          new Date(item.due_date).toLocaleDateString('en-US', { weekday: 'short' })
                        )}
                      </div>
                    </td>

                    {/* 2. Borrower Name & Person Details */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                          {item.user_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-emerald-300 transition-colors">
                            {item.user_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.user_email || `ID: ${item.user_id}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Loan Principal Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-medium text-slate-200">
                        {formatCurrency(item.principal_amount)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Loan #{item.loan_id.replace('loan_', '')}
                      </div>
                    </td>

                    {/* 4. Interest Rate (%) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 font-semibold text-xs border border-teal-500/30">
                        <Percent className="w-3 h-3 text-teal-400" />
                        {item.interest_rate}%
                      </span>
                    </td>

                    {/* 5. Interest Due on this date */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                        +{formatCurrency(item.interest_to_pay)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        interest component
                      </div>
                    </td>

                    {/* 6. Total Installment Due (Principal + Interest) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-semibold text-white">
                        {formatCurrency(item.total_to_pay)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        (incl. {formatCurrency(item.principal_to_pay)} prin.)
                      </div>
                    </td>

                    {/* 7. Installment Count (#) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="font-medium text-slate-300">
                        {item.installment_number}
                      </span>
                      <span className="text-slate-500 text-xs">
                        /{item.total_installments}
                      </span>
                    </td>

                    {/* 8. Frequency */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="capitalize px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.frequency}
                      </span>
                    </td>

                    {/* 9. Remaining Loan Balance */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-medium text-slate-300">
                        {formatCurrency(item.remaining_loan_amount)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        balance
                      </div>
                    </td>

                    {/* 10. Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* 11. Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {isPaid ? (
                          <span 
                            title={`Paid on ${formatDate(item.payment_record?.date || item.due_date)}`}
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-600/30 px-2.5 py-1 rounded-lg font-medium"
                          >
                            <Check className="w-3.5 h-3.5" /> Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => onRecordPayment(item)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 transition active:scale-95"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Record Pay
                          </button>
                        )}

                        <button
                          onClick={() => onViewLoan(item.loan_id)}
                          title="View complete loan overview"
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
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
