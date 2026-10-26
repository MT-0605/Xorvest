const Loan = require("../models/Loan");
const Money = require("../models/Money");
const User = require("../models/User");
const mongoose = require("mongoose");
const {
    calculateDailyLoan,
    PROCESSING_CHARGE_RATE_PERCENT
} = require("../utils/dailyLoanCalculations");

function roundToCents(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function validObjectId(value) {
    return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function parseInstallmentCount(value) {
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const count = Number(value);
    return Number.isSafeInteger(count) ? count : null;
}

async function getAuthorizedLoan(req, res) {
    if (!req.user_id) {
        res.status(401).json({
            success: false,
            message: "Authentication is required."
        });
        return null;
    }

    if (!validObjectId(req.params.loan_id)) {
        res.status(400).json({
            success: false,
            message: "loan_id must be a valid object ID."
        });
        return null;
    }

    const loan = await Loan.findById(req.params.loan_id);
    if (!loan) {
        res.status(404).json({
            success: false,
            message: "Loan not found."
        });
        return null;
    }

    if (String(loan.user_id) !== req.user_id) {
        const user = await User.findById(req.user_id).select("role");
        if (!user || user.role !== "admin") {
            res.status(403).json({
                success: false,
                message: "You are not authorized to access this loan."
            });
            return null;
        }
    }

    return loan;
}

function isTransactionUnsupported(error) {
    return error.code === 20
        || error.codeName === "IllegalOperation"
        || /transaction numbers are only allowed|does not support transactions/i.test(error.message);
}

function isDuplicateKey(error) {
    return error.code === 11000;
}

function paymentConflict(res, message) {
    return res.status(409).json({
        success: false,
        message
    });
}

function getMonthlyInterestRate() {
    const configuredRate = process.env.MONTHLY_INTEREST_RATE_PERCENT;
    if (configuredRate !== undefined && configuredRate.trim() === "") {
        throw new Error("MONTHLY_INTEREST_RATE_PERCENT must be a non-negative number.");
    }

    const rate = configuredRate === undefined ? 10 : Number(configuredRate);

    if (!Number.isFinite(rate) || rate < 0) {
        throw new Error("MONTHLY_INTEREST_RATE_PERCENT must be a non-negative number.");
    }

    return rate;
}

async function createLoan(req, res, next) {
    if (!req.user_id) {
        return res.status(401).json({
            success: false,
            message: "Authentication is required."
        });
    }

    const { amount, frequency, duration_months } = req.body || {};
    if (!["daily", "weekly", "monthly"].includes(frequency)) {
        return res.status(400).json({
            success: false,
            message: "frequency must be daily, weekly, or monthly."
        });
    }

    if (frequency !== "daily") {
        return res.status(501).json({
            success: false,
            message: `The ${frequency} repayment schedule is not implemented yet.`
        });
    }

    if (!req.first_due_date) {
        return res.status(400).json({
            success: false,
            message: "A first due date from the trusted approval/disbursement workflow is required."
        });
    }

    let monthlyInterestRate;
    try {
        monthlyInterestRate = getMonthlyInterestRate();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

    let calculatedLoan;
    try {
        calculatedLoan = calculateDailyLoan({
            amount,
            duration_months,
            first_due_date: req.first_due_date,
            monthly_interest_rate_percent: monthlyInterestRate
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    try {
        const loan = await Loan.create({
            ...calculatedLoan,
            user_id: req.user_id
        });

        return res.status(201).json({
            success: true,
            message: "Daily loan created successfully.",
            loan,
            financial_breakdown: {
                amount: loan.amount,
                processing_charge_rate: PROCESSING_CHARGE_RATE_PERCENT,
                processing_charge: loan.processing_charge,
                rate: loan.rate,
                monthly_interest_rate_percent: loan.rate,
                duration_months: loan.duration_months,
                total_interest: loan.total_interest,
                net_disbursed_amount: loan.net_disbursed_amount,
                total: loan.total,
                total_day: loan.total_day,
                daily_installment_amount: loan.repayment_schedule[0].amount,
                repayment_schedule: loan.repayment_schedule
            }
        });
    } catch (error) {
        return next(error);
    }
}

async function payDailyInstallment(req, res, next) {
    try {
        const loan = await getAuthorizedLoan(req, res);
        if (!loan) {
            return;
        }

        if (loan.frequency !== "daily") {
            return res.status(400).json({
                success: false,
                message: "Only daily loans can use this repayment endpoint."
            });
        }
        if (loan.status === "completed") {
            return paymentConflict(res, "This loan has already been completed.");
        }

        const count = parseInstallmentCount(req.params.count);
        if (count === null) {
            return res.status(400).json({
                success: false,
                message: "count must be a positive installment number."
            });
        }

        const installment = loan.repayment_schedule.find(item => item.count === count);
        if (!installment) {
            return res.status(404).json({
                success: false,
                message: "Installment not found."
            });
        }
        if (installment.status === "paid") {
            return paymentConflict(res, "This installment has already been paid.");
        }
        if (installment.status !== "pending" || installment.paid_amount !== 0
            || installment.remaining !== installment.amount) {
            return paymentConflict(res, "This installment is not payable in its current state.");
        }

        const scheduledCents = Math.round(installment.amount * 100);
        if (!Number.isSafeInteger(scheduledCents) || scheduledCents <= 0
            || Math.abs(installment.amount * 100 - scheduledCents) > 1e-7) {
            return res.status(409).json({
                success: false,
                message: "The persisted installment amount is invalid."
            });
        }

        const submittedAmount = req.body && Number(req.body.amount);
        const submittedCents = Math.round(submittedAmount * 100);
        if (!Number.isFinite(submittedAmount) || !Number.isSafeInteger(submittedCents)
            || Math.abs(submittedAmount * 100 - submittedCents) > 1e-7
            || submittedCents !== scheduledCents) {
            return res.status(400).json({
                success: false,
                message: "amount must exactly match the persisted scheduled installment amount."
            });
        }

        const paymentDate = new Date();
        const payment = {
            loan_id: loan._id,
            date: paymentDate,
            amount: scheduledCents / 100,
            count
        };
        const loanFilter = {
            _id: loan._id,
            user_id: loan.user_id,
            frequency: "daily",
            status: { $ne: "completed" },
            remaining: { $gte: payment.amount },
            repayment_schedule: {
                $elemMatch: {
                    count,
                    status: "pending",
                    paid_amount: 0,
                    remaining: installment.amount,
                    amount: installment.amount
                }
            }
        };
        const loanUpdate = {
            $set: {
                "repayment_schedule.$.paid_amount": payment.amount,
                "repayment_schedule.$.remaining": 0,
                "repayment_schedule.$.status": "paid",
                status: "active"
            },
            $inc: { remaining: -payment.amount }
        };

        async function persistPayment(session) {
            const options = { new: true, runValidators: true };
            if (session) {
                options.session = session;
            }

            const updatedLoan = await Loan.findOneAndUpdate(loanFilter, loanUpdate, options);
            if (!updatedLoan) {
                return null;
            }

            if (session) {
                await Money.create([payment], { session });
            } else {
                try {
                    await Money.create(payment);
                } catch (error) {
                    if (isDuplicateKey(error)) {
                        throw error;
                    }

                    const rollback = await Loan.updateOne({
                        _id: loan._id,
                        repayment_schedule: {
                            $elemMatch: {
                                count,
                                status: "paid",
                                paid_amount: payment.amount
                            }
                        }
                    }, {
                        $set: {
                            "repayment_schedule.$.paid_amount": 0,
                            "repayment_schedule.$.remaining": payment.amount,
                            "repayment_schedule.$.status": "pending",
                            status: "active"
                        },
                        $inc: { remaining: payment.amount }
                    });

                    if (rollback.modifiedCount !== 1) {
                        const rollbackError = new Error(
                            "Payment recording failed and the loan update could not be rolled back."
                        );
                        rollbackError.cause = error;
                        throw rollbackError;
                    }

                    throw error;
                }
            }

            const completionFilter = {
                _id: loan._id,
                repayment_schedule: {
                    $not: { $elemMatch: { status: { $ne: "paid" } } }
                }
            };
            const completionOptions = session ? { session } : {};
            await Loan.updateOne(completionFilter, {
                $set: { status: "completed", remaining: 0 }
            }, completionOptions);

            return updatedLoan;
        }

        let updatedLoan;
        let session;
        try {
            session = await mongoose.startSession();
            await session.withTransaction(async () => {
                updatedLoan = await persistPayment(session);
            });
        } catch (error) {
            if (!isTransactionUnsupported(error)) {
                throw error;
            }

            updatedLoan = await persistPayment(null);
        } finally {
            if (session) {
                await session.endSession();
            }
        }

        if (!updatedLoan) {
            return paymentConflict(res, "This installment has already been paid or is no longer payable.");
        }

        const savedLoan = await Loan.findById(loan._id);
        const savedPayment = await Money.findOne({
            loan_id: loan._id,
            count
        });

        return res.status(201).json({
            success: true,
            message: "Daily installment payment recorded successfully.",
            payment: savedPayment,
            loan: savedLoan,
            remaining: roundToCents(savedLoan.remaining)
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return paymentConflict(res, "A payment for this installment has already been recorded.");
        }
        return next(error);
    }
}

async function getLoanDetails(req, res, next) {
    try {
        const loan = await getAuthorizedLoan(req, res);
        if (!loan) {
            return;
        }

        const payments = await Money.find({ loan_id: loan._id });
        const totalAmountPaid = roundToCents(payments.reduce(
            (total, payment) => total + payment.amount,
            0
        ));
        const remainingBalance = roundToCents(loan.total - totalAmountPaid);
        const paidInstallments = loan.repayment_schedule.filter(
            installment => installment.status === "paid"
        );
        const pendingInstallments = loan.repayment_schedule.filter(
            installment => installment.status !== "paid"
        );
        const nextInstallment = pendingInstallments
            .slice()
            .sort((first, second) => first.date - second.date)[0];

        return res.status(200).json({
            success: true,
            loan,
            total_amount_paid: totalAmountPaid,
            remaining_balance: remainingBalance,
            paid_installments: paidInstallments,
            pending_installments: pendingInstallments,
            next_due_date: nextInstallment ? nextInstallment.date : null
        });
    } catch (error) {
        return next(error);
    }
}

async function getPaymentHistory(req, res, next) {
    try {
        const loan = await getAuthorizedLoan(req, res);
        if (!loan) {
            return;
        }

        const payments = await Money.find({ loan_id: loan._id }).sort({ date: -1 });
        return res.status(200).json({
            success: true,
            loan_id: loan._id,
            payments
        });
    } catch (error) {
        return next(error);
    }
}

async function getPendingInstallments(req, res, next) {
    try {
        const loan = await getAuthorizedLoan(req, res);
        if (!loan) {
            return;
        }

        const installments = loan.repayment_schedule
            .filter(installment => installment.status !== "paid")
            .slice()
            .sort((first, second) => first.date - second.date);

        return res.status(200).json({
            success: true,
            loan_id: loan._id,
            pending_installments: installments
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createLoan,
    payDailyInstallment,
    getLoanDetails,
    getPaymentHistory,
    getPendingInstallments
};
