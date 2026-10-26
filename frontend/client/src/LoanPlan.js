import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { saveLoanRecord } from "./loanHistory.js";

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

const durationToMonths = {
  Day: (duration) => duration / 30,
  Week: (duration) => (duration * 7) / 30,
  Month: (duration) => duration,
  Year: (duration) => duration * 12,
};

function repaymentPlan(amount, annualRate, duration, unit) {
  const months = durationToMonths[unit](duration);
  const days = months * 30;
  const monthlyRate = annualRate / 100 / 12;
  const monthlyInterest = amount * monthlyRate;
  const totalInterest = monthlyInterest * months;
  const totalPayable = amount + totalInterest;
  const dailyInterest = monthlyInterest / 30;

  return {
    days,
    months,
    totalInterest,
    totalPayable,
    daily: {
      interest: dailyInterest,
      payments: days,
      unit: "day",
    },
    weekly: {
      interest: dailyInterest * 7,
      payments: days / 7,
      unit: "week",
    },
    monthly: {
      interest: monthlyInterest,
      payments: months,
      unit: "month",
    },
  };
}

function formatPayments(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value);
}

function PlanCard({
  highlighted = false,
  label,
  onSelect,
  plan,
  totalPayable,
}) {
  const descriptions = {
    Daily: "Smallest steps, every single day",
    Weekly: "Steady chunks, once a week",
    Monthly: "The classic way to repay",
  };
  const details = [
    `Interest of ${preciseCurrency.format(plan.interest)} per ${plan.unit}`,
    `${formatPayments(plan.payments)} payments, one per ${plan.unit}`,
  ];

  return (
    <article
      className={`rounded-[34px] border p-7 sm:p-8 ${
        highlighted
          ? "border-[#1686ed] bg-[#0b1927]"
          : "border-[#2b2c2f] bg-[#1d1e20]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#f1f1f3]">{label}</h2>
        {highlighted && (
          <span className="rounded-full bg-[#152c43] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#91bde8]">
            Most popular
          </span>
        )}
      </div>
      <p className="mt-5 min-h-[56px] text-[20px] font-medium leading-8 text-[#e5e5e8]">
        {descriptions[label]}
      </p>
      <p className="mt-5 flex items-baseline gap-2 whitespace-nowrap">
        <span className="text-sm text-[#92939a]">
          {preciseCurrency.format(plan.interest)}
        </span>
        <span className="text-[36px] font-bold tracking-[-0.04em] text-[#f4f4f6] sm:text-[42px]">
          / {plan.unit}
        </span>
      </p>
      <div
        className={`mt-6 rounded-full px-4 py-3 text-center text-xs font-semibold ${
          highlighted ? "bg-[#2888e8] text-white" : "bg-[#252629] text-[#e5e5e8]"
        }`}
      >
        Total payable {currency.format(totalPayable)}
      </div>
      <h3 className="mt-8 text-xs font-semibold text-[#e5e5e8]">
        How it breaks down:
      </h3>
      <ul className="mt-4 space-y-4 text-[13px] leading-5 text-[#c4c5ca]">
        {details.map((detail, index) => (
          <li className="flex gap-3" key={detail}>
            <span aria-hidden="true" className="text-[#168cf2]">
              {index === 0 ? "◉" : "▱"}
            </span>
            {detail}
          </li>
        ))}
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-[#168cf2]">
            ↗
          </span>
          Total interest of {preciseCurrency.format(plan.totalInterest)} (
          {((plan.totalInterest / plan.principal) * 100).toFixed(1)}% of
          principal)
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-[#168cf2]">
            ◷
          </span>
          Principal {currency.format(plan.principal)} plus interest over{" "}
          {formatPayments(plan.days)} days
        </li>
      </ul>
      <button
        className={`mt-7 h-12 w-full rounded-full text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65adff] ${
          highlighted
            ? "bg-[#2888e8] text-white hover:bg-[#3b96f2]"
            : "bg-[#252629] text-[#e5e5e8] hover:bg-[#303135]"
        }`}
        onClick={() => onSelect(label)}
        type="button"
      >
        Submit {label.toLowerCase()} plan
      </button>
    </article>
  );
}

function LoanPlan() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [error, setError] = useState("");
  const query = new URLSearchParams(search);
  const amount = Number(query.get("amount"));
  const annualRate = Number(query.get("rate"));
  const duration = Number(query.get("duration"));
  const unit = query.get("unit");

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(annualRate) ||
    annualRate < 0 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Object.prototype.hasOwnProperty.call(durationToMonths, unit)
  ) {
    return <Navigate replace to="/" />;
  }

  const result = repaymentPlan(amount, annualRate, duration, unit);
  const durationLabel = `${duration} ${unit.toLowerCase()}${duration === 1 ? "" : "s"}`;

  const cards = [
    {
      label: "Daily",
      plan: {
        ...result.daily,
        days: result.days,
        principal: amount,
        totalInterest: result.totalInterest,
      },
    },
    {
      label: "Weekly",
      plan: {
        ...result.weekly,
        days: result.days,
        principal: amount,
        totalInterest: result.totalInterest,
      },
    },
    {
      label: "Monthly",
      plan: {
        ...result.monthly,
        days: result.days,
        principal: amount,
        totalInterest: result.totalInterest,
      },
      highlighted: true,
    },
  ];

  function handlePlanSelection(label) {
    const selectedCard = cards.find((card) => card.label === label);
    if (!selectedCard) {
      setError("Choose a valid repayment plan.");
      return;
    }

    try {
      const installmentCount = Math.ceil(selectedCard.plan.payments);
      const record = saveLoanRecord({
        id: crypto.randomUUID(),
        amount,
        annualRate,
        duration,
        durationUnit: unit,
        frequency: label,
        days: result.days,
        totalInterest: result.totalInterest,
        totalPayable: result.totalPayable,
        installmentCount,
        installment: result.totalPayable / installmentCount,
        paidInstallments: [],
        createdAt: new Date().toISOString(),
      });
      navigate(`/approved/${record.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this loan plan in your history.",
      );
    }
  }

  return (
    <main className="min-h-screen px-5 pb-16 pt-14 sm:pt-16">
      <header className="mx-auto max-w-[760px] text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#168cf2]">
          Your repayment plans
        </p>
        <h1 className="mt-4 text-[32px] font-bold tracking-[-0.05em] text-[#f1f1f3] sm:text-[36px]">
          {currency.format(amount)} at {annualRate}% p.a.
        </h1>
        <p className="mt-3 text-sm text-[#92939a]">
          Duration: {durationLabel} · {formatPayments(result.days)} days total
        </p>
        <Link
          className="mt-6 inline-block text-sm font-medium text-[#168cf2] hover:text-[#65adff]"
          to="/"
        >
          Change loan details
        </Link>
        <Link
          className="ml-5 inline-block text-sm font-medium text-[#168cf2] hover:text-[#65adff]"
          to="/history"
        >
          Loan history
        </Link>
      </header>

      {error && (
        <p className="mx-auto mt-6 max-w-[1110px] text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <section
        aria-label="Repayment plan options"
        className="mx-auto mt-12 grid max-w-[1110px] grid-cols-1 gap-5 md:grid-cols-3"
      >
        {cards.map(({ highlighted, label, plan }) => (
          <PlanCard
            highlighted={highlighted}
            key={label}
            label={label}
            onSelect={handlePlanSelection}
            plan={plan}
            totalPayable={result.totalPayable}
          />
        ))}
      </section>
      <p className="mx-auto mt-7 max-w-[1110px] text-xs text-[#777981]">
        Approximate estimates based on a monthly interest rate converted from
        your annual rate (annual rate ÷ 12).
      </p>
    </main>
  );
}

export default LoanPlan;
