const test = require("node:test");
const assert = require("node:assert/strict");
const Loan = require("../models/Loan");
const Money = require("../models/Money");
const User = require("../models/User");
const {
    payDailyInstallment,
    getLoanDetails,
    getPaymentHistory,
    getPendingInstallments
} = require("../controllers/loanController");

const OWNER_ID = "0123456789abcdef01234567";
const OTHER_USER_ID = "fedcba987654321001234567";
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

function copyLoan(loan) {
    return {
        ...loan,
        repayment_schedule: loan.repayment_schedule.map(installment => ({ ...installment }))
    };
}

function createPaymentHarness({ ownerId = OWNER_ID, role = "user", paid = false } = {}) {
    const state = {
        loan: {
            _id: LOAN_ID,
            user_id: ownerId,
            frequency: "daily",
            amount: 50,
            total: 50,
            remaining: paid ? 0 : 50,
            status: paid ? "completed" : "active",
            repayment_schedule: [{
                date: new Date("2026-10-26T00:00:00.000Z"),
                count: 1,
                amount: 50,
                paid_amount: paid ? 50 : 0,
                remaining: paid ? 0 : 50,
                status: paid ? "paid" : "pending"
            }]
        },
        payments: paid ? [{
            loan_id: LOAN_ID,
            date: new Date("2026-10-26T12:00:00.000Z"),
            amount: 50,
            count: 1
        }] : []
    };
    const original = {
        findById: Loan.findById,
        findOneAndUpdate: Loan.findOneAndUpdate,
        updateOne: Loan.updateOne,
        moneyCreate: Money.create,
        moneyFind: Money.find,
        moneyFindOne: Money.findOne,
        userFindById: User.findById,
        startSession: require("mongoose").startSession
    };

    Loan.findById = async id => String(id) === LOAN_ID ? copyLoan(state.loan) : null;
    Loan.findOneAndUpdate = async (filter, update) => {
        const installment = state.loan.repayment_schedule.find(item =>
            item.count === filter.repayment_schedule.$elemMatch.count
        );
        if (!installment || installment.status !== "pending"
            || installment.amount !== filter.repayment_schedule.$elemMatch.amount
            || state.loan.remaining < update.$inc.remaining * -1) {
            return null;
        }

        installment.paid_amount = update.$set["repayment_schedule.$.paid_amount"];
        installment.remaining = update.$set["repayment_schedule.$.remaining"];
        installment.status = update.$set["repayment_schedule.$.status"];
        state.loan.remaining = Math.round(
            (state.loan.remaining + update.$inc.remaining) * 100
        ) / 100;
        state.loan.status = update.$set.status;
        return copyLoan(state.loan);
    };
    Loan.updateOne = async (filter, update) => {
        if (filter.repayment_schedule
            && state.loan.repayment_schedule.every(item => item.status === "paid")) {
            Object.assign(state.loan, update.$set);
            return { modifiedCount: 1 };
        }

        return { modifiedCount: 0 };
    };
    Money.create = async documents => {
        const created = Array.isArray(documents) ? documents : [documents];
        state.payments.push(...created);
        return created;
    };
    Money.findOne = async filter => state.payments.find(payment =>
        String(payment.loan_id) === String(filter.loan_id) && payment.count === filter.count
    ) || null;
    Money.find = filter => {
        const matchingPayments = state.payments.filter(payment =>
            String(payment.loan_id) === String(filter.loan_id)
        );
        return {
            then(resolve, reject) {
                return Promise.resolve(matchingPayments).then(resolve, reject);
            },
            sort() {
                return Promise.resolve(matchingPayments);
            }
        };
    };
    User.findById = () => ({
        select: async () => ({ role })
    });
    require("mongoose").startSession = async () => ({
        withTransaction: callback => callback(),
        endSession: async () => {}
    });

    return {
        state,
        restore() {
            Loan.findById = original.findById;
            Loan.findOneAndUpdate = original.findOneAndUpdate;
            Loan.updateOne = original.updateOne;
            Money.create = original.moneyCreate;
            Money.find = original.moneyFind;
            Money.findOne = original.moneyFindOne;
            User.findById = original.userFindById;
            require("mongoose").startSession = original.startSession;
        }
    };
}

function request(userId = OWNER_ID, count = "1") {
    return {
        user_id: userId,
        params: { loan_id: LOAN_ID, count },
        body: { amount: 50 }
    };
}

test("records the persisted scheduled amount and updates loan balances", async () => {
    const harness = createPaymentHarness();
    const res = createResponse();
    try {
        await payDailyInstallment(request(), res, assert.fail);

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.payment.amount, 50);
        assert.equal(res.body.payment.count, 1);
        assert.equal(res.body.loan.remaining, 0);
        assert.equal(res.body.loan.status, "completed");
        assert.equal(harness.state.loan.repayment_schedule[0].status, "paid");
        assert.equal(harness.state.payments.length, 1);
    } finally {
        harness.restore();
    }
});

test("rejects a payment for an installment already paid", async () => {
    const harness = createPaymentHarness({ paid: true });
    const res = createResponse();
    try {
        await payDailyInstallment(request(), res, assert.fail);

        assert.equal(res.statusCode, 409);
        assert.equal(harness.state.payments.length, 1);
    } finally {
        harness.restore();
    }
});

test("rejects amounts that do not exactly match the persisted installment", async () => {
    const harness = createPaymentHarness();
    try {
        for (const amount of [49.99, 50.01]) {
            const res = createResponse();
            await payDailyInstallment({
                ...request(),
                body: { amount }
            }, res, assert.fail);

            assert.equal(res.statusCode, 400);
        }
        assert.equal(harness.state.payments.length, 0);
        assert.equal(harness.state.loan.repayment_schedule[0].status, "pending");
    } finally {
        harness.restore();
    }
});

test("rejects payment by a borrower who does not own the loan", async () => {
    const harness = createPaymentHarness({ role: "user" });
    const res = createResponse();
    try {
        await payDailyInstallment(request(OTHER_USER_ID), res, assert.fail);

        assert.equal(res.statusCode, 403);
        assert.equal(harness.state.payments.length, 0);
    } finally {
        harness.restore();
    }
});

test("allows an explicitly authorized admin collector to pay the installment", async () => {
    const harness = createPaymentHarness({ role: "admin" });
    const res = createResponse();
    try {
        await payDailyInstallment(request(OTHER_USER_ID), res, assert.fail);
        assert.equal(res.statusCode, 201);
    } finally {
        harness.restore();
    }
});

test("concurrent requests cannot record the same installment twice", async () => {
    const harness = createPaymentHarness();
    const firstResponse = createResponse();
    const secondResponse = createResponse();
    try {
        await Promise.all([
            payDailyInstallment(request(), firstResponse, assert.fail),
            payDailyInstallment(request(), secondResponse, assert.fail)
        ]);

        assert.deepEqual(
            [firstResponse.statusCode, secondResponse.statusCode].sort(),
            [201, 409]
        );
        assert.equal(harness.state.payments.length, 1);
    } finally {
        harness.restore();
    }
});

test("falls back to the atomic loan update when MongoDB transactions are unsupported", async () => {
    const harness = createPaymentHarness();
    const mongoose = require("mongoose");
    const res = createResponse();
    mongoose.startSession = async () => ({
        withTransaction: async () => {
            const error = new Error("Transaction numbers are only allowed on a replica set member or mongos");
            error.code = 20;
            throw error;
        },
        endSession: async () => {}
    });

    try {
        await payDailyInstallment(request(), res, assert.fail);

        assert.equal(res.statusCode, 201);
        assert.equal(harness.state.payments.length, 1);
        assert.equal(harness.state.loan.repayment_schedule[0].status, "paid");
    } finally {
        harness.restore();
    }
});

test("returns loan details, payment history, and pending installments", async () => {
    const harness = createPaymentHarness();
    const detailsResponse = createResponse();
    const historyResponse = createResponse();
    const pendingResponse = createResponse();
    try {
        await getLoanDetails({ user_id: OWNER_ID, params: { loan_id: LOAN_ID } },
            detailsResponse, assert.fail);
        await getPaymentHistory({ user_id: OWNER_ID, params: { loan_id: LOAN_ID } },
            historyResponse, assert.fail);
        await getPendingInstallments({ user_id: OWNER_ID, params: { loan_id: LOAN_ID } },
            pendingResponse, assert.fail);

        assert.equal(detailsResponse.statusCode, 200);
        assert.equal(detailsResponse.body.total_amount_paid, 0);
        assert.equal(detailsResponse.body.remaining_balance, 50);
        assert.equal(detailsResponse.body.pending_installments.length, 1);
        assert.equal(historyResponse.body.payments.length, 0);
        assert.equal(pendingResponse.body.pending_installments.length, 1);
    } finally {
        harness.restore();
    }
});
