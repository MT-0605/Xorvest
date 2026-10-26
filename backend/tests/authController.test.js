const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { register } = require("../controllers/authController");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

test("public registration never grants admin role and stores a password hash", async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-secret-string-at-least-32-chars";
    let createdUser;
    User.findOne = async () => null;
    User.create = async user => {
        createdUser = { ...user, _id: "0123456789abcdef01234567" };
        return createdUser;
    };

    try {
        const res = createResponse();
        await register({
            body: {
                user_name: "Test User",
                email: "test@example.com",
                password: "secure-password",
                role: "admin"
            }
        }, res);

        assert.equal(res.statusCode, 201);
        assert.equal(createdUser.role, "user");
        assert.notEqual(createdUser.password, "secure-password");
        assert.equal(await bcrypt.compare("secure-password", createdUser.password), true);
        assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).id,
            "0123456789abcdef01234567");
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    }
});

test("registration rejects passwords shorter than eight characters", async () => {
    const res = createResponse();
    await register({
        body: {
            user_name: "Test User",
            email: "test@example.com",
            password: "short"
        }
    }, res);

    assert.equal(res.statusCode, 400);
});
