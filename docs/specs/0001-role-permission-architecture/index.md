# 0001. Permission based authorization with one dashboard shell

**Date**: 2026-08-22
**Status**: Proposed

## Summary

Every screen and every API route in this platform will decide access from a **permission string** (a short label like `finance.manage`), never from a job title. A person's `role` maps to a set of permissions in code, their `positions` (President, Treasurer, Imam and so on) are stored separately and carry no power at all, and the Express API checks the permission on every request. There is one admin dashboard at `/dashboard` whose sidebar is filtered by what you may do, plus a separate member area at `/account`. This means adding a new committee post later is a data change, not a code change, and no one has to build a second dashboard.

## Structure

This is an umbrella decision. The standard below is the contract every child spec obeys.

- [0001-identity-permission-model.md](0001-identity-permission-model.md): the `User`, `Mosque` and `AuditLog` shape, the full permission registry, the role to permission map, and how per person exceptions resolve. Supports the core decision.
- [0002-backend-authorization.md](0002-backend-authorization.md): the Express middleware chain, session transport, the auth and user endpoints, the error contract, and login rate limiting. Supports enforcement.
- [0003-dashboard-shell.md](0003-dashboard-shell.md): the `/dashboard` shell, permission filtered navigation, route protection in Next.js, the `Can` component, and Prayer Times as the first real module. Supports the single shell decision.
- [0004-member-account-area.md](0004-member-account-area.md): the `/account` area for people with no dashboard access. Supports the member and staff separation.
- [0005-approval-workflow.md](0005-approval-workflow.md): the shared draft to published state machine, and the separate donation verification path. Supports the review and approval decision.

## Requirements

This is a standard, so the testable acceptance criteria belong to the children that build against it. No criteria are invented at this level. What the standard itself requires is short:

- Access is decided by a permission string, in one place, on the server. A role comparison outside that one place is a violation, not a style choice.
- A route with no permission check cannot reach production.
- A person's committee post never affects what they may do.
- The frontend may hide, and may never be the thing that refuses.
- Every record carries `mosqueId`, from the first line of backend code.

Where the criteria live:

| Child spec | Covers | Criteria |
|---|---|---|
| [0001-identity-permission-model.md](0001-identity-permission-model.md) | the model, the registry, the role map | AC-1 to AC-14 |
| [0002-backend-authorization.md](0002-backend-authorization.md) | the Express chain, sessions, the error contract | AC-1 to AC-15 |
| [0003-dashboard-shell.md](0003-dashboard-shell.md) | the one shell, filtered navigation, route protection | AC-1 to AC-13 |
| [0004-member-account-area.md](0004-member-account-area.md) | the member area and the `Own` rule | AC-1 to AC-12 |
| [0005-approval-workflow.md](0005-approval-workflow.md) | the shared state machine and the money path | AC-1 to AC-14 |

## Decision

**Chosen option**: Option 1: permission strings resolved from a role map in code, with per person exceptions, enforced in Express.

Access is decided by permission strings only. `role` is one value per person and maps to a permission set defined in code. `positions` is a separate list that describes the person's place in the mosque organisation and grants nothing. The Express API is the only security boundary; the frontend filters navigation and hides controls purely so the interface stays honest.

Every open question from the brief was settled by recommendation, because the design questions went unanswered. Each pick below is a one line change if you disagree, and the runner up is recorded in [rationale.md](rationale.md).

| Open question | Decision taken | Runner up |
|---|---|---|
| How much multi mosque behaviour now | Every record carries `mosqueId` and every query filters on it, from the first line of backend code. No mosque switching screens, no cross mosque admin yet. | Full multi mosque management now |
| Where permissions come from | Role to permission map in code, plus `permissions` (extra grants) and `deniedPermissions` (revokes) on the person | Editable roles stored in the database |
| One role or many per person | Exactly one `role`. Mixed duties are expressed with extra grants. | An array of roles |
| One position or many | `positions` is an array. A Treasurer who also runs the education programme is one person with two positions. | A single `position` string, as the brief wrote it |
| Token contents | Thin token holding only the person id and a session version. The API loads the person on every request. | Fat token carrying role and permissions |
| Session transport | `httpOnly` cookie, `SameSite=Lax`, `Secure` outside development | `Authorization` header with a token held in memory |
| Auth implementation | Own it in Express with `jsonwebtoken`, `bcryptjs` and `express-rate-limit`. No refresh token rotation in this version. | A hosted identity provider |
| Build order | Thin thread end to end through one module first, not the shell first | The shell first order written in the brief |
| First buildable scope | The model, the enforcement, the shell, and two real modules to prove it | Authorization core only, no UI |
| Approval workflow | One shared state machine reused by content types, with money on its own two step path | A separate workflow per module |

## Standard definition

**Canonical pattern**

Express, every route, no exceptions outside the public allowlist:

```js
// server/routes/prayerTimeRoutes.js
router.get("/", authenticate, authorize("prayer.view"), listPrayerTimes);
router.put("/", authenticate, authorize("prayer.manage"), updatePrayerTimes);
```

One place resolves what a person may do, and nothing else may compute it:

```js
// server/auth/permissions.js
const ROLE_PERMISSIONS = { /* role -> permission list, see child spec 0001 */ };

/** Effective set = role's permissions, plus extra grants, minus revokes. Deny always wins. */
function effectivePermissions(user) {
  if (user.role === "super_admin") return ALL_PERMISSIONS;
  const granted = new Set([...(ROLE_PERMISSIONS[user.role] ?? []), ...(user.permissions ?? [])]);
  for (const revoked of user.deniedPermissions ?? []) granted.delete(revoked);
  return granted;
}

function can(user, permission) {
  return Boolean(user?.isActive) && effectivePermissions(user).has(permission);
}
```

Frontend, for interface honesty only, never as the boundary:

```tsx
<Can permission="finance.manage">
  <EditBudgetButton />
</Can>
```

**Replaces**

- Any comparison against a role, such as `if (user.role === "treasurer")`, anywhere outside `server/auth/permissions.js`.
- Any route registered without an `authorize(...)` call, relying on the controller to check for itself.
- Any navigation or menu list written out per role.
- Any frontend check treated as the security boundary. Hiding a button is not protection.
- The simulated `loginUser` and `registerUser` bodies in [authService.ts](web/src/services/authService.ts), which resolve optimistically today.

**Enforcement**

Three layers, strongest first:

1. **Fail at startup.** `server.js` walks the mounted router stack after registration and throws if any route outside the public allowlist has no `authorize` marker. A forgotten guard cannot reach production, because the process will not boot.
2. **A lint rule.** ESLint `no-restricted-syntax` bans `role ===`, `role !==` and `role.includes(` in `server/` and `web/src/` except inside `server/auth/permissions.js` and `web/src/lib/permissions.ts`.
3. **A test.** One test asserts that every permission named in `ROLE_PERMISSIONS` and in the frontend navigation array exists in the registry, so a typo becomes a red test and not a silently denied menu item.

**Rollout**

New code immediately. There is no existing backend to migrate, since all 24 files under `server/` are empty placeholders, so this standard starts with zero debt. The only existing violation is the simulated auth service in the frontend, replaced in the first slice of [0002-backend-authorization.md](0002-backend-authorization.md).

**Exceptions**

Public read endpoints, declared in one allowlist in `server/auth/publicRoutes.js` and nowhere else: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/prayer-times`, `GET /api/events`, `GET /api/announcements`. They serve the existing public pages and return published records only. No other exception exists, and a new one is a code review conversation, not a decision an individual makes.

## Consequences

**Positive**

- A new committee post, or a person taking on a second job, is a data change. No new role, no new code path, no new dashboard.
- One shell means one place to fix a layout, a bug, or an accessibility problem, instead of six near copies drifting apart.
- Because `mosqueId` is on every record from day one, serving a second mosque later is a feature, not a rewrite of every query and index.
- The Cashier and Treasurer split is expressed exactly, so a cashier genuinely cannot delete a financial record even if someone hands them the wrong screen.
- A thin token plus a lookup means deactivating someone takes effect on their very next request, with no waiting for a token to expire.

**Negative and tradeoffs**

- Permission strings are a real vocabulary someone has to learn and keep tidy. Left unattended they sprawl into near duplicates, which is why the registry is a single file with a test behind it.
- The per person exception fields (`permissions` and `deniedPermissions`) make the effective set harder to read at a glance than a plain role. Debugging access will sometimes mean printing the effective set.
- One database read per authenticated request. Correct and simple, and fine at mosque scale, but it is a real cost and it will need a short lived cache before it serves thousands of people at once.
- Editing a role means a deploy, not an admin screen. That is deliberate, and it will feel restrictive the first time someone wants a new role at 9pm.
- Owning the auth code means owning its failure modes: password reset, lockout, session expiry, CSRF. Session handling is deliberately kept minimal in this version to keep that surface small.
- The build plan does not follow the order in the brief, so the first visible dashboard arrives slightly later than the shell first order would have shown it.

**Neutral**

- `position` from the brief becomes `positions`, an array. One line to change back.
- No refresh token rotation. A session cookie lasts 7 days and then you sign in again.
- Password reset stays out of scope, so the sign in page keeps disclosing the office contact route it already offers.
- New backend dependencies: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `express-rate-limit`, `zod`. Nothing new on the frontend.

## Follow-up

- [ ] Root `AGENT.md` and `CLAUDE.md` both hold the Jetro platform blurb rather than this project's context, so there is no recorded stack, no conventions, and no build approach for anything to inherit. This spec assumes Tracer Bullet slicing and states it plainly. A real project context file should exist before the build starts.
- [ ] The Agent Skills and MCP discovery step was not run for the new backend tools chosen here. Worth running before the build begins.
- [ ] `/terms` and `/privacy` are linked from the sign up form and both return 404. Either write them or unlink them.
- [ ] Password reset has no design. The sign in page currently discloses the mosque office as the interim route, which is honest but not a product.
- [ ] `globals.css:8` declares an unlayered `a { color: inherit }`, which silently kills every Tailwind text colour utility on links across roughly 52 anchors site wide. The auth screens work around it locally with the `!` modifier. The dashboard will hit the same wall, so wrapping that rule in `@layer base` is worth doing before the shell is built.
- [ ] Verify or replace the assumption that Express and Mongoose are the intended backend. It comes from the empty folder skeleton and the brief, not from any recorded decision.
- [ ] Decide whether member accounts need email or phone verification before they can register for events. Out of scope here.

## Rationale

Why this option won, the four options weighed, and the current state inventory: see [rationale.md](rationale.md).
