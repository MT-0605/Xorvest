const mongoose = require("mongoose");

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
    remaining: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Loan", loanSchema, "loan");