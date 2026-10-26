import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  Layers, 
  Clock, 
  ChevronRight, 
  SlidersHorizontal 
} from 'lucide-react';
import { formatDateToISOString } from '../utils/formatters';

export default function DateFilterBar({
  selectedDate,
  onDateChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  frequencyFilter,
  onFrequencyChange,
  activeTab,
  onTabChange
}) {
  const todayStr = formatDateToISOString(new Date());

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateToISOString(d);
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateToISOString(d);
  };

  const tomorrowStr = getTomorrowStr();
  const yesterdayStr = getYesterdayStr();

  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;
  const isYesterday = selectedDate === yesterdayStr;
  const isAllDates = selectedDate === 'all';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 mb-6">
      {/* Top row: Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => onTabChange('all')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            All Tables View
          </button>

          <button
            onClick={() => onTabChange('datewise')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'datewise'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Date-wise Interest & Dues
          </button>

          <button
            onClick={() => onTabChange('loans')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'loans'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Loans Table
          </button>

          <button
            onClick={() => onTabChange('money')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'money'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Money Payments
          </button>

          <button
            onClick={() => onTabChange('users')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Users Table
          </button>
        </div>

        {/* Date Quick Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onDateChange(todayStr)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              isToday ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onDateChange(tomorrowStr)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              isTomorrow ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => onDateChange(yesterdayStr)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              isYesterday ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => onDateChange('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              isAllDates ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Dates
          </button>
        </div>
      </div>

      {/* Bottom row: Search, Date Picker, Frequency & Status dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by person name, email, loan ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        {/* Date Picker Input */}
        <div className="md:col-span-3 relative">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-400 shrink-0">Date:</span>
            <input
              type="date"
              value={selectedDate === 'all' ? '' : selectedDate}
              onChange={(e) => onDateChange(e.target.value || 'all')}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-100 focus:outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Frequency Filter */}
        <div className="md:col-span-2.5">
          <div className="relative">
            <select
              value={frequencyFilter}
              onChange={(e) => onFrequencyChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Frequency: All</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2.5">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="due today">Due Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
