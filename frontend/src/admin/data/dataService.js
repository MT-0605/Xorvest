import { formatDateToISOString } from '../utils/formatters';

const API_BASE = '/api';

class MernDataService {
  constructor() {
    this.token = localStorage.getItem('xorvest_token') || null;
    this.loans = [];
    this.customers = [];
    this.calendarItems = [];
    this.dashboard = null;
    this.ledger = [];
  }

  async getAuthHeaders() {
    this.token = localStorage.getItem('xorvest_token') || null;

    // Check if token exists; if not, authenticate with seeded admin credentials
    if (!this.token || this.token === 'undefined') {
      try {
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@example.com', password: 'Test@123' })
        });
        const loginData = await loginRes.json();
        if (loginData.token) {
          this.token = loginData.token;
          localStorage.setItem('xorvest_token', this.token);
          if (loginData.user) {
            localStorage.setItem('xorvest_user', JSON.stringify(loginData.user));
          }
        }
      } catch (err) {
        console.warn('Auto admin login failed:', err);
      }
    }

    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
    };
  }

  async fetchAll(selectedDate = null, frequency = 'all') {
    try {
      const headers = await this.getAuthHeaders();
      const dateParam = selectedDate && selectedDate !== 'all' ? selectedDate : formatDateToISOString(new Date());

      // Parallel requests to MERN backend routes
      const [dashRes, loansRes, custRes, calRes, ledgerRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/loans`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/customers`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/calendar?date=${dateParam}&frequency=${frequency}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/payments/ledger`, { headers }).catch(() => null)
      ]);

      if (dashRes && dashRes.ok) {
        const data = await dashRes.json();
        this.dashboard = data.dashboard || null;
      }

      if (loansRes && loansRes.ok) {
        const data = await loansRes.json();
        this.loans = data.loans || [];
      }

      if (custRes && custRes.ok) {
        const data = await custRes.json();
        this.customers = data.customers || [];
      }

      if (calRes && calRes.ok) {
        const data = await calRes.json();
        this.calendarItems = data.collections || [];
      }

      if (ledgerRes && ledgerRes.ok) {
        const data = await ledgerRes.json();
        this.ledger = data.transactions || [];
      }

      return {
        dashboard: this.dashboard,
        loans: this.loans,
        customers: this.customers,
        calendarItems: this.calendarItems,
        ledger: this.ledger
      };
    } catch (err) {
      console.error('MERN fetchAll error:', err);
      throw err;
    }
  }

  getUsers() {
    return this.customers.map((c) => ({
      _id: c.id,
      user_name: c.user_name,
      email: c.email,
      role: 'user',
      createdAt: c.registered_at,
      loansCount: c.loans_count,
      activeLoansCount: c.active_loans_count,
      totalBorrowed: c.total_disbursed,
      totalRemaining: c.total_outstanding
    }));
  }

  getLoans() {
    return this.loans.map((l) => ({
      _id: l.id || l.loan_id,
      loan_id: l.loan_id,
      user_id: l.customer?.id,
      user_name: l.customer?.name,
      email: l.customer?.email,
      amount: l.principal_amount,
      frequency: l.frequency,
      rate: l.interest_rate,
      total_interest: l.total_interest,
      total_day: l.tenure,
      total: l.total_recovery_amount,
      remaining: l.outstanding_balance,
      recovered: l.amount_already_recovered,
      status: l.loan_status,
      createdAt: l.created_at,
      next_due_date: l.next_due_date
    }));
  }

  getMoneyRecords() {
    // If ledger has transactions return those; otherwise generate payment records from settled installments
    if (this.ledger && this.ledger.length > 0) {
      return this.ledger.map((t) => ({
        _id: t._id || t.transaction_id,
        loan_id: t.loan_id,
        date: t.transaction_date || t.createdAt,
        amount: t.amount,
        count: t.installment_number || 1,
        payment_method: t.payment_method || 'cash',
        createdAt: t.createdAt
      }));
    }

    // Recovered records from loans & calendar
    const records = [];
    this.calendarItems
      .filter((i) => i.amount_collected > 0)
      .forEach((item) => {
        records.push({
          _id: `rec_${item.installment_id}`,
          loan_id: item.loan_id,
          date: item.actual_payment_date || item.scheduled_due_date,
          amount: item.amount_collected,
          count: item.installment_number,
          createdAt: item.actual_payment_date || item.scheduled_due_date
        });
      });

    return records;
  }

  getDatewiseSchedule({ date = null, status = 'all', frequency = 'all', searchQuery = '' }) {
    const loanMap = new Map(this.loans.map((l) => [String(l.id || l.loan_id), l]));

    const items = this.calendarItems.map((item) => {
      const loan = loanMap.get(String(item.loan_id)) || null;
      const expectedAmount = Number(item.expected_installment_amount || 0);
      const rate = loan ? Number(loan.interest_rate || 10) : 10;
      const principalAmount = loan ? Number(loan.principal_amount || 0) : expectedAmount;
      
      // Compute interest portion of this installment
      const interestComponent = Number((expectedAmount * (rate / (100 + rate))).toFixed(2)) || Number((expectedAmount * 0.1).toFixed(2));
      const principalComponent = Number((expectedAmount - interestComponent).toFixed(2));

      let displayStatus = 'upcoming';
      if (item.payment_status === 'fully_paid') {
        displayStatus = 'paid';
      } else if (item.days_overdue > 0) {
        displayStatus = 'overdue';
      } else {
        displayStatus = 'due today';
      }

      return {
        id: item.installment_id,
        installment_id: item.installment_id,
        loan_id: String(item.loan_id),
        user_id: item.customer?.id,
        user_name: item.customer?.name || 'Borrower',
        user_email: item.customer?.email || '',
        principal_amount: principalAmount,
        interest_rate: rate,
        frequency: item.frequency || loan?.frequency || 'daily',
        total_days: loan?.tenure || 30,
        installment_number: item.installment_number,
        total_installments: loan ? (loan.tenure || 10) : 10,
        due_date: item.scheduled_due_date,
        interest_to_pay: interestComponent,
        principal_to_pay: principalComponent,
        total_to_pay: expectedAmount,
        remaining_loan_amount: loan ? loan.outstanding_balance : item.outstanding_installment_amount,
        status: displayStatus,
        payment_record: item.amount_collected > 0 ? {
          date: item.actual_payment_date,
          amount: item.amount_collected
        } : null
      };
    });

    return items.filter((item) => {
      if (status !== 'all' && item.status.toLowerCase() !== status.toLowerCase()) return false;
      if (frequency !== 'all' && item.frequency.toLowerCase() !== frequency.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.user_name?.toLowerCase().includes(q);
        const emailMatch = item.user_email?.toLowerCase().includes(q);
        const loanMatch = String(item.loan_id).toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !loanMatch) return false;
      }
      return true;
    });
  }

  getKPIs() {
    if (this.dashboard) {
      return {
        totalDisbursed: this.dashboard.total_principal_disbursed || 0,
        totalPayable: this.dashboard.total_expected_recovery || 0,
        totalInterestExpected: this.dashboard.total_interest_expected || 0,
        totalCollected: this.dashboard.total_amount_recovered || 0,
        totalRemaining: this.dashboard.total_outstanding_amount || 0,
        totalLoansCount: this.dashboard.total_loans_issued || 0,
        totalUsersCount: this.customers.length || 0,
        dateItemsCount: this.calendarItems.length || 0,
        dateTotalInterest: this.calendarItems.reduce((acc, i) => acc + (Number(i.expected_installment_amount || 0) * 0.1), 0),
        dateTotalPrincipal: this.calendarItems.reduce((acc, i) => acc + (Number(i.expected_installment_amount || 0) * 0.9), 0),
        dateTotalPayable: this.calendarItems.reduce((acc, i) => acc + Number(i.expected_installment_amount || 0), 0),
        datePaidCount: this.calendarItems.filter((i) => i.payment_status === 'fully_paid').length,
        datePendingCount: this.calendarItems.filter((i) => i.payment_status !== 'fully_paid').length,
        overdueCount: this.dashboard.total_overdue_installments || 0,
        overdueAmount: this.calendarItems.filter((i) => i.days_overdue > 0).reduce((acc, i) => acc + Number(i.outstanding_installment_amount || 0), 0)
      };
    }

    // Fallback if dashboard not loaded yet
    const loans = this.getLoans();
    const money = this.getMoneyRecords();
    const totalDisbursed = loans.reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const totalPayable = loans.reduce((acc, l) => acc + Number(l.total || 0), 0);

    return {
      totalDisbursed,
      totalPayable,
      totalInterestExpected: totalPayable - totalDisbursed,
      totalCollected: money.reduce((acc, m) => acc + Number(m.amount || 0), 0),
      totalRemaining: loans.reduce((acc, l) => acc + Number(l.remaining || 0), 0),
      totalLoansCount: loans.length,
      totalUsersCount: this.customers.length,
      dateItemsCount: this.calendarItems.length,
      dateTotalInterest: 0,
      dateTotalPrincipal: 0,
      dateTotalPayable: 0,
      datePaidCount: 0,
      datePendingCount: 0,
      overdueCount: 0,
      overdueAmount: 0
    };
  }

  async recordPayment({ loan_id, installment_id, amount, notes = '' }) {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/admin/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        loan_id,
        installment_id,
        amount: Number(amount),
        payment_method: 'cash',
        notes
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || 'Payment recording failed.' };
    }

    // Refresh data
    await this.fetchAll();
    return { success: true, payment: data.payment || data };
  }

  async addLoan(loanData) {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/loans/apply`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: Number(loanData.amount),
        frequency: loanData.frequency,
        rate: Number(loanData.rate),
        total_day: Number(loanData.total_day),
        notes: 'Admin-issued loan contract'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to issue loan');
    }

    await this.fetchAll();
    return data.loan;
  }
}

export const dataService = new MernDataService();
