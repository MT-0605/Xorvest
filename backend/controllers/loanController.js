const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const Money = require("../models/Money");
const TransactionLedger = require("../models/TransactionLedger");
const { calculateLoanSchedule, evaluateInstallmentStatus } = require("../services/loanService");
const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

/**
 * Apply for / create a new loan
 * POST /api/loans/apply
 */
const applyLoan = async (req, res, requiredFrequency = null) => {
    let session;
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const {
            amount,
            frequency: requestedFrequency,
            rate,
            total_day,
            notes
        } = req.body || {};
        const frequency = requiredFrequency || requestedFrequency;

        if (amount === undefined || !frequency || rate === undefined || total_day === undefined) {
            return res.status(400).json({
                success: false,
                message: requiredFrequency
                    ? `Please provide amount, rate, and total_day for a ${requiredFrequency} loan.`
                    : "Please provide amount, frequency (daily, weekly, monthly), rate, and total_day."
            });
        }
        if (requiredFrequency && requestedFrequency && requestedFrequency !== requiredFrequency) {
            return res.status(400).json({
                success: false,
                message: `This endpoint only creates ${requiredFrequency} loans.`
            });
        }

        if (typeof notes !== "undefined" && (typeof notes !== "string" || notes.length > 1000)) {
            return res.status(400).json({
                success: false,
                message: "notes must be a string of at most 1000 characters."
            });
        }

        if (!["daily", "weekly", "monthly"].includes(frequency)) {
            return res.status(400).json({
                success: false,
                message: "Frequency must be 'daily', 'weekly', or 'monthly'"
            });
        }

        const userId = req.user._id;

        let scheduleData;
        const startDate = new Date();
        try {
            scheduleData = calculateLoanSchedule({
                amount,
                frequency,
                rate,
                total_day,
                startDate
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        session = await mongoose.startSession();
        let loan;
        let createdInstallments;
        await session.withTransaction(async () => {
            [loan] = await Loan.create([{
                amount: scheduleData.principal,
                frequency,
                rate: scheduleData.interestRate,
                total_day: Number(total_day),
                user_id: userId,
                total: scheduleData.totalRecovery,
                remaining: scheduleData.remainingToRecover,
                duration_months: scheduleData.totalMonths
                    || Math.max(1, Math.ceil(Number(total_day) / 30)),
                processing_charge_rate: scheduleData.processingFeeRate,
                processing_charge: scheduleData.processingFee,
                total_interest: scheduleData.interestAmount,
                net_disbursed_amount: scheduleData.netDisbursed,
                processing_fee: scheduleData.processingFee,
                interest_amount: scheduleData.interestAmount,
                net_disbursed: scheduleData.netDisbursed,
                initial_deduction: scheduleData.initialDeduction,
                repayment_schedule: scheduleData.installments.map(installment => ({
                    date: installment.due_date,
                    count: installment.installment_number,
                    amount: installment.expected_amount,
                    paid_amount: installment.amount_paid,
                    remaining: installment.remaining_balance,
                    status: installment.amount_paid >= installment.expected_amount
                        ? "paid"
                        : installment.amount_paid > 0
                            ? "partial"
                            : "pending"
                })),
                status: scheduleData.remainingToRecover === 0 ? "completed" : "active",
                start_date: startDate,
                notes: notes || ""
            }], { session });

            const installmentsToInsert = scheduleData.installments.map(inst => ({
                ...inst,
                loan_id: loan._id,
                user_id: userId
            }));
            createdInstallments = await Installment.insertMany(installmentsToInsert, { session });

            if (scheduleData.upfrontRecovered > 0) {
                const [ledgerEntry] = await TransactionLedger.create([{
                    payment_reference: `DED-${randomUUID()}`,
                    loan_id: loan._id,
                    installment_id: createdInstallments[0]._id,
                    user_id: userId,
                    recorded_by_admin: req.user.role === "admin" ? req.user._id : userId,
                    recorded_by_name: req.user.user_name || "System Disbursement",
                    amount: scheduleData.upfrontRecovered,
                    transaction_type: "initial_deduction",
                    payment_method: "system_deduction",
                    status: "completed",
                    notes: `Upfront disbursement deduction (${frequency} loan)`
                }], { session });

                const [moneyRecord] = await Money.create([{
                    loan_id: loan._id,
                    date: startDate,
                    amount: scheduleData.upfrontRecovered,
                    count: 1
                }], { session });

                ledgerEntry.money_id = moneyRecord._id;
                await ledgerEntry.save({ session });
            }
        });

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
        if (error.code === 20 || error.codeName === "IllegalOperation"
            || /transaction numbers are only allowed|does not support transactions/i.test(error.message)) {
            return res.status(503).json({
                success: false,
                message: "Loan creation requires MongoDB transaction support (a replica set or sharded cluster)."
            });
        }
        return res.status(500).json({
            success: false,
            message: "Failed to apply for loan."
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

const createDailyLoan = (req, res) => applyLoan(req, res, "daily");
const createWeeklyLoan = (req, res) => applyLoan(req, res, "weekly");

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
            message: "Failed to retrieve loans."
        });
    }
};

/**
 * Customer view of an individual loan and its repayment schedule
 * GET /api/loans/:id
 */
const getMyLoanDetails = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Loan id must be a valid object ID."
            });
        }

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
        return res.status(500).json({ success: false, message: "Failed to retrieve loan details." });
    }
};

module.exports = {
    applyLoan,
    createDailyLoan,
    createWeeklyLoan,
    getMyLoans,
    getMyLoanDetails
};
