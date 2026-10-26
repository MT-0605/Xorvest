import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  getInstallmentCount,
  getLoanRecord,
  markInstallmentPaid,
  readLoanHistory,
} from "./loanHistory.js";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const preciseCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function PageNavigation() {
  return (
    <nav className="mb-8 flex flex-wrap justify-center gap-5 text-sm">
      <Link className="text-[#168cf2] hover:text-[#65adff]" to="/">
        Loan planner
      </Link>
      <Link className="text-[#168cf2] hover:text-[#65adff]" to="/history">
        Loan history
      </Link>
    </nav>
  );
}

function StorageError({ message }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl font-bold text-[#f1f1f3]">
        Could not load loan details
      </h1>
      <p className="mt-3 text-sm text-red-300" role="alert">
        {message}
      </p>
      <PageNavigation />
    </main>
  );
}

function InstallmentTable({
  getNumberAt,
  installmentCount,
  loan,
  onMarkPaid,
  paid,
  rowCount,
  title,
}) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const pageCount = Math.ceil(rowCount / pageSize);
  const currentPage = Math.min(page, Math.max(pageCount - 1, 0));
  const firstRow = currentPage * pageSize;
  const totalCents = Math.round(loan.totalPayable * 100);
  const baseCents = Math.floor(totalCents / loan.installmentCount);
  const rows = Array.from(
    { length: Math.min(pageSize, rowCount - firstRow) },
    (_, index) => {
      const number = getNumberAt(firstRow + index);
      const cents =
        number === installmentCount
          ? totalCents - baseCents * (installmentCount - 1)
          : baseCents;

      return {
        number,
        amount: cents / 100,
        paidAt: paid
          ? (loan.paidInstallments ?? []).find(
              (payment) => payment.number === number,
            )?.paidAt
          : null,
      };
    },
  );

  return (
    <section
      aria-label={title}
      className="mt-6 overflow-hidden rounded-2xl border border-[#343538]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#252629] px-4 py-4">
        <h3 className="font-semibold text-[#e5e5e8]">{title}</h3>
        <span className="text-xs text-[#92939a]">{rowCount} installments</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead className="bg-[#202124] text-xs uppercase tracking-wide text-[#92939a]">
            <tr>
              <th className="px-4 py-3 font-medium">Installment</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">
                {paid ? "Paid on" : "Status"}
              </th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#343538]">
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-5 text-[#92939a]"
                  colSpan={4}
                >
                  {paid
                    ? "No installment payments marked as done yet."
                    : "No outstanding installments."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="text-[#d6d6da]" key={row.number}>
                  <td className="px-4 py-3">#{row.number}</td>
                  <td className="px-4 py-3">
                    {preciseCurrency.format(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-[#a0a1a7]">
                    {paid && row.paidAt
                      ? new Date(row.paidAt).toLocaleString()
                      : paid
                        ? "Paid"
                        : "Outstanding"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!paid && (
                      <button
                        className="rounded-full bg-[#252629] px-3 py-1.5 text-xs font-semibold text-[#d6d6da] transition-colors hover:bg-[#303135] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65adff]"
                        onClick={() => onMarkPaid(row.number)}
                        type="button"
                      >
                        Mark paid
                      </button>
                    )}
                    {paid && (
                      <span className="text-xs font-semibold text-[#58d68d]">
                        Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-[#343538] px-4 py-3 text-xs text-[#92939a]">
          <span>
            Showing {firstRow + 1}–{Math.min(firstRow + pageSize, rowCount)} of{" "}
            {rowCount}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-[#252629] px-3 py-1.5 disabled:opacity-40"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-full bg-[#252629] px-3 py-1.5 disabled:opacity-40"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function LoanConfirmation() {
  const { loanId } = useParams();
  let loan;

  try {
    loan = getLoanRecord(loanId);
  } catch (error) {
    return (
      <StorageError
        message={
          error instanceof Error
            ? error.message
            : "Unable to read this plan from your browser."
        }
      />
    );
  }

  if (!loan) {
    return <Navigate replace to="/history" />;
  }

  const duration = `${loan.duration} ${loan.durationUnit.toLowerCase()}${
    loan.duration === 1 ? "" : "s"
  }`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <section className="w-full max-w-[620px] rounded-[32px] border border-[#2b2c2f] bg-[#1d1e20] p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-10">
        <PageNavigation />
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#12351f] text-2xl text-[#58d68d]"
        >
          ✓
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#168cf2]">
          Plan selected
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#f1f1f3]">
          Your loan plan is confirmed
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#a0a1a7]">
          Your {loan.frequency.toLowerCase()} repayment option has been added
          to your loan history.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-3 text-left">
          {[
            ["Loan amount", currency.format(loan.amount)],
            ["Repayment plan", loan.frequency],
            ["Rate", `${loan.annualRate}% p.a.`],
            ["Monthly rate", `${(loan.annualRate / 12).toFixed(4)}%`],
            ["Duration", duration],
            ["Payment amount", preciseCurrency.format(loan.installment)],
            ["Total interest", preciseCurrency.format(loan.totalInterest)],
            ["Total payable", currency.format(loan.totalPayable)],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-[#252629] p-4" key={label}>
              <dt className="text-xs text-[#92939a]">{label}</dt>
              <dd className="mt-2 text-sm font-semibold text-[#f1f1f3]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 rounded-2xl border border-[#5b4927] bg-[#30291c] p-4 text-left text-xs leading-5 text-[#e7d4a7]">
          Demo only: this confirms a repayment plan in this browser. It is not
          a lender approval, loan agreement, or funds disbursement.
        </p>

        <Link
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#2888e8] text-sm font-semibold text-white transition-colors hover:bg-[#3b96f2]"
          to="/history"
        >
          View loan history
        </Link>
      </section>
    </main>
  );
}

export function LoanHistory() {
  const [historyState, setHistoryState] = useState(() => {
    try {
      return { error: "", history: readLoanHistory() };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read loan history from this browser.",
        history: [],
      };
    }
  });
  const [actionError, setActionError] = useState("");

  if (historyState.error) {
    return (
      <StorageError message={historyState.error} />
    );
  }

  function handleMarkPaid(loanId, installmentNumber) {
    try {
      const updatedLoan = markInstallmentPaid(loanId, installmentNumber);
      setHistoryState((current) => ({
        ...current,
        history: current.history.map((loan) =>
          loan.id === updatedLoan.id ? updatedLoan : loan,
        ),
      }));
      setActionError("");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update the installment.",
      );
    }
  }

  const { history } = historyState;

  return (
    <main className="min-h-screen px-5 pb-16 pt-12 sm:pt-16">
      <header className="mx-auto max-w-3xl text-center">
        <PageNavigation />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#168cf2]">
          Your saved plans
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#f1f1f3]">
          Loan history
        </h1>
        <p className="mt-3 text-sm text-[#92939a]">
          Plans selected in this browser are listed here.
        </p>
      </header>

      <section
        aria-label="Loan history"
        className="mx-auto mt-9 max-w-4xl space-y-5"
      >
        {actionError && (
          <p className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
            {actionError}
          </p>
        )}
        {history.length === 0 ? (
          <div className="rounded-[28px] border border-[#2b2c2f] bg-[#1d1e20] p-8 text-center">
            <p className="text-[#d6d6da]">No loan plans in your history yet.</p>
            <Link
              className="mt-4 inline-block text-sm font-medium text-[#168cf2] hover:text-[#65adff]"
              to="/"
            >
              Create a loan plan
            </Link>
          </div>
        ) : (
          history.map((loan) => {
            const installmentCount = getInstallmentCount(loan);
            const paidInstallments = Array.isArray(loan.paidInstallments)
              ? loan.paidInstallments
              : [];
            const paidNumbers = paidInstallments
              .map((payment) => payment.number)
              .filter(
                (number) =>
                  Number.isInteger(number) &&
                  number >= 1 &&
                  number <= installmentCount,
              )
              .filter((number, index, numbers) => numbers.indexOf(number) === index)
              .sort((first, second) => first - second);
            const paidSet = new Set(paidNumbers);
            const outstandingCount = installmentCount - paidSet.size;

            function getOutstandingNumberAt(index) {
              let outstandingIndex = -1;
              for (let number = 1; number <= installmentCount; number += 1) {
                if (paidSet.has(number)) {
                  continue;
                }
                outstandingIndex += 1;
                if (outstandingIndex === index) {
                  return number;
                }
              }
              return 0;
            }

            return (
              <article
                className="rounded-[28px] border border-[#2b2c2f] bg-[#1d1e20] p-6 sm:p-7"
                key={loan.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#f1f1f3]">
                      {currency.format(loan.amount)} · {loan.frequency} plan
                    </h2>
                    <p className="mt-1 text-sm text-[#92939a]">
                      {loan.annualRate}% p.a. (
                      {(loan.annualRate / 12).toFixed(4)}
                      % monthly) · {loan.duration}{" "}
                      {loan.durationUnit.toLowerCase()}
                      {loan.duration === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#30291c] px-3 py-1 text-xs font-medium text-[#e7d4a7]">
                    Plan selected · demo
                  </span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Installment", preciseCurrency.format(loan.installment)],
                    [
                      "Payments done",
                      `${paidSet.size} / ${installmentCount}`,
                    ],
                    ["Outstanding", `${outstandingCount} installments`],
                    ["Selected", new Date(loan.createdAt).toLocaleString()],
                  ].map(([label, value]) => (
                    <div className="rounded-2xl bg-[#252629] p-4" key={label}>
                      <dt className="text-xs text-[#92939a]">{label}</dt>
                      <dd className="mt-2 text-sm font-semibold text-[#f1f1f3]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <InstallmentTable
                  getNumberAt={(index) => paidNumbers[index]}
                  installmentCount={installmentCount}
                  loan={loan}
                  onMarkPaid={(number) => handleMarkPaid(loan.id, number)}
                  paid
                  rowCount={paidNumbers.length}
                  title="Installment payments done"
                />
                <InstallmentTable
                  getNumberAt={getOutstandingNumberAt}
                  installmentCount={installmentCount}
                  loan={loan}
                  onMarkPaid={(number) => handleMarkPaid(loan.id, number)}
                  paid={false}
                  rowCount={outstandingCount}
                  title="Outstanding payments"
                />
                <Link
                  className="mt-5 inline-block text-sm font-medium text-[#168cf2] hover:text-[#65adff]"
                  to={`/approved/${loan.id}`}
                >
                  View plan details
                </Link>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
