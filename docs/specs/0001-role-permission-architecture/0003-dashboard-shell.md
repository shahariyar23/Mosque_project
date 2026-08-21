# 0001c. One dashboard shell with permission filtered navigation

## Summary

There is one dashboard, at `/dashboard`, and every module lives inside it. The sidebar is built from a single navigation array where each item names the permission it needs, so what you see is exactly what you may open. Route protection runs in two places for two different reasons: `middleware.ts` does a cheap cookie presence check so a signed out visitor never downloads the shell, and the dashboard layout, a server component, asks the API who you are and refuses properly. Prayer Times is built as the first real module so the whole thread is proven on something real.

## Requirements

**User stories**

- As a cashier, I want to open the dashboard and see only the few things I actually work with, not twelve greyed out sections.
- As a member with no staff duties, I want `/dashboard` to send me somewhere useful instead of showing me a wall.
- As a mosque admin, I want one dashboard I can teach someone to use in five minutes, not six different ones.
- As an imam, I want to update prayer times from the same shell where everything else lives.

**Acceptance criteria**

- **AC-1**: There is exactly one dashboard layout. Every module renders inside it, and no module route defines its own sidebar or header.
- **AC-2**: The sidebar shows an item only when the signed in person holds that item's permission. A group with no visible children does not render its heading.
- **AC-3**: A signed in person without `dashboard.view` who visits any `/dashboard` route is redirected to `/account`.
- **AC-4**: A visitor with no session cookie who visits any `/dashboard` route is redirected to `/signin?next=<the path they wanted>`, and after signing in lands on that path.
- **AC-5**: Typing a module URL you lack the permission for renders a denied state inside the shell, and the module's own data is never requested.
- **AC-6**: `middleware.ts` checks only that the cookie exists. It never decodes the token and never decides a permission.
- **AC-7**: The permission list comes from one server side call per request in the dashboard layout. No permission is ever read from browser storage or from a client side decode of the token.
- **AC-8**: `<Can permission="...">` renders nothing when the permission is absent, and every action it wraps is independently refused by the API.
- **AC-9**: Every module route has an explicit empty state, so a fresh install never shows a blank panel or a loading spinner that never ends.
- **AC-10**: The sidebar is fully reachable by keyboard, the current item carries `aria-current="page"`, and on a narrow screen it collapses behind a labelled toggle that reports its open state.
- **AC-11**: The Prayer Times module reads through `prayer.view` and saves through `prayer.manage`, against the real API, with the save control absent for anyone lacking `prayer.manage`.
- **AC-12**: Every link and every text colour inside the shell renders as designed, despite the unlayered `a { color: inherit }` rule in `globals.css`.
- **AC-13**: A `401` from any dashboard request clears the client session state and redirects to `/signin`, rather than showing a broken panel.

## Design

### Route shape

```
web/src/middleware.ts                        cookie presence only, for /dashboard and /account
web/src/app/dashboard/layout.tsx             server component: the real gate plus the shell
web/src/app/dashboard/page.tsx               Overview
web/src/app/dashboard/prayer-times/page.tsx  the first real module
web/src/app/dashboard/[...rest]/page.tsx     not built yet state, so no route 404s mid build
```

The layout is a server component. It reads the cookie, calls `GET /api/auth/me` with the cookie forwarded, and from there it either redirects (no session, or no `dashboard.view`) or renders the shell with the person and their permission list. This is the only place the permission list enters the frontend.

Why two checks and not one: Next.js middleware runs on the Edge runtime, which cannot reach Mongo, so it cannot know your permissions. It is there purely so a signed out visitor is bounced before any dashboard code is sent. The layout is where the real decision happens.

### The navigation array

One file, `web/src/lib/navigation.ts`, is the only description of the dashboard menu. Adding a module means adding a row here, and nothing else knows the menu exists.

```ts
export type NavItem = {
  label: string;          // English label
  labelBn: string;        // Bangla label, through the existing language provider
  href: string;
  permission: Permission; // must exist in the registry
  icon: IconName;
};

export type NavGroup = { heading: string; headingBn: string; items: NavItem[] };

export const NAVIGATION: NavGroup[] = [ /* the groups in the table below */ ];
```

Filtering is one pass: keep an item when the person's permission set contains its `permission`, then drop any group left with no items. That single rule produces every role's menu, which is why no role ever needs its own navigation list.

| Group | Items and the permission each needs |
|---|---|
| Overview | Overview `dashboard.view` |
| Mosque | Profile `mosque.view`, Settings `settings.view` |
| Prayer | Prayer Times `prayer.view`, Jumu'ah `jumuah.manage` |
| Community | Members `member.view`, Volunteers `volunteer.view` |
| Events | Events `event.view`, Registrations `event.update` |
| Services | Services `service.view`, Bookings `booking.view` |
| Islamic content | Quran `quran.view`, Khutbah `khutbah.view`, Articles `article.view`, Classes `class.view` |
| Finance | Donations `donation.view`, Expenses `expense.manage`, Budgets `budget.manage`, Transactions `transaction.view` |
| Communication | Announcements `announcement.view`, Notifications `notification.send` |
| Media | Gallery `gallery.view` |
| Reports | Reports `report.view` |
| Administration | Users `user.view`, Roles and access `permission.assign`, Audit log `audit.view` |

The result, without anyone writing a per role menu: a cashier sees Overview, Prayer, Community, Donations and Transactions. An imam sees Overview, Prayer, Community, Islamic content and Reports. A treasurer sees the whole Finance group and Reports but no Administration. A secretary sees Community, Events, Services, Communication, Media and Reports but no Finance.

Note the deliberate mismatch in a few rows: Jumu'ah uses `jumuah.manage` and Expenses uses `expense.manage`, because those pages exist only to change something and there is no separate view permission for them. Every other row uses a `view` permission and hides its own write controls with `Can`.

### Two layers of hiding, one boundary

The frontend does two jobs, and neither is security:

- **The navigation array** decides which sections exist for you, so the menu is honest.
- **`<Can permission="...">`** decides which controls appear inside a page, so a cashier does not see a Delete button they cannot use.

Both read from the permission set the layout fetched. Both are for the interface only. Every action they wrap is refused independently by the API, exactly as the standard requires. If `Can` were removed entirely the platform would still be secure, only ruder.

```tsx
// web/src/lib/permissions.ts, client side
export function usePermissions(): Set<Permission>;              // from the layout's provider
export function can(permission: Permission): boolean;
export function Can({ permission, children, fallback }: CanProps): ReactNode;
```

### Denied and empty states

- **No session**: redirect to `/signin?next=<path>`, handled in middleware, confirmed in the layout.
- **No `dashboard.view`**: redirect to `/account`. A member is not shown a refusal for a place they were never meant to go.
- **Has `dashboard.view`, lacks the module permission**: the shell renders with a denied panel in the content area, keeping the sidebar so they are not stranded. It says plainly that this section is not part of their access and points at the mosque office. It never names the missing permission outside development.
- **Allowed but no data yet**: every module ships an empty state with a one line explanation and, when the person may create, the action that fills it.
- **A `401` mid session**: a shared fetch wrapper catches it, clears the client provider state, and redirects to `/signin`. This is what a deactivated account or an expired cookie looks like from inside the dashboard.

### Shell layout

A fixed sidebar 260 pixels wide on `#073a2d` with gold `#c79a45` accents for the current item, and an ivory `#f8f6ef` content area, reusing the tokens already in the public site and the auth screens so the dashboard looks like the same platform. The top bar carries the mosque name, a breadcrumb built from the current route, a notification bell, and the person's name with their positions underneath, because a position is exactly the label a person recognises themselves by even though it grants nothing.

Below 1024 pixels the sidebar collapses behind a toggle button labelled for screen readers, reporting `aria-expanded` and pointing at the sidebar with `aria-controls`. The pattern is already in use in the site header, so it is reused rather than reinvented.

On colours: `web/src/app/globals.css:8` declares `a { color: inherit; text-decoration: none; }` outside any layer, which outranks every layered Tailwind `text-*` utility and quietly kills link colours. The auth screens work around it locally with the `!` suffix. The shell has far more links than the auth screens, so the recommendation is to wrap that rule in `@layer base` before the shell is built, which fixes it once for the whole site. If you would rather not touch a global file, the shell keeps using the `!` suffix on every coloured link and that must be stated in the component comments.

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Any dashboard request | The signed in person and their permissions | `GET /api/auth/me`, called once in the dashboard layout with the incoming cookie forwarded |
| Sidebar render | The visible menu | `NAVIGATION` filtered against that permission set |
| Breadcrumb | The trail | The current pathname matched against `NAVIGATION`, falling back to a title cased segment |
| Top bar identity | Name and position labels | The `/auth/me` person, positions rendered through the label map in child spec `0001` |
| Sign in redirect | Where to land after sign in | The `next` query parameter, accepted only when it starts with `/dashboard` or `/account` so it cannot be used to bounce someone off site |
| Prayer times display | The times and the timezone | `GET /api/prayer-times`, formatted in `Mosque.timezone` |
| Language of every label | English or Bangla | The existing language provider, same as the public pages |

### Key invariants

- The permission set is fetched server side and passed down. Nothing in the browser decides what you may do from data the browser could edit.
- `NAVIGATION` is the only menu description. A module that is not in it does not appear, and a module in it always declares a permission.
- No component compares a role. The lint rule from the standard covers `web/src/` too.
- Every module page renders inside the one layout and never renders its own chrome.
- The `next` parameter is validated as an internal path before any redirect uses it.

### Security model

- The layout gate runs on the server on every request, so it cannot be skipped by a client side navigation.
- The middleware check is presence only. It is a convenience, and it is documented as such in the file so nobody later mistakes it for the boundary.
- Nothing sensitive is rendered before the gate passes, because the gate is in the layout and the layout renders before its children.
- Module pages fetch their own data server side where possible, so a denied module never issues its request at all.
- The `Can` component never carries the only check for a destructive action. Every delete and every money action is refused by the API as well, and the test suite asserts the API refusal rather than the hidden button.

### Configuration required

- `NEXT_PUBLIC_API_URL`: the API origin, the name already referenced in `web/src/services/authService.ts`. Server side fetches use the same value.

### Critical test scenarios

- Happy path: an imam signs in, lands on `/dashboard`, sees exactly the Overview, Prayer, Community, Islamic content and Reports groups, verifies **AC-1**, **AC-2**.
- Member redirect: a member visits `/dashboard` and lands on `/account`, verifies **AC-3**.
- Signed out: a visitor opens `/dashboard/prayer-times`, lands on `/signin?next=/dashboard/prayer-times`, signs in, and arrives at prayer times, verifies **AC-4**.
- Direct URL: a cashier types `/dashboard/budgets` and sees the denied panel with the sidebar intact, and no budget request is made, verifies **AC-5**.
- Open redirect: `?next=https://example.com` is ignored and the person lands on `/dashboard`, verifies the security model.
- Storage check: assert nothing writes the permission list to `localStorage` or `sessionStorage`, verifies **AC-7**.
- Control hiding: an imam opening the Members page sees no edit control, and the same API call from a script is refused, verifies **AC-8**.
- Session death: force a `401` on a module request and assert the redirect to `/signin`, verifies **AC-13**.
- Prayer times write: an imam saves new times successfully, a cashier gets no save control and a `403` if the request is forged, verifies **AC-11**.
- Keyboard pass: tab through the sidebar, confirm every item is reachable, the current one is marked, and the mobile toggle reports its state, verifies **AC-10**.
- Empty state: with an empty database every built module shows its empty state rather than a blank area, verifies **AC-9**.
- Colour check: assert the computed colour of a sidebar link and a content link matches the token, catching the `globals.css` regression, verifies **AC-12**.

## Build plan

This slice follows the backend thread in child spec `0002`, so the shell is built against real permissions from the first render, never against imagined ones.

1. Write `web/src/lib/permissions.ts`: the `Permission` type generated from the registry, the client provider, `usePermissions`, `can`, and `Can`, satisfies **AC-8**.
2. Write `web/src/lib/session.ts`: a server side `getSession()` that calls `GET /api/auth/me` forwarding the cookie, returning the person, positions and permission set, or null, satisfies **AC-7**.
3. Write `web/src/middleware.ts`: cookie presence only, matching `/dashboard/:path*` and `/account/:path*`, redirecting to `/signin?next=`, with a comment stating plainly that this is not the security boundary, satisfies **AC-4**, **AC-6**.
4. Write `web/src/lib/navigation.ts` with every group and item from the table, and the filter function, satisfies **AC-2**.
5. Write `web/src/app/dashboard/layout.tsx`: the gate (redirect with no session, redirect to `/account` without `dashboard.view`), the provider, and the shell frame, satisfies **AC-1**, **AC-3**.
6. Write the shell components in `web/src/components/dashboard/`: `sidebar.tsx`, `top-bar.tsx`, `breadcrumb.tsx`, `page-header.tsx`, `empty-state.tsx`, `denied-state.tsx`, using the existing tokens and the header's existing mobile toggle pattern, satisfies **AC-9**, **AC-10**.
7. Decide the `globals.css` link rule: either wrap line 8 in `@layer base` once, or commit to the `!` suffix in the shell and note it in each component, satisfies **AC-12**.
8. Write `web/src/app/dashboard/page.tsx`, the Overview, showing only cards the person may see, each one a `Can` wrapped summary, satisfies **AC-2**, **AC-8**.
9. Write the Prayer Times module: server side read, a form gated on `prayer.manage`, and the save path through the API, satisfies **AC-11**.
10. Write `web/src/app/dashboard/[...rest]/page.tsx`, a plain not built yet panel inside the shell, so a sidebar item can exist before its module does without a raw 404, satisfies **AC-5**.
11. Add the shared fetch wrapper that maps `401` to a session clear and a redirect, and route every dashboard request through it, satisfies **AC-13**.
12. Write the scenario tests above, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-7**, **AC-10**, **AC-13**.

## Rationale, short

The navigation array is the whole reason one shell replaces six. A menu described as data, filtered by one rule, cannot drift the way six hand written menus do, and it makes a new module a one row change. The gate sits in the layout rather than in middleware because the Edge runtime cannot reach the database, so any permission check there would either be a guess or would force the token to carry permissions, which the umbrella already rejected. Fetching the permission set once per request in a server component is also what makes the `httpOnly` cookie workable, and it keeps the whole dashboard out of client only rendering. Full reasoning is in [rationale.md](rationale.md).
