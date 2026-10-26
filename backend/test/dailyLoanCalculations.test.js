const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateDailyLoan } = require("../utils/dailyLoanCalculations");

test("calculates the two-month daily loan example with exact totals", () => {
    const result = calculateDailyLoan({
        amount: 100000,
        duration_months: 2,
        first_due_date: "2026-01-01",
        monthly_interest_rate_percent: 10
    });

    assert.equal(result.processing_charge, 2000);
    assert.equal(result.total_interest, 20000);
    assert.equal(result.net_disbursed_amount, 78000);
    assert.equal(result.total, 120000);
    assert.equal(result.total_day, 60);
    assert.equal(result.repayment_schedule.length, 60);
    const scheduledTotalCents = result.repayment_schedule.reduce(
        (sum, installment) => sum + Math.round(installment.amount * 100),
        0
    );
    assert.equal(scheduledTotalCents, Math.round(result.total * 100));
    assert.ok(result.repayment_schedule.every(installment =>
        installment.status === "pending" && installment.paid_amount === 0
    ));
});

test("clamps month-end dates and includes the monthly anniversary in the schedule", () => {
    const result = calculateDailyLoan({
        amount: 1000,
        duration_months: 1,
        first_due_date: "2025-01-31",
        monthly_interest_rate_percent: 10
    });

    assert.equal(result.total_day, 29);
    assert.equal(result.repayment_schedule[0].date.toISOString().slice(0, 10), "2025-01-31");
    assert.equal(result.repayment_schedule.at(-1).date.toISOString().slice(0, 10), "2025-02-28");
});

test("rejects malformed dates and invalid durations", () => {
    assert.throws(() => calculateDailyLoan({
        amount: 1000,
        duration_months: 1,
        first_due_date: "2025-02-29",
        monthly_interest_rate_percent: 10
    }), /valid YYYY-MM-DD date/);

    assert.throws(() => calculateDailyLoan({
        amount: 1000,
        duration_months: 1.5,
        first_due_date: "2025-01-01",
        monthly_interest_rate_percent: 10
    }), /positive whole number/);
});

test("rejects non-positive, over-precise, and too-small daily loan amounts", () => {
    for (const amount of [0, -1, 12.345]) {
        assert.throws(() => calculateDailyLoan({
            amount,
            duration_months: 1,
            first_due_date: "2025-01-01",
            monthly_interest_rate_percent: 10
        }), /amount must be a positive amount/);
    }

    assert.throws(() => calculateDailyLoan({
        amount: 0.01,
        duration_months: 1,
        first_due_date: "2025-01-01",
        monthly_interest_rate_percent: 0
    }), /too small for the selected daily repayment period/);
});

test("rejects calculated deductions that exceed principal", () => {
    assert.throws(() => calculateDailyLoan({
        amount: 100,
        duration_months: 10,
        first_due_date: "2025-01-01",
        monthly_interest_rate_percent: 100
    }), /deductions exceed/);
});

test("rejects schedules beyond the supported installment limit", () => {
    assert.throws(() => calculateDailyLoan({
        amount: 100000,
        duration_months: 900,
        first_due_date: "2025-01-01",
        monthly_interest_rate_percent: 10
    }), /cannot exceed 10000 installments/);
});
