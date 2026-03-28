# CLAUDE.md - Project Intelligence for Claude

## Project Overview
Propfolio is a personal property portfolio tracker for Australian property investors. Built with Next.js, Tailwind CSS, and planned Supabase integration. Hosted on Vercel.

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/postcss`
- **Database:** Supabase (planned - not yet connected)
- **Hosting:** Vercel
- **Charts:** Recharts (planned - not yet added)

## Project Structure
```
propfolio/
├── src/app/           # Next.js App Router pages
│   ├── layout.tsx     # Root layout with nav bar
│   ├── page.tsx       # Dashboard homepage
│   └── globals.css    # Global styles + CSS variables
├── docs/              # Documentation, errors, problem-solving notes
├── CLAUDE.md          # This file - project context for Claude
├── HANDOFF.md         # Session handoff notes
├── next.config.ts     # Next.js configuration
├── postcss.config.mjs # PostCSS config (Tailwind)
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
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

## Current State
- Phase 1 dashboard is scaffolded with sample/demo data (3 WA properties)
- No database connected yet - data is hardcoded in `page.tsx`
- No authentication yet

## Planned Phases (from README)
- **Phase 1:** Property listing, value tracking, equity calculator, rental income, dashboard
- **Phase 2:** Yield calculator, capital growth, mortgage breakdown, expenses, cash flow
- **Phase 3:** Portfolio goals, borrowing capacity, suburb research, document storage, AI insights

## Git Workflow
- Main branch: `main`
- Feature branches: `claude/<description>`
- Always commit with clear messages
- Push to feature branch, then merge to main

## Known Issues / Errors
- Initial Vercel deploy showed 404 because repo had no app code (fixed)
- Check `docs/` folder for detailed error logs and resolution notes

## Style Guide
- Dark theme: background `#0a0a0a`, cards `#141414`, borders `#262626`
- Accent blue: `#3b82f6`
- Positive/green: `#22c55e`, Negative/red: `#ef4444`
- Muted text: `#737373`
