const test = require("node:test");
const assert = require("node:assert/strict");
const { applyLoan } = require("../controllers/loanController");

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

test("requires authenticated loan applicants", async () => {
    const response = createResponse();
    await applyLoan({ body: {} }, response);
    assert.equal(response.statusCode, 401);
});

test("rejects invalid loan terms before opening a database transaction", async () => {
    const response = createResponse();
    await applyLoan({
        user: { _id: "0123456789abcdef01234567", role: "user" },
        body: {
            amount: 1,
            frequency: "daily",
            rate: 0,
            total_day: 1
        }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /deductions exceed/);
});
