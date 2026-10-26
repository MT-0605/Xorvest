import { useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import LoanPlan from "./LoanPlan.jsx";
import { LoanConfirmation, LoanHistory } from "./LoanPages.jsx";
import ClientNavbar from "./ClientNavbar.jsx";

const durationUnits = ["Day", "Week", "Month", "Year"];

function FieldIcon({ children }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[17px] text-[#858890]"
    >
      {children}
    </span>
  );
}

function LoanForm() {
  const navigate = useNavigate();
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("Month");

  function handleSubmit(event) {
    event.preventDefault();
    const query = new URLSearchParams({
      amount: principal,
      rate: interestRate,
      duration,
      unit: durationUnit,
    });

    navigate(`/plan?${query.toString()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-5 pb-12 pt-20 sm:justify-center sm:pt-12">
      <header className="mb-10 text-center sm:mb-11">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.055em] text-[#f3f3f5] sm:text-[36px]">
          Loan Planner
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#85868d]">
          Enter your loan details and we&apos;ll break the repayment down by
          day, week and month.
        </p>
      </header>

      <section
        aria-label="Loan details"
        className="w-full max-w-[594px] rounded-[32px] border border-[#2b2c2f] bg-[#1d1e20] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8"
      >
        <form className="space-y-7" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2.5 block text-sm font-semibold text-[#e1e1e4]"
              htmlFor="principal"
            >
              Principal amount
            </label>
            <div className="relative">
              <FieldIcon>₹</FieldIcon>
              <input
                autoComplete="off"
                className="loan-input pl-11"
                id="principal"
                min="1"
                onChange={(event) => setPrincipal(event.target.value)}
                placeholder="e.g. 500000"
                required
                type="number"
                value={principal}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-2.5 block text-sm font-semibold text-[#e1e1e4]"
              htmlFor="interest-rate"
            >
              Interest rate (per annum)
            </label>
            <div className="relative">
              <FieldIcon>%</FieldIcon>
              <input
                className="loan-input pl-11"
                id="interest-rate"
                min="0"
                onChange={(event) => setInterestRate(event.target.value)}
                placeholder="e.g. 10.5"
                required
                step="0.01"
                type="number"
                value={interestRate}
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold text-[#e1e1e4]">
              Duration
            </legend>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <FieldIcon>
                  <svg
                    fill="none"
                    height="17"
                    viewBox="0 0 24 24"
                    width="17"
                  >
                    <rect
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      width="16"
                      x="4"
                      y="5"
                    />
                    <path
                      d="M8 3v4m8-4v4M4 10h16m-11 4h.01M12 14h.01M15 14h.01M8 17h.01M12 17h.01"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </FieldIcon>
                <input
                  className="loan-input pl-11"
                  id="duration"
                  min="1"
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="e.g. 24"
                  required
                  type="number"
                  value={duration}
                />
              </div>
              <div
                aria-label="Duration unit"
                className="flex h-[50px] flex-1 items-center justify-between rounded-full bg-[#252629] p-1"
                role="group"
              >
                {durationUnits.map((unit) => (
                  <button
                    aria-pressed={durationUnit === unit}
                    className={`h-full flex-1 rounded-full px-2 text-[13px] font-medium transition-colors ${
                      durationUnit === unit
                        ? "bg-[#111214] text-[#f2f2f4] shadow-sm"
                        : "text-[#92939a] hover:text-white"
                    }`}
                    key={unit}
                    onClick={() => setDurationUnit(unit)}
                    type="button"
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <button
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#2888e8] text-sm font-semibold text-white transition-colors hover:bg-[#3b96f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65adff]"
            type="submit"
          >
            Show my plan
            <svg
              aria-hidden="true"
              fill="none"
              height="17"
              viewBox="0 0 24 24"
              width="17"
            >
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </form>
      </section>
    </main>
  );
}

function App({ user, onLogout }) {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#111214] text-[#f2f2f4]">
        <ClientNavbar user={user} onLogout={onLogout} />
        <Routes>
          <Route element={<LoanForm />} path="/" />
          <Route element={<LoanPlan />} path="/plan" />
          <Route element={<LoanConfirmation />} path="/approved/:loanId" />
          <Route element={<LoanHistory />} path="/history" />
          <Route element={<LoanForm />} path="*" />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
