const express = require("express");
const router = express.Router();
const {
    calculateMonthlyInterest,
    getLoanMonthlyInterestDetails,
    getMonthlyInterestReport
} = require("../controllers/monthlyInterestController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// 1. Calculator / Preview endpoint (Available to all users/calculator forms)
router.post("/calculate", calculateMonthlyInterest);
router.get("/calculate", calculateMonthlyInterest);

// 2. Specific Loan Interest Counts and Tracking (Authenticated: owner or admin)
router.get("/loan/:id", verifyToken, getLoanMonthlyInterestDetails);

// 3. System-wide Monthly Interest Overview & Accounting Report (Admin only)
router.get("/report", verifyToken, requireAdmin, getMonthlyInterestReport);

module.exports = router;
