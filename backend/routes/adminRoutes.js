const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");

const { getAdminDashboard } = require("../controllers/adminDashboardController");
const { getAllLoans, getLoanById } = require("../controllers/adminLoanController");
const { getCollectionCalendar } = require("../controllers/adminCalendarController");
const { getOverdueReport } = require("../controllers/adminOverdueController");
const { getAllCustomersSummary, getCustomerLoanHistory } = require("../controllers/adminCustomerController");
const { recordPayment, reversePayment, getTransactionLedger } = require("../controllers/adminPaymentController");

// Enforce strict authentication and ADMIN authorization on every route
router.use(verifyToken);
router.use(requireAdmin);

// 1. Dashboard Metrics
router.get("/dashboard", getAdminDashboard);

// 2. Loan Management
router.get("/loans", getAllLoans);
router.get("/loans/:id", getLoanById);

// 3. Collection Calendar
router.get("/calendar", getCollectionCalendar);

// 4. Overdue Payment Tracking
router.get("/overdue", getOverdueReport);

// 5. Customer Loan Histories
router.get("/customers", getAllCustomersSummary);
router.get("/customers/:id", getCustomerLoanHistory);

// 6. Payment Management & Auditable Ledger
router.post("/payments", recordPayment);
router.post("/payments/:id/reverse", reversePayment);
router.get("/payments/ledger", getTransactionLedger);

module.exports = router;
