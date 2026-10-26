const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Loan = require("./models/Loan");
const Installment = require("./models/Installment");
const Money = require("./models/Money");
const { calculateLoanSchedule } = require("./services/loanService");

const seededLoans = [
    {
        id: "672000000000000000000001",
        email: "rahul@example.com",
        amount: 10000,
        frequency: "daily",
        rate: 10,
        total_day: 10
    },
    {
        id: "672000000000000000000002",
        email: "rahul@example.com",
        amount: 14000,
        frequency: "weekly",
        rate: 10,
        total_day: 28
    },
    {
        id: "672000000000000000000003",
        email: "priya@example.com",
        amount: 30000,
        frequency: "monthly",
        rate: 10,
        total_day: 90
    }
];

async function seedDatabase() {
    if (process.env.ALLOW_SEED_DATA !== "true") {
        throw new Error("Set ALLOW_SEED_DATA=true to explicitly allow development seed writes.");
    }

    await connectDB();

    const password = await bcrypt.hash("Test@123", 10);
    const users = new Map();
    for (const [userName, email] of [
        ["Rahul Patel", "rahul@example.com"],
        ["Priya Shah", "priya@example.com"]
    ]) {
        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: { user_name: userName, password, role: "user" }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        users.set(email, user);
    }

    for (const seed of seededLoans) {
        const startDate = new Date();
        const schedule = calculateLoanSchedule({
            amount: seed.amount,
            frequency: seed.frequency,
            rate: seed.rate,
            total_day: seed.total_day,
            startDate
        });
        const user = users.get(seed.email);
        const loan = await Loan.findByIdAndUpdate(
            seed.id,
            {
                $set: {
                    amount: schedule.principal,
                    frequency: seed.frequency,
                    rate: schedule.interestRate,
                    total_day: seed.total_day,
                    user_id: user._id,
                    total: schedule.totalRecovery,
                    remaining: schedule.remainingToRecover,
                    processing_fee: schedule.processingFee,
                    interest_amount: schedule.interestAmount,
                    net_disbursed: schedule.netDisbursed,
                    initial_deduction: schedule.initialDeduction,
                    status: "active",
                    start_date: startDate,
                    notes: "Development seed loan"
                }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        await Installment.deleteMany({ loan_id: loan._id });
        const installments = await Installment.insertMany(schedule.installments.map(item => ({
            ...item,
            loan_id: loan._id,
            user_id: user._id
        })));

        await Money.deleteMany({ loan_id: loan._id });
        if (schedule.upfrontRecovered > 0) {
            await Money.create({
                loan_id: loan._id,
                date: startDate,
                amount: schedule.upfrontRecovered,
                count: 1
            });
        }

        console.log(
            `Seeded ${seed.frequency} loan ${loan._id} with ${installments.length} installments for ${user.email}.`
        );
    }
}

seedDatabase()
    .catch(error => {
        console.error(`Seeding failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
