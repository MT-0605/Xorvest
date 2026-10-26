const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const TransactionLedger = require("../models/TransactionLedger");
const { evaluateInstallmentStatus, round2 } = require("../services/loanService");

/**
 * Get comprehensive admin dashboard metrics from actual DB records
 * GET /api/admin/dashboard
 */
const getAdminDashboard = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // 1. Aggregation on Loans
        const loanAgg = await Loan.aggregate([
            {
                $group: {
                    _id: null,
                    totalLoans: { $sum: 1 },
                    totalPrincipal: { $sum: "$amount" },
                    totalNetDisbursed: { $sum: { $ifNull: ["$net_disbursed", "$amount"] } },
                    totalExpectedRecovery: { $sum: "$total" },
                    totalOutstanding: { $sum: "$remaining" },
                    totalProcessingFees: { $sum: { $ifNull: ["$processing_fee", { $multiply: ["$amount", 0.02] }] } },
                    totalInterestExpected: {
                        $sum: {
                            $ifNull: ["$interest_amount", { $subtract: ["$total", "$amount"] }]
                        }
                    },
                    activeLoans: {
                        $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
                    },
                    completedLoans: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    }
                }
            }
        ]);

        const loanStats = loanAgg[0] || {
            totalLoans: 0,
            totalPrincipal: 0,
            totalNetDisbursed: 0,
            totalExpectedRecovery: 0,
            totalOutstanding: 0,
            totalProcessingFees: 0,
            totalInterestExpected: 0,
            activeLoans: 0,
            completedLoans: 0
        };

        // 2. Total Amount Recovered from Ledger
        const ledgerAgg = await TransactionLedger.aggregate([
            {
                $match: {
                    status: "completed",
                    is_reversed: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRecovered: { $sum: "$amount" }
                }
            }
        ]);

        const totalRecovered = ledgerAgg[0] ? round2(ledgerAgg[0].totalRecovered) : round2(loanStats.totalExpectedRecovery - loanStats.totalOutstanding);

        // 3. Today's actual collections from TransactionLedger
        const todayCollectionsAgg = await TransactionLedger.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfToday, $lte: endOfToday },
                    status: "completed",
                    is_reversed: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    todayActualCollections: { $sum: "$amount" },
                    todayTransactionsCount: { $sum: 1 }
                }
            }
        ]);

        const todayActualCollections = todayCollectionsAgg[0] ? round2(todayCollectionsAgg[0].todayActualCollections) : 0;
        const todayTransactionsCount = todayCollectionsAgg[0] ? todayCollectionsAgg[0].todayTransactionsCount : 0;

        // 4. Installment stats (Today's scheduled collections, Grace period, Overdue)
        // Retrieve all pending/active installments to evaluate dynamic real-time statuses
        const activeInstallments = await Installment.find({
            status: { $nin: ["fully_paid", "paid_late"] }
        });

        let todayScheduledCollections = 0;
        let todayScheduledCount = 0;
        let installmentsInGrace = 0;
        let overdueInstallmentsCount = 0;
        const overdueCustomerSet = new Set();

        activeInstallments.forEach((inst) => {
            const evaluation = evaluateInstallmentStatus(inst, now);
            const remainingBalance = Number(inst.remaining_balance || (inst.expected_amount - inst.amount_paid));

            // Check if due today
            const due = new Date(inst.due_date);
            if (due >= startOfToday && due <= endOfToday) {
                todayScheduledCollections = round2(todayScheduledCollections + remainingBalance);
                todayScheduledCount++;
            }

            if (evaluation.isGrace) {
                installmentsInGrace++;
            }

            if (evaluation.isOverdue) {
                overdueInstallmentsCount++;
                overdueCustomerSet.add(inst.user_id.toString());
            }
        });

        return res.status(200).json({
            success: true,
            dashboard: {
                // Core Portfolio Metrics
                total_loans_issued: loanStats.totalLoans,
                total_principal_disbursed: round2(loanStats.totalPrincipal),
                total_net_disbursed: round2(loanStats.totalNetDisbursed),
                total_interest_expected: round2(loanStats.totalInterestExpected),
                processing_fees_collected: round2(loanStats.totalProcessingFees),
                total_expected_recovery: round2(loanStats.totalExpectedRecovery),
                total_amount_recovered: totalRecovered,
                total_outstanding_amount: round2(loanStats.totalOutstanding),

                // Today's Collection Metrics
                today_scheduled_collections: todayScheduledCollections,
                today_scheduled_installments_count: todayScheduledCount,
                today_actual_collections: todayActualCollections,
                today_transactions_count: todayTransactionsCount,

                // Loan & Customer Statuses
                active_loans: loanStats.activeLoans,
                completed_loans: loanStats.completedLoans,
                customers_with_overdue_installments: overdueCustomerSet.size,
                installments_currently_in_grace: installmentsInGrace,
                total_overdue_installments: overdueInstallmentsCount
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate admin dashboard metrics: " + error.message
        });
    }
};

module.exports = {
    getAdminDashboard
};
