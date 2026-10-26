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

const getDayOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
};

const seededLoans = [
    {
        id: "672000000000000000000001",
        email: "rahul@example.com",
        amount: 10000,
        frequency: "daily",
        rate: 10,
        total_day: 10,
        startOffsetDays: -2 // Day 1 was -2, Day 2 was -1, Day 3 is TODAY!
    },
    {
        id: "672000000000000000000002",
        email: "vikram@example.com",
        amount: 25000,
        frequency: "daily",
        rate: 12,
        total_day: 15,
        startOffsetDays: -1 // Day 1 was -1, Day 2 is TODAY!
    },
    {
        id: "672000000000000000000003",
        email: "rahul@example.com",
        amount: 14000,
        frequency: "weekly",
        rate: 10,
        total_day: 28,
        startOffsetDays: -14 // Week 1 (-14), Week 2 (-7), Week 3 is TODAY!
    },
    {
        id: "672000000000000000000004",
        email: "ananya@example.com",
        amount: 35000,
        frequency: "weekly",
        rate: 14,
        total_day: 56,
        startOffsetDays: -21 // Week 1 (-21), Week 2 (-14), Week 3 (-7), Week 4 is TODAY!
    },
    {
        id: "672000000000000000000005",
        email: "priya@example.com",
        amount: 30000,
        frequency: "monthly",
        rate: 10,
        total_day: 90,
        startOffsetDays: -30 // Month 1 was -30, Month 2 is TODAY!
    },
    {
        id: "672000000000000000000006",
        email: "vikram@example.com",
        amount: 60000,
        frequency: "monthly",
        rate: 15,
        total_day: 180,
        startOffsetDays: -60 // Month 1 (-60), Month 2 (-30), Month 3 is TODAY!
    }
];

async function seedDatabase() {
    if (process.env.ALLOW_SEED_DATA !== "true") {
        throw new Error("Set ALLOW_SEED_DATA=true to explicitly allow development seed writes.");
    }

    await connectDB();

    const password = await bcrypt.hash("Test@123", 10);
    const users = new Map();

    const seedUsers = [
        ["Rahul Patel", "rahul@example.com", "user"],
        ["Priya Shah", "priya@example.com", "user"],
        ["Vikram Malhotra", "vikram@example.com", "user"],
        ["Ananya Sharma", "ananya@example.com", "user"],
        ["Admin Officer", "admin@example.com", "admin"]
    ];

    for (const [userName, email, role] of seedUsers) {
        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: { user_name: userName, password, role: role || "user" }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        users.set(email, user);
    }

    for (const seed of seededLoans) {
        const startDate = getDayOffset(seed.startOffsetDays || 0);
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
                    notes: `Development seed loan for ${user.user_name}`
                }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        await Installment.deleteMany({ loan_id: loan._id });
        const installments = await Installment.insertMany(
            schedule.installments.map((item) => ({
                ...item,
                loan_id: loan._id,
                user_id: user._id
            }))
        );

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
            `Seeded ${seed.frequency} loan ${loan._id} (₹${seed.amount} @ ${seed.rate}%) with ${installments.length} installments for ${user.user_name} (${user.email}).`
        );
    }

    console.log("All sample loans, installments, and users successfully seeded in MongoDB Atlas!");
}

seedDatabase()
    .catch((error) => {
        console.error(`Seeding failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
