const mongoose = require("mongoose");

const moneySchema = new mongoose.Schema({
    loan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Loan",
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    count: {
        type: Number,
        required: true,
        min: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Money", moneySchema, "money");