# ScopeLogic Software

Commercial ScopeLogic software platform. This repository is intentionally separate from the existing internal/consulting ScopeLogic application. **Do not connect it to the production database, storage, authentication, or deployment used by `app.scopelogic.net`.**

## Batch 1

This batch establishes the Alpha monorepo foundation and a static UI shell only:

- pnpm/Turborepo workspace
- Next.js + React + TypeScript web app
- approved ScopeLogic software colors
- shared domain, permissions, UI, and Rules Engine packages
- application shell and module navigation
- starter CI workflow

No Supabase project or live database is connected yet.

## Approved brand colors

- Primary Green `#4B6623`
- Dark Green `#3D5320`
- Charcoal `#1F2937`
- App Background `#F9FAFB`

The shell uses a temporary lettermark until the canonical 4C SVG is finalized. Do not create alternate green logo versions.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Upload to GitHub

If you downloaded this batch as a ZIP, **extract it first**. GitHub's normal file upload does not expand ZIP archives. Upload the contents of the extracted `ScopeLogic-Software-Batch-1` folder to the root of the empty `ScopeLogic-Software` repository.

## Next batch

Batch 2 will add the isolated Supabase Alpha foundation: organizations, memberships, roles/overrides, module entitlements, customers, projects, quotes, quote versions, RLS, and auth scaffolding.
