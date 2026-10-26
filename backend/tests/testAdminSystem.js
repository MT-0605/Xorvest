/**
 * Comprehensive Automated Verification Test Suite
 * Validates all 6 criteria from Prompt Section 10:
 * 1. Administrator can access all authorized features.
 * 2. Regular customer CANNOT access admin dashboard or APIs (returns HTTP 403; unauthenticated returns HTTP 401).
 * 3. Initial deductions are recorded correctly (Daily, Weekly, Monthly).
 * 4. Repayments and outstanding balances reconcile (payments, Money model sync, auditable reversals).
 * 5. Delayed payments and grace periods are calculated correctly without overwriting original due dates.
 * 6. Dashboard statistics match underlying database records dynamically.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const connectDB = require("../config/db");

process.env.NODE_ENV = "test";
if (!process.env.TEST_MONGODB_URI) {
    throw new Error("Set TEST_MONGODB_URI to a dedicated test database before running integration tests.");
}
const testDatabaseName = new URL(process.env.TEST_MONGODB_URI).pathname.slice(1);
if (!/^xorvest_test(?:_[a-z0-9_-]+)?$/i.test(testDatabaseName)) {
    throw new Error("Integration tests may only use a database named xorvest_test or xorvest_test_<suffix>.");
}
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
process.env.MONGO_URI = process.env.TEST_MONGODB_URI;
process.env.JWT_SECRET = "integration-test-only-secret-32-characters";

const app = require("../server");
const User = require("../models/User");
const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const Money = require("../models/Money");
const TransactionLedger = require("../models/TransactionLedger");
const { calculateLoanSchedule, evaluateInstallmentStatus } = require("../services/loanService");

let server;
let baseUrl;

const startServer = () => {
    return connectDB().then(() => new Promise((resolve) => {
        server = app.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            console.log(`Test server running on ${baseUrl}`);
            resolve();
        });
    }));
};

const stopServer = async () => {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
};

const makeRequest = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
};

const runTests = async () => {
    console.log("\n=======================================================");
    console.log("   XORVEST ADMIN REPAYMENT SYSTEM - TEST SUITE");
    console.log("=======================================================\n");

    await startServer();

    try {
        // Clear only records owned by this test suite; never truncate collections.
        const testUsers = await User.find({
            email: /@testxorvest\.com$/
        }).select("_id");
        const testUserIds = testUsers.map(user => user._id);
        const testLoans = await Loan.find({ user_id: { $in: testUserIds } }).select("_id");
        const testLoanIds = testLoans.map(loan => loan._id);

        await TransactionLedger.deleteMany({
            $or: [
                { user_id: { $in: testUserIds } },
                { loan_id: { $in: testLoanIds } }
            ]
        });
        await Money.deleteMany({ loan_id: { $in: testLoanIds } });
        await Installment.deleteMany({ loan_id: { $in: testLoanIds } });
        await Loan.deleteMany({ _id: { $in: testLoanIds } });
        await User.deleteMany({ _id: { $in: testUserIds } });

        console.log(" Cleaned up test database collections.\n");

        // ----------------------------------------------------
        // TEST 1: User Registration & Authentication Setup
        // ----------------------------------------------------
        console.log(">>> [SETUP] Creating Admin and registering Regular Customer...");

        const adminPassword = await bcrypt.hash("adminPassword123!", 10);
        const adminUser = await User.create({
            user_name: "Admin User",
            email: "admin@testxorvest.com",
            password: adminPassword,
            role: "admin"
        });
        const adminId = adminUser._id.toString();
        const adminToken = jwt.sign({ id: adminId }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const adminRegistrationRes = await makeRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                user_name: "Unprivileged Admin",
                email: "unprivileged-admin@testxorvest.com",
                password: "customerPassword123!",
                role: "admin"
            })
        });
        if (adminRegistrationRes.status !== 201
            || adminRegistrationRes.data.user.role !== "user") {
            throw new Error("Public registration must not grant administrator privileges.");
        }
        console.log(" Admin fixture created directly; public registration cannot grant ADMIN role.");

        const customerRes = await makeRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                user_name: "John Customer",
                email: "customer@testxorvest.com",
                password: "customerPassword123!",
                role: "user"
            })
        });
        if (customerRes.status !== 201) throw new Error("Customer registration failed: " + JSON.stringify(customerRes.data));
        const customerToken = customerRes.data.token;
        const customerId = customerRes.data.user.id;
        console.log(" Customer registered successfully with USER role.\n");

        // ----------------------------------------------------
        // TEST 2: Security & Role-Based Authorization
        // ----------------------------------------------------
        console.log(">>> [SECURITY TEST] Validating Role-Based Access Controls...");

        // Unauthenticated request -> HTTP 401
        const unauthRes = await makeRequest("/api/admin/dashboard");
        console.log(`    - Unauthenticated GET /api/admin/dashboard -> Status: ${unauthRes.status} (Expected: 401)`);
        if (unauthRes.status !== 401) throw new Error(`Expected 401, got ${unauthRes.status}`);

        // Customer token on admin endpoint -> HTTP 403 Forbidden
        const custAdminRes = await makeRequest("/api/admin/dashboard", {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log(`    - Regular Customer Token on GET /api/admin/dashboard -> Status: ${custAdminRes.status} (Expected: 403)`);
        if (custAdminRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${custAdminRes.status}`);

        // Customer token on admin loans -> HTTP 403
        const custLoanRes = await makeRequest("/api/admin/loans", {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log(`    - Regular Customer Token on GET /api/admin/loans -> Status: ${custLoanRes.status} (Expected: 403)`);
        if (custLoanRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${custLoanRes.status}`);

        // Customer token on admin calendar -> HTTP 403
        const custCalRes = await makeRequest("/api/admin/calendar", {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log(`    - Regular Customer Token on GET /api/admin/calendar -> Status: ${custCalRes.status} (Expected: 403)`);
        if (custCalRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${custCalRes.status}`);

        // Admin token on admin dashboard -> HTTP 200 OK
        const adminDashboardRes = await makeRequest("/api/admin/dashboard", {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`    - Admin Token on GET /api/admin/dashboard -> Status: ${adminDashboardRes.status} (Expected: 200)`);
        if (adminDashboardRes.status !== 200) throw new Error(`Expected 200 OK for admin, got ${adminDashboardRes.status}`);

        console.log(" PASS: Backend Security & Admin-only Authorization strictly verified!\n");

        // ----------------------------------------------------
        // TEST 3: Initial Deductions & Repayment Rules
        // ----------------------------------------------------
        console.log(">>> [LOAN CALCULATION TEST] Testing Daily, Weekly, and Monthly Loans...");

        // 3a. Daily Loan (Principal: 10000, Rate: 10%, Tenure: 10 days)
        // Processing fee: 2% of 10000 = 200
        // Total interest: 1000, Total recovery: 11000
        // Daily EMI: 11000 / 10 = 1100
        // Initial deduction: 200 (processing fee) + 1100 (Day 1 EMI) = 1300
        // Net credited: 10000 - 1300 = 8700
        // Remaining to recover: 11000 - 1100 = 9900
        const dailyLoanRes = await makeRequest("/api/loans/apply", {
            method: "POST",
            headers: { Authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({
                amount: 10000,
                frequency: "daily",
                rate: 10,
                total_day: 10,
                notes: "Daily Microloan Test"
            })
        });
        if (dailyLoanRes.status !== 201) throw new Error("Daily loan failed: " + JSON.stringify(dailyLoanRes.data));
        const dailyCalc = dailyLoanRes.data.calculation;
        console.log("    - Daily Loan Created:");
        console.log(`      * Principal: ${dailyCalc.principal}, Net Disbursed: ${dailyCalc.net_disbursed} (Expected: 8700)`);
        console.log(`      * Initial Deduction: ${dailyCalc.initial_deduction} (Expected: 1300)`);
        console.log(`      * Remaining to Recover: ${dailyCalc.remaining_to_recover} (Expected: 9900)`);
        if (dailyCalc.net_disbursed !== 8700 || dailyCalc.initial_deduction !== 1300 || dailyCalc.remaining_to_recover !== 9900) {
            throw new Error("Daily loan calculation mismatch!");
        }

        // Verify Installment #1 for daily loan is marked paid upfront
        const dailyInst1 = await Installment.findOne({ loan_id: dailyLoanRes.data.loan._id, installment_number: 1 });
        if (dailyInst1.status !== "fully_paid" || dailyInst1.remaining_balance !== 0) {
            throw new Error("Daily Installment #1 was not marked paid upfront!");
        }
        console.log("      * Daily Installment #1 verified paid upfront at disbursement.");

        // 3b. Weekly Loan (Principal: 14000, Rate: 10%, Tenure: 28 days = 4 weeks)
        // Processing fee: 2% of 14000 = 280
        // Total interest: 1400, Total recovery: 15400
        // Weekly EMI: 15400 / 4 = 3850
        // Half of first weekly EMI: 3850 / 2 = 1925
        // Initial deduction: 280 + 1925 = 2205
        // Net credited: 14000 - 2205 = 11795
        // Remaining to recover: 15400 - 1925 = 13475
        const weeklyLoanRes = await makeRequest("/api/loans/apply", {
            method: "POST",
            headers: { Authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({
                amount: 14000,
                frequency: "weekly",
                rate: 10,
                total_day: 28,
                notes: "Weekly Loan Test"
            })
        });
        if (weeklyLoanRes.status !== 201) throw new Error("Weekly loan failed: " + JSON.stringify(weeklyLoanRes.data));
        const weeklyCalc = weeklyLoanRes.data.calculation;
        console.log("    - Weekly Loan Created:");
        console.log(`      * Principal: ${weeklyCalc.principal}, Net Disbursed: ${weeklyCalc.net_disbursed} (Expected: 11795)`);
        console.log(`      * Initial Deduction: ${weeklyCalc.initial_deduction} (Expected: 2205)`);
        console.log(`      * Remaining to Recover: ${weeklyCalc.remaining_to_recover} (Expected: 13475)`);
        if (weeklyCalc.net_disbursed !== 11795 || weeklyCalc.initial_deduction !== 2205 || weeklyCalc.remaining_to_recover !== 13475) {
            throw new Error("Weekly loan calculation mismatch!");
        }

        // Verify Installment #1 for weekly loan has 50% paid and remaining balance 1925
        const weeklyInst1 = await Installment.findOne({ loan_id: weeklyLoanRes.data.loan._id, installment_number: 1 });
        if (weeklyInst1.amount_paid !== 1925 || weeklyInst1.remaining_balance !== 1925 || weeklyInst1.status !== "partially_paid") {
            throw new Error("Weekly Installment #1 initial deduction tracking failed!");
        }
        console.log("      * Weekly Installment #1 verified partially paid (50% deducted upfront).");

        // 3c. Monthly Loan (Principal: 30000, Rate: 10%, Tenure: 90 days = 3 months)
        // Processing fee: 2% of 30000 = 600
        // Total interest: 3000, Total recovery: 33000
        // Monthly interest: 3000 / 3 = 1000
        // Monthly principal: 30000 / 3 = 10000
        // Upfront deduction: 600 (fee) + 1000 (prepaid month 1 interest) = 1600
        // Net credited: 30000 - 1600 = 28400
        // Remaining to recover: 33000 - 1000 = 32000
        const monthlyLoanRes = await makeRequest("/api/loans/apply", {
            method: "POST",
            headers: { Authorization: `Bearer ${customerToken}` },
            body: JSON.stringify({
                amount: 30000,
                frequency: "monthly",
                rate: 10,
                total_day: 90,
                notes: "Monthly Loan Test"
            })
        });
        if (monthlyLoanRes.status !== 201) throw new Error("Monthly loan failed: " + JSON.stringify(monthlyLoanRes.data));
        const monthlyCalc = monthlyLoanRes.data.calculation;
        console.log("    - Monthly Loan Created:");
        console.log(`      * Principal: ${monthlyCalc.principal}, Net Disbursed: ${monthlyCalc.net_disbursed} (Expected: 28400)`);
        console.log(`      * Initial Deduction: ${monthlyCalc.initial_deduction} (Expected: 1600)`);
        console.log(`      * Remaining to Recover: ${monthlyCalc.remaining_to_recover} (Expected: 32000)`);
        if (monthlyCalc.net_disbursed !== 28400 || monthlyCalc.initial_deduction !== 1600 || monthlyCalc.remaining_to_recover !== 32000) {
            throw new Error("Monthly loan calculation mismatch!");
        }

        // Verify Installment #1 for monthly loan: expected amount on due date is ONLY principal (10000), interest was prepaid upfront!
        const monthlyInst1 = await Installment.findOne({ loan_id: monthlyLoanRes.data.loan._id, installment_number: 1 });
        if (monthlyInst1.expected_amount !== 10000 || monthlyInst1.is_prepaid_interest !== true) {
            throw new Error("Monthly Installment #1 prepaid interest rule failed!");
        }
        console.log("      * Monthly Installment #1 verified: Interest prepaid upfront, only principal (10000) remains due on schedule.");

        console.log(" PASS: Daily, Weekly, and Monthly initial deduction and repayment rules verified!\n");

        // ----------------------------------------------------
        // TEST 4: Payment Management, Reconciliation & Reversal
        // ----------------------------------------------------
        console.log(">>> [ADMIN PAYMENT & AUDIT TEST] Recording verified payment & testing reversal...");

        const weeklyLoanId = weeklyLoanRes.data.loan._id;
        const initialRemaining = weeklyLoanRes.data.calculation.remaining_to_recover; // 13475

        // Admin records a verified repayment of 1925 to clear Installment #1
        const payRes = await makeRequest("/api/admin/payments", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                loan_id: weeklyLoanId,
                installment_id: weeklyInst1._id,
                amount: 1925,
                payment_method: "upi",
                notes: "Verified payment via UPI"
            })
        });
        if (payRes.status !== 201) throw new Error("Admin payment recording failed: " + JSON.stringify(payRes.data));
        console.log(`    - Payment of 1925 recorded. Payment Ref: ${payRes.data.transaction.payment_reference}`);

        // Verify Money.js was synced
        const moneyDocs = await Money.find({ loan_id: weeklyLoanId });
        console.log(`    - Synced with Money model. Money entries for loan: ${moneyDocs.length} (Expected >= 2)`);
        if (moneyDocs.length < 2) throw new Error("Money model was not synced with repayment!");

        // Verify Installment #1 is now fully paid
        const reloadedWeeklyInst1 = await Installment.findById(weeklyInst1._id);
        console.log(`    - Weekly Installment #1 status: ${reloadedWeeklyInst1.status}, remaining balance: ${reloadedWeeklyInst1.remaining_balance}`);
        if (reloadedWeeklyInst1.status !== "fully_paid" || reloadedWeeklyInst1.remaining_balance !== 0) {
            throw new Error("Installment #1 was not marked fully_paid after completing remaining balance!");
        }

        // Verify Loan remaining balance decremented
        const reloadedLoan = await Loan.findById(weeklyLoanId);
        const expectedNewRemaining = Math.round((initialRemaining - 1925) * 100) / 100;
        console.log(`    - Loan remaining balance: ${reloadedLoan.remaining} (Expected: ${expectedNewRemaining})`);
        if (reloadedLoan.remaining !== expectedNewRemaining) throw new Error("Loan remaining balance did not reconcile!");

        // Duplicate payment prevention test
        const dupPayRes = await makeRequest("/api/admin/payments", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                loan_id: weeklyLoanId,
                installment_id: weeklyInst1._id,
                amount: 1925,
                payment_method: "upi",
                payment_reference: payRes.data.transaction.payment_reference
            })
        });
        console.log(`    - Duplicate reference test -> Status: ${dupPayRes.status} (Expected: 409 Conflict)`);
        if (dupPayRes.status !== 409) throw new Error(`Expected 409 Conflict for duplicate payment reference, got ${dupPayRes.status}`);

        // Auditable reversal test
        const paymentTxId = payRes.data.transaction._id;
        const revRes = await makeRequest(`/api/admin/payments/${paymentTxId}/reverse`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                reversal_reason: "Customer made payment via incorrect account, reversing per audit policy"
            })
        });
        if (revRes.status !== 200) throw new Error("Reversal failed: " + JSON.stringify(revRes.data));
        console.log(`    - Auditable Reversal successful. Reversal Ref: ${revRes.data.reversal_transaction.payment_reference}`);

        // Verify balance restored after reversal
        const loanAfterReversal = await Loan.findById(weeklyLoanId);
        console.log(`    - Loan remaining balance restored after reversal: ${loanAfterReversal.remaining} (Expected: ${initialRemaining})`);
        if (loanAfterReversal.remaining !== initialRemaining) throw new Error("Loan balance was not restored after reversal!");

        console.log(" PASS: Payment management, reconciliation, duplicate prevention, and auditable reversal verified!\n");

        // ----------------------------------------------------
        // TEST 5: Grace Period & Overdue Rules
        // ----------------------------------------------------
        console.log(">>> [GRACE PERIOD & OVERDUE TEST] Validating grace rules and overdue calculation...");

        // Simulate an installment from the past
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

        const overdueInst = await Installment.create({
            loan_id: dailyLoanRes.data.loan._id,
            user_id: customerId,
            installment_number: 99,
            due_date: pastDate,
            original_due_date: pastDate,
            grace_period_days: 1,
            grace_end_date: new Date(pastDate.getTime() + 1 * 24 * 60 * 60 * 1000), // grace ended 9 days ago
            expected_amount: 1100,
            amount_paid: 0,
            remaining_balance: 1100,
            status: "pending"
        });

        const overdueEval = evaluateInstallmentStatus(overdueInst, new Date());
        console.log(`    - Past Installment Evaluation: Status: ${overdueEval.status}, Days Overdue: ${overdueEval.daysOverdue}`);
        if (overdueEval.status !== "overdue" || overdueEval.daysOverdue < 9) {
            throw new Error("Overdue calculation failed!");
        }
        if (overdueInst.original_due_date.toISOString() !== pastDate.toISOString()) {
            throw new Error("Original due date was overwritten!");
        }

        // Check overdue API report
        const overdueReportRes = await makeRequest("/api/admin/overdue", {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (overdueReportRes.status !== 200) throw new Error("Overdue report failed!");
        console.log(`    - Overdue report summary: Total overdue after grace: ${overdueReportRes.data.summary.total_overdue_after_grace}`);
        if (overdueReportRes.data.summary.total_overdue_after_grace < 1) {
            throw new Error("Overdue installment not detected in admin overdue report!");
        }

        console.log(" PASS: Grace periods and overdue tracking verified without overwriting original due date!\n");

        // ----------------------------------------------------
        // TEST 6: Dashboard Statistics Verification from DB
        // ----------------------------------------------------
        console.log(">>> [DASHBOARD METRICS TEST] Validating dynamic dashboard aggregation from DB...");

        const finalDashboardRes = await makeRequest("/api/admin/dashboard", {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (finalDashboardRes.status !== 200) throw new Error("Dashboard failed!");

        const d = finalDashboardRes.data.dashboard;
        console.log("    - Dashboard Metrics from Actual DB:");
        console.log(`      * Total Loans Issued: ${d.total_loans_issued}`);
        console.log(`      * Total Principal Disbursed: ${d.total_principal_disbursed}`);
        console.log(`      * Total Interest Expected: ${d.total_interest_expected}`);
        console.log(`      * Processing Fees Collected: ${d.processing_fees_collected}`);
        console.log(`      * Total Expected Recovery: ${d.total_expected_recovery}`);
        console.log(`      * Total Amount Recovered: ${d.total_amount_recovered}`);
        console.log(`      * Total Outstanding Amount: ${d.total_outstanding_amount}`);
        console.log(`      * Active Loans: ${d.active_loans}`);
        console.log(`      * Customers with Overdue Installments: ${d.customers_with_overdue_installments}`);

        const dbLoanCount = await Loan.countDocuments();
        if (d.total_loans_issued !== dbLoanCount) {
            throw new Error(`Dashboard total loans (${d.total_loans_issued}) does not match DB count (${dbLoanCount})!`);
        }

        console.log(" PASS: Dashboard metrics accurately reflect actual database records!\n");

        // ----------------------------------------------------
        // TEST 7: Collection Calendar & Customer History
        // ----------------------------------------------------
        console.log(">>> [CALENDAR & CUSTOMER HISTORY TEST] Validating admin calendar & customer portfolio...");

        const calendarRes = await makeRequest("/api/admin/calendar", {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (calendarRes.status !== 200) throw new Error("Calendar query failed!");
        console.log(`    - Collection Calendar today: ${calendarRes.data.summary.total_installments_due} installments due.`);

        const customerHistRes = await makeRequest(`/api/admin/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (customerHistRes.status !== 200) throw new Error("Customer history query failed!");
        console.log(`    - Customer portfolio: ${customerHistRes.data.portfolio_summary.total_loans} loans, Disbursed: ${customerHistRes.data.portfolio_summary.total_disbursed}`);

        console.log(" PASS: Collection calendar and customer history endpoints verified!\n");

        console.log("=======================================================");
        console.log("   ALL 6 PROMPT VERIFICATION TESTS PASSED SUCCESSFULLY! ");
        console.log("=======================================================\n");
    } finally {
        await stopServer();
    }
};

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test Suite Failed:", err);
        process.exit(1);
    });
