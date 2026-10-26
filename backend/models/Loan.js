const mongoose = require("mongoose");

const repaymentInstallmentSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    count: {
        type: Number,
        required: true,
        min: 1
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paid_amount: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    remaining: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ["pending", "partial", "paid"],
        required: true,
        default: "pending"
    }
}, {
    _id: false
});

const loanSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        required: true
    },
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    duration_months: {
        type: Number,
        required: true,
        min: 1
    },
    total_day: {
        type: Number,
        required: true,
        min: 1
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    processing_charge_rate: {
        type: Number,
        required: true,
        min: 0
    },
    processing_charge: {
        type: Number,
        required: true,
        min: 0
    },
    total_interest: {
        type: Number,
        required: true,
        min: 0
    },
    net_disbursed_amount: {
        type: Number,
        required: true,
        min: 0
    },
    remaining: {
        type: Number,
        required: true,
        min: 0
    },
    processing_fee: {
        type: Number,
        default: 0,
        min: 0
    },
    interest_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    net_disbursed: {
        type: Number,
        default: 0,
        min: 0
    },
    initial_deduction: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ["active", "completed", "defaulted"],
        default: "active"
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    first_installment_prepaid_amount: {
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

module.exports = mongoose.model("Loan", loanSchema, "loan");