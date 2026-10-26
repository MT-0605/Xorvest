/**
 * Monthly Interest Count & Calculation Service
 * 
 * Implements the specific monthly loan interest model:
 * 1. Upfront at disbursement:
 *    - 2% processing fee
 *    - Month 1 interest (Total Interest / Total Months) deducted upfront
 *    - Net credited to customer = Principal - (Processing Fee + Month 1 Interest)
 * 2. Next month (Month 1 due date):
 *    - Collect ONLY interest for the next month (Principal = 0, Interest = Monthly Interest)
 * 3. Final month (After completing tenure, e.g. Month 2):
 *    - Collect TOTAL Principal amount (Principal = Full Principal, Interest = 0)
 * 
 * Reconciles 100% of principal and interest without double collection.
 */

const Loan = require("../models/Loan");
const Installment = require("../models/Installment");

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

const getEvaluateInstallmentStatus = () => {
    return require("./loanService").evaluateInstallmentStatus;
};

/**
 * Safely add N months to a date, avoiding month-end overflow
 */
const addMonths = (date, months) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== day) {
        d.setDate(0); // Snap to last day of target month
    }
    return d;
};

/**
 * Calculate Monthly Interest, upfront deductions, net credit, and installment schedule.
 *
 * @param {Object} params
 * @param {number} params.amount - Principal loan amount (e.g. 100000)
 * @param {number} params.rate - Interest rate percentage (e.g. 10 for 10%)
 * @param {number} [params.months] - Tenure in months (e.g. 2)
 * @param {number} [params.total_day] - Alternate tenure in days (e.g. 60 -> 2 months)
 * @param {Date|string} [params.startDate] - Loan disbursement date
 * @returns {Object} Complete monthly calculation and installment schedule
 */
const calculateMonthlyInterestSchedule = ({
    amount,
    rate,
    months,
    total_day,
    startDate = new Date()
}) => {
    const principal = Number(amount);
    const interestRate = Number(rate);
    const start = new Date(startDate);

    // Determine number of monthly installments
    let totalMonths = 1;
    if (months && Number(months) > 0) {
        totalMonths = Math.max(1, Math.floor(Number(months)));
    } else if (total_day && Number(total_day) > 0) {
        totalMonths = Number(total_day) >= 30 ? Math.floor(Number(total_day) / 30) : Math.max(1, Math.floor(Number(total_day)));
    }

    // 1. Monthly Interest: Rate is applied per month (e.g. 10% of 100,000 = 10,000/month)
    const monthlyInterest = round2(principal * (interestRate / 100));

    // 2. Total Interest: Monthly Interest * Total Months (e.g. 10,000 * 2 = 20,000 for 2 months)
    const totalInterest = round2(monthlyInterest * totalMonths);
    const totalRecovery = round2(principal + totalInterest);

    // 3. Processing Fee: 2% of principal
    const processingFee = round2(principal * 0.02);

    // 4. Upfront Month 1 Interest Deduction at disbursement (e.g. 10,000)
    const upfrontInterest = monthlyInterest;
    const initialDeduction = round2(processingFee + upfrontInterest);
    const netDisbursed = round2(principal - initialDeduction);
    const upfrontRecovered = upfrontInterest;
    const remainingToRecover = round2(totalRecovery - upfrontRecovered);

    // 5. Generate Monthly Installment Schedule
    // Monthly grace period: 5 days
    const graceDays = 5;
    const installments = [];

    if (totalMonths === 1) {
        // Edge case: 1-month loan
        // Month 1 interest was paid upfront at disbursement.
        // At Month 1 end, only the full principal is due!
        const due1 = addMonths(start, 1);
        const graceEnd1 = new Date(due1);
        graceEnd1.setDate(graceEnd1.getDate() + graceDays);

        installments.push({
            installment_number: 1,
            due_date: due1,
            original_due_date: due1,
            grace_period_days: graceDays,
            grace_end_date: graceEnd1,
            expected_amount: principal,
            principal_component: principal,
            interest_component: 0,
            amount_paid: 0,
            remaining_balance: principal,
            status: "pending",
            is_initial_deduction: false,
            is_prepaid_interest: true,
            actual_payment_date: null,
            days_overdue: 0,
            notes: "Month 1: Month 1 interest was deducted upfront at disbursement; Full Principal amount due"
        });
    } else {
        // Multi-month loan (e.g. 2 months, 3 months, etc.)
        // Month 1 to (totalMonths - 1): Customer pays ONLY monthly interest
        // Final Month (totalMonths): Customer pays TOTAL Principal amount

        // Track intermediate interest rounding to ensure penny-accurate sum
        let cumulativeIntermediateInterest = 0;
        const totalIntermediateInterestNeeded = round2(totalInterest - upfrontInterest);

        for (let i = 1; i < totalMonths; i++) {
            const dueDate = addMonths(start, i);
            const graceEndDate = new Date(dueDate);
            graceEndDate.setDate(graceEndDate.getDate() + graceDays);

            let instInterest = monthlyInterest;
            // On the last interest-only month, adjust any 1-cent rounding difference
            if (i === totalMonths - 1) {
                instInterest = round2(totalIntermediateInterestNeeded - cumulativeIntermediateInterest);
            }
            cumulativeIntermediateInterest = round2(cumulativeIntermediateInterest + instInterest);

            installments.push({
                installment_number: i,
                due_date: dueDate,
                original_due_date: dueDate,
                grace_period_days: graceDays,
                grace_end_date: graceEndDate,
                expected_amount: instInterest,
                principal_component: 0, // Principal is 0 in intermediate months
                interest_component: instInterest, // Only interest due
                amount_paid: 0,
                remaining_balance: instInterest,
                status: "pending",
                is_initial_deduction: false,
                is_prepaid_interest: false,
                actual_payment_date: null,
                days_overdue: 0,
                notes: `Month ${i}: Interest payment only (${instInterest})`
            });
        }

        // Final Month (totalMonths): TOTAL Principal amount repayment
        const finalDueDate = addMonths(start, totalMonths);
        const finalGraceEndDate = new Date(finalDueDate);
        finalGraceEndDate.setDate(finalGraceEndDate.getDate() + graceDays);

        installments.push({
            installment_number: totalMonths,
            due_date: finalDueDate,
            original_due_date: finalDueDate,
            grace_period_days: graceDays,
            grace_end_date: finalGraceEndDate,
            expected_amount: principal,
            principal_component: principal,
            interest_component: 0,
            amount_paid: 0,
            remaining_balance: principal,
            status: "pending",
            is_initial_deduction: false,
            is_prepaid_interest: false,
            actual_payment_date: null,
            days_overdue: 0,
            notes: `Month ${totalMonths}: Full Principal amount repayment (${principal})`
        });
    }

    return {
        principal,
        interestRate,
        totalMonths,
        totalInterest,
        interestAmount: totalInterest,
        monthlyInterest,
        processingFeeRate: 2,
        processingFee,
        upfrontInterestDeduction: upfrontInterest,
        initialDeduction,
        netDisbursed,
        totalRecovery,
        upfrontRecovered,
        remainingToRecover,
        numberOfInstallments: totalMonths,
        installments
    };
};

/**
 * Get detailed monthly interest count and lifecycle tracking for a specific loan
 *
 * @param {string|ObjectId} loanId - Loan ObjectId
 * @param {Date} [referenceDate] - Comparison date for overdue/grace evaluation
 * @returns {Promise<Object>} Detailed monthly interest counts, paid/pending cycles, and schedule
 */
const getLoanMonthlyInterestCount = async (loanId, referenceDate = new Date()) => {
    const loan = await Loan.findById(loanId).populate("user_id", "user_name email");
    if (!loan) {
        throw new Error("Loan not found");
    }

    const installments = await Installment.find({ loan_id: loan._id }).sort({ installment_number: 1 });

    const totalMonths = installments.length;
    let interestCyclesPaidCount = 0;
    let interestCyclesPendingCount = 0;
    let interestCyclesOverdueCount = 0;

    let interestPaidAmount = 0;
    let interestRemainingAmount = 0;

    let principalPaidAmount = 0;
    let principalRemainingAmount = 0;
    let principalDueDate = null;
    let principalStatus = "pending";

    // Month 1 interest was paid upfront at disbursement
    if (loan.initial_deduction && loan.initial_deduction > (loan.processing_fee || 0)) {
        interestCyclesPaidCount += 1;
        interestPaidAmount += round2(loan.initial_deduction - (loan.processing_fee || 0));
    }

    const evaluateInstallmentStatus = getEvaluateInstallmentStatus();
    const evaluatedInstallments = installments.map((inst) => {
        const evalStatus = evaluateInstallmentStatus(inst, referenceDate);
        const dynamicStatus = evalStatus.status;

        // Is this an interest installment (intermediate months) or principal installment (final month)?
        const isPrincipalInst = inst.installment_number === totalMonths;

        if (isPrincipalInst) {
            principalDueDate = inst.due_date;
            principalStatus = dynamicStatus;
            principalPaidAmount = round2(inst.amount_paid);
            principalRemainingAmount = round2(inst.remaining_balance);
        } else {
            // Interest-only installment
            if (["fully_paid", "paid_late"].includes(dynamicStatus)) {
                interestCyclesPaidCount += 1;
                interestPaidAmount = round2(interestPaidAmount + inst.amount_paid);
            } else if (dynamicStatus === "overdue") {
                interestCyclesOverdueCount += 1;
                interestRemainingAmount = round2(interestRemainingAmount + inst.remaining_balance);
            } else {
                interestCyclesPendingCount += 1;
                interestRemainingAmount = round2(interestRemainingAmount + inst.remaining_balance);
            }
        }

        return {
            installment_id: inst._id,
            installment_number: inst.installment_number,
            due_date: inst.due_date,
            original_due_date: inst.original_due_date,
            grace_end_date: inst.grace_end_date,
            type: isPrincipalInst ? "principal_repayment" : "monthly_interest",
            expected_amount: inst.expected_amount,
            principal_component: inst.principal_component,
            interest_component: inst.interest_component,
            amount_paid: inst.amount_paid,
            remaining_balance: inst.remaining_balance,
            status: dynamicStatus,
            days_overdue: evalStatus.daysOverdue,
            is_grace: evalStatus.isGrace,
            is_overdue: evalStatus.isOverdue,
            notes: inst.notes
        };
    });

    // Find next upcoming due installment
    const nextInstallment = evaluatedInstallments.find((i) => !["fully_paid", "paid_late"].includes(i.status)) || null;

    return {
        loan_id: loan._id,
        customer: {
            id: loan.user_id ? loan.user_id._id : null,
            name: loan.user_id ? loan.user_id.user_name : "Unknown",
            email: loan.user_id ? loan.user_id.email : "Unknown"
        },
        loan_frequency: loan.frequency,
        principal_amount: loan.amount,
        interest_rate_percentage: loan.rate,
        total_loan_duration_months: totalMonths,
        total_interest_expected: loan.interest_amount || round2(loan.total - loan.amount),
        processing_fee: loan.processing_fee || round2(loan.amount * 0.02),
        initial_deduction: loan.initial_deduction || 0,
        net_disbursed_to_customer: loan.net_disbursed || round2(loan.amount - (loan.initial_deduction || 0)),
        total_recovery: loan.total,
        outstanding_balance: loan.remaining,
        interest_counts: {
            total_interest_cycles: totalMonths,
            paid_interest_cycles: interestCyclesPaidCount,
            pending_interest_cycles: interestCyclesPendingCount,
            overdue_interest_cycles: interestCyclesOverdueCount,
            total_interest_amount: loan.interest_amount || round2(loan.total - loan.amount),
            interest_paid_amount: interestPaidAmount,
            interest_remaining_amount: round2((loan.interest_amount || round2(loan.total - loan.amount)) - interestPaidAmount)
        },
        principal_counts: {
            principal_amount: loan.amount,
            principal_paid_amount: principalPaidAmount,
            principal_remaining_amount: principalRemainingAmount,
            principal_due_date: principalDueDate,
            principal_status: principalStatus
        },
        next_due: nextInstallment ? {
            installment_number: nextInstallment.installment_number,
            type: nextInstallment.type,
            due_date: nextInstallment.due_date,
            expected_amount: nextInstallment.expected_amount,
            status: nextInstallment.status
        } : null,
        installments: evaluatedInstallments
    };
};

/**
 * Get aggregated Monthly Interest summary across all monthly loans (Admin report)
 *
 * @returns {Promise<Object>} Aggregated monthly interest metrics
 */
const getMonthlyInterestOverviewReport = async () => {
    const monthlyLoans = await Loan.find({ frequency: "monthly" }).populate("user_id", "user_name email");

    let totalMonthlyLoans = monthlyLoans.length;
    let activeMonthlyLoans = 0;
    let completedMonthlyLoans = 0;

    let totalPrincipalDisbursed = 0;
    let totalInterestExpected = 0;
    let totalUpfrontInterestCollected = 0;
    let totalProcessingFeesCollected = 0;

    for (const loan of monthlyLoans) {
        if (loan.status === "active") activeMonthlyLoans++;
        if (loan.status === "completed") completedMonthlyLoans++;

        totalPrincipalDisbursed = round2(totalPrincipalDisbursed + loan.amount);
        const intAmt = loan.interest_amount || round2(loan.total - loan.amount);
        totalInterestExpected = round2(totalInterestExpected + intAmt);
        totalProcessingFeesCollected = round2(totalProcessingFeesCollected + (loan.processing_fee || round2(loan.amount * 0.02)));

        if (loan.initial_deduction && loan.initial_deduction > (loan.processing_fee || 0)) {
            totalUpfrontInterestCollected = round2(totalUpfrontInterestCollected + (loan.initial_deduction - (loan.processing_fee || 0)));
        }
    }

    // Query all installments belonging to monthly loans
    const monthlyLoanIds = monthlyLoans.map((l) => l._id);
    const installments = await Installment.find({ loan_id: { $in: monthlyLoanIds } });

    let installmentInterestCollected = 0;
    let installmentInterestPending = 0;
    let installmentInterestOverdue = 0;

    let principalCollected = 0;
    let principalPending = 0;

    const evaluateInstallmentStatus = getEvaluateInstallmentStatus();
    const now = new Date();
    for (const inst of installments) {
        const evalStatus = evaluateInstallmentStatus(inst, now);
        const isPrincipalInst = inst.principal_component > 0 && inst.interest_component === 0;

        if (isPrincipalInst) {
            principalCollected = round2(principalCollected + inst.amount_paid);
            principalPending = round2(principalPending + inst.remaining_balance);
        } else {
            // Interest installment
            installmentInterestCollected = round2(installmentInterestCollected + inst.amount_paid);
            if (evalStatus.status === "overdue") {
                installmentInterestOverdue = round2(installmentInterestOverdue + inst.remaining_balance);
            } else if (!["fully_paid", "paid_late"].includes(evalStatus.status)) {
                installmentInterestPending = round2(installmentInterestPending + inst.remaining_balance);
            }
        }
    }

    const totalInterestCollected = round2(totalUpfrontInterestCollected + installmentInterestCollected);
    const totalInterestRemaining = round2(totalInterestExpected - totalInterestCollected);

    return {
        summary: {
            total_monthly_loans: totalMonthlyLoans,
            active_loans: activeMonthlyLoans,
            completed_loans: completedMonthlyLoans,
            total_principal_lent: totalPrincipalDisbursed,
            total_processing_fees: totalProcessingFeesCollected,
            total_interest_expected: totalInterestExpected,
            total_interest_collected: totalInterestCollected,
            total_interest_remaining: totalInterestRemaining,
            upfront_interest_collected: totalUpfrontInterestCollected,
            installment_interest_collected: installmentInterestCollected,
            installment_interest_pending: installmentInterestPending,
            installment_interest_overdue: installmentInterestOverdue,
            principal_collected: principalCollected,
            principal_pending: principalPending
        }
    };
};

module.exports = {
    addMonths,
    calculateMonthlyInterestSchedule,
    getLoanMonthlyInterestCount,
    getMonthlyInterestOverviewReport
};
