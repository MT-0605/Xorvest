const {
    calculateMonthlyInterestSchedule,
    getLoanMonthlyInterestCount,
    getMonthlyInterestOverviewReport
} = require("../services/monthlyInterestService");
const Loan = require("../models/Loan");

/**
 * Preview / Calculate Monthly Interest, EMI, upfront deductions, and full repayment schedule
 * POST /api/monthly-interest/calculate
 * GET /api/monthly-interest/calculate
 */
const calculateMonthlyInterest = async (req, res) => {
    try {
        const params = req.method === "POST" ? req.body : req.query;
        const { amount, rate, months, total_day, startDate } = params;

        if (!amount || rate === undefined || (!months && !total_day)) {
            return res.status(400).json({
                success: false,
                message: "Please provide amount (principal), rate (interest rate %), and months (or total_day)"
            });
        }

        const numAmount = Number(amount);
        const numRate = Number(rate);
        const numMonths = months ? Number(months) : (Number(total_day) >= 30 ? Math.floor(Number(total_day) / 30) : Math.max(1, Math.floor(Number(total_day))));

        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Amount must be a positive number" });
        }
        if (isNaN(numRate) || numRate < 0) {
            return res.status(400).json({ success: false, message: "Rate must be a non-negative number" });
        }
        if (isNaN(numMonths) || numMonths <= 0) {
            return res.status(400).json({ success: false, message: "Tenure months must be at least 1" });
        }

        const calculation = calculateMonthlyInterestSchedule({
            amount: numAmount,
            rate: numRate,
            months: numMonths,
            startDate: startDate ? new Date(startDate) : new Date()
        });

        const timelineSummary = [
            {
                step: 0,
                timeline: "Day 0 (Disbursement)",
                description: `Customer receives ₹${calculation.netDisbursed.toLocaleString()} (Principal ₹${calculation.principal.toLocaleString()} minus ₹${calculation.processingFee.toLocaleString()} processing fee & upfront month 1 interest ₹${calculation.upfrontInterestDeduction.toLocaleString()})`
            }
        ];

        calculation.installments.forEach((inst) => {
            if (inst.principal_component > 0) {
                timelineSummary.push({
                    step: inst.installment_number,
                    timeline: `Month ${inst.installment_number} (Tenure completion)`,
                    due_date: inst.due_date,
                    amount_due: inst.expected_amount,
                    type: "Full Principal Repayment",
                    description: `Repay entire principal amount ₹${inst.expected_amount.toLocaleString()}`
                });
            } else {
                timelineSummary.push({
                    step: inst.installment_number,
                    timeline: `Month ${inst.installment_number}`,
                    due_date: inst.due_date,
                    amount_due: inst.expected_amount,
                    type: "Monthly Interest Only",
                    description: `Pay interest only ₹${inst.expected_amount.toLocaleString()}`
                });
            }
        });

        return res.status(200).json({
            success: true,
            message: "Monthly interest schedule calculated successfully",
            data: {
                ...calculation,
                timelineSummary
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to calculate monthly interest: " + error.message
        });
    }
};

/**
 * Get monthly interest lifecycle and status counts for an active or completed loan
 * GET /api/monthly-interest/loan/:id
 */
const getLoanMonthlyInterestDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const loan = await Loan.findById(id);
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Loan not found"
            });
        }

        // Authorization check: Customer can only view their own loan; admin can view all
        if (req.user && req.user.role !== "admin" && loan.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: You do not have permission to view this loan's interest details"
            });
        }

        const data = await getLoanMonthlyInterestCount(id);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch loan monthly interest details: " + error.message
        });
    }
};

/**
 * Get system-wide monthly interest analytics and aggregation report (Admin Only)
 * GET /api/monthly-interest/report
 */
const getMonthlyInterestReport = async (req, res) => {
    try {
        const report = await getMonthlyInterestOverviewReport();
        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate monthly interest report: " + error.message
        });
    }
};

module.exports = {
    calculateMonthlyInterest,
    getLoanMonthlyInterestDetails,
    getMonthlyInterestReport
};
