const test = require("node:test");
const assert = require("node:assert/strict");
const Loan = require("../models/Loan");
const { createLoan } = require("../controllers/loanController");

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

test("creates daily loans from trusted identity and date, ignoring client calculations", async () => {
    const originalCreate = Loan.create;
    const previousRate = process.env.MONTHLY_INTEREST_RATE_PERCENT;
    process.env.MONTHLY_INTEREST_RATE_PERCENT = "10";
    Loan.create = async values => ({ ...values, _id: "saved-loan" });

    try {
        const req = {
            user_id: "0123456789abcdef01234567",
            first_due_date: "2025-01-01",
            body: {
                amount: 1000,
                frequency: "daily",
                duration_months: 1,
                user_id: "fedcba987654321001234567",
                rate: 99,
                total: 1,
                processing_charge: 0
            }
        };
        const res = createResponse();
        let nextError;

        await createLoan(req, res, error => {
            nextError = error;
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.loan.user_id, req.user_id);
        assert.equal(res.body.loan.rate, 10);
        assert.equal(res.body.loan.processing_charge, 20);
        assert.equal(res.body.loan.total_interest, 100);
        assert.equal(res.body.loan.total, 1100);
        assert.equal(res.body.financial_breakdown.daily_installment_amount,
            res.body.loan.repayment_schedule[0].amount);
        assert.ok(res.body.loan.repayment_schedule.every(installment =>
            installment.status === "pending" && installment.paid_amount === 0
        ));
    } finally {
        Loan.create = originalCreate;
        if (previousRate === undefined) {
            delete process.env.MONTHLY_INTEREST_RATE_PERCENT;
        } else {
            process.env.MONTHLY_INTEREST_RATE_PERCENT = previousRate;
        }
    }
});

test("rejects daily loan creation without a trusted workflow date", async () => {
    const res = createResponse();

    await createLoan({
        user_id: "0123456789abcdef01234567",
        body: { amount: 1000, frequency: "daily", duration_months: 1 }
    }, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /trusted approval\/disbursement workflow/);
});

test("does not apply daily calculations to weekly loans", async () => {
    const res = createResponse();

    await createLoan({
        user_id: "0123456789abcdef01234567",
        body: { amount: 1000, frequency: "weekly", duration_months: 1 }
    }, res, () => {});

    assert.equal(res.statusCode, 501);
    assert.match(res.body.message, /not implemented yet/);
});
