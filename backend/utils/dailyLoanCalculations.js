const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const PROCESSING_CHARGE_RATE_PERCENT = 2;
const MAX_DAILY_INSTALLMENTS = 10000;

function toCents(amount) {
    return Math.round((amount + Number.EPSILON) * 100);
}

function fromCents(amountInCents) {
    return amountInCents / 100;
}

function parseDateOnly(dateValue) {
    if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        throw new Error("first_due_date must be a valid YYYY-MM-DD date.");
    }

    const date = new Date(`${dateValue}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) {
        throw new Error("first_due_date must be a valid YYYY-MM-DD date.");
    }

    return date;
}

function addCalendarMonths(date, months) {
    const targetMonth = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + months,
        1
    ));
    const lastDayOfTargetMonth = new Date(Date.UTC(
        targetMonth.getUTCFullYear(),
        targetMonth.getUTCMonth() + 1,
        0
    )).getUTCDate();

    targetMonth.setUTCDate(Math.min(date.getUTCDate(), lastDayOfTargetMonth));
    return targetMonth;
}

function calculateDailyLoan({
    amount,
    duration_months,
    first_due_date,
    monthly_interest_rate_percent
}) {
    const principal = Number(amount);
    const durationMonths = Number(duration_months);
    const monthlyRate = Number(monthly_interest_rate_percent);

    if (!Number.isFinite(principal) || principal <= 0
        || Math.abs(principal * 100 - Math.round(principal * 100)) > 1e-7) {
        throw new Error("amount must be a positive amount with at most two decimal places.");
    }

    if (!Number.isSafeInteger(durationMonths) || durationMonths < 1) {
        throw new Error("duration_months must be a positive whole number.");
    }

    if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
        throw new Error("The configured monthly interest rate must be a non-negative number.");
    }

    const firstDueDate = parseDateOnly(first_due_date);
    const endDate = addCalendarMonths(firstDueDate, durationMonths);
    const totalDays = (endDate.getTime() - firstDueDate.getTime())
        / DAY_IN_MILLISECONDS + 1;
    if (!Number.isSafeInteger(totalDays) || totalDays < 1) {
        throw new Error("The selected duration does not produce a valid repayment period.");
    }
    if (totalDays > MAX_DAILY_INSTALLMENTS) {
        throw new Error(`Daily repayment schedules cannot exceed ${MAX_DAILY_INSTALLMENTS} installments.`);
    }

    const principalCents = toCents(principal);
    const processingChargeCents = Math.round(
        principalCents * PROCESSING_CHARGE_RATE_PERCENT / 100
    );
    const totalInterestCents = Math.round(
        principalCents * (monthlyRate / 100) * durationMonths
    );
    const netDisbursedCents = principalCents - processingChargeCents - totalInterestCents;
    if (netDisbursedCents < 0) {
        throw new Error("The calculated deductions exceed the loan principal.");
    }

    const totalRepaymentCents = principalCents + totalInterestCents;
    const regularInstallmentCents = Math.round(totalRepaymentCents / totalDays);
    const finalInstallmentCents = totalRepaymentCents
        - regularInstallmentCents * (totalDays - 1);
    if (regularInstallmentCents <= 0 || finalInstallmentCents <= 0) {
        throw new Error("The loan amount is too small for the selected daily repayment period.");
    }

    const repaymentSchedule = [];
    for (let installmentNumber = 1; installmentNumber <= totalDays; installmentNumber += 1) {
        const installmentCents = installmentNumber === totalDays
            ? finalInstallmentCents
            : regularInstallmentCents;
        const dueDate = new Date(firstDueDate.getTime()
            + (installmentNumber - 1) * DAY_IN_MILLISECONDS);

        repaymentSchedule.push({
            date: dueDate,
            count: installmentNumber,
            amount: fromCents(installmentCents),
            paid_amount: 0,
            remaining: fromCents(installmentCents),
            status: "pending"
        });
    }

    return {
        amount: fromCents(principalCents),
        frequency: "daily",
        rate: monthlyRate,
        duration_months: durationMonths,
        total_day: totalDays,
        processing_charge_rate: PROCESSING_CHARGE_RATE_PERCENT,
        processing_charge: fromCents(processingChargeCents),
        total_interest: fromCents(totalInterestCents),
        net_disbursed_amount: fromCents(netDisbursedCents),
        total: fromCents(totalRepaymentCents),
        remaining: fromCents(totalRepaymentCents),
        repayment_schedule: repaymentSchedule
    };
}

module.exports = {
    calculateDailyLoan,
    PROCESSING_CHARGE_RATE_PERCENT
};
