# HANDOFF.md - Session Continuity Notes

> Use this file to pass context between Claude sessions. Update it at the end of each session or when significant progress is made.

---

## Last Updated
2026-03-28

## Last Session Summary
- Scaffolded Next.js 16 + Tailwind CSS 4 application
- Built full multi-page portfolio dashboard with REAL financial data
- Created 4 pages: Dashboard, Properties, Finances, Borrowing
- All values are editable in the UI — expenses save to localStorage
- Fixed Vercel deployment issues (404 + output directory error)
- Created `docs/`, `CLAUDE.md`, and `HANDOFF.md`

## Current Branch
`claude/new-session-1Sz2q`

## Owners
- **Stuart French** — 60 Bagshaw Cres, Gray NT 0830 (PPOR)
  - Employer: Svitzer Australia Pty Ltd (88 Deckhand, Darwin Towage)
  - Fortnightly net: $4,371.26 | Annual gross: ~$157k
  - Loan: $328,078.87 @ 5.59% P&I, Home Value Loan
  - Rental income: $1,400/wk (room rentals)
- **Sasitron Ransuk** — 72 Bagshaw Cres, Gray NT 0830 (Investment)
  - Employer: Compass Group (Attendant - Utility, McArthur River)
  - Fortnightly net: $2,650.09 | Annual gross: ~$88k
  - Loan: $377,636.82 @ 6.04% P&I, ING
  - Offset account: $236,004.33
  - Rental income: $1,000/wk (fully tenanted)

## What's Working
- **Dashboard** — portfolio overview with combined value ($1.268M), equity, debt, income, rent
- **Properties** — detailed editable cards for each property (values, loans, rent, features)
- **Finances** — income breakdown for both earners + full expense entry forms with localStorage persistence
- **Borrowing** — capacity calculator, scenario planner ("can we afford X?"), NT stamp duty, equity breakdown, LMI warnings
- Dark themed UI with navigation bar
- Vercel builds successfully

## What's Not Done Yet
- No database (Supabase) — property/loan/income data hardcoded in `src/lib/data.ts`, expenses in localStorage
- No authentication
- No charts (Recharts not yet installed)
- Expense data entered via forms doesn't persist to a database yet
- Property/income edits are session-only (reset on page refresh) — need Supabase for persistence
- No document upload (payslips, bank statements, contracts)
- Phase 2 & 3 features from README not fully started

## Immediate Next Steps
1. User to test and merge `claude/new-session-1Sz2q` into `main` (Vercel deploys from `main`)
2. Set up Supabase project and connect database for persistent data storage
3. Add authentication (Supabase Auth) to protect private financial data
4. Add charts/graphs (Recharts) for value trends, cash flow visualisation
5. Add document upload functionality

## Project Structure
```
src/
├── app/
│   ├── layout.tsx         # Root layout with NavBar
│   ├── page.tsx           # Dashboard overview
│   ├── globals.css        # CSS variables and Tailwind
│   ├── properties/page.tsx # Editable property details
│   ├── finances/page.tsx   # Income + expense forms
│   └── borrowing/page.tsx  # Borrowing calculator + scenarios
├── components/
│   └── NavBar.tsx         # Navigation bar (client component)
└── lib/
    └── data.ts            # All financial data, types, helpers
```

## Errors & Resolutions Log
| Date | Error | Resolution |
|------|-------|------------|
| 2026-03-28 | Vercel 404 NOT_FOUND on deploy | Repo only had README.md, no app code. Scaffolded full Next.js app. |
| 2026-03-28 | Vercel build failed: No Output Directory named "public" | Vercel didn't auto-detect Next.js framework. Added `vercel.json` with `"framework": "nextjs"`. |

## Git Workflow Reminder
- **All development happens on `claude/` branches.** Never merge to `main` or push to `main` directly.
- The user manually tests on the Claude branch and merges to `main` themselves.
- Vercel production deploys from `main` only. The Claude branch must be merged by the user before changes go live.

## Notes for Next Claude
- Read `CLAUDE.md` first for project context and rules
- Check `docs/` for any error logs or problem-solving notes
- Financial data is in `src/lib/data.ts` — this is the single source of truth until Supabase is connected
- Users are Stuart French & Sasitron Ransuk, based in Gray (Darwin), NT
- Both properties are on Bagshaw Crescent, Gray NT 0830
- They want to use this tool to plan their next property purchase — the borrowing page is key
- They prefer a frugal lifestyle — expense tracking matters to them
