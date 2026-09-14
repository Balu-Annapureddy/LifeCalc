# LifeCalc

> **Your numbers. Your decisions.**  
> LifeCalc is a universal calculator and personal decision-support platform designed to answer real-world questions across money, salaries, loans, investments, education, time, purchases, and everyday calculations.

---

## Architecture Principles

1. **Deterministic Mathematics First**: All formulas (EMI, SIP, Compound Interest, CAGR, Indian CTC-to-in-hand, Attendance 75% thresholds) are pure, standalone functions with zero UI or database coupling.
2. **100% Free, Private & Anonymous**: No logins, no signups, no accounts, no server databases, and no tracking. All saved scenarios and calculation histories live safely and privately in your own browser's local storage.
3. **Zero Ads**: Completely ad-free interface. No banner ads, no popups, no side-rails, and no third-party ad trackers.
4. **Static Edge Architecture**: Optimized for instant loading as a static export hosted globally on Cloudflare Pages.
5. **Progressive Web App (PWA)**: Multi-platform installability on Android, iOS, Windows, macOS, and Linux with full offline support for all calculators.

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

### 💰 Money & Everyday Expenses
- **EMI Calculator** (`/calculators/money/emi`): Home, Car, Personal loans with yearly amortization schedule.
- **SIP Calculator** (`/calculators/money/sip`): Mutual funds wealth accumulation and year-by-year compounding.
- **CTC to Take-Home** (`/calculators/money/ctc-to-take-home`): Indian salary with New vs Old Tax Regime, EPF, and Professional Tax.
- **Compound Interest** (`/calculators/money/compound-interest`): Annual, quarterly (Indian FDs), and monthly compounding.
- **CAGR Calculator** (`/calculators/money/cagr`): Portfolio geometric compound growth rate.
- **GST Calculator** (`/calculators/money/gst`): Add/remove GST with CGST and SGST splits.
- **Bill Split & Tip** (`/calculators/money/bill-split`): Group dining expense and tip calculator.
- **Discount & Savings** (`/calculators/money/discount`): Sale discounts and double-discount promotions.
- **Fuel Cost & Mileage** (`/calculators/money/fuel-cost`): Road trip fuel estimation, mileage, and carpool split costs.

### 🎓 Student & Academics
- **Attendance Calculator** (`/calculators/student/attendance`): 75% university eligibility, lectures to attend or safe bunks.
- **CGPA to Percentage** (`/calculators/student/cgpa`): CBSE (9.5 multiplier), VTU, Mumbai University, and KTU formulas.

### 🛍️ Buying & Decisions
- **Can I Afford This?** (`/calculators/buying/can-i-afford-this`): Objective financial risk assessment based on debt-to-income and liquid runway.
- **EMI vs Cash** (`/calculators/buying/emi-vs-cash`): Financing comparison factoring in upfront cash discounts and investment opportunity returns.
- **Total Ownership Cost** (`/calculators/buying/total-ownership-cost`): 5-to-10 year car and motorcycle true ownership cost covering insurance, fuel, maintenance, and resale salvage.

### ⏰ Time & Dates
- **Age Calculator** (`/calculators/time/age`): Exact years, months, days, total days lived, and next birthday countdown.

---

## License

MIT License. Designed and engineered for production reliability.
