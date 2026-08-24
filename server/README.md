# NOOR API

REST API for the NOOR mosque management system. NestJS · TypeScript · Prisma · PostgreSQL (Neon).

The Next.js dashboard in [`../web`](../web) is the client. Its `src/services/query.ts`,
`src/lib/permissions.ts` and `src/lib/**/types.ts` describe the contract this API implements, and the
API is the authority for every rule they mirror — the frontend decides what to *show*, never what is
*allowed*.

---

## Getting started

```bash
cd server
npm install
cp .env.example .env        # then fill in real values
npm run prisma:generate
npm run prisma:migrate      # creates the schema on your database
npm run db:seed             # optional: one mosque, one account per role
npm run start:dev
```

- API — `http://localhost:4000/api/v1`
- Docs — `http://localhost:4000/api/docs`
- Health — `http://localhost:4000/health` and `/health/ready`

### Generating the JWT secrets

The two secrets must be different, and long:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Secrets

`.env` is git-ignored. `.env.example` is committed and contains placeholders only — never paste a
real password, token or key into it.

The environment is validated at boot (`src/config/env.validation.ts`), so a missing or malformed
variable stops the process with a readable list of problems instead of failing later on the request
that happens to need it. The logger redacts credentials by configuration
(`src/config/logger.config.ts`) rather than by call-site discipline: passwords, tokens, cookies and
connection strings cannot reach the logs even if something logs a whole request object.

---

## Layout

```
prisma/
  schema.prisma          domain model; money is Decimal, never Float
  seed.ts                development data, refuses to run against production
src/
  main.ts                bootstrap: helmet, CORS, validation, versioning, Swagger
  app.module.ts          composition root
  config/                env validation, typed accessors, logger options
  prisma/                PrismaModule + PrismaService (one shared client)
  common/
    constants/           the permission registry and role→permission map
    decorators/          @Public, @Roles, @Permissions, @CurrentUser
    dto/                 ListQueryDto — the shared list contract
    filters/             the single global exception filter
    guards/              the authorisation guards (JWT strategy lands in Phase 3)
    pagination/          Page<Row> and the Prisma skip/take helpers
    validators/          @IsPermission — validates a value against the registry
  auth/                  the JWT strategy the guards read a caller from
  roles/                 read-only: the roles and what each one resolves to
  permissions/           read-only: the registry, described
  health/                liveness and readiness probes
```

One deployable, with each domain owning its controllers, services and DTOs — a modular monolith, not
microservices.

---

## Conventions

**Routing.** Everything lives under `/api/v1/...`. The health probes deliberately sit outside the
version segment so a load balancer has a stable URL.

**Lists.** Every list endpoint accepts `page`, `pageSize`, `sortBy`, `sortDir`, `search`, `from`,
`to` and returns

```json
{ "rows": [], "total": 0, "page": 1, "pageSize": 10, "pageCount": 1 }
```

`page` is 1-based and `total` counts rows matching the filter *before* paging. This is
`Page<Row>` from the frontend, field for field, so a service there can forward its query object as a
query string with no translation. `sortBy` is validated per resource against an allow-list — an
arbitrary column name is rejected rather than sorted by.

**Errors.** One global filter produces every error response:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Some of the details provided are not valid.",
  "errors": { "email": ["email must be an email"] },
  "path": "/api/v1/auth/register",
  "timestamp": "2026-08-23T10:00:00.000Z",
  "requestId": "…"
}
```

`code` is stable and machine-readable; `message` is plain language and safe to show a person. Stack
traces never leave the process, and Prisma's own messages are rewritten so table and column names
are not disclosed.

**Validation.** The global pipe runs with `whitelist` and `forbidNonWhitelisted`, so a field no DTO
declares is a rejected request rather than a silently ignored one. That is what stops a caller from
setting `role` or `amount` on an endpoint that never offered them.

**Authorisation.** `src/common/constants/permissions.ts` is the registry; `roles.ts` resolves
`base + role + permissions − deniedPermissions`, with deny winning and an inactive account resolving
to nothing at all. There are seven roles and no `president` — the President is a *position*, and
positions grant nothing; the approver is whoever holds `workflow.approve`. Access is never decided
by comparing a role name.

A route declares what it needs with `@Permissions('finance.manage')`, or `@Roles(...)` where the rule
really is about the office rather than a capability; `PermissionsGuard` and `RolesGuard` are global
and pass through any handler that declares neither. There is no super-admin shortcut in either guard:
the registry grants `super_admin` every permission, so the resolver already admits them — and, unlike
a name comparison, it still refuses a *suspended* one. Roles and permissions have no tables and are
never queried; assigning one to a user is a write on the user row, and a caller may only hand out
authority they hold themselves. `JwtAuthGuard` and the strategy behind it are in place but not yet
registered globally, which is Phase 3's first step — until then, an endpoint that asks for a
permission answers `401`.

**Money.** `Decimal` in the database and `Prisma.Decimal` in code, never `Float` — binary floating
point cannot represent `0.10`. Anything touching more than one financial row runs inside
`prisma.$transaction`. A completed financial record is voided or reversed, never edited or deleted.

---

## Scripts

| | |
|---|---|
| `npm run start:dev` | watch mode |
| `npm run build` / `start:prod` | compile / run compiled output |
| `npm test` / `test:cov` | unit tests / coverage |
| `npm run test:e2e` | end-to-end tests |
| `npm run lint` | ESLint with `--fix` |
| `npm run prisma:migrate` | create and apply a migration (development) |
| `npm run prisma:deploy` | apply existing migrations (production) |
| `npm run prisma:studio` | browse the database |
| `npm run db:seed` | seed development data |
