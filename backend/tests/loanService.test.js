const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateLoanSchedule } = require("../services/loanService");

test("calculates daily simple-interest totals and upfront recovery", () => {
    const result = calculateLoanSchedule({
        amount: 10000,
        frequency: "daily",
        rate: 10,
        total_day: 10,
        startDate: new Date("2025-01-01T00:00:00.000Z")
    });

    assert.equal(result.interestAmount, 1000);
    assert.equal(result.totalRecovery, 11000);
    assert.equal(result.processingFee, 200);
    assert.equal(result.initialDeduction, 1300);
    assert.equal(result.netDisbursed, 8700);
    assert.equal(result.remainingToRecover, 9900);
    assert.equal(result.installments.length, 10);
});

test("interprets a partial week as one weekly installment", () => {
    const weekly = calculateLoanSchedule({
        amount: 1000,
        frequency: "weekly",
        rate: 10,
        total_day: 6,
        startDate: new Date("2025-01-01T00:00:00.000Z")
    });

    assert.equal(weekly.numberOfInstallments, 1);
});

test("clamps month-end installments to valid calendar dates", () => {
    const result = calculateLoanSchedule({
        amount: 30000,
        frequency: "monthly",
        rate: 10,
        total_day: 90,
        startDate: new Date("2025-01-31T00:00:00.000Z")
    });

    assert.equal(result.installments[0].due_date.toISOString(), "2025-02-28T00:00:00.000Z");
    assert.equal(result.installments[1].due_date.toISOString(), "2025-03-31T00:00:00.000Z");
    assert.equal(result.installments[2].due_date.toISOString(), "2025-04-30T00:00:00.000Z");
});

test("rejects invalid financial terms and impossible disbursement deductions", () => {
    const base = {
        amount: 1000,
        frequency: "daily",
        rate: 10,
        total_day: 10,
        startDate: new Date("2025-01-01T00:00:00.000Z")
    };

    assert.throws(() => calculateLoanSchedule({ ...base, amount: -1 }), /amount must be a positive/);
    assert.throws(() => calculateLoanSchedule({ ...base, rate: -1 }), /rate must be a non-negative/);
    assert.throws(() => calculateLoanSchedule({ ...base, total_day: 1.5 }), /positive whole number/);
    assert.throws(() => calculateLoanSchedule({ ...base, frequency: "yearly" }), /frequency must be/);
    assert.throws(() => calculateLoanSchedule({ ...base, rate: null }), /must be numeric/);
    assert.throws(() => calculateLoanSchedule({ ...base, amount: Number.MAX_VALUE }), /positive number/);
    assert.throws(() => calculateLoanSchedule({
        ...base,
        amount: 1,
        total_day: 1
    }), /deductions exceed/);
    assert.throws(() => calculateLoanSchedule({
        ...base,
        total_day: 1001
    }), /cannot exceed 1000 installments/);
});
