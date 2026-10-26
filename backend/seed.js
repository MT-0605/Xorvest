
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Use fixed IDs so relationships remain consistent
const userId1 = new mongoose.Types.ObjectId("671000000000000000000001");
const userId2 = new mongoose.Types.ObjectId("671000000000000000000002");

const loanId1 = new mongoose.Types.ObjectId("672000000000000000000001");
const loanId2 = new mongoose.Types.ObjectId("672000000000000000000002");
const loanId3 = new mongoose.Types.ObjectId("672000000000000000000003");

// Schemas
const userSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  user_name: String,
  email: String,
  password: String,
  role: String
});

const loanSchema = new mongoose.Schema({
  loan_id: mongoose.Schema.Types.ObjectId,
  amount: Number,
  frequency: String, // daily, weekly, monthly
  rate: Number,
  total_day: Number,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  total: Number,
  remaining: Number
});

const moneySchema = new mongoose.Schema({
  loan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Loan"
  },
  date: Date,
  amount: Number,
  count: Number
});

// Explicit collection names
const User = mongoose.model("User", userSchema, "users");
const Loan = mongoose.model("Loan", loanSchema, "loans");
const Money = mongoose.model("Money", moneySchema, "money");

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    // Hash dummy passwords
    const password = await bcrypt.hash("Test@123", 10);

    // 1. Insert/update dummy users
    await User.bulkWrite([
      {
        replaceOne: {
          filter: { email: "rahul@example.com" },
          replacement: {
            user_id: userId1,
            user_name: "Rahul Patel",
            email: "rahul@example.com",
            password,
            role: "user"
          },
          upsert: true
        }
      },
      {
        replaceOne: {
          filter: { email: "priya@example.com" },
          replacement: {
            user_id: userId2,
            user_name: "Priya Shah",
            email: "priya@example.com",
            password,
            role: "user"
          },
          upsert: true
        }
      }
    ]);

    // 2. Insert/update dummy loans
    await Loan.bulkWrite([
      {
        replaceOne: {
          filter: { loan_id: loanId1 },
          replacement: {
            loan_id: loanId1,
            amount: 10000,
            frequency: "monthly",
            rate: 12,
            total_day: 365,
            user_id: userId1,
            total: 11200,
            remaining: 9200
          },
          upsert: true
        }
      },
      {
        replaceOne: {
          filter: { loan_id: loanId2 },
          replacement: {
            loan_id: loanId2,
            amount: 5000,
            frequency: "weekly",
            rate: 10,
            total_day: 180,
            user_id: userId1,
            total: 5500,
            remaining: 4500
          },
          upsert: true
        }
      },
      {
        replaceOne: {
          filter: { loan_id: loanId3 },
          replacement: {
            loan_id: loanId3,
            amount: 20000,
            frequency: "daily",
            rate: 15,
            total_day: 365,
            user_id: userId2,
            total: 23000,
            remaining: 20000
          },
          upsert: true
        }
      }
    ]);

    // 3. Insert/update dummy repayment records
    const payments = [
      {
        loan_id: loanId1,
        date: new Date("2026-10-01"),
        amount: 1000,
        count: 1
      },
      {
        loan_id: loanId1,
        date: new Date("2026-10-15"),
        amount: 1000,
        count: 2
      },
      {
        loan_id: loanId2,
        date: new Date("2026-10-20"),
        amount: 500,
        count: 1
      },
      {
        loan_id: loanId3,
        date: new Date("2026-10-22"),
        amount: 3000,
        count: 1
      }
    ];

    for (const payment of payments) {
      await Money.replaceOne(
        {
          loan_id: payment.loan_id,
          count: payment.count
        },
        payment,
        { upsert: true }
      );
    }

    console.log("Dummy data inserted successfully!");
    console.log("Users: 2 | Loans: 3 | Money records: 4");
  } catch (error) {
    console.error("Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
}

seedDatabase();
