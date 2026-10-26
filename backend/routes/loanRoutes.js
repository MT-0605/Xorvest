const express = require("express");
const router = express.Router();
const { applyLoan, getMyLoans, getMyLoanDetails } = require("../controllers/loanController");
const { verifyToken } = require("../middleware/auth");

// All routes require authenticated user
router.use(verifyToken);

router.post("/apply", applyLoan);
router.get("/my-loans", getMyLoans);
router.get("/:id", getMyLoanDetails);

module.exports = router;
