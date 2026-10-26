const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const Money = require("../models/Money");
const TransactionLedger = require("../models/TransactionLedger");
const { createDailyLoan } = require("../controllers/dailyLoanController");
const { createWeeklyLoan } = require("../controllers/weeklyLoanController");

const USER_ID = "0123456789abcdef01234567";
const LOAN_ID = "abcdef0123456789abcdef01";

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

function stubLoanCreation() {
    const original = {
        startSession: mongoose.startSession,
        loanCreate: Loan.create,
        installmentInsertMany: Installment.insertMany,
        ledgerCreate: TransactionLedger.create,
        moneyCreate: Money.create
    };
    const state = {};

    mongoose.startSession = async () => ({
        withTransaction: async callback => callback(),
        endSession: async () => {}
    });
    Loan.create = async ([values]) => {
        state.loan = { ...values, _id: LOAN_ID };
        return [state.loan];
    };
    Installment.insertMany = async installments => {
        state.installments = installments.map((installment, index) => ({
            ...installment,
            _id: `fedcba98765432100123456${index}`
        }));
        return state.installments;
    };
    TransactionLedger.create = async ([values]) => {
        state.ledger = { ...values, save: async () => {} };
        return [state.ledger];
    };
    Money.create = async ([values]) => {
        state.money = values;
        return [values];
    };

    return {
        state,
        restore() {
            mongoose.startSession = original.startSession;
            Loan.create = original.loanCreate;
            Installment.insertMany = original.installmentInsertMany;
            TransactionLedger.create = original.ledgerCreate;
            Money.create = original.moneyCreate;
        }
    };
}

test("creates daily loans and persists the matching schedule and financial fields", async () => {
    const harness = stubLoanCreation();
    const response = createResponse();

    try {
        await createDailyLoan({
            user: { _id: USER_ID, role: "user", user_name: "Borrower" },
            body: { amount: 10000, rate: 10, total_day: 10 }
        }, response);

        assert.equal(response.statusCode, 201);
        assert.equal(harness.state.loan.frequency, "daily");
        assert.equal(harness.state.loan.duration_months, 1);
        assert.equal(harness.state.loan.processing_charge_rate, 2);
        assert.equal(harness.state.loan.processing_charge, 200);
        assert.equal(harness.state.loan.total_interest, 1000);
        assert.equal(harness.state.loan.net_disbursed_amount, 8700);
        assert.equal(harness.state.loan.repayment_schedule.length, 10);
        assert.equal(harness.state.loan.repayment_schedule[0].status, "paid");
        assert.equal(harness.state.loan.repayment_schedule[0].paid_amount, 1100);
        assert.equal(harness.state.loan.repayment_schedule[1].status, "pending");
        assert.equal(harness.state.installments.length, 10);
        assert.equal(harness.state.money.count, 1);
        assert.equal(harness.state.ledger.transaction_type, "initial_deduction");
        await new Loan(harness.state.loan).validate();
    } finally {
        harness.restore();
    }
});

test("creates weekly loans with weekly installments and upfront partial payment", async () => {
    const harness = stubLoanCreation();
    const response = createResponse();

    try {
        await createWeeklyLoan({
            user: { _id: USER_ID, role: "user", user_name: "Borrower" },
            body: { amount: 14000, rate: 10, total_day: 28 }
        }, response);

        assert.equal(response.statusCode, 201);
        assert.equal(harness.state.loan.frequency, "weekly");
        assert.equal(harness.state.loan.duration_months, 1);
        assert.equal(harness.state.installments.length, 4);
        assert.equal(harness.state.installments[0].status, "partially_paid");
        assert.equal(harness.state.installments[0].amount_paid, 1925);
        assert.equal(harness.state.loan.repayment_schedule[0].status, "partial");
        assert.equal(harness.state.loan.repayment_schedule[0].paid_amount, 1925);
        assert.equal(harness.state.loan.repayment_schedule[1].status, "pending");
        await new Loan(harness.state.loan).validate();
    } finally {
        harness.restore();
    }
});

test("frequency-specific endpoints reject conflicting loan types", async () => {
    const dailyResponse = createResponse();
    const weeklyResponse = createResponse();
    const req = {
        user: { _id: USER_ID, role: "user" },
        body: { amount: 1000, rate: 10, total_day: 7, frequency: "weekly" }
    };

    await createDailyLoan(req, dailyResponse);
    await createWeeklyLoan({
        ...req,
        body: { ...req.body, frequency: "daily" }
    }, weeklyResponse);

    assert.equal(dailyResponse.statusCode, 400);
    assert.match(dailyResponse.body.message, /only creates daily/);
    assert.equal(weeklyResponse.statusCode, 400);
    assert.match(weeklyResponse.body.message, /only creates weekly/);
});
