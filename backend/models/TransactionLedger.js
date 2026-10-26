const mongoose = require("mongoose");

const transactionLedgerSchema = new mongoose.Schema({
    payment_reference: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    loan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Loan",
        required: true,
        index: true
    },
    installment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Installment",
        default: null
    },
    money_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Money",
        default: null
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    recorded_by_admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recorded_by_name: {
        type: String,
        default: "Administrator"
    },
    amount: {
        type: Number,
        required: true
    },
    transaction_type: {
        type: String,
        enum: ["repayment", "initial_deduction", "prepaid_interest", "reversal", "adjustment"],
        default: "repayment"
    },
    payment_method: {
        type: String,
        enum: ["cash", "bank_transfer", "upi", "cheque", "system_deduction", "other"],
        default: "cash"
    },
    status: {
        type: String,
        enum: ["completed", "reversed"],
        default: "completed"
    },
    is_reversed: {
        type: Boolean,
        default: false
    },
    reversal_reference: {
        type: String,
        default: null
    },
    reversal_reason: {
        type: String,
        default: null
    },
    reversed_at: {
        type: Date,
        default: null
    },
    reversed_by_admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    notes: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("TransactionLedger", transactionLedgerSchema, "transaction_ledger");
