# CLAUDE.md - Project Intelligence for Claude

## Project Overview
Propfolio is a multi-user property portfolio tracker for Australian property investors. Built with Next.js, Tailwind CSS, MongoDB, and NextAuth. Hosted on Vercel. Focused on new builds in the Northern Territory using equity release and the NT BuildBonus $30,000 grant.

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/postcss`
- **Database:** MongoDB (connection string in environment variables)
- **Auth:** NextAuth v5 (beta) with Google OAuth + email/password, MongoDB adapter
- **Hosting:** Vercel
- **File Storage:** Vercel Blob Storage (document uploads)
- **AI/OCR:** Anthropic Claude API (payslip OCR only — setup wizard)
- **Property Data:** Domain.com.au API (address autocomplete, property details, price estimates, suburb stats)
- **Property Search:** RapidAPI (realestate.com.au listings)
- **Charts:** Recharts (planned - not yet added)

## Project Structure
```
propfolio/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with SessionProvider + AuthGuard
│   │   ├── page.tsx                # Dashboard homepage
│   │   ├── globals.css             # Global styles + CSS variables
│   │   ├── login/page.tsx          # Login page (Google + email/password)
│   │   ├── properties/page.tsx     # Editable property details
│   │   ├── finances/page.tsx       # Income + expense entry forms
│   │   ├── borrowing/page.tsx      # Borrowing calculator (new build focus)
│   │   ├── strategy/page.tsx       # 5-year portfolio growth planner
│   │   ├── discover/page.tsx       # Property search + Tinder-style swipe
│   │   ├── assets/page.tsx         # Assets tracker
│   │   ├── roadmap/page.tsx        # Investment roadmap
│   │   ├── documents/page.tsx      # Document vault / broker checklist + OCR
│   │   ├── tax-guide/page.tsx      # Australian property tax reference
│   │   └── setup/page.tsx          # First-time setup wizard
│   ├── app/api/
│   │   ├── auth/[...nextauth]/     # NextAuth API route
│   │   ├── properties/             # CRUD - user-scoped
│   │   ├── loans/                  # CRUD - user-scoped
│   │   ├── incomes/                # CRUD - user-scoped
│   │   ├── expenses/               # CRUD - user-scoped
│   │   ├── assets/                 # CRUD - user-scoped
│   │   ├── documents/              # CRUD - user-scoped
│   │   ├── files/                  # File upload/download (Vercel Blob)
│   │   ├── watchlist/              # Discover watchlist - user-scoped
│   │   ├── discover/               # Discover properties - user-scoped
│   │   ├── borrowing-settings/     # Persisted borrowing calc inputs
│   │   ├── strategy-settings/      # Persisted strategy plan inputs
│   │   ├── rapidapi-search/        # RapidAPI property search proxy
│   │   ├── domain-search/          # Domain API listing search proxy
│   │   ├── domain-suggest/         # Domain API address autocomplete
│   │   ├── domain-property/        # Domain API property details + price
│   │   ├── ocr-payslip/            # Claude Vision OCR for payslips
│   │   ├── seed/                   # Seed demo data for new users
│   │   ├── migrate/                # One-time data migration (claim existing data)
│   │   ├── broker-pack/            # Broker pack file listing
│   │   └── broker-pack-download/   # Broker pack ZIP download
│   ├── components/
│   │   ├── NavBar.tsx              # Responsive nav with auth (sign out)
│   │   ├── AuthGuard.tsx           # Client-side auth redirect
│   │   └── setup/                  # Setup wizard step components
│   └── lib/
│       ├── data.ts                 # Financial data types, defaults, helpers
│       ├── useData.ts              # React hooks for all DB collections
│       ├── domainApi.ts            # Domain.com.au API shared OAuth + helpers
│       ├── auth.ts                 # NextAuth configuration
│       ├── apiAuth.ts              # getAuthDb() helper for API routes
│       ├── getUser.ts              # getUserId() helper
│       └── mongodb.ts              # MongoDB connection + adapter export
├── .npmrc                          # legacy-peer-deps=true (for Vercel)
├── public/images/                  # Property photos
├── docs/                           # Documentation, errors, problem-solving notes
├── CLAUDE.md                       # This file - project context for Claude
├── HANDOFF.md                      # Session handoff notes
├── vercel.json                     # Vercel framework config
├── next.config.ts                  # Next.js configuration
├── postcss.config.mjs              # PostCSS config (Tailwind)
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies and scripts
```

## Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Authentication System
- **NextAuth v5** with JWT sessions
- **Providers:** Google OAuth + Email/Password (auto-register)
- **AuthGuard component** wraps entire app, redirects to `/login` if unauthenticated
- **Every API route** uses `getAuthDb()` which returns `{ db, userId }` or 401
- **All MongoDB documents** include `userId` field for data isolation
- **No middleware.ts** — deprecated in Next.js 16, using client-side AuthGuard instead
- **Session strategy:** JWT (not database sessions) to work with Credentials provider

### Environment Variables (Vercel)
- `MONGODB_URI` — MongoDB connection string
- `AUTH_SECRET` — NextAuth secret (openssl rand -base64 32)
- `AUTH_TRUST_HOST` — `true`
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `ANTHROPIC_API_KEY` — For payslip OCR (setup wizard only)
- `RAPIDAPI_KEY` — For realestate.com.au property search
- `DOMAIN_CLIENT_ID` — Domain.com.au OAuth client ID
- `DOMAIN_CLIENT_SECRET` — Domain.com.au OAuth client secret
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Storage

### Google OAuth Setup
- Redirect URI: `https://propfolio.work/api/auth/callback/google`
- Must be added in Google Cloud Console under OAuth 2.0 Client

## Development Rules
- All prices are in AUD
- Australian property context (stamp duty, LVR, LMI, offset accounts, negative gearing)
- Dark theme UI with CSS custom properties defined in `globals.css`
- Use `@/*` import alias for `src/*` paths
- **New builds only** — the users are focused on building new properties to get the NT $30,000 BuildBonus grant
- **Stamp duty on land only** for new builds in the NT (not on the build cost)
- **Mobile-first design** — must work well on iPhone/iPad
- **Viewport:** uses Next.js Viewport export with userScalable=false
- **overflow-x-hidden** on body to prevent horizontal scroll

## Setup Wizard (/setup)
- **First-time user detection:** Dashboard checks for empty incomes + no `setupComplete` flag → redirects to `/setup`
- **Multi-person:** Any number of people (investors, partners, family)
- **Step 1:** Upload payslip PDF per person → OCR extracts name, employer, income automatically (no manual name entry)
- **Step 2:** Enter property addresses → Domain API autocomplete (when available) + manual entry fallback + manual property value
- **Step 3:** Enter loan balance, interest rate, offset balance, bank savings per property
- **Step 4:** Summary — shows combined borrowing power, equity, portfolio overview
- **On completion:** Saves all data to existing collections (incomes, properties, loans, assets) + sets `setupComplete` flag
- **OCR:** ONLY payslips. No OCR for bank statements, ID, or other documents. Users enter expenses manually.
- **NavBar hidden** during setup wizard for clean experience
- **Known issue:** Wizard creates new records instead of matching existing — can cause duplicates if run twice. Needs dedup logic or CRUD delete.

## Discover Page (Property Search + Swipe)
- **Search results are in-memory only** — never saved to DB until liked
- **Only liked properties save to watchlist** — pass just skips, no DB write
- **Auto-load more** — when 5 cards from the end, fetches next API page
- **Image preloading** — next 3 images preload in background
- **Touch handling** — detects horizontal vs vertical, only captures horizontal swipes
- **Like animation** — DB save deferred until after exit animation (prevents re-render glitch)
- **"Saved to watchlist" toast** — shows briefly after liking
- **Watchlist cards are tappable** — opens listing URL in new tab
- **RapidAPI only** — Domain API toggle removed, hardcoded to realestate.com.au

## Data Persistence
- **Borrowing page** — all inputs auto-save to `borrowing_settings` collection (800ms debounce)
- **Strategy page** — plan, growth rate, rent growth auto-save to `strategy_settings` collection
- **Documents page** — status/notes save to `documents` collection, files to Vercel Blob
- **Properties/Loans/Incomes/Expenses/Assets** — all persist per-user in MongoDB

## Owners (First Users)
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

## Investment Strategy (IMPORTANT — read this)
1. **Room rentals, not whole-house:** 4-bed ensuite houses, rent 3 rooms @ $350/wk = $1,050/wk
2. **Offset account strategy:** All income into offset accounts, cascade to next property when 100%
3. **Equity release for deposits:** ~$100K each from existing properties (80% LVR)
4. **Construction loans:** Interest-only on drawn amounts during 12-18 month build
5. **NT BuildBonus $30K:** Each new build in NT qualifies
6. **Stamp duty on land only:** For new builds in NT
7. **5-year plan:** Buy as many properties as possible, using equity from each to fund the next

## Git Workflow
- Main branch: `master`
- Feature branches: `claude/<description>`
- **IMPORTANT:** All development happens on `claude/` branches. The user manually merges into `master` after testing.
- Vercel deploys from `master` for production. Branch deployments also auto-deploy.
- The user tests on propfolio.work (their production URL) — they deploy branches there too.
- Always commit with clear messages
- Push to the Claude feature branch only

## Known Issues / Resolutions
| Date | Issue | Resolution |
|------|-------|------------|
| 2026-03-28 | Vercel 404 on deploy | Repo had no app code. Scaffolded full Next.js app. |
| 2026-03-28 | Vercel build failed: No Output Directory | Added `vercel.json` with `"framework": "nextjs"` |
| 2026-04-09 | Vercel npm install fails (peer deps) | Added `.npmrc` with `legacy-peer-deps=true` |
| 2026-04-09 | middleware.ts deprecated in Next.js 16 | Replaced with client-side AuthGuard component |
| 2026-04-09 | Google OAuth skipping to dashboard | Missing redirect URI in Google Cloud Console |
| 2026-04-09 | viewport meta not working | Use Next.js `Viewport` export, not `metadata.viewport` |
| 2026-04-09 | iPhone page wobble on swipe | Detect horizontal vs vertical touch, only capture horizontal |
| 2026-04-09 | Like button causes card glitch | Defer DB save until after exit animation completes |
| 2026-04-09 | Pinch-to-zoom on iPhone | Added `userScalable: false` to Viewport export |
| 2026-04-13 | Vercel Blob files stored as `access: "private"` | Fetching private blob URLs requires Bearer token (BLOB_READ_WRITE_TOKEN) |
| 2026-04-13 | Domain API access pending | Address Suggestions, Properties & Locations, Rental AVM all requested — waiting for Domain approval. Contact form submitted to api@domain.com.au. Manual entry works as fallback. |
| 2026-04-13 | Setup wizard creates duplicate records | Running wizard when data already exists creates duplicates. Need CRUD delete or dedup logic. |
| 2026-04-13 | Property value field disappeared while typing | Fixed — was using `!estimatedValue` as condition, now tracks API vs manual separately |
