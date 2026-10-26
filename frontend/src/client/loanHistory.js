const STORAGE_KEY = "xorvest-loan-history";

const DEFAULT_SEEDED_LOANS = [
  {
    id: "loan_demo_weekly_1",
    amount: 14000,
    annualRate: 10,
    duration: 4,
    durationUnit: "Week",
    frequency: "Weekly",
    days: 28,
    totalInterest: 1400,
    totalPayable: 15400,
    installmentCount: 4,
    installment: 3850,
    paidInstallments: [
      { number: 1, paidAt: new Date(Date.now() - 7 * 86400000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: "loan_demo_daily_2",
    amount: 10000,
    annualRate: 10,
    duration: 10,
    durationUnit: "Day",
    frequency: "Daily",
    days: 10,
    totalInterest: 1000,
    totalPayable: 11000,
    installmentCount: 10,
    installment: 1100,
    paidInstallments: [
      { number: 1, paidAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { number: 2, paidAt: new Date(Date.now() - 86400000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  }
];

export function readLoanHistory() {
  try {
    const storedHistory = window.localStorage.getItem(STORAGE_KEY);
    if (!storedHistory) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDED_LOANS));
      return DEFAULT_SEEDED_LOANS;
    }

    const history = JSON.parse(storedHistory);
    if (!Array.isArray(history)) {
      throw new Error("Saved loan history has an invalid format.");
    }

    return history;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Saved loan history could not be read.");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unable to read loan history from this browser.");
  }
}

export function saveLoanRecord(record) {
  const history = readLoanHistory();

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([record, ...history]),
    );
    return record;
  } catch {
    throw new Error(
      "Unable to save this loan plan. Check your browser storage settings and try again.",
    );
  }
}

export function markInstallmentPaid(loanId, installmentNumber) {
  const history = readLoanHistory();
  const loanIndex = history.findIndex((loan) => loan.id === loanId);

  if (loanIndex === -1) {
    throw new Error("This loan could not be found in your browser history.");
  }

  const loan = history[loanIndex];
  if (
    !Number.isInteger(installmentNumber) ||
    installmentNumber < 1 ||
    installmentNumber > getInstallmentCount(loan)
  ) {
    throw new Error("The selected installment is invalid.");
  }

  const paidInstallments = Array.isArray(loan.paidInstallments)
    ? loan.paidInstallments
    : [];

  if (paidInstallments.some((payment) => payment.number === installmentNumber)) {
    return loan;
  }

  const updatedLoan = {
    ...loan,
    paidInstallments: [
      ...paidInstallments,
      { number: installmentNumber, paidAt: new Date().toISOString() },
    ],
  };
  history[loanIndex] = updatedLoan;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return updatedLoan;
  } catch {
    throw new Error(
      "Unable to update this installment. Check your browser storage settings and try again.",
    );
  }
}

export function getInstallmentCount(loan) {
  if (Number.isInteger(loan.installmentCount) && loan.installmentCount > 0) {
    return loan.installmentCount;
  }

  const days = Number(loan.days);
  if (!Number.isFinite(days) || days <= 0) {
    return 0;
  }

  if (loan.frequency === "Daily") {
    return Math.ceil(days);
  }
  if (loan.frequency === "Weekly") {
    return Math.ceil(days / 7);
  }
  if (loan.frequency === "Monthly") {
    return Math.ceil(days / 30);
  }
  return 0;
}

export function getLoanRecord(id) {
  return readLoanHistory().find((record) => record.id === id) ?? null;
}
