const jwt = require("jsonwebtoken");

function authenticateJWT(req, res, next) {
    const authorization = req.headers.authorization;
    const token = authorization && authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "A Bearer token is required."
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: "JWT authentication is not configured."
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });
        if (!payload || typeof payload !== "object"
            || typeof payload.user_id !== "string"
            || !/^[a-f\d]{24}$/i.test(payload.user_id)) {
            return res.status(401).json({
                success: false,
                message: "The token does not contain a valid user_id."
            });
        }

        req.user_id = payload.user_id;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "The Bearer token is invalid or expired."
        });
    }
}

module.exports = authenticateJWT;
