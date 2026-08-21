# 0001b. Backend authorization in Express

## Summary

This is where security actually happens. Every request carries a session cookie, the API loads the person behind it on every request, and a route only runs after `authorize("something")` says yes. A missing guard stops the server from starting rather than quietly letting a route through. Error responses say what went wrong in fixed codes and never leak a stack trace, a database error, or a connection string.

## Requirements

**User stories**

- As a treasurer, I want the API to refuse a request for a screen I am not allowed to see, even if someone hands me the URL directly.
- As a mosque admin, I want deactivating a person to take effect immediately, not whenever their token happens to expire.
- As a developer, I want a forgotten permission check to break the build, not to ship.
- As a member, I want to sign in with either my email address or my phone number, exactly as the existing sign in screen offers.

**Acceptance criteria**

- **AC-1**: A request to any route outside the public allowlist without a valid session receives `401` with code `AUTH_REQUIRED`, and the controller never runs.
- **AC-2**: A signed in person lacking the route's permission receives `403` with code `PERMISSION_DENIED`, and the controller never runs.
- **AC-3**: The server refuses to start if any registered route outside the public allowlist has no `authorize` marker, naming the offending method and path.
- **AC-4**: A person deactivated after signing in receives `401` with code `ACCOUNT_DISABLED` on their very next request, with no action needed on the cookie.
- **AC-5**: A role or permission change applies on the person's next request, without signing out and in again.
- **AC-6**: Incrementing `sessionVersion` makes every existing cookie for that person return `401` with code `SESSION_REVOKED`.
- **AC-7**: Login accepts an email address or a phone number in one `identifier` field. A wrong password and an unknown identifier return the identical `401` body with code `INVALID_CREDENTIALS`.
- **AC-8**: After the configured number of consecutive failures the account returns `423` with code `ACCOUNT_LOCKED` until the lock expires, and a successful sign in resets the counter.
- **AC-9**: No response body in any environment contains a stack trace, a mongoose or MongoDB error message, a file path, or the database connection string. Every unhandled error returns the same `500` body with code `INTERNAL_ERROR`.
- **AC-10**: Every authenticated read and write is scoped to the actor's `mosqueId`. Asking for a record belonging to another mosque returns `404`, not `403`, so the response does not confirm that the record exists.
- **AC-11**: `GET /api/auth/me` returns the person, their positions, and their full effective permission list.
- **AC-12**: `POST /api/auth/logout` clears the cookie, and the cleared cookie cannot be replayed.
- **AC-13**: The session cookie is `httpOnly`, `SameSite=Lax`, and `Secure` outside development. A state changing request arriving with an `Origin` that is not the configured one is refused with `403`.
- **AC-14**: No one can raise a person to a role at or above their own, and no one can grant a permission they do not hold. Either attempt returns `403` with code `ESCALATION_REFUSED`.
- **AC-15**: No one can change their own role, permissions, or active status. The attempt returns `403` with code `SELF_EDIT_REFUSED`.

## Design

### The chain

Every guarded route runs the same four steps in the same order:

```js
router.put(
  "/",
  authenticate,                    // who are you, are you still allowed to be here
  authorize("prayer.manage"),      // may you do this specific thing
  validate(updatePrayerTimesSchema), // is the body shaped correctly
  updatePrayerTimes,               // do it
);
```

- **`authenticate`** reads the session cookie, verifies the signature, loads the person by id, and refuses with the right `401` code when the person is missing, inactive, or carrying a stale `sessionVersion`. It attaches `req.user` and `req.mosqueId`.
- **`authorize(permission)`** calls `can(req.user, permission)` and refuses with `403` otherwise. It is the only consumer of the permission module in the request path.
- **`validate(schema)`** fills the currently empty `middleware/validateMiddleware.js` with a small `zod` adapter, returning `422` with a field keyed error map.
- **`errorMiddleware`** maps a thrown `AppError` to its status and code, logs the real cause on the server, and returns only the contract shape.

`super_admin` is the one exception to mosque scoping: it may pass `?mosqueId=` to act on another mosque, and `authenticate` honours that only for that role.

### Startup guard

`authorize` tags the handler function it returns with a marker property. After all routers are mounted, `server.js` walks the Express router stack and throws on any route that has neither the marker nor an entry in `server/auth/publicRoutes.js`. This is why a forgotten check cannot ship: the process does not boot.

### Session transport

A JSON web token carrying only `{ sub: userId, sv: sessionVersion }`, delivered in an `httpOnly` cookie named by `COOKIE_NAME`, `SameSite=Lax`, `Secure` when `NODE_ENV` is not development, `Path=/`, expiring per `JWT_EXPIRES_IN` (7 days). No refresh token and no rotation in this version: when it expires you sign in again.

Cross site request forgery defence is two layers, both cheap: `SameSite=Lax` keeps the cookie off cross site form posts, and every state changing method additionally requires an `Origin` header matching `CORS_ORIGIN`. CORS runs with `credentials: true` and a single configured origin, never a wildcard.

### API surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/auth/register` | POST | `name`, `email?`, `phone?`, `password` | `201` person, sets cookie | public | 409 duplicate, 422, 429 |
| `/api/auth/login` | POST | `identifier`, `password`, `remember` | `200` person plus permissions, sets cookie | public | 401, 423, 429 |
| `/api/auth/logout` | POST | none | `204`, clears cookie | session | 401 |
| `/api/auth/me` | GET | none | `200` person, positions, permissions | session | 401 |
| `/api/permissions` | GET | none | `200` registry grouped by module | `permission.assign` | 401, 403 |
| `/api/users` | GET | `q`, `role`, `page`, `limit` | `200` paginated list plus total | `user.view` | 401, 403 |
| `/api/users/:id` | GET | `id` | `200` person | `user.view` | 401, 403, 404 |
| `/api/users/:id/role` | PATCH | `role` | `200` person | `role.assign` | 401, 403, 404, 422 |
| `/api/users/:id/permissions` | PATCH | `permissions[]`, `deniedPermissions[]` | `200` person | `permission.assign` | 401, 403, 404, 422 |
| `/api/users/:id/positions` | PATCH | `positions[]` | `200` person | `position.assign` | 401, 403, 404, 422 |
| `/api/users/:id/status` | PATCH | `isActive` | `200` person | `user.manage` | 401, 403, 404 |
| `/api/audit-logs` | GET | `targetType`, `targetId`, `page` | `200` paginated list | `audit.view` | 401, 403 |
| `/api/prayer-times` | GET | `date?` | `200` times | public | 422 |
| `/api/prayer-times` | PUT | the five prayers, Jumuah, iqamah offsets | `200` times | `prayer.manage` | 401, 403, 422 |

### Error contract

Every failure returns `{ "error": { "code": "...", "message": "..." } }`, plus `fields` on a `422`. The message is written for a person to read and never carries internal detail.

| Status | Codes |
|---|---|
| 401 | `AUTH_REQUIRED`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `ACCOUNT_DISABLED`, `INVALID_CREDENTIALS` |
| 403 | `PERMISSION_DENIED`, `ESCALATION_REFUSED`, `SELF_EDIT_REFUSED`, `SELF_APPROVAL_REFUSED`, `ORIGIN_REFUSED` |
| 404 | `NOT_FOUND` |
| 409 | `DUPLICATE_EMAIL`, `DUPLICATE_PHONE` |
| 422 | `VALIDATION_FAILED` |
| 423 | `ACCOUNT_LOCKED` |
| 429 | `TOO_MANY_REQUESTS` |
| 500 | `INTERNAL_ERROR` |

`PERMISSION_DENIED` names the missing permission only when `NODE_ENV` is development. In production it says nothing beyond that access was refused.

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Login | Session token payload | `{ sub: user._id, sv: user.sessionVersion }`, signed with `JWT_SECRET` |
| Login | Which field the identifier is | Re detected on the server with the same rule the frontend uses: an `@` means email, otherwise digits and separators mean phone |
| Login | Normalised phone | The Bangladesh default conversion already implemented in `web/src/components/signin/signin-validation.ts`, ported to the server so both sides agree |
| Login failure | `lockedUntil` | Now plus `LOGIN_LOCK_MINUTES`, once `failedLoginCount` reaches `LOGIN_MAX_ATTEMPTS` |
| Any authenticated request | `req.user` | Loaded from Mongo by the token's `sub`, `passwordHash` excluded |
| Any authenticated request | `req.mosqueId` | `req.user.mosqueId`, or the `?mosqueId=` query value when the role is `super_admin` |
| `/auth/me` | Permission list | `effectivePermissions()` from the permission module, serialised as a sorted array |
| Any list endpoint | `total` for pagination | A `countDocuments` query with the same filter as the page query |
| Any error response | `code` and `message` | The thrown `AppError`, or the fixed `INTERNAL_ERROR` pair for anything unhandled |
| Audit entry | `ip` | `req.ip`, with `trust proxy` set from `TRUST_PROXY` |

### Key invariants

- Nothing reaches a controller without passing `authenticate` and `authorize`, except the routes in the public allowlist.
- The public allowlist lives in exactly one file and returns published records only.
- Every query includes `mosqueId`. A query without it is a bug, and the reviewable rule is that no controller builds a filter object that does not start from `req.mosqueId`.
- `passwordHash` is excluded by the schema and never re added to a projection.
- Login responses are identical for an unknown identifier and a wrong password.
- The token carries no role and no permissions, so a stale token cannot carry stale power.

### Security model

- Registration is public and always produces a `member` in the default mosque. The request body cannot influence `role`, `permissions` or `mosqueId`.
- Login and registration are rate limited per IP address, and login additionally locks the individual account after repeated failures, so limiting one does not leave the other open.
- Role assignment refuses anything at or above the actor's own level, and refuses granting a permission the actor lacks.
- Self edits of role, permissions, and active status are refused outright, which also stops the last admin from locking themselves out by accident.
- Access changes and deactivations write an `AuditLog` entry before the response returns.
- Logging records the actor id, the route, and the refused permission on every `403`, at warning level, with no personal data beyond the id.

### Configuration required

- `MONGO_URI`: database connection string. Never a default pointing at a real host.
- `JWT_SECRET`: token signing secret. The server refuses to start without it.
- `JWT_EXPIRES_IN`: session lifetime, default `7d`.
- `COOKIE_NAME`: session cookie name, default `noor_session`.
- `COOKIE_DOMAIN`: cookie domain, unset in development.
- `CORS_ORIGIN`: the single allowed frontend origin.
- `TRUST_PROXY`: whether to trust `X-Forwarded-For`, needed for correct rate limiting behind a proxy.
- `LOGIN_MAX_ATTEMPTS`: default 10.
- `LOGIN_LOCK_MINUTES`: default 15.
- `PORT`, `NODE_ENV`.
- Frontend: `NEXT_PUBLIC_API_URL`, the name already referenced in `web/src/services/authService.ts`.

`server/.env` stays out of version control, which `server/.gitignore` already handles. No secret and no URL is written inline in code.

### Critical test scenarios

- Happy path: sign in with an email address, receive the cookie, call `/api/auth/me`, receive the effective permission list, verifies **AC-7**, **AC-11**.
- Happy path variant: the same with a phone number, verifies **AC-7**.
- Permission refusal: a cashier calls `PUT /api/prayer-times` and receives `403 PERMISSION_DENIED` while the handler never runs, verifies **AC-2**.
- No session: the same call with no cookie returns `401 AUTH_REQUIRED`, verifies **AC-1**.
- Immediate deactivation: deactivate a signed in imam, then replay their request, expecting `401 ACCOUNT_DISABLED`, verifies **AC-4**.
- Live role change: promote a member to imam mid session, then call a `prayer.manage` route successfully with the same cookie, verifies **AC-5**.
- Revocation: bump `sessionVersion` and replay, expecting `401 SESSION_REVOKED`, verifies **AC-6**.
- Lockout: submit wrong passwords up to the limit, expect `423`, then confirm a correct password still fails until the lock expires, verifies **AC-8**.
- Startup guard: add a route without `authorize` and assert the server throws naming that route, verifies **AC-3**.
- Leak check: force a mongoose cast error and a thrown exception, and assert both responses match the fixed shapes with no internal text, verifies **AC-9**.
- Tenancy: request a user id belonging to another mosque and receive `404`, verifies **AC-10**.
- Escalation: a secretary with `permission.assign` tries to grant themselves `finance.manage`, expecting `403 ESCALATION_REFUSED`, verifies **AC-14**.
- Self edit: an admin tries to change their own role, expecting `403 SELF_EDIT_REFUSED`, verifies **AC-15**.
- Cookie shape: assert `httpOnly`, `SameSite=Lax`, and `Secure` under a production style environment, verifies **AC-13**.

## Build plan

Sliced as a thin thread. Slice one is the whole chain working for one route, so nothing further is built on an unproven foundation.

**Slice 1, the thread**

1. Fill `server/server.js`: Express, `cookie-parser`, `cors` with credentials and one origin, `trust proxy`, JSON body limit, route mounting, `errorMiddleware` last, satisfies **AC-13**.
2. Write `server/utils/AppError.js` and fill `middleware/errorMiddleware.js` against the error contract, with the fixed `500` body, satisfies **AC-9**.
3. Fill `server/utils/generateToken.js` with the thin payload and the cookie options, satisfies **AC-13**.
4. Fill `server/middleware/authMiddleware.js` with `authenticate` and `authorize`, including the marker property, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**.
5. Add the startup route guard and `server/auth/publicRoutes.js`, satisfies **AC-3**.
6. Fill `server/controllers/authController.js` and `routes/authRoutes.js` for register, login, logout and me, with the identical failure body and the phone normalisation ported from the frontend, satisfies **AC-7**, **AC-11**, **AC-12**.
7. Add `express-rate-limit` on the auth routes and the per account lockout fields, satisfies **AC-8**.
8. Fill `models/PrayerTime.js`, `controllers/prayerTimeController.js` and `routes/prayerTimeRoutes.js`, with the public read and the `prayer.manage` write, satisfies **AC-2**, **AC-10**.
9. Replace the simulated bodies in `web/src/services/authService.ts` with real `fetch` calls using `NEXT_PUBLIC_API_URL` and `credentials: "include"`, keeping the existing call signatures and thrown error shapes so no form component changes, satisfies **AC-7**.
10. Write the slice one tests: the happy path both ways, the permission refusal, the no session case, and the leak check, satisfies **AC-1**, **AC-2**, **AC-7**, **AC-9**.

**Slice 2, people and access**

11. Fill `middleware/validateMiddleware.js` as a `zod` adapter returning the `422` field map, satisfies **AC-9**.
12. Add the user read endpoints with mosque scoping and pagination, satisfies **AC-10**.
13. Add the role, permissions, positions and status endpoints with the escalation and self edit guards, satisfies **AC-14**, **AC-15**.
14. Add `GET /api/permissions` and `GET /api/audit-logs`, satisfies **AC-11**.
15. Write the escalation, self edit, tenancy, deactivation, revocation and lockout tests, satisfies **AC-4**, **AC-6**, **AC-8**, **AC-10**, **AC-14**, **AC-15**.

## Rationale, short

The startup guard is the load bearing choice here. A lint rule can be disabled with a comment and a review can be rushed, but a server that will not boot with an unguarded route cannot be talked round. The thin token was chosen so that deactivating a person and changing a role both take effect on the next request, which matters more than saving one indexed read in a system that holds financial permissions. The cookie is `httpOnly` because the dashboard layout is a server component and cannot read browser storage, so any other transport would force the whole dashboard to render on the client. Full reasoning is in [rationale.md](rationale.md).
