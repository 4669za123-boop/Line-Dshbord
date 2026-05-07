# LINE Management Dashboard

A Thai-language LINE account management dashboard for tracking LINE accounts across multiple websites, with notification schedule settings.

## Run & Operate

- `pnpm --filter @workspace/line-dashboard run dev` — run the frontend (Vite, reads PORT env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (Express, reads PORT env)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `DATABASE_URL` — Postgres connection string (for api-server)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- API: Express 5 + Pino logging
- Fonts: Plus Jakarta Sans, Noto Sans Thai, JetBrains Mono (Google Fonts)
- Dark mode by default (`.dark` class on root)

## Where things live

- `artifacts/line-dashboard/` — React + Vite frontend app (preview path: `/`)
- `artifacts/api-server/` — Express API server (preview path: `/api`)
- `artifacts/line-dashboard/src/components/dashboard/` — main dashboard components
- `artifacts/line-dashboard/src/components/ui/` — shadcn/ui components
- `artifacts/api-server/src/routes/lines.ts` — LINE management API routes
- `artifacts/api-server/data/lines.json` — persisted LINE data

## Architecture decisions

- App is dark-mode-only (Thai gambling/management tool context)
- **Websites** are server-persisted: `GET/POST/DELETE /api/websites` → `data/websites.json`
- **LINE accounts** remain localStorage-based (`line-mgmt-accounts` key)
- API `/api/add-line` writes to `data/lines.json` on the server
- Website name in LineCard is a clickable link (opens the website URL in a new tab)
- `"use client"` Next.js directives removed during migration (Vite is always client-rendered)
- Bot automation (`bot.py`, `selenium.js`, `worker.js`) is in `.migration-backup/` — out of scope for migration

## Product

- Dashboard: view LINE accounts grouped by website with online/suspended status
- Add LINE: add LINE ID or URL linked to a website (main or deposit role)
- Notification Settings: configure Bangkok-timezone notification times (stored in localStorage)
- Website management: add/remove websites from the dashboard

## User preferences

- Thai language interface
- Dark mode only

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use workflow restart or filter
- `postcss.config.mjs` conflicts with Tailwind v4 — do not add it
- Fonts are loaded from Google Fonts in `index.html`, referenced via CSS vars `--font-sans-latin`, `--font-sans-thai`, `--font-mono-var`

## Pointers

- See the `pnpm-workspace` skill for workspace structure
- See the `react-vite` skill for frontend build patterns
