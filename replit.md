# Spelarutvecklingsverktyg

A Player Development Tool built with Next.js, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Runtime**: Node.js 20

## Project Structure

```
src/
  app/           # Next.js App Router pages and layouts
public/          # Static assets
```

## Development

The app runs on port 5000 (`npm run dev`) and is configured for the Replit proxy environment via `next.config.ts` (`allowedDevOrigins: ["*"]`).

## Deployment

Configured for Replit autoscale deployment:
- **Build**: `npm run build`
- **Run**: `npm run start`
