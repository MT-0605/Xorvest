const Loan = require("../models/Loan");

/**
 * Weekly Loan Controller
 * Handles calculation and creation of weekly loans.
 *
 * Calculations:
 * - totalInterest = principal * (monthlyInterestRate / 100) * durationInMonths
 * - totalRepayment = principal + totalInterest
 * - fixedCharge = 2% of principal
 * - totalInstallments = durationInMonths * 4 (8 weekly installments for 2 months)
 * - weeklyInstallment = totalRepayment / totalInstallments
 * - amountReceived = principal - fixedCharge - weeklyInstallment
 */
const createWeeklyLoan = async (req, res) => {
    try {
        const {
            principal,
            monthlyInterestRate,
            durationInMonths,
            startDate,
            userId,
            user_id
        } = req.body;

        // Validate required fields
        if (
            principal === undefined ||
            monthlyInterestRate === undefined ||
            durationInMonths === undefined ||
            !startDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide principal, monthlyInterestRate, durationInMonths, and startDate."
            });
        }

        const numPrincipal = Number(principal);
        const numRate = Number(monthlyInterestRate);
        const numDuration = Number(durationInMonths);

        if (isNaN(numPrincipal) || numPrincipal <= 0) {
            return res.status(400).json({
                success: false,
                message: "Principal must be a positive number."
            });
        }

        if (isNaN(numRate) || numRate < 0) {
            return res.status(400).json({
                success: false,
                message: "Monthly interest rate must be a non-negative number."
            });
        }

        if (isNaN(numDuration) || numDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Duration in months must be a positive number."
            });
        }

        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid startDate format. Please provide a valid date string or timestamp."
            });
        }

        // 1. Calculate Simple Interest: totalInterest = principal × monthlyInterestRate / 100 × durationInMonths
        const totalInterest = (numPrincipal * numRate * numDuration) / 100;

        // 2. Calculate Total Repayment: totalRepayment = principal + totalInterest
        const totalRepayment = numPrincipal + totalInterest;

        // 3. Calculate Fixed Charge: 2% of principal
        const fixedCharge = (numPrincipal * 2) / 100;

        // 4. Calculate Installments: 4 weekly installments per month (e.g. 8 for 2 months)
        const totalInstallments = numDuration * 4;

        // 5. Calculate Weekly Installment: weeklyInstallment = totalRepayment / 8 (for 2 months)
        const weeklyInstallment = totalRepayment / totalInstallments;

        // 6. Deduct fixedCharge and first installment upfront: amountReceived = principal - fixedCharge - weeklyInstallment
        const amountReceived = numPrincipal - fixedCharge - weeklyInstallment;

        // Save to MongoDB if user_id / userId is provided
        const borrowerId = userId || user_id || req.user?._id;
        let savedLoan = null;

        if (borrowerId) {
            const loan = new Loan({
                amount: numPrincipal,
                frequency: "weekly",
                rate: numRate,
                total_day: totalInstallments * 7,
                user_id: borrowerId,
                total: totalRepayment,
                remaining: totalRepayment - weeklyInstallment
            });
            savedLoan = await loan.save();
        }

        return res.status(201).json({
            success: true,
            message: "Weekly loan processed successfully",
            data: {
                principal: numPrincipal,
                monthlyInterestRate: numRate,
                durationInMonths: numDuration,
                totalInstallments,
                totalInterest,
                totalRepayment,
                fixedCharge,
                weeklyInstallment,
                amountReceived,
                startDate: parsedStartDate.toISOString(),
                ...(savedLoan && { loan: savedLoan })
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing weekly loan.",
            error: error.message
        });
    }
};

module.exports = {
    createWeeklyLoan,
    weeklyLoanController: createWeeklyLoan
};
