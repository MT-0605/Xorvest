const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Mount Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/loans", require("./routes/loanRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/monthly-interest", require("./routes/monthlyInterestRoutes"));

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
        message: err.message || "Internal Server Error"
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Xorvest Backend Server running on port ${PORT}`);
    });
}

module.exports = app;
