const Installment = require("../models/Installment");
const Loan = require("../models/Loan");
const { evaluateInstallmentStatus, round2 } = require("../services/loanService");

/**
 * Get date-wise repayment calendar data for admin
 * GET /api/admin/calendar
 * Query params:
 *   date: YYYY-MM-DD (defaults to today)
 *   frequency: 'daily' | 'weekly' | 'monthly' | 'all'
 */
const getCollectionCalendar = async (req, res) => {
    try {
        const { date, frequency } = req.query;

        let targetDate = new Date();
        let targetDateString;
        if (date) {
            if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    message: "date must use YYYY-MM-DD format."
                });
            }
            const [year, month, day] = date.split("-").map(Number);
            targetDate = new Date(year, month - 1, day);
            if (targetDate.getFullYear() !== year
                || targetDate.getMonth() !== month - 1
                || targetDate.getDate() !== day) {
                return res.status(400).json({
                    success: false,
                    message: "date must be a valid calendar date."
                });
            }
            targetDateString = date;
        } else {
            targetDateString = [
                targetDate.getFullYear(),
                String(targetDate.getMonth() + 1).padStart(2, "0"),
                String(targetDate.getDate()).padStart(2, "0")
            ].join("-");
        }
        if (frequency && !["daily", "weekly", "monthly", "all"].includes(frequency)) {
            return res.status(400).json({
                success: false,
                message: "frequency must be daily, weekly, monthly, or all."
            });
        }

        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

        // Find installments with due_date on this day
        const installmentQuery = {
            due_date: { $gte: startOfDay, $lte: endOfDay }
        };

        const installments = await Installment.find(installmentQuery)
            .populate("user_id", "user_name email")
            .populate("loan_id", "frequency amount total remaining status")
            .sort({ installment_number: 1 });

        // Filter by frequency if specified
        const filteredInstallments = installments.filter((inst) => {
            if (!inst.loan_id) return false;
            if (frequency && frequency !== "all") {
                return inst.loan_id.frequency === frequency;
            }
            return true;
        });

        let totalExpected = 0;
        let totalCollected = 0;
        let totalOutstanding = 0;

        const items = filteredInstallments.map((inst) => {
            const evalStatus = evaluateInstallmentStatus(inst, new Date());
            const expectedAmount = inst.expected_amount || 0;
            const amountPaid = inst.amount_paid || 0;
            const remainingBalance = Math.max(0, round2(expectedAmount - amountPaid));

            totalExpected = round2(totalExpected + expectedAmount);
            totalCollected = round2(totalCollected + amountPaid);
            totalOutstanding = round2(totalOutstanding + remainingBalance);

            // Grace period status relative to target date
            let gracePeriodStatus = "not_in_grace";
            const now = new Date();
            if (evalStatus.isGrace) {
                gracePeriodStatus = "within_grace";
            } else if (now > inst.grace_end_date && remainingBalance > 0) {
                gracePeriodStatus = "grace_expired";
            }

            return {
                installment_id: inst._id,
                installment_number: inst.installment_number,
                loan_id: inst.loan_id ? inst.loan_id._id : null,
                frequency: inst.loan_id ? inst.loan_id.frequency : null,
                customer: {
                    id: inst.user_id ? inst.user_id._id : null,
                    name: inst.user_id ? inst.user_id.user_name : "Unknown",
                    email: inst.user_id ? inst.user_id.email : "Unknown"
                },
                scheduled_due_date: inst.due_date,
                original_due_date: inst.original_due_date,
                grace_end_date: inst.grace_end_date,
                expected_installment_amount: expectedAmount,
                amount_collected: amountPaid,
                outstanding_installment_amount: remainingBalance,
                actual_payment_date: inst.actual_payment_date,
                grace_period_status: gracePeriodStatus,
                payment_status: evalStatus.status,
                days_overdue: evalStatus.daysOverdue
            };
        });

        return res.status(200).json({
            success: true,
            date: targetDateString,
            filter_frequency: frequency || "all",
            summary: {
                total_installments_due: items.length,
                total_expected_amount: totalExpected,
                total_collected_amount: totalCollected,
                total_outstanding_amount: totalOutstanding
            },
            collections: items
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to load collection calendar."
        });
    }
};

module.exports = {
    getCollectionCalendar
};
