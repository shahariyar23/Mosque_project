# 0001a. Identity and permission model

## Summary

This defines the three collections the authorization standard needs (`Mosque`, `User`, `AuditLog`), the full list of permission strings, and the map from each role to its permissions. The important idea is that a person's committee post lives in `positions` and does nothing, their `role` decides their permission set, and two small arrays on the record handle the exceptions real committees create. One function resolves all of it, and every permission change is written to an audit trail.

## Requirements

**User stories**

- As a mosque admin, I want to change who the Treasurer is without touching code, so an election is a data edit.
- As a mosque admin, I want to give one person a single extra ability without inventing a new role for them.
- As a treasurer, I want the cashier to be able to record a donation but never to delete a financial record.
- As an auditor, I want a permanent record of who changed whose access, and when.
- As a member, I want to see only my own donation history and my own bookings.

**Acceptance criteria**

- **AC-1**: `can(user, permission)` returns true only when the permission is in the person's effective set. The effective set is the base set for every signed in person, plus their role's set, plus `permissions`, minus `deniedPermissions`.
- **AC-2**: When `isActive` is false, `can()` returns false for every permission, including base ones.
- **AC-3**: `super_admin` resolves true for every permission in the registry. `mosque_admin` resolves true for every permission except `platform.manage`, `mosque.create` and `workflow.selfApprove`.
- **AC-4**: `cashier` resolves true for `donation.record`, `donation.view`, `transaction.view` and `receipt.issue`, and false for `donation.manage`, `donation.verify`, `finance.manage`, `expense.manage`, `budget.manage`, `report.manage` and `user.manage`.
- **AC-5**: `imam` resolves true for `prayer.manage`, `jumuah.manage`, `khutbah.create`, `khutbah.update` and `quran.manage`, and false for every `finance.*`, every `donation.*`, every `user.*`, every `settings.*`, and for `khutbah.publish` and `khutbah.delete`.
- **AC-6**: `member` resolves false for `dashboard.view` and for every unscoped financial permission, and true for `account.view`, `donation.viewOwn` and `booking.viewOwn`.
- **AC-7**: A string that is not in the registry, placed in `permissions` or `deniedPermissions`, is rejected on save with a validation error naming the unknown string.
- **AC-8**: The same permission in both `permissions` and `deniedPermissions` resolves to denied. Deny always wins.
- **AC-9**: Saving a `User` without `mosqueId` fails validation. Saving one with neither `email` nor `phone` fails validation.
- **AC-10**: Email and phone uniqueness is scoped to the mosque. The same email may exist once in each of two mosques and never twice in one.
- **AC-11**: `positions` accepts zero, one, or many values from the position list, and changing `positions` does not change the result of any `can()` call for that person.
- **AC-12**: Every change to `role`, `permissions`, `deniedPermissions`, `positions` or `isActive` writes exactly one `AuditLog` entry carrying the actor, the target, the value before, and the value after.
- **AC-13**: `AuditLog` entries cannot be updated or deleted through the model.
- **AC-14**: Every permission named in any role's map entry, and in the frontend navigation array, exists in the registry.

## Design

### Permission registry

One file, `server/auth/permissions.js`, exports the registry. Grouped by module, `resource.action` throughout. Permissions ending in `Own` act only on records belonging to the requesting person, which keeps ownership out of the permission check itself.

| Group | Permissions |
|---|---|
| Base (every signed in person) | `account.view`, `profile.manageOwn`, `notification.viewOwn`, `prayer.view`, `announcement.view`, `event.view`, `service.view`, `quran.view`, `gallery.view` |
| Dashboard | `dashboard.view` |
| Platform (super admin only) | `platform.manage`, `mosque.create`, `audit.view` |
| Mosque | `mosque.view`, `mosque.manage`, `settings.view`, `settings.manage` |
| People and access | `user.view`, `user.manage`, `role.assign`, `permission.assign`, `position.assign`, `member.view`, `member.manage` |
| Prayer | `prayer.manage`, `jumuah.manage` |
| Events | `event.create`, `event.update`, `event.delete`, `event.publish`, `event.registerSelf` |
| Services | `service.manage`, `booking.view`, `booking.manage`, `booking.viewOwn`, `booking.createOwn` |
| Announcements | `announcement.manage`, `announcement.publish` |
| Islamic content | `quran.manage`, `khutbah.view`, `khutbah.create`, `khutbah.update`, `khutbah.delete`, `khutbah.publish`, `article.view`, `article.manage`, `class.view`, `class.manage` |
| Donations | `donation.view`, `donation.viewOwn`, `donation.record`, `donation.verify`, `donation.manage` |
| Finance | `finance.view`, `finance.manage`, `expense.manage`, `budget.manage`, `transaction.view`, `receipt.issue` |
| Reports | `report.view`, `report.manage` |
| Governance | `meeting.manage`, `document.manage`, `volunteer.view`, `volunteer.manage` |
| Communication | `notification.send` |
| Media | `gallery.manage` |
| Workflow | `workflow.review`, `workflow.approve`, `workflow.selfApprove` |

### Role map

Roles: `super_admin`, `mosque_admin`, `secretary`, `treasurer`, `cashier`, `imam`, `member`. Everyone also gets the base set, so the lists below hold only what the role adds.

| Role | Adds | Deliberately excluded |
|---|---|---|
| `super_admin` | Every permission in the registry | Nothing |
| `mosque_admin` | Every permission except the three platform only ones | `platform.manage`, `mosque.create`, `workflow.selfApprove` |
| `secretary` | `dashboard.view`, `member.view`, `member.manage`, `user.view`, `event.create`, `event.update`, `event.delete`, `announcement.manage`, `meeting.manage`, `document.manage`, `workflow.review`, `report.view`, `gallery.manage`, `notification.send`, `volunteer.view`, `volunteer.manage`, `booking.view`, `booking.manage`, `service.manage` | `event.publish`, `announcement.publish` and `workflow.approve` (a secretary reviews, an admin approves), all finance, all donations, `role.assign` |
| `treasurer` | `dashboard.view`, `donation.view`, `donation.record`, `donation.verify`, `donation.manage`, `finance.view`, `finance.manage`, `expense.manage`, `budget.manage`, `transaction.view`, `receipt.issue`, `report.view`, `report.manage`, `member.view` | `user.manage`, `role.assign`, `permission.assign`, `settings.manage` |
| `cashier` | `dashboard.view`, `donation.view`, `donation.record`, `transaction.view`, `receipt.issue`, `member.view` | `donation.manage`, `donation.verify`, every `finance.*`, `expense.manage`, `budget.manage`, `report.manage`, `user.manage`. A cashier has no delete anywhere. |
| `imam` | `dashboard.view`, `prayer.manage`, `jumuah.manage`, `khutbah.view`, `khutbah.create`, `khutbah.update`, `quran.manage`, `article.view`, `article.manage`, `class.view`, `class.manage`, `member.view`, `report.view` | `khutbah.publish`, `khutbah.delete`, all finance, all donations, all user management, all settings |
| `member` | `donation.viewOwn`, `booking.viewOwn`, `booking.createOwn`, `event.registerSelf` | `dashboard.view` and every unscoped view of another person's data |

`mosque_admin` is computed as the registry minus a three item `PLATFORM_ONLY` list, not written out by hand, so a permission added later cannot be silently missed.

### Positions

`positions` is a list from a fixed set, and grants nothing: `president`, `vice_president`, `general_secretary`, `assistant_secretary`, `treasurer`, `cashier`, `imam`, `muazzin`, `khatib`, `education_coordinator`, `event_coordinator`, `volunteer_coordinator`, `volunteer`, `caretaker`, `member`. A display label map in code turns each value into English and Bangla text for the interface, reusing the existing language provider.

### Data model

| Entity | Key | Fields | Relationships |
|---|---|---|---|
| `Mosque` | `_id` | `name` (req), `slug` (req, unique), `timezone` (req, default `Asia/Dhaka`), `addressLine`, `city`, `country`, `contactEmail`, `contactPhone`, timestamps | 1:N `User`, 1:N every other record |
| `User` | `_id` | `mosqueId` (req, ref Mosque, indexed), `name` (req), `email` (optional, lowercase), `phone` (optional, E.164), `passwordHash` (req, never selected by default), `role` (req, enum, default `member`), `positions` (array of enum, default empty), `permissions` (array of registry strings, default empty), `deniedPermissions` (array of registry strings, default empty), `isActive` (bool, default true), `sessionVersion` (number, default 1), `dateOfBirth`, `gender`, `city`, `newsletterOptIn`, `lastLoginAt`, `failedLoginCount` (default 0), `lockedUntil`, timestamps | N:1 `Mosque`; 1:N `AuditLog` as actor |
| `AuditLog` | `_id` | `mosqueId` (indexed), `actorId` (req, ref User), `action` (req), `targetType`, `targetId`, `before` (mixed), `after` (mixed), `ip`, `userAgent`, `createdAt` | N:1 `User`, N:1 `Mosque` |

**Indexes**: `User` gets `{ mosqueId: 1, email: 1 }` unique and sparse, `{ mosqueId: 1, phone: 1 }` unique and sparse, `{ mosqueId: 1, role: 1 }`, and `{ mosqueId: 1, isActive: 1 }`. `AuditLog` gets `{ mosqueId: 1, createdAt: -1 }` and `{ targetType: 1, targetId: 1 }`.

### Key invariants

- Exactly one `role` per person. Mixed duties are expressed with `permissions`, never with a second role.
- `positions` never affects a permission check. This is enforced by a test that flips every position on a member and asserts the effective set is unchanged.
- Every `User` has a `mosqueId`, and at least one of `email` or `phone`.
- Deny beats grant beats role beats base.
- `permissions` and `deniedPermissions` accept only strings present in the registry.
- Nothing outside `server/auth/permissions.js` computes an effective permission set, and nothing outside it compares a role.
- `AuditLog` is append only.
- A self registered person is always created with `role: "member"` and an empty `permissions` array, no matter what the request body contains.

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Any permission check | Effective permission set | Computed from the role map in code, plus `User.permissions`, minus `User.deniedPermissions` |
| Self registration | `mosqueId` | `DEFAULT_MOSQUE_ID` environment variable, resolved on the server, never from the request |
| Self registration | `role` | Constant `member` in code, never read from the request body |
| Self registration | `passwordHash` | `bcryptjs` hash of the submitted password, cost factor 12 |
| Any access change | Audit `actorId` | The authenticated person on the request |
| Any access change | Audit `before` and `after` | The mongoose document's modified paths, captured before save |
| Any access change | Audit `ip`, `userAgent` | `req.ip` (with `trust proxy` enabled) and the request headers |
| Forced sign out or password change | `sessionVersion` | Incremented on the record, compared against the token claim |
| Position display | Position label, English and Bangla | Label map in code, rendered through the existing language provider |
| Prayer time display | Mosque timezone | `Mosque.timezone`, default `Asia/Dhaka` |

### Security model

- `role.assign`, `permission.assign` and `position.assign` are separate from `user.manage`. Editing someone's name and changing their power are different acts and need different grants.
- No one may raise anyone, including themselves, to a role at or above their own. Only `super_admin` may create `super_admin` or `mosque_admin`.
- No one may grant a permission they do not themselves hold. This closes the obvious escalation path where a secretary with `permission.assign` hands themselves `finance.manage`.
- No one may change their own `role`, `permissions`, `deniedPermissions` or `isActive`.
- Every write to those fields is scoped to the actor's own `mosqueId`, except for `super_admin`.
- `passwordHash` is never selected by default and never leaves the server in any response shape.
- The full member list is personal data. `member.view` is a staff permission and is never in the base set.

### Configuration required

- `DEFAULT_MOSQUE_ID`: the mosque a self registered person is attached to.
- `BCRYPT_COST`: password hashing cost, default 12.

### Critical test scenarios

- Happy path: a member is promoted to `treasurer`, and their next permission check returns true for `finance.manage` and false for `role.assign`, verifies **AC-1**, **AC-3**.
- Cashier boundary: every excluded permission in the cashier row resolves false, verifies **AC-4**.
- Imam boundary: every finance and donation permission resolves false for an imam, verifies **AC-5**.
- Deactivation: an inactive treasurer resolves false for `finance.manage` and for `account.view`, verifies **AC-2**.
- Deny precedence: `finance.manage` in both arrays resolves false, verifies **AC-8**.
- Escalation attempt: a secretary holding `permission.assign` tries to grant themselves `finance.manage` and is refused, verifies the security model.
- Typo guard: saving `permissions: ["finance.mange"]` fails with an error naming the string, verifies **AC-7**.
- Position neutrality: adding `president` to a member changes nothing about their access, verifies **AC-11**.
- Tenancy: the same email address saves successfully under two different mosques and fails on the second attempt within one, verifies **AC-10**.

## Build plan

1. Create `server/package.json` and install `express`, `mongoose`, `dotenv`, `bcryptjs`. Fill `config/db.js` and `config/config.js` reading `MONGO_URI` and the variables above, with no default that points at a real host, satisfies **AC-9**.
2. Write `server/auth/permissions.js`: the registry, `PLATFORM_ONLY`, `BASE_PERMISSIONS`, `ROLE_PERMISSIONS`, `effectivePermissions()` and `can()`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-8**.
3. Write the registry integrity test and the role boundary tests for cashier, imam and member, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-14**.
4. Write `server/models/Mosque.js` and a seed script that creates the single mosque and prints its id for `DEFAULT_MOSQUE_ID`, satisfies **AC-9**.
5. Write `server/models/User.js` with the fields, the enums, the compound sparse unique indexes, the validator rejecting unknown permission strings, and the pre save check for `mosqueId` plus one contact method, satisfies **AC-7**, **AC-9**, **AC-10**, **AC-11**.
6. Write `server/models/AuditLog.js`, append only, blocking update and delete at the model level, satisfies **AC-13**.
7. Add the audit hook that captures modified access fields on `User` and writes one entry per change, satisfies **AC-12**.
8. Write the position label map with English and Bangla labels, and the position neutrality test, satisfies **AC-11**.

## Rationale, short

One role plus exception arrays was chosen over an editable role collection because roles rotating between people is the actual problem, and that is solved by keeping posts in `positions`. Runtime role authoring solves a different problem this mosque does not have yet, and it brings an escalation surface that would need more guarding than the whole rest of this spec. The `Own` suffix on member permissions keeps ownership out of the check function, which was the alternative and would have put resource loading inside the authorization layer. Full reasoning is in [rationale.md](rationale.md).
