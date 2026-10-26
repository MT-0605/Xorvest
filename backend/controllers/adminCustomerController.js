const User = require("../models/User");
const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const TransactionLedger = require("../models/TransactionLedger");
const mongoose = require("mongoose");
const { evaluateInstallmentStatus, round2 } = require("../services/loanService");

/**
 * Get all customers with their loan summaries (Admin View Only)
 * GET /api/admin/customers
 */
const getAllCustomersSummary = async (req, res) => {
    try {
        const customers = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 });

        const customerSummaries = await Promise.all(
            customers.map(async (cust) => {
                const loans = await Loan.find({ user_id: cust._id });
                const installments = await Installment.find({ user_id: cust._id });
                const lastTransaction = await TransactionLedger.findOne({
                    user_id: cust._id,
                    status: "completed",
                    is_reversed: { $ne: true }
                }).sort({ createdAt: -1 });

                let totalDisbursed = 0;
                let totalExpected = 0;
                let totalOutstanding = 0;

                loans.forEach((l) => {
                    totalDisbursed = round2(totalDisbursed + (l.net_disbursed || l.amount));
                    totalExpected = round2(totalExpected + l.total);
                    totalOutstanding = round2(totalOutstanding + l.remaining);
                });

                const totalRecovered = round2(totalExpected - totalOutstanding);

                // Analyze payment behavior
                let onTimeCount = 0;
                let lateCount = 0;
                let overdueCount = 0;
                let partialCount = 0;
                let graceUsageCount = 0;

                installments.forEach((inst) => {
                    const evalStatus = evaluateInstallmentStatus(inst);
                    if (evalStatus.status === "fully_paid") {
                        onTimeCount++;
                    } else if (evalStatus.status === "paid_late") {
                        lateCount++;
                    } else if (evalStatus.isOverdue) {
                        overdueCount++;
                    } else if (evalStatus.isGrace) {
                        graceUsageCount++;
                    }

                    if (inst.amount_paid > 0 && inst.amount_paid < inst.expected_amount) {
                        partialCount++;
                    }
                });

                return {
                    id: cust._id,
                    user_name: cust.user_name,
                    email: cust.email,
                    registered_at: cust.createdAt,
                    loans_count: loans.length,
                    active_loans_count: loans.filter((l) => l.status === "active").length,
                    completed_loans_count: loans.filter((l) => l.status === "completed").length,
                    total_disbursed: totalDisbursed,
                    total_recovered: totalRecovered,
                    total_outstanding: totalOutstanding,
                    performance: {
                        on_time_payments: onTimeCount,
                        late_payments: lateCount,
                        overdue_payments: overdueCount,
                        partial_payments: partialCount,
                        grace_period_usage: graceUsageCount,
                        last_payment_date: lastTransaction ? lastTransaction.createdAt : null
                    }
                };
            })
        );

        return res.status(200).json({
            success: true,
            total_customers: customerSummaries.length,
            customers: customerSummaries
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve customers summary."
        });
    }
};

/**
 * Get comprehensive loan history for a specific customer (Admin View Only)
 * GET /api/admin/customers/:id
 */
const getCustomerLoanHistory = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Customer id must be a valid object ID."
            });
        }
        const customer = await User.findById(req.params.id).select("-password");
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const loans = await Loan.find({ user_id: customer._id }).sort({ createdAt: -1 });
        const installments = await Installment.find({ user_id: customer._id }).sort({ due_date: 1 });
        const transactions = await TransactionLedger.find({ user_id: customer._id }).sort({ createdAt: -1 });

        let totalDisbursed = 0;
        let totalExpected = 0;
        let totalOutstanding = 0;

        loans.forEach((l) => {
            totalDisbursed = round2(totalDisbursed + (l.net_disbursed || l.amount));
            totalExpected = round2(totalExpected + l.total);
            totalOutstanding = round2(totalOutstanding + l.remaining);
        });

        const totalRecovered = round2(totalExpected - totalOutstanding);

        let onTimeCount = 0;
        let lateCount = 0;
        let overdueCount = 0;
        let partialCount = 0;
        let graceUsageCount = 0;

        const evaluatedInstallments = installments.map((inst) => {
            const evalStatus = evaluateInstallmentStatus(inst);
            if (evalStatus.status === "fully_paid") {
                onTimeCount++;
            } else if (evalStatus.status === "paid_late") {
                lateCount++;
            } else if (evalStatus.isOverdue) {
                overdueCount++;
            } else if (evalStatus.isGrace) {
                graceUsageCount++;
            }

            if (inst.amount_paid > 0 && inst.amount_paid < inst.expected_amount) {
                partialCount++;
            }

            return {
                id: inst._id,
                loan_id: inst.loan_id,
                installment_number: inst.installment_number,
                due_date: inst.due_date,
                original_due_date: inst.original_due_date,
                grace_period_days: inst.grace_period_days,
                grace_end_date: inst.grace_end_date,
                expected_amount: inst.expected_amount,
                amount_paid: inst.amount_paid,
                remaining_balance: inst.remaining_balance,
                status: evalStatus.status,
                days_overdue: evalStatus.daysOverdue,
                actual_payment_date: inst.actual_payment_date,
                notes: inst.notes
            };
        });

        return res.status(200).json({
            success: true,
            customer: {
                id: customer._id,
                user_name: customer.user_name,
                email: customer.email,
                role: customer.role,
                created_at: customer.createdAt
            },
            portfolio_summary: {
                total_loans: loans.length,
                total_disbursed: totalDisbursed,
                total_recovered: totalRecovered,
                total_outstanding: totalOutstanding,
                performance: {
                    on_time_payments: onTimeCount,
                    late_payments: lateCount,
                    overdue_payments: overdueCount,
                    partial_payments: partialCount,
                    grace_period_usage: graceUsageCount,
                    last_payment_date: transactions.length > 0 ? transactions[0].createdAt : null
                }
            },
            loans,
            installment_history: evaluatedInstallments,
            transaction_history: transactions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve customer loan history."
        });
    }
};

module.exports = {
    getAllCustomersSummary,
    getCustomerLoanHistory
};
