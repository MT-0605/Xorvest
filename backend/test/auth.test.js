const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const authenticateJWT = require("../middleware/auth");

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

test("authenticates a valid HS256 token with the existing user_id field", () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret-for-jwt-validation";
    const userId = "0123456789abcdef01234567";
    const req = {
        headers: {
            authorization: `Bearer ${jwt.sign({ user_id: userId }, process.env.JWT_SECRET)}`
        }
    };
    const res = createResponse();
    let nextCalled = false;

    try {
        authenticateJWT(req, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(req.user_id, userId);
    } finally {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    }
});

test("rejects tokens without a valid user_id claim", () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret-for-jwt-validation";
    const req = {
        headers: {
            authorization: `Bearer ${jwt.sign({ sub: "user" }, process.env.JWT_SECRET)}`
        }
    };
    const res = createResponse();

    try {
        authenticateJWT(req, res, () => {
            assert.fail("next must not be called for an invalid identity claim");
        });
        assert.equal(res.statusCode, 401);
        assert.match(res.body.message, /valid user_id/);
    } finally {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    }
});
