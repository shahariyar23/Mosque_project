import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

import { isPermission } from '../constants/permissions';

/** Permission-shaped enough to quote back in an error without becoming a reflection surface. */
const QUOTABLE = /^[\w.-]{1,60}$/;

/**
 * Validates a string against the compile-time permission registry.
 *
 * This exists instead of `@IsIn(ALL_PERMISSIONS)` for one reason: `@IsIn` prints the whole allowed set
 * in its failure message, and the allowed set is 130 permissions. The 400 would be several kilobytes of
 * noise per bad element. This names the offending value and points at `GET /permissions` for the list.
 *
 * The registry is the authority, not the request. A client can send any string it likes; if code does
 * not declare it, it is not a permission, and storing it would leave a value on the user row that no
 * guard will ever match — a grant that silently does nothing, which is worse than a rejection.
 */
export function IsPermission(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isPermission',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isPermission(value);
        },
        defaultMessage(args: ValidationArguments): string {
          const offender =
            typeof args.value === 'string' && QUOTABLE.test(args.value)
              ? `"${args.value}"`
              : 'that value';

          return `${offender} is not a permission this API recognises — see GET /api/v1/permissions`;
        },
      },
    });
  };
}
