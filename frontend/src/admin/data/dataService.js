import { getInitialData } from './mockData';
import { generateLoanSchedule, calculateLoanSummary } from '../utils/loanCalculations';
import { isSameDay, formatDateToISOString } from '../utils/formatters';

const STORAGE_KEYS = {
  USERS: 'xorvest_admin_users',
  LOANS: 'xorvest_admin_loans',
  MONEY: 'xorvest_admin_money'
};

class DataService {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS) || !localStorage.getItem(STORAGE_KEYS.LOANS)) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    const initial = getInitialData();
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initial.users));
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(initial.loans));
    localStorage.setItem(STORAGE_KEYS.MONEY, JSON.stringify(initial.money));
    return initial;
  }

  getUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse users', e);
      return [];
    }
  }

  getLoans() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOANS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse loans', e);
      return [];
    }
  }

  getMoneyRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MONEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse money records', e);
      return [];
    }
  }

  addUser(userData) {
    const users = this.getUsers();
    const newUser = {
      _id: 'usr_' + Date.now().toString(36),
      user_name: userData.user_name,
      email: userData.email,
      password: 'demo_password',
      role: userData.role || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.unshift(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  }

  addLoan(loanData) {
    const loans = this.getLoans();
    const { amount, frequency, rate, total_day, user_id } = loanData;

    const summary = calculateLoanSummary(amount, rate, frequency, total_day);

    const newLoan = {
      _id: 'loan_' + Math.floor(1000 + Math.random() * 9000),
      user_id: user_id,
      amount: Number(amount),
      frequency,
      rate: Number(rate),
      total_day: Number(total_day),
      total: summary.totalPayable,
      remaining: summary.totalPayable,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    loans.unshift(newLoan);
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
    return newLoan;
  }

  recordPayment({ loan_id, count, amount, date = new Date().toISOString() }) {
    const moneyRecords = this.getMoneyRecords();
    const loans = this.getLoans();

    // Check if payment for this count already exists
    const existing = moneyRecords.find(
      (m) => String(m.loan_id) === String(loan_id) && Number(m.count) === Number(count)
    );

    if (existing) {
      return { success: false, message: `Installment #${count} is already marked as paid.` };
    }

    const newMoneyRecord = {
      _id: 'mny_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      loan_id,
      date,
      amount: Number(amount),
      count: Number(count),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    moneyRecords.push(newMoneyRecord);
    localStorage.setItem(STORAGE_KEYS.MONEY, JSON.stringify(moneyRecords));

    // Update loan's remaining amount
    const loanIndex = loans.findIndex((l) => String(l._id) === String(loan_id));
    if (loanIndex !== -1) {
      const updatedRemaining = Math.max(0, Number((loans[loanIndex].remaining - Number(amount)).toFixed(2)));
      loans[loanIndex].remaining = updatedRemaining;
      loans[loanIndex].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
    }

    return { success: true, payment: newMoneyRecord };
  }

  /**
   * Retrieves all date-wise schedule items across all loans
   */
  getAllScheduleItems() {
    const users = this.getUsers();
    const loans = this.getLoans();
    const money = this.getMoneyRecords();

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    let allItems = [];

    loans.forEach((loan) => {
      const user = userMap.get(String(loan.user_id));
      const loanSchedule = generateLoanSchedule(loan, money, user);
      allItems = allItems.concat(loanSchedule);
    });

    // Sort by due_date ascending
    allItems.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    return allItems;
  }

  /**
   * Get date-wise dues & interest for a specific date or date filter
   */
  getDatewiseSchedule({ date = null, status = 'all', frequency = 'all', searchQuery = '' }) {
    const allItems = this.getAllScheduleItems();

    return allItems.filter((item) => {
      // Date filter
      if (date && date !== 'all') {
        const itemDateStr = formatDateToISOString(item.due_date);
        const targetDateStr = formatDateToISOString(date);
        if (itemDateStr !== targetDateStr) return false;
      }

      // Status filter
      if (status !== 'all') {
        if (item.status.toLowerCase() !== status.toLowerCase()) return false;
      }

      // Frequency filter
      if (frequency !== 'all') {
        if (item.frequency.toLowerCase() !== frequency.toLowerCase()) return false;
      }

      // Search query (name, email, loan ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.user_name?.toLowerCase().includes(q);
        const emailMatch = item.user_email?.toLowerCase().includes(q);
        const loanMatch = item.loan_id?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !loanMatch) return false;
      }

      return true;
    });
  }

  /**
   * Get overarching KPI metrics
   */
  getKPIs(selectedDate = new Date()) {
    const loans = this.getLoans();
    const money = this.getMoneyRecords();
    const users = this.getUsers();
    const allSchedule = this.getAllScheduleItems();

    const totalDisbursed = loans.reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const totalPayable = loans.reduce((acc, l) => acc + Number(l.total || 0), 0);
    const totalInterestExpected = totalPayable - totalDisbursed;
    const totalCollected = money.reduce((acc, m) => acc + Number(m.amount || 0), 0);
    const totalRemaining = loans.reduce((acc, l) => acc + Number(l.remaining || 0), 0);

    // Selected date items
    const selectedDateStr = formatDateToISOString(selectedDate);
    const dateItems = allSchedule.filter(
      (item) => formatDateToISOString(item.due_date) === selectedDateStr
    );

    const dateTotalInterest = dateItems.reduce((acc, i) => acc + Number(i.interest_to_pay || 0), 0);
    const dateTotalPrincipal = dateItems.reduce((acc, i) => acc + Number(i.principal_to_pay || 0), 0);
    const dateTotalPayable = dateItems.reduce((acc, i) => acc + Number(i.total_to_pay || 0), 0);
    const datePaidItems = dateItems.filter((i) => i.status === 'paid');
    const datePendingItems = dateItems.filter((i) => i.status !== 'paid');

    const overdueItems = allSchedule.filter((i) => i.status === 'overdue');

    return {
      totalDisbursed,
      totalPayable,
      totalInterestExpected,
      totalCollected,
      totalRemaining,
      totalLoansCount: loans.length,
      totalUsersCount: users.filter((u) => u.role !== 'admin').length,
      // Date specific
      dateItemsCount: dateItems.length,
      dateTotalInterest,
      dateTotalPrincipal,
      dateTotalPayable,
      datePaidCount: datePaidItems.length,
      datePendingCount: datePendingItems.length,
      overdueCount: overdueItems.length,
      overdueAmount: overdueItems.reduce((acc, i) => acc + Number(i.total_to_pay || 0), 0)
    };
  }
}

export const dataService = new DataService();
