const assert = require("assert");
const {
    calculateMonthlyInterestSchedule
} = require("../services/monthlyInterestService");
const { calculateLoanSchedule } = require("../services/loanService");
const { calculateMonthlyInterest } = require("../controllers/monthlyInterestController");

console.log("=================================================");
console.log("RUNNING MONTHLY INTEREST COUNT & SCHEDULE TESTS");
console.log("=================================================\n");

// TEST CASE 1: User's Example
// Principal: 100,000 (1 Lakh)
// Tenure: 2 months
// Rate: 10% per month (10% of 100,000 = 10,000/month; 20,000 for 2 months)
console.log("--- TEST 1: User's Example (1 Lakh, 2 Months, 10% Monthly Interest) ---");
const result = calculateMonthlyInterestSchedule({
    amount: 100000,
    rate: 10,
    months: 2,
    startDate: new Date("2026-10-01")
});

console.log("Principal:", result.principal);
console.log("Monthly Interest Rate:", result.interestRate + "% per month");
console.log("Total Months:", result.totalMonths);
console.log("Monthly Interest (10% of 100,000):", result.monthlyInterest);
console.log("Total Interest for 2 Months (10,000 * 2):", result.totalInterest);
console.log("2% Processing Fee (2% of 100,000):", result.processingFee);
console.log("Upfront Month 1 Interest Deduction:", result.upfrontInterestDeduction);
console.log("Total Initial Deduction at Disbursement (2,000 fee + 10,000 interest):", result.initialDeduction);
console.log("Net Disbursed to Customer (100,000 - 12,000):", result.netDisbursed);
console.log("Total Expected Recovery (100,000 + 20,000):", result.totalRecovery);
console.log("Remaining to Recover from Customer (120,000 - 10,000):", result.remainingToRecover);
console.log("Number of Installments:", result.installments.length);

console.log("\nInstallment Breakdown:");
result.installments.forEach((inst) => {
    console.log(`- Month ${inst.installment_number}: Due Amount = ${inst.expected_amount} (Principal: ${inst.principal_component}, Interest: ${inst.interest_component}) | Notes: ${inst.notes}`);
});

// Assertions matching user's exact specification:
assert.strictEqual(result.principal, 100000, "Principal must be 100,000");
assert.strictEqual(result.monthlyInterest, 10000, "Monthly interest must be 10,000 (10% of 100,000)");
assert.strictEqual(result.totalInterest, 20000, "Total interest for 2 months must be 20,000 (10,000 * 2)");
assert.strictEqual(result.processingFee, 2000, "2% Processing fee must be 2,000");
assert.strictEqual(result.upfrontInterestDeduction, 10000, "Upfront interest deduction must be 10,000");
assert.strictEqual(result.initialDeduction, 12000, "Initial deduction must be 2,000 fee + 10,000 upfront interest = 12,000");
assert.strictEqual(result.netDisbursed, 88000, "Net disbursed must be 100,000 - 12,000 = 88,000");
assert.strictEqual(result.totalRecovery, 120000, "Total recovery must be 100,000 + 20,000 = 120,000");
assert.strictEqual(result.remainingToRecover, 110000, "Remaining to recover must be 120,000 - 10,000 = 110,000");

// Installment 1: ONLY interest
const inst1 = result.installments[0];
assert.strictEqual(inst1.installment_number, 1);
assert.strictEqual(inst1.expected_amount, 10000, "Month 1 must be ONLY interest = 10,000");
assert.strictEqual(inst1.principal_component, 0, "Month 1 principal must be 0");
assert.strictEqual(inst1.interest_component, 10000, "Month 1 interest component must be 10,000");

// Installment 2: TOTAL Principal amount
const inst2 = result.installments[1];
assert.strictEqual(inst2.installment_number, 2);
assert.strictEqual(inst2.expected_amount, 100000, "Month 2 must be TOTAL Principal amount = 100,000");
assert.strictEqual(inst2.principal_component, 100000, "Month 2 principal component must be 100,000");
assert.strictEqual(inst2.interest_component, 0, "Month 2 interest component must be 0");

// Total collected check:
const totalCollectedThroughInstallments = inst1.expected_amount + inst2.expected_amount;
assert.strictEqual(totalCollectedThroughInstallments, 110000, "Sum of installments must equal 110,000");
assert.strictEqual(result.upfrontRecovered + totalCollectedThroughInstallments, 120000, "Upfront (10,000) + Installments (110,000) must equal 120,000 total recovery");

console.log("\n>>> TEST 1 PASSED SUCCESSFULLY! <<<\n");

// TEST CASE 2: Multi-month tenure (3 Months, 50,000, 5% Monthly Interest)
console.log("--- TEST 2: 3-Month Tenure (50,000, 5% Monthly Interest) ---");
const result3m = calculateMonthlyInterestSchedule({
    amount: 50000,
    rate: 5,
    months: 3,
    startDate: new Date("2026-10-01")
});

// Monthly interest = 5% of 50,000 = 2,500
// Total interest for 3 months = 2,500 * 3 = 7,500
// Upfront deduction: 2% of 50,000 (1,000) + 2,500 = 3,500
// Net disbursed = 50,000 - 3,500 = 46,500
// Installment 1: 2,500 (Interest only)
// Installment 2: 2,500 (Interest only)
// Installment 3: 50,000 (Full Principal)
assert.strictEqual(result3m.principal, 50000);
assert.strictEqual(result3m.monthlyInterest, 2500);
assert.strictEqual(result3m.totalInterest, 7500);
assert.strictEqual(result3m.processingFee, 1000);
assert.strictEqual(result3m.initialDeduction, 3500);
assert.strictEqual(result3m.netDisbursed, 46500);
assert.strictEqual(result3m.installments[0].expected_amount, 2500);
assert.strictEqual(result3m.installments[1].expected_amount, 2500);
assert.strictEqual(result3m.installments[2].expected_amount, 50000);

console.log(">>> TEST 2 PASSED SUCCESSFULLY! <<<\n");

// TEST CASE 3: Integration with calculateLoanSchedule(frequency: 'monthly')
console.log("--- TEST 3: Integration with loanService.js ---");
const loanServiceResult = calculateLoanSchedule({
    amount: 100000,
    rate: 10,
    frequency: "monthly",
    total_day: 60 // 60 days = 2 months
});

assert.strictEqual(loanServiceResult.principal, 100000);
assert.strictEqual(loanServiceResult.numberOfInstallments, 2);
assert.strictEqual(loanServiceResult.installments[0].expected_amount, 10000);
assert.strictEqual(loanServiceResult.installments[1].expected_amount, 100000);
assert.strictEqual(loanServiceResult.netDisbursed, 88000);
assert.strictEqual(loanServiceResult.totalRecovery, 120000);

console.log(">>> TEST 3 PASSED SUCCESSFULLY! <<<\n");

// TEST CASE 4: Controller calculateMonthlyInterest API Handler
console.log("--- TEST 4: Controller calculateMonthlyInterest API Handler ---");
const mockReq = {
    method: "POST",
    body: {
        amount: 100000,
        rate: 10,
        months: 2
    }
};

let capturedStatus = 0;
let capturedJson = null;

const mockRes = {
    status(code) {
        capturedStatus = code;
        return this;
    },
    json(payload) {
        capturedJson = payload;
        return this;
    }
};

(async () => {
    await calculateMonthlyInterest(mockReq, mockRes);
    assert.strictEqual(capturedStatus, 200, "Controller must return HTTP 200");
    assert.strictEqual(capturedJson.success, true, "Controller must return success: true");
    assert.strictEqual(capturedJson.data.netDisbursed, 88000, "Controller returned netDisbursed must be 88000");
    assert.strictEqual(capturedJson.data.totalInterest, 20000, "Controller returned totalInterest must be 20000");
    assert.strictEqual(capturedJson.data.monthlyInterest, 10000, "Controller returned monthlyInterest must be 10000");
    assert.strictEqual(capturedJson.data.installments[0].expected_amount, 10000);
    assert.strictEqual(capturedJson.data.installments[1].expected_amount, 100000);
    assert.strictEqual(capturedJson.data.timelineSummary.length, 3);
    console.log("Timeline generated by API:");
    capturedJson.data.timelineSummary.forEach((t) => console.log(`  * [${t.timeline}]: ${t.description}`));
    console.log(">>> TEST 4 PASSED SUCCESSFULLY! <<<\n");

    console.log("=================================================");
    console.log("ALL 4 MONTHLY INTEREST TESTS PASSED WITH 100% ACCURACY!");
    console.log("=================================================");
})();
