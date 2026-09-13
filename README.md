# LifeCalc

> **Your numbers. Your decisions.**  
> LifeCalc is a universal calculator and personal decision-support platform designed to answer real-world questions across money, salaries, loans, investments, education, time, purchases, and everyday calculations.

---

## Architecture Principles

1. **Deterministic Mathematics First**: All formulas (EMI, SIP, Compound Interest, CAGR, Indian CTC-to-in-hand, Attendance 75% thresholds) are pure, standalone functions with zero UI or database coupling.
2. **Tamper-Proof Guest Quota (15 Free Calculations)**: Tracked authoritatively via server-side session cookies; client-side localStorage cannot bypass restrictions. Reaching 15 calculations preserves the current result and offers a friendly, non-destructive invitation to create a free account.
3. **100% Free Core Calculators**: Basic calculators remain free forever without artificial paywalls. Premium exists for ad-free experience, multi-year expense analytics, and AI explanation layers.
4. **Desktop Side-Rail Ads with Zero Intrusion**: Clean, isolated `AdSlot` components placed strictly in side rails on desktop (>=1280px) and non-blocking inline slots on mobile. Automatically suppressed for premium members.
5. **Progressive Web App (PWA)**: Multi-platform installability on Android, iOS, Windows, macOS, and Linux with offline support for deterministic calculators.

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit, Property, and Integration tests)
- **CI/CD**: GitHub Actions

---

## Local Development Setup

Clone the repository and install dependencies locally (dependencies stay inside the local `./node_modules` folder; no global packages required):

```bash
git clone https://github.com/Balu-Annapureddy/LifeCalc.git
cd LifeCalc

# Install local dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

Run the test suite:

```bash
# Run unit & property tests
npm test

# Typecheck TypeScript definitions
npm run typecheck

# Production build verification
npm run build
```

---

## Calculator Catalog

### 💰 Money & Loans
- **EMI Calculator** (`/calculators/money/emi`): Home, Car, Personal loans with yearly amortization schedule.
- **SIP Calculator** (`/calculators/money/sip`): Mutual funds wealth accumulation and year-by-year compounding.
- **CTC to Take-Home** (`/calculators/money/ctc-to-take-home`): Indian salary with New vs Old Tax Regime, EPF, and Professional Tax.
- **Compound Interest** (`/calculators/money/compound-interest`): Annual, quarterly (Indian FDs), and monthly compounding.
- **CAGR Calculator** (`/calculators/money/cagr`): Portfolio geometric compound growth rate.
- **GST Calculator** (`/calculators/money/gst`): Add/remove GST with CGST and SGST splits.

### 🎓 Student & Academics
- **Attendance Calculator** (`/calculators/student/attendance`): 75% university eligibility, lectures to attend or safe bunks.
- **CGPA to Percentage** (`/calculators/student/cgpa`): CBSE (9.5 multiplier), VTU, Mumbai University, and KTU formulas.

### 🛍️ Buying & Decisions
- **Can I Afford This?** (`/calculators/buying/can-i-afford-this`): Objective financial risk assessment based on debt-to-income and liquid runway.

### ⏰ Time & Dates
- **Age Calculator** (`/calculators/time/age`): Exact years, months, days, total days lived, and next birthday countdown.

### 🚗 Everyday Utility
- **Fuel Cost & Mileage** (`/calculators/everyday/fuel-cost`): Road trip fuel estimation, mileage, and carpool split costs.

---

## License

MIT License. Designed and engineered for production reliability.
