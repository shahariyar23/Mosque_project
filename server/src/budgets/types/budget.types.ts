import { Prisma } from '@prisma/client';

/**
 * The shapes the budgets module shares between its service, controller, DTOs and tests.
 *
 * `BUDGET_SELECT` is the single definition of what a budget is over HTTP. `mosqueId` is not returned: a caller
 * can only ever read their own mosque's budgets, so echoing its id adds an internal identifier to every row in
 * exchange for nothing.
 *
 * `createdBy` is an id and a name, and deliberately not the user record. Who set a figure is part of the
 * record; their email, phone and role are not.
 *
 * Nothing here is a total, and nothing here is `spent` or `remaining`. A budget row is what somebody planned.
 * What was actually spent against it lives in the expenses table, and the two are put side by side by
 * `GET /financial-reports/budget`, which aggregates both — a `spent` column here would be a figure this
 * module had no way to keep current.
 */

/** Columns a budget endpoint may return. */
export const BUDGET_SELECT = {
  id: true,
  name: true,
  category: true,
  amount: true,
  currency: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.BudgetSelect;

/** What Prisma hands back for `BUDGET_SELECT`, derived so the two cannot drift apart. */
export type SelectedBudget = Prisma.BudgetGetPayload<{ select: typeof BUDGET_SELECT }>;

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_BUDGET_PAGE_SIZE = 20;
