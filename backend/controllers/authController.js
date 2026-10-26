const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }
    return secret;
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        getJwtSecret(),
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const body = req.body || {};
        const userName = (body.user_name || body.username || "").trim();
        const email = (body.email || "").trim().toLowerCase();
        const password = body.password || "";

        if (!userName
            || typeof email !== "string" || email.length > 254
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Provide a valid name, email address, and password of at least 8 characters."
            });
        }

        const normalizedEmail = email;
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            user_name: userName,
            email: normalizedEmail,
            password: hashedPassword,
            role: "user"
        });

        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: newUser._id,
                user_name: newUser.user_name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists."
            });
        }
        return res.status(500).json({
            success: false,
            message: "Server error during registration."
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const body = req.body || {};
        const identifier = (body.email || body.identifier || "").trim().toLowerCase();
        const password = body.password || "";

        if (!identifier || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email (or username) and password"
            });
        }

        const user = await User.findOne({
            $or: [{ email: identifier }, { user_name: identifier }]
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const hasBcryptHash = /^\$2[aby]\$/.test(user.password);
        const isMatch = hasBcryptHash
            ? await bcrypt.compare(password, user.password)
            : user.password === password;

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        if (!hasBcryptHash) {
            user.password = await bcrypt.hash(password, 10);
            await user.save();
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                user_name: user.user_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error during login."
        });
    }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error retrieving profile."
        });
    }
};

module.exports = {
    register,
    login,
    getMe
};
