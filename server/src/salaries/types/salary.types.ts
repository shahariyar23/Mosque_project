import { Prisma } from '@prisma/client';

/**
 * The columns a salary record shows.
 *
 * `mosqueId` is not among them: a caller only ever reads their own mosque's records, so returning it would add
 * nothing and put an internal key on the wire.
 *
 * `user` is the person being paid, reduced to an id and a name. That reduction is the point — a salary record
 * is one of the most sensitive rows in the system, and whoever may read the payroll should not thereby be
 * handed everybody's email, phone number and account state. Their password hash and tokens are not selectable
 * here at all.
 *
 * There is no `createdById` column on the table and so none here. It would be worth having, but the spec's
 * field list does not include one and this module adds no columns to it beyond `currency`.
 */
export const SALARY_SELECT = {
  id: true,
  amount: true,
  currency: true,
  payPeriod: true,
  paymentDate: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, fullName: true } },
} satisfies Prisma.SalaryRecordSelect;

/** A salary record as read with `SALARY_SELECT`. The only shape the response DTO accepts. */
export type SelectedSalaryRecord = Prisma.SalaryRecordGetPayload<{
  select: typeof SALARY_SELECT;
}>;

/** Rows per page when the caller does not say. `MAX_PAGE_SIZE` is the ceiling, and it is enforced twice. */
export const DEFAULT_SALARY_PAGE_SIZE = 20;
