# Spelarutvecklingsverktyg

A Player Development Tool built with Next.js, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Runtime**: Node.js 20
- **Database**: PostgreSQL (Replit Built-in)
- **ORM**: Prisma
- **Validation**: Zod

## Project Structure

```
src/
  app/           # Next.js App Router pages and layouts
prisma/
  schema.prisma  # Database schema
```

## Development

The app runs on port 5000 (`npm run dev`) and is configured for the Replit proxy environment via `next.config.ts` (`allowedDevOrigins: ["*"]`).

### Database & Prisma

- **Environment**: DATABASE_URL is managed via Replit environment variables and mirrored in `.env`.
- **Generate Client**: `npx prisma generate`
- **Migrations**: `npx prisma migrate dev`

## Deployment

Configured for Replit autoscale deployment:
- **Build**: `npm run build`
- **Run**: `npm run start`
