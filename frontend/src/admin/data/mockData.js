/**
 * Initial Seed Data for Loan Management System
 * Perfectly matching Mongoose Models:
 * - User (user_name, email, password, role)
 * - Loan (amount, frequency, rate, total_day, user_id, total, remaining)
 * - Money (loan_id, date, amount, count)
 */

export const getInitialData = () => {
  const baseDate = new Date(); // Current date (e.g., 2026-10-26)

  const getDateOffset = (days) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  // 1. USERS (backend/models/User.js)
  const users = [
    {
      _id: 'usr_671b001',
      user_name: 'Marcus Sterling',
      email: 'marcus.sterling@example.com',
      password: 'hashed_password_1',
      role: 'user',
      createdAt: getDateOffset(-45),
      updatedAt: getDateOffset(-45)
    },
    {
      _id: 'usr_671b002',
      user_name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      password: 'hashed_password_2',
      role: 'user',
      createdAt: getDateOffset(-30),
      updatedAt: getDateOffset(-30)
    },
    {
      _id: 'usr_671b003',
      user_name: 'Devon Vance',
      email: 'devon.vance@example.com',
      password: 'hashed_password_3',
      role: 'user',
      createdAt: getDateOffset(-30),
      updatedAt: getDateOffset(-30)
    },
    {
      _id: 'usr_671b004',
      user_name: 'Sophia Patel',
      email: 'sophia.patel@example.com',
      password: 'hashed_password_4',
      role: 'user',
      createdAt: getDateOffset(-15),
      updatedAt: getDateOffset(-15)
    },
    {
      _id: 'usr_671b005',
      user_name: 'Amara Okafor',
      email: 'amara.okafor@example.com',
      password: 'hashed_password_5',
      role: 'user',
      createdAt: getDateOffset(-20),
      updatedAt: getDateOffset(-20)
    },
    {
      _id: 'usr_671b006',
      user_name: 'Lucas Silva',
      email: 'lucas.silva@example.com',
      password: 'hashed_password_6',
      role: 'user',
      createdAt: getDateOffset(-10),
      updatedAt: getDateOffset(-10)
    },
    {
      _id: 'usr_admin_01',
      user_name: 'Alex Rivera (Admin)',
      email: 'admin@xorvest.internal',
      password: 'hashed_password_admin',
      role: 'admin',
      createdAt: getDateOffset(-90),
      updatedAt: getDateOffset(-90)
    }
  ];

  // 2. LOANS (backend/models/Loan.js)
  // loanSchema: { amount, frequency, rate, total_day, user_id, total, remaining }
  const loans = [
    {
      _id: 'loan_8801',
      user_id: 'usr_671b001',
      amount: 15000,
      frequency: 'daily',
      rate: 12, // 12%
      total_day: 30, // 30 days
      total: 16800, // 15000 + 1800
      remaining: 9520, // 17 installments left
      createdAt: getDateOffset(-14),
      updatedAt: getDateOffset(-1)
    },
    {
      _id: 'loan_8802',
      user_id: 'usr_671b002',
      amount: 35000,
      frequency: 'weekly',
      rate: 15, // 15%
      total_day: 56, // 8 weeks (56 days)
      total: 40250, // 35000 + 5250
      remaining: 30187.5,
      createdAt: getDateOffset(-21),
      updatedAt: getDateOffset(-7)
    },
    {
      _id: 'loan_8803',
      user_id: 'usr_671b003',
      amount: 60000,
      frequency: 'monthly',
      rate: 18, // 18%
      total_day: 180, // 6 months (180 days)
      total: 70800, // 60000 + 10800
      remaining: 70800, // due today!
      createdAt: getDateOffset(-30),
      updatedAt: getDateOffset(-30)
    },
    {
      _id: 'loan_8804',
      user_id: 'usr_671b004',
      amount: 8000,
      frequency: 'daily',
      rate: 10,
      total_day: 20, // 20 days
      total: 8800, // 8000 + 800
      remaining: 4840,
      createdAt: getDateOffset(-10),
      updatedAt: getDateOffset(-1)
    },
    {
      _id: 'loan_8805',
      user_id: 'usr_671b005',
      amount: 25000,
      frequency: 'weekly',
      rate: 14,
      total_day: 70, // 10 weeks
      total: 28500, // 25000 + 3500
      remaining: 25650,
      createdAt: getDateOffset(-14),
      updatedAt: getDateOffset(-7)
    },
    {
      _id: 'loan_8806',
      user_id: 'usr_671b006',
      amount: 40000,
      frequency: 'daily',
      rate: 8,
      total_day: 40,
      total: 43200,
      remaining: 41040,
      createdAt: getDateOffset(-3),
      updatedAt: getDateOffset(-1)
    }
  ];

  // 3. MONEY (backend/models/Money.js: { loan_id, date, amount, count })
  const money = [
    // loan_8801 payments (13 paid, 14th is due TODAY)
    ...Array.from({ length: 13 }, (_, idx) => ({
      _id: `mny_10_${idx + 1}`,
      loan_id: 'loan_8801',
      date: getDateOffset(-(14 - (idx + 1))),
      amount: 560,
      count: idx + 1,
      createdAt: getDateOffset(-(14 - (idx + 1))),
      updatedAt: getDateOffset(-(14 - (idx + 1)))
    })),

    // loan_8802 (installment 1 & 2 paid, installment 3 due TODAY)
    {
      _id: 'mny_201',
      loan_id: 'loan_8802',
      date: getDateOffset(-14),
      amount: 5031.25,
      count: 1,
      createdAt: getDateOffset(-14),
      updatedAt: getDateOffset(-14)
    },
    {
      _id: 'mny_202',
      loan_id: 'loan_8802',
      date: getDateOffset(-7),
      amount: 5031.25,
      count: 2,
      createdAt: getDateOffset(-7),
      updatedAt: getDateOffset(-7)
    },

    // loan_8804 (installments 1 to 9 paid, installment 10 is due TODAY)
    ...Array.from({ length: 9 }, (_, idx) => ({
      _id: `mny_30_${idx + 1}`,
      loan_id: 'loan_8804',
      date: getDateOffset(-(10 - (idx + 1))),
      amount: 440,
      count: idx + 1,
      createdAt: getDateOffset(-(10 - (idx + 1))),
      updatedAt: getDateOffset(-(10 - (idx + 1)))
    })),

    // loan_8805 (installment 1 paid, installment 2 due TODAY)
    {
      _id: 'mny_401',
      loan_id: 'loan_8805',
      date: getDateOffset(-7),
      amount: 2850,
      count: 1,
      createdAt: getDateOffset(-7),
      updatedAt: getDateOffset(-7)
    },

    // loan_8806 (installments 1 & 2 paid, installment 3 due yesterday - overdue!)
    {
      _id: 'mny_501',
      loan_id: 'loan_8806',
      date: getDateOffset(-2),
      amount: 1080,
      count: 1,
      createdAt: getDateOffset(-2),
      updatedAt: getDateOffset(-2)
    },
    {
      _id: 'mny_502',
      loan_id: 'loan_8806',
      date: getDateOffset(-1),
      amount: 1080,
      count: 2,
      createdAt: getDateOffset(-1),
      updatedAt: getDateOffset(-1)
    }
  ];

  return { users, loans, money };
};
