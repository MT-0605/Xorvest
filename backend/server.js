const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health Check
app.get("/api/health", (req, res) => {
    const isDatabaseConnected = mongoose.connection.readyState === 1;
    res.status(isDatabaseConnected ? 200 : 503).json({
        status: isDatabaseConnected ? "healthy" : "unavailable",
        database: isDatabaseConnected ? "connected" : "disconnected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Mount Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/loans", require("./routes/loanRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Central Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err);
    res.status(err.status || 500).json({
        success: false,
        message: err.status && err.status < 500
            ? err.message
            : "Internal Server Error"
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        console.error("JWT_SECRET must be configured with at least 32 characters.");
        process.exitCode = 1;
    } else {
        connectDB()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Xorvest Backend Server running on port ${PORT}`);
            });
        })
        .catch(error => {
            console.error(`MongoDB Connection Error: ${error.message}`);
            process.exitCode = 1;
        });
    }
}

module.exports = app;
