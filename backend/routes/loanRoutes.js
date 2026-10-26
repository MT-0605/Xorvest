const express = require("express");
const {
    createLoan,
    payDailyInstallment,
    getLoanDetails,
    getPaymentHistory,
    getPendingInstallments
} = require("../controllers/loanController");
const authenticateJWT = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateJWT, createLoan);
router.post("/:loan_id/installments/:count/pay", authenticateJWT, payDailyInstallment);
router.get("/:loan_id/payments", authenticateJWT, getPaymentHistory);
router.get("/:loan_id/installments/pending", authenticateJWT, getPendingInstallments);
router.get("/:loan_id", authenticateJWT, getLoanDetails);

module.exports = router;
