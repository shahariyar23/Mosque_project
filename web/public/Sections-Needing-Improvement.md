# Sections Needing Improvement

Based on the *Executive Summary* report (About/Community pages). Every item below is currently **hard-coded** and has little or no backend data integration.

## Frontend Sections to Convert to Backend-Driven

1. **Hero / Introduction** — Title and description are static strings. Needs `Mosque.story` / tagline in DB + public DTO.
2. **Our Story & Purpose** — Hard-coded paragraph. Needs a dedicated `Mosque.story` field and public API.
3. **History & Milestones** — Static timeline entries (1987, 2004, 2016, 2024). Needs a new `MosqueMilestone` model + admin CRUD + public endpoint.
4. **Mission & Vision** — Hard-coded text blocks. Needs `Mosque.mission` and `Mosque.vision` fields.
5. **What We Believe (Values / Pillars)** — Three hard-coded pillars. Needs `Mosque.values` JSON or a `MosqueValue` model.
6. **Architecture & Amenities** — Static subsections. Should reuse the existing **Facility** model (verify descriptive fields exist).
7. **Community Impact (Stats)** — Hard-coded numbers (39+ years, 5/7 prayers, 25+ programs, 1000+ families). Should be computed in the `PublicMosqueDto`. Numbers are also inconsistent with the homepage ("20+ years" vs "39+ years").
8. **Islamic Education** — Static program list. Reuse the **Classes** module or add an education-programs source + public endpoint.
9. **Community Welfare (Services)** — Static services and donate links. Reuse the existing **Service** model (public/published only).
10. **Life at Noor (Gallery)** — Hard-coded image list. Needs a **Gallery / GalleryItem** model with Cloudinary URLs + public endpoint.
11. **Get Involved (CTA)** — Static buttons. Generally fine; just verify all links are functional.
12. **Visit & Connect (Contact Info)** — Hard-coded address/phone/email. Should come from `Mosque.address/phone/email` via public DTO.

## Backend Pieces Missing

- **Prisma schema:** add `story`, `mission`, `vision` (and optional `values` JSON / `MosqueValue` model) to `Mosque`; add `MosqueMilestone` and `GalleryItem` models; ensure `address/phone/email` exist; optional `establishedYear`.
- **Public API endpoints:** mosque profile, facilities, services, classes, stats, milestones, gallery, (optional) leadership — all slug-scoped and unauthenticated.
- **Admin API endpoints:** `PATCH /mosque` (profile fields), CRUD for milestones, CRUD for gallery (with upload); reuse existing Facility/Service/Class CRUD.

## Media / Cloudinary

- No evidence of Cloudinary or file upload currently in use; all images are statically bundled.
- Add a Cloudinary-backed upload service; store only URL + public ID in PostgreSQL.
- Use per-mosque folder paths (e.g. `mosques/{mosqueId}/gallery/`); never expose API secrets.

## Security & Multi-Tenancy

- Public APIs must resolve the mosque by **slug** and filter all data by that mosque's ID.
- Admin APIs must derive `mosqueId` from the authenticated user (`@CurrentUser()`), never from the frontend.
- Public DTOs must exclude admin emails, internal notes, and any member information.

## Quality, Testing & QA

- Backend typecheck/lint/build; Prisma migrations.
- Unit tests for each new endpoint (auth success/failure).
- Integration tests: cross-tenant leak checks (wrong slug), unauthorized access blocked, non-image uploads rejected.
- Frontend data-fetching checks (no hard-coded text remains).
- Responsive/mobile layout and accessibility (contrast, semantics, focus states, alt text).

## Quick Wins / Immediate Cleanup

- Hide or grey out placeholder stats (e.g. "0 Years", "0 Members").
- Fix inconsistent stat numbers (homepage "20+ years" vs About "39+ years") or remove until backend-driven.
- Merge duplicated language selectors (top bar + footer).
- Ensure all CTA links route correctly (donate/support links).

## Unknowns to Investigate

- Whether an existing Media Gallery module/model exists (reuse vs. create new).
- Whether the Classes module already has public APIs.
- Whether volunteer data should appear on About.
- How `mosque.slug` is defined and whether `CurrentUser.mosqueId` is correctly set (previous audit noted a hardcoded demo user).
