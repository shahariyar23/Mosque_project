# Noor Community Mosque Project

Next.js 16 frontend with React 19, TypeScript, Tailwind CSS, and an
Express/MongoDB backend scaffold.

## Repository layout

- `web/` — the implemented Next.js application
- `web/src/app/` — App Router pages and route segments
- `web/src/components/` — shared client and presentation components
- `web/public/` — static frontend assets
- `server/` — planned backend structure with controllers, routes, models,
  middleware, config, and uploads; most files are currently placeholders

## Role

Act as a senior full-stack JavaScript/TypeScript developer. Follow the
existing Next.js App Router and component patterns for frontend work. Do not
introduce NestJS, Prisma, or unrelated frameworks into this repository.

## Frontend standards

- Keep pages in `web/src/app/<route>/page.tsx`.
- Put reusable UI in `web/src/components/`.
- Use `next/link` for internal navigation instead of raw anchors to routes.
- Use absolute route paths such as `/about`, `/events`, and `/donations` for
  page navigation; use hash links only for sections on the current page.
- Preserve the existing visual language: deep green, warm gold, off-white,
  responsive layouts, and the shared `SiteHeader`/`InnerPage` patterns.
- Keep client-only behavior in components marked with `"use client"`.
- Prefer existing translations from `language-provider.tsx` when changing
  visible navigation or shared copy.
- Keep TypeScript types clear and avoid unnecessary dependencies.

## Backend standards

- The backend is not yet implemented. Do not assume server endpoints exist.
- When implementing it, use the existing `server/` organization: routes,
  controllers, models, middleware, config, and utils.
- Use dependency injection or small factory functions rather than creating
  database clients repeatedly inside request handlers.
- Keep secrets in environment variables and never commit `.env` values.
- Add a server `package.json`, startup script, validation, and error handling
  as part of the first real backend implementation.

## Validation

Run frontend commands from `web/`:

- `npm run lint`
- `npm run build`
- `npm run dev`

The repository root does not currently contain a `package.json`.

## Skills

Do not load any skill by default. Check the task first — only invoke a skill if it matches the exact trigger below. Never invoke a skill just because it exists.

- `/architect` — before making a load-bearing design decision
- `/develop` — to implement a feature from an approved design
- `/check` — when a feature is complete and needs production verification
- `/recover` — when a failure is not obvious
- `/remember` — at the start and end of a session when available

## Session continuity

When the remember workflow is available, restore context at session start and
save progress before closing.
