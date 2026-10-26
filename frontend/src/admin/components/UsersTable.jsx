import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Calendar, 
  CreditCard, 
  Wallet 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function UsersTable({ users, loans }) {
  // Compute user loan metrics
  const getUserStats = (userId) => {
    const userLoans = (loans || []).filter((l) => String(l.user_id) === String(userId));
    const totalBorrowed = userLoans.reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const totalRemaining = userLoans.reduce((acc, l) => acc + Number(l.remaining || 0), 0);
    const activeCount = userLoans.filter((l) => Number(l.remaining) > 0).length;

    return {
      loanCount: userLoans.length,
      activeCount,
      totalBorrowed,
      totalRemaining
    };
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-8">
      {/* Table Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Borrowers & System Users (User Model)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              User Model ({users.length})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered accounts, borrower profiles, roles, and aggregate debt balance.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase font-bold tracking-wider text-slate-400">
              <th className="py-3.5 px-4">User ID</th>
              <th className="py-3.5 px-4">Name</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4 text-center">System Role</th>
              <th className="py-3.5 px-4 text-center">Active Loans</th>
              <th className="py-3.5 px-4 text-right">Total Borrowed</th>
              <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
              <th className="py-3.5 px-4 text-center">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const stats = getUserStats(u._id);
                const isAdmin = u.role === 'admin';

                return (
                  <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                    {/* User ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-400 whitespace-nowrap">
                      {u._id}
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-indigo-300 border border-slate-700'
                        }`}>
                          {u.user_name.charAt(0)}
                        </div>
                        <span className="font-semibold text-white">
                          {u.user_name}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Borrower
                        </span>
                      )}
                    </td>

                    {/* Active Loans */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-semibold text-slate-200 text-xs border border-slate-700">
                        {stats.activeCount} / {stats.loanCount}
                      </span>
                    </td>

                    {/* Total Borrowed */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-200 whitespace-nowrap">
                      {formatCurrency(stats.totalBorrowed)}
                    </td>

                    {/* Outstanding Balance */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-semibold ${stats.totalRemaining > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {formatCurrency(stats.totalRemaining)}
                      </span>
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-4 text-center text-slate-400 whitespace-nowrap text-xs">
                      {formatDate(u.createdAt)}
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
