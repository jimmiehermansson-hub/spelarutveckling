# Project: Spelarutveckling

A Player Development Tool for coaches (general coaching tool, not sport-specific).
Built to help coaches track, measure and visualize player development over time.

## Links
- GitHub: https://github.com/jimmiehermansson-hub/spelarutveckling
- Live app: https://jh-vikingstadp1617.replit.app
- Hosted on Replit (Autoscale)

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- PostgreSQL + Prisma ORM
- Zod (validation)
- Recharts (charts)
- iron-session + Passport + openid-client (auth)
- Runs on port 3000

## Folder Structure
src/app/          # All pages (Next.js App Router)
prisma/           # schema.prisma (database model)
data/             # Data files
public/           # Static assets
scripts/          # Utility scripts

## Pages
- / (Dashboard)          — Player overview table: total status, trend, strengths, focus areas, last test date
- /players/[id]          — Individual player report: radar chart, line chart trend, exercise detail table vs team median, print/PDF export
- /exercises             — List and manage exercises
- /exercises/new         — Create new exercise
- /exercises/[id]/edit   — Edit exercise
- /measurements/new      — Register single measurement
- /measurements/bulk     — Bulk data entry
- /unauthorized          — Shown to users not on the allowed email list

## Data Model
- Team        — has many Players
- Player      — name, birthYear, primaryPosition, isActive, imageUrl, teamId
- Exercise    — name, category, unit, direction (HIGHER_BETTER/LOWER_BETTER), bestValue, worstValue, roundingStep, isActive, isCore
- Measurement — links Player + Exercise by date with a float value
- User        — email-based auth (only registered emails can access)

## Key Concepts
- Scores normalized to 0–100 based on bestValue/worstValue per exercise
- "Core" exercises (isCore=true) appear in the radar chart (6 core exercises)
- Team median shown alongside individual player scores
- Trend calculated as delta between first and last score in selected period
- Strengths = highest scoring exercises, Focus = lowest scoring exercises
- Dashboard supports date range filtering (default: last 60 days)

## Status
- Awaiting feedback from real coaches before next development phase
