# 0001. Permission based authorization: reasoning

Decision record for [index.md](index.md). No build step reads this file.

## Context

> ⚠️ Premise note: three things in the brief need pushing back on before the design stands.
>
> **One: the topic spans five independently buildable decisions,** not one. The identity and permission model, the backend enforcement, the dashboard shell, the member area, and the approval workflow can each ship on their own. That is why this is an umbrella spec with child specs rather than one document, and why the buildable scope is narrowed to the model, the enforcement, the shell, and two proving modules. The remaining modules in your tree get their own specs later.
>
> **Two: the implementation order in the brief puts the security layer last,** at step 6, after the shell, the sidebar, and the permission system are all built. That is the order that goes wrong most reliably. A shell and a filtered sidebar built against imagined permissions bake in assumptions about what a permission is, and the day the real middleware arrives you discover the interface needs permissions the API does not have, or checks a shape the API cannot answer. The build plan here runs one thin thread instead: real login, real cookie, real Express permission check, real filtered sidebar, on one real module, then widens. The whole chain gets proven while it is still cheap to change, and you still see a working dashboard early, just one page of it rather than an empty frame.
>
> **Three: writing your own authentication is the single most expensive thing in this brief,** and it deserves to be a conscious choice rather than a default. Password hashing, session expiry, cross site request forgery, lockout, and reset are each a place where a small mistake becomes a breach, and a hosted identity provider solves all of them for you. The recommendation here is still to own it, for reasons given below, but the surface is deliberately kept small: one short lived session cookie, no refresh token rotation, no social sign in, no multi factor. The moment any of those three is wanted, revisit this and price a hosted provider properly.

The platform serves one mosque today with an organisational committee: President, Vice President, General Secretary, Assistant Secretary, Treasurer, Cashier, Imam, Muazzin, coordinators, volunteers, and ordinary members. Those posts rotate. A general election can change who the Treasurer is without changing anything about what a treasurer may do, and a person often holds two posts at once.

The frontend exists and is real: 90 source files, Next.js 16 App Router with React 19 and TypeScript in strict mode, Tailwind v4, and public pages for prayer times, events, services, Quran, donations, announcements, gallery, about, and contact. Sign up and sign in screens are built and accept an email address or a phone number, but they call `web/src/services/authService.ts`, which resolves optimistically after a simulated delay. There is no `/dashboard` route and no `/account` route. There is no `middleware.ts`. The frontend has no auth dependency of any kind.

The backend does not exist. `server/` holds a folder skeleton of 24 files, every one of them zero bytes, with no `package.json` and no dependencies installed. The file names (`authController.js`, `authMiddleware.js`, `generateToken.js`, `models/User.js`) record an intention to build Express with Mongoose and JSON web tokens, and the brief confirms Express, but nothing has been decided on the record.

Two forces make this decision urgent rather than optional. First, every module in the planned tree (prayer times, events, donations, finance, members, reports, and the rest) needs an answer to "who may do this", so the answer has to exist before the second module is written or each module invents its own. Second, money is involved: donations, expenses, budgets, and receipts. A cashier who can delete a financial record is a governance failure, not a bug, and the difference between Treasurer and Cashier has to be expressible precisely rather than approximately.

Not deciding means the first module hardcodes a role check, the second copies it, and by the fifth there is no single place that knows who may do what. That state is recoverable only by touching every route.

There is no project context file to inherit from. Root `AGENT.md` and `CLAUDE.md` both contain the Jetro research platform blurb, so there is no recorded stack, no conventions, no agent skills list, and no build approach.

## Options considered

### Option 1: permission strings from a role map in code, with per person exceptions

One `role` per person. A single code file maps each role to a permission set. Two arrays on the person hold exceptions: `permissions` adds, `deniedPermissions` removes. `positions` is separate and grants nothing. One `can(user, permission)` function is the only thing that computes access, and Express calls it through `authorize(permission)` on every route.

**Pros**
- Roles are versioned, reviewed, and diffable. You can see in a pull request that someone gave Cashier the ability to delete a donation.
- Changing a role applies to everyone holding it instantly, with no data backfill.
- Exceptions handle the real world (one Imam who also manages the library) without inventing a role for each combination.
- Matches the `role` plus `permissions` shape already sketched in the brief.

**Cons**
- A new role, or a change to one, needs a deploy. No admin screen can do it.
- The effective set is computed from three inputs, so reading a person's record does not tell you what they may do.
- Deny lists are a known source of confusion when they grow.

### Option 2: role to permission map in code only, no per person exceptions

The same, minus the two exception arrays. A person's permissions are entirely determined by their role.

**Pros**
- The simplest possible model. A role fully explains a person's access, and debugging is trivial.
- No deny precedence to reason about, so no chance of a surprising interaction.
- Least code, least test surface.

**Cons**
- Every real exception forces a new role. "Treasurer who also posts announcements" becomes a role, and role sprawl is worse than permission sprawl because roles are coarse.
- Committees genuinely do hand one person an extra duty for a season. This model cannot express that without a deploy.

### Option 3: editable roles stored in the database

A `Role` collection with a name and a permission array. Admins create and edit roles at runtime through an admin screen.

**Pros**
- Maximum flexibility, and almost certainly the right end state for a platform serving many mosques with different committee structures.
- New roles need no deploy, so the mosque is not blocked on a developer.
- Role definitions become auditable data with history.

**Cons**
- A role editor is itself a serious privilege escalation surface. Anyone who can edit a role can grant themselves anything, so it needs its own guard rails, its own audit trail, and careful thought about which permissions may never be granted through it.
- It adds a management interface, a migration, and a seeding story to a build that has no backend at all yet.
- Solves a problem this project does not have. One mosque with one committee structure does not need runtime role authoring.

### Option 4: copy the role's permissions onto each person at save time

`role` is kept for display, but the person's `permissions` array is the authority, populated from the role when the record is saved.

**Pros**
- Access is completely explicit on the record. What you see is what they get.
- No computation at check time, so a check is one array lookup.

**Cons**
- Editing a role does not reach existing people. It needs a backfill across every user, and if the backfill half fails the records silently disagree.
- Records drift over time until nobody trusts the `role` field, which is the failure this model creates and no other option has.

## Rationale

Option 1 wins on the specific force that shaped this whole brief: posts rotate but duties do not. Storing `positions` separately and deriving access from `role` means a general election is a data edit, and the authorization code is untouched. That is the property worth paying for, and Option 3 gets it too but charges a role editor and its escalation surface to do it.

The exception arrays earn their keep because of the money split. Treasurer and Cashier are close enough that the difference is a handful of permissions, and committees do reassign a duty for a season. Option 2 would force a new role for each variation, and coarse role sprawl is harder to reason about than a documented exception on one person's record. The cost is real, so deny precedence is fixed in one place, stated once (deny always wins), and never recomputed elsewhere.

Option 3 is where this ends up if the platform ever serves several mosques with different committee structures, and the model here is deliberately shaped so that move is additive: the check function reads a permission set, and a database backed role would just be another source feeding that same set. Doing it now would mean building a role editor before there is a single working endpoint, which inverts the risk.

Option 4 is rejected outright. A denormalised copy that needs a backfill to stay correct will drift, and drifted permissions are silent. Nobody notices until the wrong person can do the wrong thing.

**On the thin token.** Loading the person on every authenticated request costs one indexed read and buys two things worth more than that read: deactivating someone takes effect immediately, and a role change applies on their next click rather than whenever their token happens to expire. A fat token carrying role and permissions avoids the read but goes stale, which for a system holding financial permissions is the wrong trade. At mosque scale the read is not measurable. The runner up, a fat token with a short expiry, becomes attractive only if this ever serves thousands of concurrent people, and a small cache in front of the lookup is the cheaper answer at that point.

**On the cookie.** An `httpOnly` cookie is the only transport that works cleanly with the App Router, because the dashboard layout is a server component and a server component cannot read `localStorage`. The alternative pushes the whole dashboard into client rendering to read a token, which throws away the reason to use this framework. It is also the safer store: a token in `localStorage` is readable by any script that gets injected.

**On owning the auth code.** A hosted identity provider is genuinely the lower risk path and would remove the reset, lockout, and session work entirely. It loses on three specific forces here. The sign up and sign in interfaces are already built and are deliberately part of the mosque experience rather than a generic hosted page. A mosque committee holding member records, donation history, and financial data has a strong reason to keep identity in its own database. And the interesting part of this decision, positions, approval flows, and the Treasurer and Cashier split, is domain specific and no provider supplies it, so a provider would be bought for the password handling alone. Owning it is therefore accepted, with the surface kept deliberately narrow, and the moment multi factor or social sign in is wanted this should be repriced.

**On the build order.** The recorded build approach is Tracer Bullet by assumption, because no project context file records one. Even without that assumption it is the right shape here: the risk in this decision is concentrated in whether the enforcement chain actually holds end to end, so the first slice should be the thinnest possible version of that whole chain rather than the most visible piece of it.

**Where this disagrees with the brief.** The brief writes `position` as a single value. It becomes `positions`, an array, because committee members commonly hold two posts and a single string forces a migration the first time that happens. The brief's implementation order is also inverted, for the reason in the premise note. Both are one line changes if you disagree.

## Evidence: current state inventory

Sampled on 2026-08-22.

**Backend.** All 24 files under `server/` are zero bytes: `config/{config,db}.js`, `controllers/{announcement,auth,donation,event,prayerTime}Controller.js`, `middleware/{auth,error,validate}Middleware.js`, `models/{Announcement,Donation,Event,PrayerTime,User}.js`, `routes/{announcement,auth,donation,event,prayerTime}Routes.js`, `server.js`, `utils/{apiFeatures,generateToken,sendEmail}.js`. No `package.json`, no `node_modules`. A `.gitignore` and a `.env` exist and were not opened.

**Frontend.** 90 source files. `web/package.json` dependencies are exactly `next@16.3.1`, `react@19.2.8`, `react-dom@19.2.8`. No validation library, no form library, no icon library, no auth library. Routes present under `web/src/app`: about, announcements, contact, donations, events, gallery, prayer-times, quran, services, signin, signup. No `dashboard`, no `account`, no `middleware.ts`.

**The one competing pattern that exists.** `web/src/services/authService.ts` is the whole current auth surface. Both `registerUser` and `loginUser` wait 1200 milliseconds and resolve optimistically, with a comment recording the intended replacement and the environment variable name `NEXT_PUBLIC_API_URL`. That name is reused rather than a new one invented. There is no second pattern to reconcile, so this standard starts clean.

**Existing specs.** None. `docs/` did not exist before this spec, and there is no `docs/scope/`, so no scope feature links this decision and it is a standalone decision spec.
