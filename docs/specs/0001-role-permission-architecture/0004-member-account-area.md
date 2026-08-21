# 0001d. Member account area

## Summary

Ordinary members never see the admin dashboard. They get `/account`, a small area with their own profile, their own donation history, their own bookings, their own event registrations, and the public prayer times and events they already care about. Everything in it runs on the `Own` permissions, and the rule that makes it safe is simple: the owner is always taken from the session, never from anything the request can set.

## Requirements

**User stories**

- As a member, I want to see what I have donated and download a receipt without emailing the office.
- As a member, I want to register for an event and later see what I am registered for.
- As a member, I want to update my phone number and change my password myself.
- As a treasurer, I want my own donation history in the same place any member finds theirs, separate from the finance module where I manage everyone else's.

**Acceptance criteria**

- **AC-1**: Every `/account` route requires a session. A signed out visitor is redirected to `/signin?next=<path>`.
- **AC-2**: Every signed in person can use `/account`, staff included, because `account.view` is in the base permission set.
- **AC-3**: Every account endpoint derives the owner from the session. Passing another person's id in the body, the query, or the path changes nothing about what is returned or written.
- **AC-4**: The donations page lists only the signed in person's donations, and shows a recorded donation as pending until a treasurer verifies it.
- **AC-5**: Profile editing cannot change `role`, `permissions`, `deniedPermissions`, `positions`, `isActive`, or `mosqueId`, even if those fields are present in the request body.
- **AC-6**: Changing a password requires the current password, and on success increments `sessionVersion` so other sessions are signed out while the current one keeps working.
- **AC-7**: Event registration succeeds only for a published event that is still open and not full. A second registration for the same event is refused rather than duplicated.
- **AC-8**: A person may cancel their own registration or booking before the configured cutoff, and never anyone else's.
- **AC-9**: Notifications list and mark as read are scoped to the signed in person.
- **AC-10**: No staff control appears anywhere in `/account`, even for a super admin. The two areas stay separate.
- **AC-11**: A receipt can be downloaded only for the person's own verified donation.
- **AC-12**: Every account page has an explicit empty state.

## Design

### Route shape

```
web/src/app/account/layout.tsx            session gate plus the member shell
web/src/app/account/page.tsx              Overview
web/src/app/account/profile/page.tsx      name, phone, email, city, password, newsletter
web/src/app/account/prayer-times/page.tsx today's times, read only
web/src/app/account/events/page.tsx       upcoming events plus my registrations
web/src/app/account/donations/page.tsx    my history plus receipts
web/src/app/account/bookings/page.tsx     my service bookings
web/src/app/account/notifications/page.tsx my notifications
```

The layout is a server component and reuses the same `getSession()` helper as the dashboard, so there is one way to read a session in the frontend. It needs only a session, not `dashboard.view`, so the two areas gate differently on purpose. Someone holding `dashboard.view` gets a quiet link across to `/dashboard` in the account top bar, and that is the only place the two areas touch.

The shell is deliberately lighter than the dashboard: a horizontal tab row rather than a sidebar, the same ivory and green tokens, no breadcrumb, no module tree. It should feel like part of the mosque website rather than a back office.

### The Own rule

Six permissions carry the `Own` suffix: `profile.manageOwn`, `notification.viewOwn`, `donation.viewOwn`, `booking.viewOwn`, `booking.createOwn`, and `event.registerSelf`. The suffix is a naming convention with one job: it tells you the permission answers "may this kind of person do this at all", and never "does this record belong to them". Ownership is a query concern, so it lives in the controller:

```js
// server/controllers/accountController.js
const filter = { mosqueId: req.mosqueId, userId: req.user._id };
```

That is the whole safety mechanism, and it is why the authorization layer never loads a record. `authorize("donation.viewOwn")` says a member may look at their own donations. The filter decides which ones are theirs. A route that took a `userId` from the request would break this, so no account route accepts one.

### API surface

Every endpoint below is mounted under `/api/account` except the two that act on another collection's record.

| Endpoint | Method | Key inputs | Key outputs | Permission |
|---|---|---|---|---|
| `/api/account/summary` | GET | none | counts and totals for the overview | `account.view` |
| `/api/account/profile` | GET | none | the editable fields only | `account.view` |
| `/api/account/profile` | PATCH | `name`, `phone`, `email`, `city`, `dateOfBirth`, `gender`, `newsletterOptIn` | the updated person | `profile.manageOwn` |
| `/api/account/password` | POST | `currentPassword`, `newPassword` | `204`, other sessions ended | `profile.manageOwn` |
| `/api/account/donations` | GET | `page`, `year` | own donations with status | `donation.viewOwn` |
| `/api/account/donations/:id/receipt` | GET | `id` | receipt document | `donation.viewOwn` |
| `/api/account/bookings` | GET | `page`, `upcoming` | own bookings | `booking.viewOwn` |
| `/api/account/bookings` | POST | `serviceId`, `date`, `notes` | the created booking | `booking.createOwn` |
| `/api/account/bookings/:id/cancel` | POST | `id` | the cancelled booking | `booking.createOwn` |
| `/api/account/registrations` | GET | none | own event registrations | `event.registerSelf` |
| `/api/account/notifications` | GET | `page`, `unread` | own notifications | `notification.viewOwn` |
| `/api/account/notifications/read` | POST | `ids[]` | `204` | `notification.viewOwn` |
| `/api/events/:id/register` | POST | `id`, `guests` | the registration | `event.registerSelf` |
| `/api/events/:id/register` | DELETE | `id` | `204` | `event.registerSelf` |

An unknown `:id` and an id belonging to someone else both return `404`, so the response never confirms that a record exists.

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Any account request | The owner filter | `req.user._id` and `req.mosqueId`, never the request body or query |
| Profile save | The writable field list | A fixed allowlist in the controller, so an unexpected field is dropped rather than trusted |
| Password change | New `passwordHash` | `bcryptjs` at `BCRYPT_COST`, after the current password verifies |
| Password change | Session invalidation | `sessionVersion` incremented, then a fresh cookie issued for the current session only |
| Donation status | Pending or confirmed | The donation's own state from child spec `0005`, not a field the member can influence |
| Receipt number | The printed identifier | The donation record, generated at verification time, never at download time |
| Registration capacity | Whether a place is left | A count of existing registrations against the event's capacity, checked inside the write |
| Booking cutoff | Whether cancelling is still allowed | `BOOKING_CANCEL_CUTOFF_HOURS` compared against the booking date in `Mosque.timezone` |
| Notification list | The recipient | `userId` on the notification, matched to the session |

### Key invariants

- No account route reads an owner id from the request. The session is the only source.
- Profile writes go through a field allowlist, so adding a sensitive field to `User` later cannot accidentally become editable.
- Reading and writing always filter on `mosqueId` as well as the owner.
- `/account` contains no staff action of any kind. If a page needs one, it belongs in `/dashboard`.
- The account area uses the same `getSession()` helper as the dashboard, so session reading has one implementation.

### Security model

- Account endpoints are the ones most likely to be probed with someone else's id, so the ownership filter is asserted by test on every single one, not just reviewed.
- Registration capacity is checked inside the write path, not before it, so two people registering for the last place cannot both succeed.
- Password change requires the current password, which stops a stolen session from locking the real owner out permanently.
- Rate limiting covers the password endpoint the same way it covers login, since it verifies a password.
- Receipts are documents about money, so the download path checks ownership and verified status, and is never a plain static file with a guessable name.
- The account area shows a person their own data only, so nothing in it needs `member.view`, which stays a staff permission.

### Configuration required

- `BOOKING_CANCEL_CUTOFF_HOURS`: how long before a booking cancelling stops being allowed, default 24.

### Critical test scenarios

- Happy path: a member signs in, opens `/account`, and sees their own donations, bookings and registrations, verifies **AC-2**, **AC-4**.
- Ownership probe: request another person's donation id directly and receive `404`, verifies **AC-3**, **AC-11**.
- Injected owner: send `userId` in the profile patch body and confirm it is ignored, verifies **AC-3**.
- Privilege field: send `role: "mosque_admin"` in the profile patch body and confirm the role does not change, verifies **AC-5**.
- Password change: change it, confirm the current session still works and a second session is refused with `SESSION_REVOKED`, verifies **AC-6**.
- Registration guard: register twice for one event and confirm the second is refused, then fill the event and confirm the next attempt is refused, verifies **AC-7**.
- Cancel window: cancel inside the cutoff and confirm refusal, and cancel someone else's booking and confirm `404`, verifies **AC-8**.
- Staff crossover: sign in as a super admin, open `/account`, and confirm no staff control is present, verifies **AC-10**.
- Signed out: open `/account/donations` with no cookie and land on `/signin?next=/account/donations`, verifies **AC-1**.
- Empty account: a brand new member sees an empty state on every tab, verifies **AC-12**.

## Build plan

1. Write `server/controllers/accountController.js` with the summary, profile and password endpoints, using the field allowlist and the session derived filter, satisfies **AC-3**, **AC-5**, **AC-6**.
2. Write `server/routes/accountRoutes.js` with `authorize` on every route, and add the password endpoint to the auth rate limiter, satisfies **AC-3**.
3. Write `web/src/app/account/layout.tsx` reusing `getSession()`, plus the tab shell and the cross link to `/dashboard` when the person holds `dashboard.view`, satisfies **AC-1**, **AC-2**, **AC-10**.
4. Write the Overview and Profile pages, including the password form, satisfies **AC-5**, **AC-6**, **AC-12**.
5. Write the read only Prayer Times page against the existing public endpoint, satisfies **AC-12**.
6. Add the donation read endpoints and the Donations page, with pending and confirmed shown distinctly, satisfies **AC-4**.
7. Add the receipt endpoint with the ownership and verified checks, and the download control, satisfies **AC-11**.
8. Add the registration endpoints with the capacity and duplicate guards, and the Events page, satisfies **AC-7**.
9. Add the booking endpoints with the cutoff, and the Bookings page, satisfies **AC-8**.
10. Add the notification endpoints and the Notifications page, satisfies **AC-9**.
11. Write the ownership probe test for every account endpoint as one table driven test, so a new endpoint added later without an owner filter fails immediately, satisfies **AC-3**.
12. Write the remaining scenario tests above, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-10**.

## Rationale, short

Keeping the member area separate rather than showing members a stripped down dashboard is what keeps the dashboard honest. A shell that has to serve both a member and a treasurer ends up with conditional chrome everywhere, and the member gets a back office interface for looking at three of their own things. Two shells, one session helper, one permission set. The `Own` suffix earns itself here: it lets `authorize()` stay a pure set lookup with no database access, while ownership stays where it belongs, in the query. Full reasoning is in [rationale.md](rationale.md).
