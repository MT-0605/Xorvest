# Monthly Interest Count & Repayment Module

**Author:** Shreyas  
**Branch:** `shreyas`  
**Project:** Xorvest  

---

## 📌 Business Logic & Repayment Model

This module implements the monthly interest model for loans:

1. **Monthly Interest Rate:** The interest rate ($R$) is applied **per month** (e.g., 10% per month on ₹1,00,000 = ₹10,000 / month).
2. **Upfront Deductions at Disbursement (Day 0):**
   * **Processing Fee:** 2% of principal amount ($2\% \times P$).
   * **Month 1 Interest:** First month's interest is deducted upfront at disbursement.
   * **Net Disbursed to Customer:** $P - (\text{Processing Fee} + \text{Month 1 Interest})$.
3. **Subsequent Monthly Installments (Month 1 to $M - 1$):**
   * Customer pays **ONLY interest** for that monthly cycle.
   * Principal component = ₹0.
4. **Final Month (Tenure Completion, Month $M$):**
   * Customer repays the **FULL Principal amount**.
   * Interest component = ₹0 (all interest cycles already collected).

---

## 💡 Example: ₹1,00,000 Loan for 2 Months at 10% Monthly Interest

* **Principal ($P$):** ₹1,00,000
* **Monthly Interest Rate ($R$):** 10% per month
* **Tenure ($M$):** 2 Months
* **Monthly Interest:** ₹10,000
* **Total Interest (2 Months):** ₹20,000
* **Total Recovery:** ₹1,20,000

### Cashflow Table:
| Step | When | Expected Amount | Component Breakdown | Notes |
|:---|:---|:---|:---|:---|
| **Disbursement** | Day 0 | ₹12,000 (Deduction) | ₹2,000 (2% Fee) + ₹10,000 (Month 1 Interest) | **Customer receives ₹88,000** |
| **Installment 1** | Month 1 | **₹10,000** | Principal: ₹0, Interest: ₹10,000 | **Month 2 Interest Only** |
| **Installment 2** | Month 2 | **₹1,00,000** | Principal: ₹1,00,000, Interest: ₹0 | **Full Principal Repayment** |
| **Total Collected** | Across Tenure | **₹1,20,000** | Principal: ₹1,00,000, Interest: ₹20,000 | Reconciled 100% |

---

## 📁 File Structure

* `backend/services/monthlyInterestService.js` (and copy in `shreyas/monthlyInterestService.js`): Calculation engine and tracking logic.
* `backend/controllers/monthlyInterestController.js` (and copy in `shreyas/monthlyInterestController.js`): API handlers for calculate preview, loan interest details, and admin reports.
* `backend/routes/monthlyInterestRoutes.js` (and copy in `shreyas/monthlyInterestRoutes.js`): Express router mounted at `/api/monthly-interest`.
* `backend/tests/testMonthlyInterest.js` (and copy in `shreyas/testMonthlyInterest.js`): Verification test suite.

---

## 🚀 API Endpoints

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` / `GET` | `/api/monthly-interest/calculate` | Public | Preview upfront deductions, net credit, and repayment schedule |
| `GET` | `/api/monthly-interest/loan/:id` | Authenticated | View interest cycles, paid vs pending months for a loan |
| `GET` | `/api/monthly-interest/report` | Admin | Aggregated monthly interest metrics across all monthly loans |

---

## 🧪 Testing with Postman

1. **Start Backend Server:**
   ```powershell
   cd backend
   node server.js
   ```
2. **Send POST Request:**
   * **URL:** `http://localhost:5000/api/monthly-interest/calculate`
   * **Headers:** `Content-Type: application/json`
   * **Body (raw JSON):**
     ```json
     {
       "amount": 100000,
       "rate": 10,
       "months": 2
     }
     ```
3. **Verify Response:**
   * `netDisbursed`: `88000`
   * `totalInterest`: `20000`
   * `installments[0].expected_amount`: `10000` (Interest only)
   * `installments[1].expected_amount`: `100000` (Full principal)
