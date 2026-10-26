/**
 * Loan Calculation & Repayment Schedule Service
 * Implements strict business rules for Daily, Weekly, and Monthly loans
 * including disbursement deductions, grace periods, and overdue tracking.
 */

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
const isNumericInput = (val) => val !== null && val !== undefined && val !== "" && Number.isFinite(Number(val));
const MAX_INSTALLMENTS = 1000;
const { calculateMonthlyInterestSchedule } = require("./monthlyInterestService");

/**
 * Calculate loan totals, upfront deductions, net credit, and installment schedule.
 *
 * @param {Object} params
 * @param {number} params.amount - Principal amount
 * @param {string} params.frequency - 'daily' | 'weekly' | 'monthly'
 * @param {number} params.rate - Interest rate percentage (e.g. 10 for 10%)
 * @param {number} params.total_day - Tenure in days (or units)
 * @param {Date} [params.startDate] - Disbursement / start date
 * @returns {Object} Calculated loan details and installment array
 */
const calculateLoanSchedule = ({ amount, frequency, rate, total_day, startDate = new Date() }) => {
    if (!isNumericInput(amount) || !isNumericInput(rate) || !isNumericInput(total_day)) {
        throw new Error("amount, rate, and total_day must be numeric values.");
    }

    const principal = Number(amount);
    const interestRate = Number(rate);
    const tenure = Number(total_day);
    const start = new Date(startDate);

    if (!Number.isFinite(principal) || principal <= 0
        || !Number.isSafeInteger(Math.round(principal * 100))
        || Math.abs(principal * 100 - Math.round(principal * 100)) > 1e-7) {
        throw new Error("amount must be a positive number with at most two decimal places.");
    }
    if (!["daily", "weekly", "monthly"].includes(frequency)) {
        throw new Error("frequency must be daily, weekly, or monthly.");
    }
    if (!Number.isFinite(interestRate) || interestRate < 0) {
        throw new Error("rate must be a non-negative number.");
    }
    if (!Number.isSafeInteger(tenure) || tenure < 1) {
        throw new Error("total_day must be a positive whole number.");
    }
    if (!Number.isFinite(start.getTime())) {
        throw new Error("startDate must be a valid date.");
    }

    // Calculate Interest Amount & Total Expected Recovery
    // Flat rate for the tenure: Interest = Principal * (Rate / 100)
    const interestAmount = round2(principal * (interestRate / 100));
    const totalRecovery = round2(principal + interestAmount);

    // Processing Fee is 2% of principal for all loans
    const processingFee = round2(principal * 0.02);
    if (![interestAmount, totalRecovery, processingFee].every(Number.isFinite)) {
        throw new Error("The financial terms exceed the supported calculation range.");
    }

    let numberOfInstallments = 1;
    let initialDeduction = 0;
    let netDisbursed = 0;
    let installments = [];
    let upfrontRecovered = 0;

    if (frequency === "daily") {
        // Daily loans
        // Tenure represents number of days
        numberOfInstallments = Math.max(1, Math.floor(tenure));
        if (numberOfInstallments > MAX_INSTALLMENTS) {
            throw new Error(`Repayment schedules cannot exceed ${MAX_INSTALLMENTS} installments.`);
        }
        const dailyEMI = round2(totalRecovery / numberOfInstallments);

        // Deduct processing fee of 2% of principal and first day's EMI at disbursement
        initialDeduction = round2(processingFee + dailyEMI);
        netDisbursed = round2(principal - initialDeduction);
        upfrontRecovered = dailyEMI;

        // Daily grace period: 1 day
        const graceDays = 1;

        // Installment #1: Deducted at disbursement (Day 1)
        const due1 = new Date(start);
        const graceEnd1 = new Date(due1);
        graceEnd1.setDate(graceEnd1.getDate() + graceDays);

        installments.push({
            installment_number: 1,
            due_date: due1,
            original_due_date: due1,
            grace_period_days: graceDays,
            grace_end_date: graceEnd1,
            expected_amount: dailyEMI,
            principal_component: round2(principal / numberOfInstallments),
            interest_component: round2(interestAmount / numberOfInstallments),
            amount_paid: dailyEMI,
            remaining_balance: 0,
            status: "fully_paid",
            is_initial_deduction: true,
            is_prepaid_interest: false,
            actual_payment_date: due1,
            days_overdue: 0,
            notes: "First day's EMI deducted upfront at disbursement"
        });

        // Subsequent installments: Day 2 to Day N
        let cumulativeExpected = dailyEMI;
        for (let i = 2; i <= numberOfInstallments; i++) {
            const dueDate = new Date(start);
            dueDate.setDate(dueDate.getDate() + (i - 1));

            const graceEndDate = new Date(dueDate);
            graceEndDate.setDate(graceEndDate.getDate() + graceDays);

            // Handle last installment penny rounding adjustment
            let instAmount = dailyEMI;
            if (i === numberOfInstallments) {
                instAmount = round2(totalRecovery - cumulativeExpected);
            }
            cumulativeExpected = round2(cumulativeExpected + instAmount);

            installments.push({
                installment_number: i,
                due_date: dueDate,
                original_due_date: dueDate,
                grace_period_days: graceDays,
                grace_end_date: graceEndDate,
                expected_amount: instAmount,
                principal_component: round2(principal / numberOfInstallments),
                interest_component: round2(interestAmount / numberOfInstallments),
                amount_paid: 0,
                remaining_balance: instAmount,
                status: "pending",
                is_initial_deduction: false,
                is_prepaid_interest: false,
                actual_payment_date: null,
                days_overdue: 0,
                notes: `Day ${i} installment`
            });
        }
    } else if (frequency === "weekly") {
        // Weekly loans
        // Number of weekly installments (e.g. total_day / 7 or if total_day < 7, minimum 1)
        numberOfInstallments = Math.max(1, Math.floor(tenure / 7));
        if (numberOfInstallments > MAX_INSTALLMENTS) {
            throw new Error(`Repayment schedules cannot exceed ${MAX_INSTALLMENTS} installments.`);
        }
        const weeklyEMI = round2(totalRecovery / numberOfInstallments);

        // Deduct processing fee and HALF of the first weekly EMI at disbursement
        const halfFirstEMI = round2(weeklyEMI / 2);
        initialDeduction = round2(processingFee + halfFirstEMI);
        netDisbursed = round2(principal - initialDeduction);
        upfrontRecovered = halfFirstEMI;

        // Weekly grace period: 2 days
        const graceDays = 2;

        // Installment #1: due in 7 days, but half already deducted at disbursement
        const due1 = new Date(start);
        due1.setDate(due1.getDate() + 7);

        const graceEnd1 = new Date(due1);
        graceEnd1.setDate(graceEnd1.getDate() + graceDays);

        const remainingInst1 = round2(weeklyEMI - halfFirstEMI);

        installments.push({
            installment_number: 1,
            due_date: due1,
            original_due_date: due1,
            grace_period_days: graceDays,
            grace_end_date: graceEnd1,
            expected_amount: weeklyEMI,
            principal_component: round2(principal / numberOfInstallments),
            interest_component: round2(interestAmount / numberOfInstallments),
            amount_paid: halfFirstEMI,
            remaining_balance: remainingInst1,
            status: "partially_paid",
            is_initial_deduction: true,
            is_prepaid_interest: false,
            actual_payment_date: start, // initial half deducted on start date
            days_overdue: 0,
            notes: "50% of first weekly EMI deducted upfront at disbursement"
        });

        // Subsequent installments: Week 2 to Week W
        let cumulativeExpected = weeklyEMI;
        for (let i = 2; i <= numberOfInstallments; i++) {
            const dueDate = new Date(start);
            dueDate.setDate(dueDate.getDate() + (i * 7));

            const graceEndDate = new Date(dueDate);
            graceEndDate.setDate(graceEndDate.getDate() + graceDays);

            let instAmount = weeklyEMI;
            if (i === numberOfInstallments) {
                instAmount = round2(totalRecovery - cumulativeExpected);
            }
            cumulativeExpected = round2(cumulativeExpected + instAmount);

            installments.push({
                installment_number: i,
                due_date: dueDate,
                original_due_date: dueDate,
                grace_period_days: graceDays,
                grace_end_date: graceEndDate,
                expected_amount: instAmount,
                principal_component: round2(principal / numberOfInstallments),
                interest_component: round2(interestAmount / numberOfInstallments),
                amount_paid: 0,
                remaining_balance: instAmount,
                status: "pending",
                is_initial_deduction: false,
                is_prepaid_interest: false,
                actual_payment_date: null,
                days_overdue: 0,
                notes: `Week ${i} installment`
            });
        }
    } else if (frequency === "monthly") {
        // Monthly loans: Delegated to Monthly Interest Service
        // Implements: Month 1 interest + 2% processing fee deducted upfront at disbursement;
        // intermediate months: interest only; final month: full principal repayment.
        return calculateMonthlyInterestSchedule({
            amount: principal,
            rate: interestRate,
            total_day: tenure,
            startDate: start
        });
    }

    if (!Number.isFinite(netDisbursed) || netDisbursed < 0) {
        throw new Error("The calculated deductions exceed the loan principal.");
    }

    const remainingToRecover = round2(totalRecovery - upfrontRecovered);

    return {
        principal,
        interestRate,
        interestAmount,
        totalRecovery,
        processingFee,
        initialDeduction,
        netDisbursed,
        upfrontRecovered,
        remainingToRecover,
        numberOfInstallments,
        installments
    };
};

/**
 * Determine dynamic real-time status of an installment relative to a reference date (default: today)
 *
 * @param {Object} inst - Installment document or object
 * @param {Date} [referenceDate] - Comparison date (default: current Date)
 * @returns {Object} { status, daysOverdue, isGrace, isOverdue }
 */
const evaluateInstallmentStatus = (inst, referenceDate = new Date()) => {
    const today = new Date(referenceDate);
    const dueDate = new Date(inst.due_date);
    const graceEndDate = new Date(inst.grace_end_date);
    const originalDueDate = new Date(inst.original_due_date || inst.due_date);

    // Normalize date strings to YYYY-MM-DD for same-day comparison
    const todayStr = today.toISOString().split("T")[0];
    const dueStr = dueDate.toISOString().split("T")[0];

    const amountPaid = Number(inst.amount_paid || 0);
    const expectedAmount = Number(inst.expected_amount || 0);
    const isFullyPaid = amountPaid >= expectedAmount;
    const isPartiallyPaid = amountPaid > 0 && amountPaid < expectedAmount;

    let status = inst.status;
    let daysOverdue = 0;
    let isGrace = false;
    let isOverdue = false;

    if (isFullyPaid) {
        if (inst.actual_payment_date && new Date(inst.actual_payment_date) > dueDate) {
            status = "paid_late";
        } else {
            status = "fully_paid";
        }
    } else {
        if (todayStr === dueStr) {
            status = isPartiallyPaid ? "partially_paid" : "due_today";
        } else if (today < dueDate) {
            status = isPartiallyPaid ? "partially_paid" : "pending";
        } else if (today <= graceEndDate) {
            status = isPartiallyPaid ? "partially_paid" : "within_grace";
            isGrace = true;
        } else {
            // Past grace end date
            status = "overdue";
            isOverdue = true;
            const diffTime = today.getTime() - originalDueDate.getTime();
            daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
    }

    return {
        status,
        daysOverdue,
        isGrace,
        isOverdue,
        originalDueDate: inst.original_due_date
    };
};

module.exports = {
    round2,
    calculateLoanSchedule,
    evaluateInstallmentStatus
};
