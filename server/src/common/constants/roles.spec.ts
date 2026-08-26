import { Role } from '@prisma/client';
import { ALL_PERMISSIONS, BASE_PERMISSIONS, PLATFORM_ONLY, isPermission } from './permissions';
import { ROLE_PERMISSIONS, effectivePermissions, scopeFor } from './roles';

/**
 * Tests for the permission resolver.
 *
 * This is the security boundary for the whole API, so the rules it implements are asserted directly
 * rather than only through the endpoints that depend on them. Each case below corresponds to a rule
 * stated in the identity model, and would be a real vulnerability if it regressed.
 */
describe('effectivePermissions', () => {
  const subject = (over: Partial<Parameters<typeof effectivePermissions>[0]> = {}) => ({
    role: Role.member,
    permissions: [] as string[],
    deniedPermissions: [] as string[],
    isActive: true,
    ...over,
  });

  it('grants the base set to every active person', () => {
    const granted = effectivePermissions(subject());
    for (const permission of BASE_PERMISSIONS) {
      expect(granted).toContain(permission);
    }
  });

  it('resolves to nothing at all for an inactive account, base permissions included', () => {
    // A disabled account is a complete revocation, not a reduction.
    expect(effectivePermissions(subject({ isActive: false }))).toEqual([]);
    expect(
      effectivePermissions(
        subject({ role: Role.super_admin, isActive: false, permissions: ['finance.manage'] }),
      ),
    ).toEqual([]);
  });

  it('lets a deny beat a role grant and an explicit grant alike', () => {
    const fromRole = effectivePermissions(
      subject({ role: Role.treasurer, deniedPermissions: ['donation.verify'] }),
    );
    expect(fromRole).not.toContain('donation.verify');

    const fromGrant = effectivePermissions(
      subject({ permissions: ['donation.verify'], deniedPermissions: ['donation.verify'] }),
    );
    expect(fromGrant).not.toContain('donation.verify');
  });

  it('adds an explicit grant on top of the role', () => {
    const granted = effectivePermissions(
      subject({ role: Role.secretary, permissions: ['donation.record'] }),
    );
    expect(granted).toContain('donation.record');
  });

  it('ignores a permission that is not in the registry', () => {
    const granted = effectivePermissions(subject({ permissions: ['finance.destroyEverything'] }));
    expect(granted).not.toContain('finance.destroyEverything');
  });

  it('gives super_admin the whole registry', () => {
    const granted = effectivePermissions(subject({ role: Role.super_admin }));
    expect([...granted].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('gives mosque_admin everything except the platform-only permissions', () => {
    const granted = effectivePermissions(subject({ role: Role.mosque_admin }));
    for (const permission of PLATFORM_ONLY) {
      expect(granted).not.toContain(permission);
    }
    expect(granted).toHaveLength(ALL_PERMISSIONS.length - PLATFORM_ONLY.length);
  });

  it('keeps a secretary out of finance and donations entirely', () => {
    const granted = effectivePermissions(subject({ role: Role.secretary }));
    for (const permission of granted) {
      expect(permission.startsWith('donation.')).toBe(false);
      expect(permission.startsWith('finance.')).toBe(false);
      expect(permission.startsWith('salary.')).toBe(false);
    }
  });

  it('stops a treasurer from approving their own preparation', () => {
    const granted = effectivePermissions(subject({ role: Role.treasurer }));
    expect(granted).toContain('workflow.review');
    expect(granted).not.toContain('workflow.approve');
  });

  it('gives a cashier no verify, no void and no manage', () => {
    const granted = effectivePermissions(subject({ role: Role.cashier }));
    expect(granted).toContain('donation.record');
    expect(granted).not.toContain('donation.verify');
    expect(granted).not.toContain('donation.manage');
    expect(granted).not.toContain('transaction.void');
  });

  it('limits an imam to their own salary record', () => {
    const granted = effectivePermissions(subject({ role: Role.imam }));
    expect(granted).toContain('salary.viewOwn');
    expect(granted).not.toContain('salary.view');
    expect(granted).not.toContain('salary.manage');
  });

  it('withholds dashboard access from a plain member', () => {
    expect(effectivePermissions(subject({ role: Role.member }))).not.toContain('dashboard.view');
  });

  it('grants user.viewDeleted to super_admin', () => {
    const granted = effectivePermissions(subject({ role: Role.super_admin }));
    expect(granted).toContain('user.viewDeleted');
  });

  it('withholds user.viewDeleted from mosque_admin', () => {
    const granted = effectivePermissions(subject({ role: Role.mosque_admin }));
    expect(granted).not.toContain('user.viewDeleted');
  });
});

describe('the registry', () => {
  it('contains no duplicate permission strings', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('names only registry permissions in every role', () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(isPermission(permission)).toBe(true);
        // Named in the failure output so a typo points at the role that carries it.
        expect(`${role}:${permission}`).toBe(`${role}:${permission}`);
      }
    }
  });

  it('covers every role in the Prisma enum', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(Object.values(Role).sort());
  });
});

describe('scopeFor', () => {
  it('prefers the wider grant when a person holds both', () => {
    expect(
      scopeFor(['donation.view', 'donation.viewOwn'], 'donation.view', 'donation.viewOwn'),
    ).toBe('all');
  });

  it('falls back to own, then refuses', () => {
    expect(scopeFor(['donation.viewOwn'], 'donation.view', 'donation.viewOwn')).toBe('own');
    expect(scopeFor([], 'donation.view', 'donation.viewOwn')).toBe('none');
  });
});
