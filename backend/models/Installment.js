const mongoose = require("mongoose");

const installmentSchema = new mongoose.Schema({
    loan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Loan",
        required: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    installment_number: {
        type: Number,
        required: true
    },
    due_date: {
        type: Date,
        required: true,
        index: true
    },
    original_due_date: {
        type: Date,
        required: true
    },
    grace_period_days: {
        type: Number,
        required: true,
        default: 0
    },
    grace_end_date: {
        type: Date,
        required: true,
        index: true
    },
    expected_amount: {
        type: Number,
        required: true,
        min: 0
    },
    principal_component: {
        type: Number,
        default: 0
    },
    interest_component: {
        type: Number,
        default: 0
    },
    amount_paid: {
        type: Number,
        default: 0,
        min: 0
    },
    remaining_balance: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ["pending", "due_today", "within_grace", "overdue", "partially_paid", "paid_late", "fully_paid"],
        default: "pending",
        index: true
    },
    is_initial_deduction: {
        type: Boolean,
        default: false
    },
    is_prepaid_interest: {
        type: Boolean,
        default: false
    },
    actual_payment_date: {
        type: Date,
        default: null
    },
    days_overdue: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

installmentSchema.index({ due_date: 1, status: 1 });
installmentSchema.index({ loan_id: 1, installment_number: 1 }, { unique: true });

module.exports = mongoose.model("Installment", installmentSchema, "installment");
