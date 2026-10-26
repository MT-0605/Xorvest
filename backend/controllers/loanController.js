const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const Money = require("../models/Money");
const TransactionLedger = require("../models/TransactionLedger");
const { calculateLoanSchedule, evaluateInstallmentStatus } = require("../services/loanService");

/**
 * Apply for / create a new loan
 * POST /api/loans/apply
 */
const applyLoan = async (req, res) => {
    try {
        const { amount, frequency, rate, total_day, notes } = req.body;

        if (!amount || !frequency || rate === undefined || !total_day) {
            return res.status(400).json({
                success: false,
                message: "Please provide amount, frequency (daily, weekly, monthly), rate, and total_day"
            });
        }

        if (!["daily", "weekly", "monthly"].includes(frequency)) {
            return res.status(400).json({
                success: false,
                message: "Frequency must be 'daily', 'weekly', or 'monthly'"
            });
        }

        const userId = req.user._id;

        // Calculate schedule and upfront deductions
        const scheduleData = calculateLoanSchedule({
            amount,
            frequency,
            rate,
            total_day,
            startDate: new Date()
        });

        // Create Loan document adhering to the original and extended schema
        const loan = await Loan.create({
            amount: scheduleData.principal,
            frequency,
            rate: scheduleData.interestRate,
            total_day: Number(total_day),
            user_id: userId,
            total: scheduleData.totalRecovery,
            remaining: scheduleData.remainingToRecover,
            processing_fee: scheduleData.processingFee,
            interest_amount: scheduleData.interestAmount,
            net_disbursed: scheduleData.netDisbursed,
            initial_deduction: scheduleData.initialDeduction,
            status: "active",
            start_date: new Date(),
            notes: notes || ""
        });

        // Insert Installments
        const installmentsToInsert = scheduleData.installments.map((inst) => ({
            ...inst,
            loan_id: loan._id,
            user_id: userId
        }));

        const createdInstallments = await Installment.insertMany(installmentsToInsert);

        // Record initial upfront recovery in TransactionLedger and Money if applicable
        if (scheduleData.upfrontRecovered > 0) {
            const firstInst = createdInstallments[0];
            const payRef = `DED-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

            const ledgerEntry = await TransactionLedger.create({
                payment_reference: payRef,
                loan_id: loan._id,
                installment_id: firstInst ? firstInst._id : null,
                user_id: userId,
                recorded_by_admin: req.user.role === "admin" ? req.user._id : userId,
                recorded_by_name: req.user.user_name || "System Disbursement",
                amount: scheduleData.upfrontRecovered,
                transaction_type: "initial_deduction",
                payment_method: "system_deduction",
                status: "completed",
                notes: `Upfront disbursement deduction (${frequency} loan)`
            });

            // Sync with existing Money model
            const moneyRecord = await Money.create({
                loan_id: loan._id,
                date: new Date(),
                amount: scheduleData.upfrontRecovered,
                count: 1
            });

            ledgerEntry.money_id = moneyRecord._id;
            await ledgerEntry.save();
        }

        return res.status(201).json({
            success: true,
            message: "Loan created and disbursed successfully",
            loan,
            calculation: {
                principal: scheduleData.principal,
                interest_amount: scheduleData.interestAmount,
                total_recovery: scheduleData.totalRecovery,
                processing_fee: scheduleData.processingFee,
                initial_deduction: scheduleData.initialDeduction,
                net_disbursed: scheduleData.netDisbursed,
                upfront_recovered: scheduleData.upfrontRecovered,
                remaining_to_recover: scheduleData.remainingToRecover,
                installments_count: createdInstallments.length
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to apply for loan: " + error.message
        });
    }
};

/**
 * Customer view of their own loans
 * GET /api/loans/my-loans
 */
const getMyLoans = async (req, res) => {
    try {
        const loans = await Loan.find({ user_id: req.user._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: loans.length,
            loans
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve loans: " + error.message
        });
    }
};

/**
 * Customer view of an individual loan and its repayment schedule
 * GET /api/loans/:id
 */
const getMyLoanDetails = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Loan not found"
            });
        }

        // Regular customers can ONLY view their own loan
        if (req.user.role !== "admin" && loan.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to view this loan"
            });
        }

        const installments = await Installment.find({ loan_id: loan._id }).sort({ installment_number: 1 });
        const evaluatedInstallments = installments.map((inst) => {
            const statusInfo = evaluateInstallmentStatus(inst);
            return {
                ...inst.toObject(),
                status: statusInfo.status,
                days_overdue: statusInfo.daysOverdue,
                is_grace: statusInfo.isGrace,
                is_overdue: statusInfo.isOverdue
            };
        });

        const transactions = await TransactionLedger.find({ loan_id: loan._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            loan,
            installments: evaluatedInstallments,
            transactions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve loan details: " + error.message
        });
    }
};

module.exports = {
    applyLoan,
    getMyLoans,
    getMyLoanDetails
};
