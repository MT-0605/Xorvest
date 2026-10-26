const Installment = require("../models/Installment");
const { evaluateInstallmentStatus, round2 } = require("../services/loanService");

/**
 * Get overdue and delayed payment monitoring report categorized by status
 * GET /api/admin/overdue
 */
const getOverdueReport = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Fetch all installments to categorize
        const installments = await Installment.find()
            .populate("user_id", "user_name email")
            .populate("loan_id", "amount frequency rate total remaining status")
            .sort({ due_date: 1 });

        const categories = {
            due_today: [],
            within_grace_period: [],
            overdue_after_grace: [],
            partially_paid: [],
            paid_late: [],
            fully_paid: []
        };

        let totalOverdueAmount = 0;
        let totalGraceAmount = 0;

        installments.forEach((inst) => {
            const evalStatus = evaluateInstallmentStatus(inst, now);
            const expectedAmount = inst.expected_amount || 0;
            const amountPaid = inst.amount_paid || 0;
            const outstandingAmount = Math.max(0, round2(expectedAmount - amountPaid));

            const item = {
                installment_id: inst._id,
                loan_id: inst.loan_id ? inst.loan_id._id : null,
                frequency: inst.loan_id ? inst.loan_id.frequency : null,
                customer: {
                    id: inst.user_id ? inst.user_id._id : null,
                    name: inst.user_id ? inst.user_id.user_name : "Unknown",
                    email: inst.user_id ? inst.user_id.email : "Unknown"
                },
                installment_number: inst.installment_number,
                original_due_date: inst.original_due_date,
                scheduled_due_date: inst.due_date,
                grace_period_days: inst.grace_period_days,
                grace_period_end_date: inst.grace_end_date,
                amount_due: expectedAmount,
                amount_paid: amountPaid,
                outstanding_amount: outstandingAmount,
                actual_payment_date: inst.actual_payment_date,
                days_overdue: evalStatus.daysOverdue,
                status: evalStatus.status
            };

            const dueDate = new Date(inst.due_date);
            const isDueToday = dueDate >= startOfToday && dueDate <= endOfToday;

            // Categorize into specific buckets
            if (evalStatus.status === "fully_paid") {
                categories.fully_paid.push(item);
            } else if (evalStatus.status === "paid_late") {
                categories.paid_late.push(item);
            } else if (evalStatus.isOverdue) {
                categories.overdue_after_grace.push(item);
                totalOverdueAmount = round2(totalOverdueAmount + outstandingAmount);
                if (amountPaid > 0) {
                    categories.partially_paid.push(item);
                }
            } else if (evalStatus.isGrace) {
                categories.within_grace_period.push(item);
                totalGraceAmount = round2(totalGraceAmount + outstandingAmount);
                if (amountPaid > 0) {
                    categories.partially_paid.push(item);
                }
            } else if (isDueToday) {
                categories.due_today.push(item);
                if (amountPaid > 0) {
                    categories.partially_paid.push(item);
                }
            } else if (amountPaid > 0 && amountPaid < expectedAmount) {
                categories.partially_paid.push(item);
            }
        });

        return res.status(200).json({
            success: true,
            summary: {
                total_due_today: categories.due_today.length,
                total_within_grace_period: categories.within_grace_period.length,
                total_overdue_after_grace: categories.overdue_after_grace.length,
                total_partially_paid: categories.partially_paid.length,
                total_paid_late: categories.paid_late.length,
                total_fully_paid: categories.fully_paid.length,
                total_overdue_amount: totalOverdueAmount,
                total_grace_amount: totalGraceAmount
            },
            categories
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to load overdue report: " + error.message
        });
    }
};

module.exports = {
    getOverdueReport
};
