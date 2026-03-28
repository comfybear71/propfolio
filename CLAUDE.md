# CLAUDE.md - Project Intelligence for Claude

## Project Overview
Propfolio is a personal property portfolio tracker for Australian property investors. Built with Next.js, Tailwind CSS, and MongoDB. Hosted on Vercel. Focused on new builds in the Northern Territory using equity release and the NT BuildBonus $30,000 grant.

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/postcss`
- **Database:** MongoDB (connection string in environment variables)
- **Hosting:** Vercel
- **Charts:** Recharts (planned - not yet added)

## Project Structure
```
propfolio/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with NavBar
│   │   ├── page.tsx            # Dashboard homepage
│   │   ├── globals.css         # Global styles + CSS variables
│   │   ├── properties/page.tsx # Editable property details
│   │   ├── finances/page.tsx   # Income + expense entry forms
│   │   ├── borrowing/page.tsx  # Borrowing calculator (new build focus)
│   │   ├── strategy/page.tsx   # 5-year portfolio growth planner
│   │   ├── documents/page.tsx  # Document vault / broker checklist
│   │   └── tax-guide/page.tsx  # Australian property tax reference
│   ├── components/
│   │   └── NavBar.tsx          # Responsive navigation bar
│   └── lib/
│       └── data.ts             # Financial data, types, helpers
├── public/images/              # Property photos
├── docs/                       # Documentation, errors, problem-solving notes
├── CLAUDE.md                   # This file - project context for Claude
├── HANDOFF.md                  # Session handoff notes
├── vercel.json                 # Vercel framework config
├── next.config.ts              # Next.js configuration
├── postcss.config.mjs          # PostCSS config (Tailwind)
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Development Rules
- All prices are in AUD
- Australian property context (stamp duty, LVR, LMI, offset accounts, negative gearing)
- Dark theme UI with CSS custom properties defined in `globals.css`
- Use `@/*` import alias for `src/*` paths
- **New builds only** — the users are focused on building new properties to get the NT $30,000 BuildBonus grant
- **Stamp duty on land only** for new builds in the NT (not on the build cost)
- Two owners: Stuart French (60 Bagshaw) and Sasitron Ransuk (72 Bagshaw), both in Gray, NT

## Investment Strategy (IMPORTANT — read this)
The users' strategy for building their portfolio:

1. **Room rentals, not whole-house:** They rent out individual rooms (not the whole property). New builds will be 4-bed ensuite houses. They live in one room and rent out 3 rooms at ~$350/wk each = **$1,050/wk** per property.

2. **Offset account strategy:** Every dollar of income (wages + rent) goes into offset accounts:
   - Sasitron's 72 Bagshaw offset is at ~62% ($236K of $378K). Will hit 100% in 12-18 months.
   - Stuart's 60 Bagshaw redraw is at ~11%. Will hit ~50% in 12 months.
   - Once a property is 100% offset, all income shifts to the NEXT property's offset.

3. **Equity release for deposits:** They plan to release ~$100K each from existing properties (80% LVR) to fund deposits on new builds. NOT selling properties.

4. **Construction loans in Australia:** During the 12-18 month build period, you only pay interest on amounts drawn down (progress payments). Full P&I repayments don't start until the build is complete and the certificate of occupancy is issued.

5. **NT BuildBonus $30K:** Each new build in the NT qualifies for a $30,000 government grant.

6. **Stamp duty on land only:** For new builds in the NT, stamp duty is calculated on the land price only, not the build cost.

7. **5-year plan:** Buy as many properties as possible over 5 years, using equity from each purchase to fund the next.

## Current State
- Full multi-page dashboard with real financial data for 2 Darwin properties
- 7 pages: Dashboard, Properties, Finances, Borrowing, Strategy, Documents, Tax Guide
- Editable fields throughout — expenses save to MongoDB
- MongoDB connected for persistent data storage
- Vercel Blob Storage connected for document uploads (private)
- Borrowing calculator focused on new builds with equity release + $30K grant
- 5-year portfolio growth planner
- Document vault with broker checklist + file upload
- Offset/debt reduction strategy tracker on dashboard

## Planned Phases (from README)
- **Phase 1:** Property listing, value tracking, equity calculator, rental income, dashboard ✅
- **Phase 2:** Yield calculator, capital growth, mortgage breakdown, expenses, cash flow ✅
- **Phase 3:** Portfolio goals, borrowing capacity, suburb research, document storage, AI insights (partially done)

## Git Workflow
- Main branch: `main`
- Feature branches: `claude/<description>` (e.g. `claude/new-session-1Sz2q`)
- **IMPORTANT:** All development happens on `claude/` branches. The user manually merges into `main` after testing. Never merge to `main` or push to `main` directly.
- Vercel deploys from `main`. Changes only go live after the user merges the Claude branch.
- Always commit with clear messages
- Push to the Claude feature branch only

## Known Issues / Errors
- Initial Vercel deploy showed 404 because repo had no app code (fixed)
- Vercel didn't auto-detect Next.js framework — fixed with `vercel.json`
- Check `docs/` folder for detailed error logs and resolution notes

## Style Guide
- Dark theme: background `#0a0a0a`, cards `#141414`, borders `#262626`
- Accent blue: `#3b82f6`
- Positive/green: `#22c55e`, Negative/red: `#ef4444`
- Muted text: `#737373`
