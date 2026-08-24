import type { TransformFnParams } from 'class-transformer';

/**
 * Normalisers for the fields where the stored form differs from what a form submits.
 *
 * The same three the users module declares in `create-user.dto.ts`. They are repeated here rather than
 * imported across module boundaries because a DTO reaching into another feature's DTO file to borrow a
 * helper couples the two in a direction neither wants; these are four lines of pure string handling
 * with no domain in them.
 *
 * Each is a named function rather than an inline arrow so it can state that it returns `unknown`.
 * `TransformFnParams.value` is `any` — a non-string reaching one of these is a validation error the
 * decorator is about to raise, so the value passes through untouched rather than being coerced, and the
 * cast stops that pass-through from spreading `any` into the DTO.
 */

export function trimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export function normalisedEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown);
}

/** Strips the spaces and dashes people type, leaving the E.164 digits the column stores. */
export function compactedPhone({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : (value as unknown);
}
