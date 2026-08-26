import { Prisma } from '@prisma/client';

/**
 * The shapes the expenses module shares between its service, controller, DTOs and tests.
 *
 * `EXPENSE_SELECT` is the single definition of what an expense is over HTTP. `mosqueId` is not returned: a
 * caller can only ever read their own mosque's expenses, so echoing its id adds an internal identifier to
 * every row in exchange for nothing.
 *
 * `createdBy` is an id and a name, and deliberately not the user record. Who entered a payment is part of
 * the record — it is the answer to "who booked this?" — but their email, phone and role are not, and copying
 * the account into every row would hand out contact details as a side effect of reading the books.
 *
 * Nothing here is a total. An expense reports itself; there is no running balance, no month-to-date, no
 * budget remaining. Those are derived from these rows when financial reports arrive in a later part, and a
 * figure published here would be one nobody had reconciled.
 */

/** Columns an expense endpoint may return. */
export const EXPENSE_SELECT = {
  id: true,
  category: true,
  description: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  status: true,
  expenseDate: true,
  reference: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ExpenseSelect;

/** What Prisma hands back for `EXPENSE_SELECT`, derived so the two cannot drift apart. */
export type SelectedExpense = Prisma.ExpenseGetPayload<{ select: typeof EXPENSE_SELECT }>;

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_EXPENSE_PAGE_SIZE = 20;
