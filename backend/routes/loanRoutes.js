const express = require("express");
const router = express.Router();
const { applyLoan, getMyLoans, getMyLoanDetails } = require("../controllers/loanController");
const { createDailyLoan } = require("../controllers/dailyLoanController");
const { createWeeklyLoan } = require("../controllers/weeklyLoanController");
const { verifyToken } = require("../middleware/auth");

// All routes require authenticated user
router.use(verifyToken);

router.post("/apply", applyLoan);
router.post("/daily", createDailyLoan);
router.post("/weekly", createWeeklyLoan);
router.get("/my-loans", getMyLoans);
router.get("/:id", getMyLoanDetails);

module.exports = router;
