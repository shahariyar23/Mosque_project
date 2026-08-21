# 0001e. Shared approval workflow

## Summary

One state machine, reused by every kind of content that needs a second pair of eyes: `draft` to `pending_review` to `approved` to `published`, with `rejected` off to the side. Each move is guarded by a permission, each move is stamped with who did it and when, and nobody may approve their own work. Money does not use this machine. Donations run on their own short path, `recorded` to `verified`, with voiding instead of deleting, because a financial record that can be edited quietly is not a financial record.

## Requirements

**User stories**

- As an imam, I want to write a khutbah, hand it in, and know it goes live only after the committee has seen it.
- As a secretary, I want to review what has been handed in and send it back with a note when it is not ready.
- As a mosque admin, I want to be the one who publishes, so nothing appears on the public site without my sign off.
- As a treasurer, I want a donation a cashier recorded to sit unconfirmed until I have checked it against the money actually received.
- As an auditor, I want to see who wrote it, who reviewed it, who approved it, and when.

**Acceptance criteria**

- **AC-1**: One shared workflow definition governs every content type that uses it. Adding a second content type adds no new state and no new transition table.
- **AC-2**: The states are exactly `draft`, `pending_review`, `approved`, `published`, `rejected`. Anything else is a validation error.
- **AC-3**: Every transition is refused unless the actor holds the permission that transition requires, refused by the API and not merely hidden.
- **AC-4**: A transition that is not in the table is refused, including a jump straight from `draft` to `published`.
- **AC-5**: Each completed transition records the actor and the time in the matching field, and appends an entry to the item's history.
- **AC-6**: Nobody may approve or publish an item they submitted, unless they hold `workflow.selfApprove`. The refusal code is `SELF_APPROVAL_REFUSED`.
- **AC-7**: Every use of `workflow.selfApprove` writes an `AuditLog` entry naming the item, so the exception is visible after the fact.
- **AC-8**: When a content type requires review, approving without a recorded review is refused, even by someone holding `workflow.approve`.
- **AC-9**: Only `published` items appear on the public site and in the public API. A `draft`, `pending_review`, `approved` or `rejected` item is never returned by a public endpoint.
- **AC-10**: Sending an item back to `draft` keeps its full history, including the review that rejected it.
- **AC-11**: A donation moves `recorded` to `verified` to `voided` only, and never through the content states.
- **AC-12**: The person who verifies a donation must be a different person from the one who recorded it, unless they hold `workflow.selfApprove`.
- **AC-13**: No financial record is ever deleted or edited in place. A correction is a void plus a new record, and both remain readable.
- **AC-14**: Voiding requires a reason of at least the configured minimum length, stored with the void.

## Design

### The content state machine

Four states in the normal life of an item, plus one for refusal.

```
draft ──submit──▶ pending_review ──approve──▶ approved ──publish──▶ published
  ▲                    │   │                                            │
  └───send back────────┘   └──reject──▶ rejected ──reopen──▶ draft ◀────┘
                                                              withdraw
```

| From | To | Action | Permission required | Extra rule |
|---|---|---|---|---|
| (new) | `draft` | create | the type's `create` permission | author recorded as `submittedBy` on first submit, not on create |
| `draft` | `pending_review` | submit | the type's `update` permission | actor must be the author, or hold `workflow.review` |
| `pending_review` | `draft` | send back | `workflow.review` | a note is required and is kept in history |
| `pending_review` | `approved` | approve | `workflow.approve` | actor must not be `submittedBy`, and review must exist when the type requires it |
| `pending_review` | `rejected` | reject | `workflow.review` | a reason is required |
| `rejected` | `draft` | reopen | the type's `update` permission | history is preserved |
| `approved` | `published` | publish | the type's `publish` permission | actor must not be `submittedBy` |
| `approved` | `draft` | send back | `workflow.review` | |
| `published` | `draft` | withdraw | the type's `publish` permission | the public site stops showing it immediately |

**On review as a rule rather than a state.** The brief describes two people: a secretary reviews, then the president or admin approves. That is modelled as one state with a recorded review, not two states. A reviewer acting on a `pending_review` item stamps `reviewedBy` and `reviewedAt` and leaves the item where it is; the approver then moves it forward. When the content type is marked as requiring review, approving an item with no `reviewedBy` is refused. Same audit trail, same two people, one fewer state to reason about, and a type that needs no review just skips the requirement flag.

**On the President.** `president` is a position and grants nothing, exactly as the umbrella decided. The approver is whoever holds `workflow.approve`, which in practice is the person elected President carrying the `mosque_admin` role. When the President changes, someone reassigns the role and the position, and no code changes. This is the clearest place the position and role split pays for itself.

### Where the workflow lives

A shared mongoose schema fragment, `server/models/workflow.js`, mixed into any collection that needs it, plus one shared transition function.

| Field | Meaning |
|---|---|
| `status` | one of the five states, default `draft` |
| `submittedBy`, `submittedAt` | who handed it in |
| `reviewedBy`, `reviewedAt` | who looked at it |
| `approvedBy`, `approvedAt` | who signed it off |
| `publishedBy`, `publishedAt` | who put it live |
| `rejectedBy`, `rejectedAt`, `rejectionReason` | who refused it and why |
| `history[]` | append only list of `{ from, to, action, actorId, note, at }` |

```js
// server/workflow/transition.js
// The only function that changes a workflow status. Every controller calls this.
async function transition(doc, action, actor, { note } = {}) { /* table lookup, guards, stamps, history */ }
```

The transition table is data, keyed by content type only for the three type specific permissions (`create`, `update`, `publish`) and the review requirement flag. Everything else is shared.

| Content type | Create | Update | Publish | Review required |
|---|---|---|---|---|
| Khutbah | `khutbah.create` | `khutbah.update` | `khutbah.publish` | yes |
| Event | `event.create` | `event.update` | `event.publish` | yes |
| Announcement | `announcement.manage` | `announcement.manage` | `announcement.publish` | no |
| Article | `article.manage` | `article.manage` | `announcement.publish` | no |

Khutbah and Event are built first, as the umbrella decided. The other two rows are recorded now so the table's shape is settled, and they are wired when those modules are built.

Reading the permissions against the role map from child spec `0001`: an imam can create and update a khutbah but cannot publish one, a secretary can create and update an event and can review, and only `mosque_admin` and above can approve and publish. The workflow described in the brief falls out of the existing role map with no special cases.

### The money path

Donations do not use the machine above. They use three states and no publishing.

```
recorded ──verify──▶ verified ──void──▶ voided
    └───────────────void──────────────────┘
```

| From | To | Action | Permission | Extra rule |
|---|---|---|---|---|
| (new) | `recorded` | record | `donation.record` | `recordedBy` stamped |
| `recorded` | `verified` | verify | `donation.verify` | actor must not be `recordedBy` |
| `recorded` | `voided` | void | `donation.manage` | reason required |
| `verified` | `voided` | void | `donation.manage` | reason required, and the original stays readable |

A receipt number is issued at verification, never at recording, so an unverified donation has no receipt to hand out. A correction is a void plus a fresh record, never an edit, and the void carries a pointer to the replacement when there is one.

The different actor rule bites the treasurer too, because a treasurer holds both `donation.record` and `donation.verify`. That is intended: a treasurer who takes money at the door needs someone else to confirm it. Where a mosque genuinely has one person doing both, the escape is to grant that named person `workflow.selfApprove` deliberately, which is auditable per use rather than a silent hole in the model.

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Any transition | The permission to check | The transition table, looked up by content type and action |
| Any transition | `actorId` on the stamp and the history entry | `req.user._id`, never the request body |
| Any transition | `at` timestamps | Server clock at save time, never a client supplied time |
| Approve | Whether review exists | `reviewedBy` on the document, compared against the type's review requirement |
| Approve or publish | Whether this is self approval | `submittedBy` compared with `req.user._id` |
| Public listing | Which items to return | `status: "published"` plus `mosqueId`, applied in the public controller |
| Verify a donation | Receipt number | Generated at verification from the mosque's receipt sequence |
| Void | The reason | Request body, validated against `VOID_REASON_MIN_LENGTH` |
| Any self approval | Audit entry | Written by the transition function itself, so no controller can forget it |

### Key invariants

- One function changes a status. A controller that assigns `status` directly is a bug, and the lint rule bans assignment to `status` outside `server/workflow/`.
- The transition table is the only description of what may follow what.
- `history` is append only, and a send back never trims it.
- Public endpoints filter on `published`. This is asserted by test for every public route, not left to review.
- No financial record is deleted or edited in place, ever.
- `workflow.selfApprove` exists so the exception is explicit and logged, not so it becomes routine. Only `super_admin` holds it by default.

### Security model

- The self approval guard is the point of the whole spec, so it lives inside `transition()` where it cannot be skipped, rather than in each controller.
- The permission for each transition comes from the table, so a new content type cannot accidentally ship with a weaker guard than an existing one.
- Financial voiding needs `donation.manage`, which a cashier does not hold, which is exactly the cashier restriction the brief asked for expressed as a permission rather than a role check.
- Every transition on a financial record writes an `AuditLog` entry, not only the access changes covered in child spec `0001`.
- A rejected item's reason is visible to its author and to staff, and never on any public endpoint.

### Configuration required

- `VOID_REASON_MIN_LENGTH`: minimum characters for a void reason, default 10.
- `RECEIPT_PREFIX`: the mosque's receipt number prefix, read from the `Mosque` record rather than the environment when it is set there.

### Critical test scenarios

- Happy path, khutbah: an imam submits, a secretary reviews, an admin approves and publishes, and the item appears publicly only at the last step, verifies **AC-1**, **AC-3**, **AC-5**, **AC-9**.
- Self approval: an admin submits an event and tries to approve it, expecting `403 SELF_APPROVAL_REFUSED`, verifies **AC-6**.
- Deliberate exception: a super admin does the same successfully and an audit entry is written, verifies **AC-7**.
- Missing review: an admin approves a khutbah with no `reviewedBy` and is refused, verifies **AC-8**.
- Illegal jump: a direct attempt to move a `draft` to `published` is refused, verifies **AC-4**.
- Publish permission: an imam with an approved khutbah cannot publish it, verifies **AC-3**.
- Send back: a reviewer returns an item to `draft` with a note, and the history still holds every earlier entry, verifies **AC-10**.
- Public leak check: every public endpoint is called with unpublished items present in the database and returns none of them, verifies **AC-9**.
- Donation path: a cashier records, cannot verify their own, and a treasurer verifies successfully, verifies **AC-11**, **AC-12**.
- Treasurer both hats: a treasurer records and then tries to verify the same donation, expecting refusal, verifies **AC-12**.
- No deletion: attempt a delete on a verified donation through the model and confirm it is impossible, then void it and confirm both records remain, verifies **AC-13**.
- Void reason: void with a two character reason and confirm the validation error, verifies **AC-14**.
- Receipt timing: confirm a `recorded` donation has no receipt number and a `verified` one does, verifies **AC-11**.

## Build plan

1. Write `server/workflow/states.js`: the five content states, the three donation states, and the transition table with the type specific permissions and the review flag, satisfies **AC-2**, **AC-4**.
2. Write `server/models/workflow.js`, the shared schema fragment with the stamps and the append only `history`, satisfies **AC-5**, **AC-10**.
3. Write `server/workflow/transition.js`: the table lookup, the permission check through `can()`, the self approval guard, the review requirement check, the stamping, the history append, and the audit write for any self approval, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-8**.
4. Add the lint rule banning assignment to `status` outside `server/workflow/`, satisfies the invariants.
5. Write the transition unit tests covering every legal move, every illegal move, and both self approval paths, satisfies **AC-3**, **AC-4**, **AC-6**, **AC-7**.
6. Mix the fragment into `models/Khutbah.js`, add its controller transitions and the dashboard review screen, satisfies **AC-1**, **AC-8**.
7. Mix the fragment into `models/Event.js`, add its controller transitions, and make the public events endpoint filter on `published`, satisfies **AC-9**.
8. Write the public leak test as one table driven test over every public route, so a new public route without the filter fails immediately, satisfies **AC-9**.
9. Write `models/Donation.js` with the three states, the `recordedBy` and `verifiedBy` stamps, the receipt number at verification, and model level blocking of delete and of edits to a verified record, satisfies **AC-11**, **AC-13**.
10. Add the donation transitions with the different actor rule and the void reason validation, satisfies **AC-12**, **AC-14**.
11. Add the dashboard queue: a single pending list showing everything awaiting the signed in person's review or approval, built from the same table so it needs no per type code, satisfies **AC-1**.
12. Write the remaining scenario tests above, satisfies **AC-9**, **AC-10**, **AC-12**, **AC-13**.

## Rationale, short

One machine shared by every content type was chosen over a workflow per module because the modules do not actually differ. Khutbah, event, announcement and article all need the same four states and the same two extra people; what differs is only which permission lets you create and publish, and that is three cells in a table. A workflow per module would mean four self approval guards, and the fourth one is the one somebody forgets. Money is deliberately not on that machine, because publishing and verifying are different acts: publishing is reversible and verifying is an assertion about cash that arrived, so it gets append only records and voiding instead of a status you can walk backwards. Full reasoning is in [rationale.md](rationale.md).
