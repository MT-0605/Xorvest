# XorVest - Loan Platform Frontend (MERN Stack)

Welcome to the frontend authentication suite for **XorVest** (*"Logic Meets Profit"*).

Designed specifically for algorithmic lending and investment management, featuring a high-conversion dark luxury fintech aesthetic matching the official company branding.

---

## 🚀 Quick Start

To launch the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

Visit the local server in your browser (typically `http://localhost:3000` or `http://localhost:5173`).

---

## 🎨 Features & Capabilities

- **Official XorVest Branding**: Incorporates the company logo, dark luxury fintech palette (`#080C14`), and warm gold/amber accents (`#F59E0B`).
- **Lending & Loan Focus**:
  - Interactive **Quick Loan Estimator** with live sliders and term selectors.
  - Loan purpose picker (Personal, Business, Student / Microloan, Debt Consolidation).
  - Matches the team's backend `Loan.js` frequency schemas (`daily`, `weekly`, `monthly`).
- **Complete Auth Suite**:
  - **Sign Up**: Username, Email, Password, Confirm Password, Loan Purpose, Strength Meter, Terms agreement.
  - **Login**: Username/Email identifier, Password, Show/Hide password toggle, Remember Me session state, Forgot password helper.
  - **1-Click Auto-Fill Demo**: Test and review the UI in 1 click without typing.
  - **Integrated Fallback / Demo Mode**: If the Express backend is not running yet, simulated responses enable full UI walkthroughs without failing.
  - **Welcome & Profile Dialog**: Displays authenticated session details and token status.

---

## 🔌 Connecting to MERN Backend

The API integration is pre-configured in `src/api/auth.js`.

### 1. Configure Backend URL
Set `VITE_API_URL` in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Expected Backend Endpoints
- `POST /api/auth/register`
  - Body: `{ username, email, password, loanType }`
  - Response: `{ token, user: { id, username, email, loanType } }`
- `POST /api/auth/login`
  - Body: `{ identifier, password }`
  - Response: `{ token, user: { id, username, email, loanType } }`

The Axios client automatically attaches the `Bearer <token>` header to all future requests.
