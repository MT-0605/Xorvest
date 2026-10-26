const Loan = require("../models/Loan");
const User = require("../models/User");
const Installment = require("../models/Installment");
const TransactionLedger = require("../models/TransactionLedger");
const { evaluateInstallmentStatus, round2 } = require("../services/loanService");
const mongoose = require("mongoose");

/**
 * Get all loans with search, filters, pagination, and customer details
 * GET /api/admin/loans
 */
const getAllLoans = async (req, res) => {
    try {
        const { search, frequency, status, page = 1, limit = 20, sort = "-createdAt" } = req.query;

        const query = {};

        if (frequency && ["daily", "weekly", "monthly"].includes(frequency)) {
            query.frequency = frequency;
        }

        if (status) {
            query.status = status;
        }

        // Search by customer name, email, or Loan ID
        if (search) {
            const isObjectId = mongoose.Types.ObjectId.isValid(search);
            if (isObjectId) {
                query.$or = [{ _id: search }];
            } else {
                const matchingUsers = await User.find({
                    $or: [
                        { user_name: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } }
                    ]
                }).select("_id");

                const userIds = matchingUsers.map((u) => u._id);
                query.user_id = { $in: userIds };
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const totalCount = await Loan.countDocuments(query);

        const loans = await Loan.find(query)
            .populate("user_id", "user_name email")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        // For each loan, find the next due date and recovered amount
        const enrichedLoans = await Promise.all(
            loans.map(async (loan) => {
                const nextInstallment = await Installment.findOne({
                    loan_id: loan._id,
                    status: { $nin: ["fully_paid", "paid_late"] }
                }).sort({ due_date: 1 });

                const recoveredAmount = round2(loan.total - loan.remaining);

                return {
                    id: loan._id,
                    loan_id: loan._id,
                    customer: {
                        id: loan.user_id ? loan.user_id._id : null,
                        name: loan.user_id ? loan.user_id.user_name : "Unknown",
                        email: loan.user_id ? loan.user_id.email : "Unknown"
                    },
                    principal_amount: loan.amount,
                    interest_rate: loan.rate,
                    total_interest: loan.interest_amount || round2(loan.total - loan.amount),
                    processing_fee: loan.processing_fee || round2(loan.amount * 0.02),
                    frequency: loan.frequency,
                    tenure: loan.total_day,
                    net_amount_credited: loan.net_disbursed || round2(loan.amount - (loan.initial_deduction || 0)),
                    initial_deduction: loan.initial_deduction || 0,
                    total_recovery_amount: loan.total,
                    amount_already_recovered: recoveredAmount,
                    outstanding_balance: loan.remaining,
                    next_due_date: nextInstallment ? nextInstallment.due_date : null,
                    loan_status: loan.status,
                    created_at: loan.createdAt
                };
            })
        );

        return res.status(200).json({
            success: true,
            total: totalCount,
            page: Number(page),
            pages: Math.ceil(totalCount / Number(limit)),
            loans: enrichedLoans
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve loans: " + error.message
        });
    }
};

/**
 * Get individual loan detail with complete repayment schedule and transaction history
 * GET /api/admin/loans/:id
 */
const getLoanById = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id).populate("user_id", "user_name email");
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Loan not found"
            });
        }

        const installments = await Installment.find({ loan_id: loan._id }).sort({ installment_number: 1 });
        const transactions = await TransactionLedger.find({ loan_id: loan._id })
            .populate("recorded_by_admin", "user_name email")
            .sort({ createdAt: -1 });

        const evaluatedInstallments = installments.map((inst) => {
            const evalStatus = evaluateInstallmentStatus(inst);
            return {
                id: inst._id,
                installment_number: inst.installment_number,
                due_date: inst.due_date,
                original_due_date: inst.original_due_date,
                grace_period_days: inst.grace_period_days,
                grace_end_date: inst.grace_end_date,
                expected_amount: inst.expected_amount,
                principal_component: inst.principal_component,
                interest_component: inst.interest_component,
                amount_paid: inst.amount_paid,
                remaining_balance: inst.remaining_balance,
                status: evalStatus.status,
                is_initial_deduction: inst.is_initial_deduction,
                is_prepaid_interest: inst.is_prepaid_interest,
                actual_payment_date: inst.actual_payment_date,
                days_overdue: evalStatus.daysOverdue,
                notes: inst.notes
            };
        });

        const recoveredAmount = round2(loan.total - loan.remaining);

        return res.status(200).json({
            success: true,
            loan: {
                id: loan._id,
                loan_id: loan._id,
                customer: {
                    id: loan.user_id ? loan.user_id._id : null,
                    name: loan.user_id ? loan.user_id.user_name : "Unknown",
                    email: loan.user_id ? loan.user_id.email : "Unknown"
                },
                principal_amount: loan.amount,
                interest_rate: loan.rate,
                total_interest: loan.interest_amount || round2(loan.total - loan.amount),
                processing_fee: loan.processing_fee || round2(loan.amount * 0.02),
                frequency: loan.frequency,
                tenure: loan.total_day,
                net_amount_credited: loan.net_disbursed || round2(loan.amount - (loan.initial_deduction || 0)),
                initial_deduction: loan.initial_deduction || 0,
                total_recovery_amount: loan.total,
                amount_already_recovered: recoveredAmount,
                outstanding_balance: loan.remaining,
                loan_status: loan.status,
                start_date: loan.start_date,
                created_at: loan.createdAt
            },
            repayment_schedule: evaluatedInstallments,
            transaction_history: transactions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve loan detail: " + error.message
        });
    }
};

module.exports = {
    getAllLoans,
    getLoanById
};
