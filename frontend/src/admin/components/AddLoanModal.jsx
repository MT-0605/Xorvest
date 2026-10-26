import React, { useState, useMemo } from 'react';
import { 
  X, 
  CreditCard, 
  Plus, 
  Calendar, 
  Percent, 
  User, 
  Calculator, 
  Clock 
} from 'lucide-react';
import { calculateLoanSummary } from '../utils/loanCalculations';
import { formatCurrency } from '../utils/formatters';

export default function AddLoanModal({ users, onClose, onAddLoan, onAddUser }) {
  const [selectedUserId, setSelectedUserId] = useState(users?.[0]?._id || '');
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  const [amount, setAmount] = useState('10000');
  const [rate, setRate] = useState('12');
  const [frequency, setFrequency] = useState('daily');
  const [totalDay, setTotalDay] = useState('30');

  // Dynamic calculations
  const summary = useMemo(() => {
    return calculateLoanSummary(amount, rate, frequency, totalDay);
  }, [amount, rate, frequency, totalDay]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let targetUserId = selectedUserId;

    if (isCreatingNewUser) {
      if (!newUserName.trim() || !newUserEmail.trim()) {
        alert('Please provide borrower name and email');
        return;
      }
      const createdUser = onAddUser({
        user_name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: 'user'
      });
      targetUserId = createdUser._id;
    }

    if (!targetUserId) {
      alert('Please select or create a borrower');
      return;
    }

    onAddLoan({
      user_id: targetUserId,
      amount: Number(amount),
      frequency,
      rate: Number(rate),
      total_day: Number(totalDay)
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Issue New Loan</h3>
              <p className="text-xs text-slate-400">Configure principal, interest rate, and repayment frequency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Borrower Selection */}
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Borrower (User Model)
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewUser(!isCreatingNewUser)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {isCreatingNewUser ? 'Select Existing Borrower' : '+ Quick Add New Borrower'}
              </button>
            </div>

            {isCreatingNewUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name (e.g. John Doe)"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.user_name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount & Interest Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Loan Principal Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Frequency & Total Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Payment Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Loan Duration (Total Days)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={totalDay}
                onChange={(e) => setTotalDay(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Live Loan Calculation Summary Preview */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Calculator className="w-4 h-4" />
              Live Repayment Preview
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Total Interest:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(summary.totalInterest)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Total Payable:</span>
                <span className="font-bold text-white">{formatCurrency(summary.totalPayable)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Installments:</span>
                <span className="font-bold text-teal-300">{summary.installmentCount} {frequency}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Per Installment:</span>
                <span className="font-bold text-white">{formatCurrency(summary.perInstallmentTotal)}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-emerald-500/20 pt-2 flex justify-between">
              <span>Each payment includes:</span>
              <span className="text-emerald-300">
                {formatCurrency(summary.perInstallmentInterest)} interest + {formatCurrency(summary.perInstallmentPrincipal)} principal
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create & Issue Loan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
