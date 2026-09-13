# LifeCalc — Cumulative Development Log

> **Protocol**: APPEND-ONLY. Entries are recorded chronologically. Never overwrite or remove previous records.

---

## [Entry 001] — 2026-09-13: Project Foundation & Authoritative Calculator Engine (Phase A)

### What Was Implemented
- **Repository Initialization**: Clean Git repository initialized with local `.gitignore` ignoring dependencies, local environment variables, test coverage, and Next.js build artifacts.
- **Node.js LTS Runtime**: Verified Node.js v24.19.0 LTS and npm 11.17.0. Isolated all package installations to local `./node_modules` (zero global machine packages).
- **Core Dependencies**: Installed Next.js 14.2.35, React 18.3.1, TypeScript 5.6.3 (strict mode), Tailwind CSS 3.4.14, Lucide React, Zod 3.23.8, and Vitest 2.1.9.
- **Engine Core Architecture (`src/engine/`)**:
  - `types.ts`: Strongly-typed calculator definitions, input definitions, result models, SEO metadata, category schemas, and FAQ models.
  - `formatters.ts`: Locale-aware Indian number system (`12,45,480`), rupee formatting (`₹`), and word representations (`₹12.45 Lakh`, `₹1.50 Crore`). Internal math calculations maintain raw numerical precision and only round on display strings.
  - `registry.ts`: Typed registry pattern supporting lookup by ID, slug, category, and typo-tolerant search ranking.
  - `search/nl-parser.ts`: Deterministic natural language query parser for financial and everyday queries ("10 lakh loan at 9% for 5 years" -> EMI calculator with prefilled values).
- **Authoritative Deterministic Calculators**:
  - `money/emi.ts`: Reducing-balance loan EMI, total interest, total repayment, and annual amortization schedule.
  - `money/sip.ts`: Systematic Investment Plan future value compounding formula, wealth gain, and yearly growth trajectory.
  - `money/ctc-to-take-home.ts`: Indian salary calculator with New Tax Regime (Section 115BAC revised slabs + ₹75,000 standard deduction + Section 87A rebate) vs Old Tax Regime, EPF, and Professional Tax.
  - `money/compound-interest.ts`: Configurable annual, semi-annual, quarterly (Indian FDs), and monthly compounding.
  - `money/cagr.ts`: Portfolio compound annual growth rate and absolute percentage gain.
  - `money/gst.ts`: Indian GST calculator (5%, 12%, 18%, 28%) with exclusive/inclusive modes and CGST/SGST intrastate split.
  - `student/attendance.ts`: College attendance calculator for 75%/85% criteria, computing required consecutive lectures or safe bunks.
  - `student/cgpa.ts`: CGPA to percentage converter supporting CBSE (9.5 multiplier), VTU, Mumbai University, KTU, and standard scales.
  - `buying/can-i-afford-this.ts`: Personal finance decision engine computing cash flow, debt-to-income (DTI), and emergency fund runway with objective 🟢/🟡/🔴 indicators.
  - `time/age.ts`: Exact age in years, months, days, total days lived, and countdown to next birthday.
  - `everyday/fuel-cost.ts`: Trip fuel consumption, cost per km, round-trip multiplier, and carpool cost splitting.

### Tests & Verification
- 33 automated Vitest unit and property tests passing across 4 test suites:
  - `math.test.ts`: Monotonicity tests (Principal vs EMI, Tenure vs Total Interest), verified ground-truth values.
  - `nl-parser.test.ts`: Indian word amounts (lakh, crore, k) and query intent extraction.
  - `registry.test.ts`: Category filters, search ranking, and related calculator lookup.
  - `guest-quota.test.ts`: Tamper-proof 15-calculation enforcement.

---

## [Entry 002] — 2026-09-13: UI System, Guest Quota, Navigation & Static Generation (Phase B)

### What Was Implemented
- **Universal Calculator Runner (`src/components/calculator/CalculatorRunner.tsx`)**:
  - Reactive client-side calculation with instant user feedback.
  - Primary result display, secondary metrics, and zero-dependency SVG donut chart distribution.
  - Amortization / yearly breakdown schedule table toggle.
  - "What does this mean?" explanatory section, assumptions, caveats, and mathematical formula card.
  - FAQ accordions, shareable calculation links, and usefulness feedback widget.
- **Server-Side Tamper-Proof 15-Calculation Guest Quota (`src/app/api/calculate/route.ts`)**:
  - Backed by an `httpOnly` secure session cookie. Client cannot bypass quota via `localStorage`.
  - Non-destructive UX: On reaching the 15th calculation, the calculation is returned intact and a friendly conversion invitation is displayed ("*You've completed 15 free calculations. Sign in for unlimited calculations and save your progress across devices*").
- **Isolated Advertising Layer (`src/components/ads/AdSlot.tsx`)**:
  - Non-intrusive desktop side rails (`desktop_side_rail_left`, `desktop_side_rail_right`) active only on wide viewports (>=1280px).
  - Responsive inline slots for mobile; zero ad logic inside calculation formulas.
  - Automatically hidden for verified premium accounts.
- **Application Pages & Routes**:
  - Homepage (`src/app/page.tsx`): Hero, prominent natural language search bar with live intent parsing, category grid, decision tools showcase, and trust pillars.
  - Dynamic Calculator Route (`/calculators/[category]/[slug]`): Breadcrumbs, SEO metadata, JSON-LD Schema.org structured data, and calculator runner.
  - Category Browsing (`/calculators/[category]`): Filtered calculator catalog.
  - Search Page (`/search`): Query filtering, natural language intent banner, and fuzzy match results wrapped in React Suspense.
  - Authentication Pages (`/signin`, `/signup`): Transparent free-tier messaging.
  - Trust & Legal Pages (`/privacy`, `/about`): Financial data privacy commitments and mathematical philosophy.
  - Multi-Platform PWA & SEO: `public/manifest.json`, `src/app/sitemap.ts`, and `src/app/robots.ts`.
- **CI/CD Pipeline (`.github/workflows/ci.yml`)**:
  - GitHub Actions workflow covering install, typecheck, test suite, and Next.js production build.

### Verification Status
- `npm run typecheck`: 0 TypeScript errors.
- `npm test`: 33 passed (100% pass rate).
- `npm run build`: Next.js production bundle compiled cleanly with 29 prerendered static pages.

---

## [Entry 003] — 2026-09-13: Advanced Decision Tools, Share Route, Personal Finance & AI Grounding (Phase C & D)

### What Was Implemented
- **Expanded Decision Engines**:
  - `buying/emi-vs-cash.ts`: Objective comparison between paying upfront cash (with seller cash discounts) vs financing via EMI, factoring in opportunity returns earned by retaining liquid capital in investments over the tenure.
  - `buying/total-ownership-cost.ts`: 5-to-10 year car and motorcycle true ownership cost calculator factoring on-road pricing, loan interest, annual insurance, fuel/charging, periodic maintenance, and salvage resale value.
- **Reproducible Calculation Sharing (`/share/[id]`)**:
  - API endpoint (`/api/share`) storing and retrieving calculation state.
  - Dynamic page (`src/app/share/[id]/page.tsx`) allowing users to safely share calculations without exposing private personal credentials.
- **User Dashboards (`/history` and `/saved`)**:
  - Calculation history view with instant scenario reopening and clean deletion.
  - Bookmarked saved calculations with custom titles (e.g. "My SBI Home Loan", "Retirement SIP").
- **Personal Finance Module (`src/app/finance/page.tsx`)**:
  - Income and expenditure tracking across 10 categories (Rent, Food, Transport, Shopping, Utilities, Subscriptions, Education, Healthcare, Entertainment, Other).
  - Deterministic metrics: Total Income, Total Expenses, Net Savings, and Savings Rate.
  - Automated optimization recommendations (e.g. identifying largest discretionary expense and calculating compounded annual savings if reduced by ₹2,000/month).
- **Authoritative AI Explanation Layer (`src/app/api/ai/explain/route.ts`)**:
  - Strict grounding architecture: receives authoritative facts from the deterministic calculation engine.
  - Generates clear, contextual financial advice without independently calculating or contradicting mathematical formulas.

### Verification Status
- `npm run typecheck`: 0 errors.
- `npm test`: 34 passed across 4 test suites.
- `npm run build`: Next.js production bundle compiled with 36 prerendered pages and zero errors.

