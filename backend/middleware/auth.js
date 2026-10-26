const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }
    return secret;
}

/**
 * Verify JWT token and attach user to req.user
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Token missing or invalid"
        });
    }

    const token = authHeader.slice(7);
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Token missing"
        });
    }

    let secret;
    try {
        secret = getJwtSecret();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "JWT authentication is not configured."
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    } catch (error) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }

    if (!decoded || typeof decoded !== "object"
        || !mongoose.isValidObjectId(decoded.id)) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid token"
        });
    }

    try {
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not found"
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
};

/**
 * Enforce Admin Role Authorization
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Authentication required"
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Admin access required"
        });
    }

    next();
};

/**
 * Customer / General User Auth
 */
const requireCustomer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Authentication required"
        });
    }
    next();
};

module.exports = {
    verifyToken,
    requireAdmin,
    requireCustomer
};
