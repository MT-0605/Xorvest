const test = require("node:test");
const assert = require("node:assert/strict");
const { recordPayment, reversePayment } = require("../controllers/adminPaymentController");

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

test("rejects invalid payment input before opening a database transaction", async () => {
    for (const body of [
        { loan_id: "invalid", amount: 10 },
        { loan_id: "0123456789abcdef01234567", amount: 0 },
        { loan_id: "0123456789abcdef01234567", amount: 10.001 },
        { loan_id: "0123456789abcdef01234567", amount: 10, payment_method: "crypto" }
    ]) {
        const response = createResponse();
        await recordPayment({ body }, response);
        assert.equal(response.statusCode, 400);
    }
});

test("rejects invalid reversal identifiers and reasons", async () => {
    const invalidIdResponse = createResponse();
    await reversePayment({
        params: { id: "bad-id" },
        body: { reversal_reason: "duplicate" }
    }, invalidIdResponse);
    assert.equal(invalidIdResponse.statusCode, 400);

    const invalidReasonResponse = createResponse();
    await reversePayment({
        params: { id: "0123456789abcdef01234567" },
        body: { reversal_reason: " " }
    }, invalidReasonResponse);
    assert.equal(invalidReasonResponse.statusCode, 400);
});
