import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  Layers, 
  CreditCard, 
  Receipt, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Download 
} from 'lucide-react';
import { dataService } from './data/dataService';
import { formatDateToISOString, formatDate, formatCurrency } from './utils/formatters';

import AdminNavbar from './components/AdminNavbar';
import StatsCards from './components/StatsCards';
import DateFilterBar from './components/DateFilterBar';
import DatewiseInterestTable from './components/DatewiseInterestTable';
import LoansTable from './components/LoansTable';
import MoneyTable from './components/MoneyTable';
import UsersTable from './components/UsersTable';
import RecordPaymentModal from './components/RecordPaymentModal';
import AddLoanModal from './components/AddLoanModal';
import LoanDetailsModal from './components/LoanDetailsModal';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [money, setMoney] = useState([]);

  // Date filter state - default to Today's date
  const [selectedDate, setSelectedDate] = useState(() => formatDateToISOString(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'datewise' | 'loans' | 'money' | 'users'

  // Modals state
  const [paymentModalItem, setPaymentModalItem] = useState(null);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [viewingLoanId, setViewingLoanId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load data on mount
  const refreshData = () => {
    setUsers(dataService.getUsers());
    setLoans(dataService.getLoans());
    setMoney(dataService.getMoneyRecords());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Date-wise schedule items for active filters
  const datewiseItems = useMemo(() => {
    return dataService.getDatewiseSchedule({
      date: selectedDate,
      status: statusFilter,
      frequency: frequencyFilter,
      searchQuery
    });
  }, [users, loans, money, selectedDate, statusFilter, frequencyFilter, searchQuery]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const targetDate = selectedDate === 'all' ? new Date() : new Date(selectedDate);
    return dataService.getKPIs(targetDate);
  }, [users, loans, money, selectedDate]);

  // Action handlers
  const handleRecordPayment = (paymentData) => {
    const res = dataService.recordPayment(paymentData);
    if (res.success) {
      refreshData();
      showToast(`Payment of ${formatCurrency(paymentData.amount)} recorded successfully!`);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleAddLoan = (loanData) => {
    const newLoan = dataService.addLoan(loanData);
    refreshData();
    showToast(`New loan of ${formatCurrency(newLoan.amount)} created successfully!`);
  };

  const handleAddUser = (userData) => {
    const newUser = dataService.addUser(userData);
    refreshData();
    return newUser;
  };

  const handleResetData = () => {
    if (window.confirm('Reset all loans and payments back to the initial demo database?')) {
      dataService.resetToDefaults();
      refreshData();
      showToast('Database reset to initial demo state!');
    }
  };

  const handleExportCSV = () => {
    const rows = datewiseItems.map((item) => ({
      DueDate: formatDate(item.due_date),
      BorrowerName: item.user_name,
      BorrowerEmail: item.user_email,
      LoanPrincipal: item.principal_amount,
      InterestRatePercent: item.interest_rate,
      InterestPayable: item.interest_to_pay,
      PrincipalPayable: item.principal_to_pay,
      TotalInstallment: item.total_to_pay,
      InstallmentCount: `${item.installment_number}/${item.total_installments}`,
      Frequency: item.frequency,
      RemainingBalance: item.remaining_loan_amount,
      Status: item.status
    }));

    if (rows.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [
      headers,
      ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `xorvest_datewise_interest_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs sm:text-sm font-semibold ${
            toastMessage.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-700/60'
              : 'bg-emerald-950 text-emerald-200 border-emerald-600/60'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage.message}
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <AdminNavbar
        onOpenAddLoan={() => setIsAddLoanOpen(true)}
        onResetData={handleResetData}
        onExportData={handleExportCSV}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Page Title & Intro */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Admin Loan Dashboard</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                Live Datewise Tracking
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Monitor on which date who has to pay how much interest with loan principal, interest rates, and borrower records across all system models.
            </p>
          </div>
        </div>

        {/* Top Financial KPI Metrics */}
        <StatsCards kpis={kpis} selectedDate={selectedDate} />

        {/* Interactive Filter Bar (Date picker, tabs, search, dropdowns) */}
        <DateFilterBar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          frequencyFilter={frequencyFilter}
          onFrequencyChange={setFrequencyFilter}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Display Views according to activeTab */}
        {(activeTab === 'all' || activeTab === 'datewise') && (
          <section id="datewise-table-section">
            <DatewiseInterestTable
              items={datewiseItems}
              selectedDate={selectedDate}
              onRecordPayment={(item) => setPaymentModalItem(item)}
              onViewLoan={(id) => setViewingLoanId(id)}
            />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'loans') && (
          <section id="loans-table-section">
            <LoansTable
              loans={loans}
              users={users}
              onViewLoan={(id) => setViewingLoanId(id)}
              onOpenAddLoan={() => setIsAddLoanOpen(true)}
            />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'money') && (
          <section id="money-table-section">
            <MoneyTable
              moneyRecords={money}
              loans={loans}
              users={users}
            />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'users') && (
          <section id="users-table-section">
            <UsersTable
              users={users}
              loans={loans}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>Xorvest Loan Management System • Admin Dashboard with Date-wise Interest Computation</p>
      </footer>

      {/* Record Payment Modal */}
      {paymentModalItem && (
        <RecordPaymentModal
          item={paymentModalItem}
          onClose={() => setPaymentModalItem(null)}
          onConfirm={handleRecordPayment}
        />
      )}

      {/* Add Loan Modal */}
      {isAddLoanOpen && (
        <AddLoanModal
          users={users.filter((u) => u.role !== 'admin')}
          onClose={() => setIsAddLoanOpen(false)}
          onAddLoan={handleAddLoan}
          onAddUser={handleAddUser}
        />
      )}

      {/* Loan Details Modal */}
      {viewingLoanId && (
        <LoanDetailsModal
          loanId={viewingLoanId}
          loans={loans}
          users={users}
          moneyRecords={money}
          onClose={() => setViewingLoanId(null)}
          onRecordPayment={(item) => setPaymentModalItem(item)}
        />
      )}
    </div>
  );
}
