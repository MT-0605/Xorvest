/**
 * Loan Calculation Utilities
 * Aligned with models from Cloud MongoDB:
 * User (user_id / _id, user_name, email, role)
 * Loan (loan_id / _id, amount, frequency, rate, total_day, user_id, total, remaining)
 * Money (loan_id, date, amount, count)
 */

export const calculateLoanSummary = (amount, rate, frequency, totalDays) => {
  const p = Number(amount) || 0;
  const r = Number(rate) || 0;
  const days = Math.max(1, Number(totalDays) || 30);

  // Simple interest calculation: (P * R) / 100
  const totalInterest = Number(((p * r) / 100).toFixed(2));
  const totalPayable = Number((p + totalInterest).toFixed(2));

  let intervalDays = 1;
  let installmentCount = days;

  if (frequency === 'weekly') {
    intervalDays = 7;
    installmentCount = Math.max(1, Math.round(days / 7));
  } else if (frequency === 'monthly') {
    intervalDays = 30;
    installmentCount = Math.max(1, Math.round(days / 30));
  } else {
    // daily
    intervalDays = 1;
    installmentCount = days;
  }

  const perInstallmentTotal = Number((totalPayable / installmentCount).toFixed(2));
  const perInstallmentInterest = Number((totalInterest / installmentCount).toFixed(2));
  const perInstallmentPrincipal = Number((p / installmentCount).toFixed(2));

  return {
    principal: p,
    interestRate: r,
    totalInterest,
    totalPayable,
    frequency,
    totalDays: days,
    installmentCount,
    intervalDays,
    perInstallmentTotal,
    perInstallmentInterest,
    perInstallmentPrincipal
  };
};

/**
 * Generate repayment schedule items from cloud loan data
 */
export const generateLoanSchedule = (loan, moneyRecords = [], user = null) => {
  if (!loan) return [];

  const {
    amount,
    rate,
    frequency,
    total_day,
    _id,
    loan_id,
    createdAt
  } = loan;

  const actualLoanId = String(loan_id || _id);
  const summary = calculateLoanSummary(amount, rate, frequency, total_day);

  // Find payments matching this loan
  const loanPayments = (moneyRecords || []).filter(
    (m) => String(m.loan_id) === actualLoanId || String(m.loan_id) === String(_id)
  );

  // Determine base start date
  let startDate = new Date();
  if (createdAt) {
    startDate = new Date(createdAt);
  } else if (loanPayments.length > 0) {
    const dates = loanPayments.map((p) => new Date(p.date).getTime()).filter((t) => !isNaN(t));
    if (dates.length > 0) {
      startDate = new Date(Math.min(...dates));
      startDate.setDate(startDate.getDate() - summary.intervalDays);
    }
  }

  const schedule = [];

  for (let i = 1; i <= summary.installmentCount; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (i * summary.intervalDays));

    const matchingPayment = loanPayments.find(
      (m) => Number(m.count) === i
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dueDay = new Date(dueDate);
    dueDay.setHours(0, 0, 0, 0);

    let status = 'upcoming';
    if (matchingPayment) {
      status = 'paid';
    } else if (dueDay.getTime() === now.getTime()) {
      status = 'due today';
    } else if (dueDay.getTime() < now.getTime()) {
      status = 'overdue';
    } else {
      status = 'upcoming';
    }

    schedule.push({
      id: `${actualLoanId}-inst-${i}`,
      loan_id: actualLoanId,
      user_id: loan.user_id,
      user_name: user?.user_name || 'Borrower',
      user_email: user?.email || '',
      principal_amount: amount,
      interest_rate: rate,
      frequency,
      total_days: total_day,
      installment_number: i,
      total_installments: summary.installmentCount,
      due_date: dueDate.toISOString(),
      interest_to_pay: summary.perInstallmentInterest,
      principal_to_pay: summary.perInstallmentPrincipal,
      total_to_pay: summary.perInstallmentTotal,
      remaining_loan_amount: loan.remaining,
      status,
      payment_record: matchingPayment || null
    });
  }

  return schedule;
};
