import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { ALL_PERMISSIONS } from '../common/constants/permissions';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const service = new PermissionsService();

  describe('findMany', () => {
    it('returns the whole registry, once each', () => {
      const { rows, meta } = service.findMany();
      const ids = rows.map((row) => row.id);

      expect(ids).toEqual([...ALL_PERMISSIONS]);
      expect(meta.total).toBe(ALL_PERMISSIONS.length);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('names every group, in registry order', () => {
      const { rows, meta } = service.findMany();

      expect(meta.groups[0]).toBe('base');
      expect(meta.groups).toContain('finance');
      // Every row's group is one the meta declares, so a client can section the list without guessing.
      expect(rows.every((row) => meta.groups.includes(row.group))).toBe(true);
    });
  });

  describe('findOne', () => {
    it('splits a permission into resource and action', () => {
      expect(service.findOne('donation.record')).toMatchObject({
        id: 'donation.record',
        group: 'donations',
        resource: 'donation',
        action: 'record',
      });
    });

    it('flags the base set, which every active account holds', () => {
      const permission = service.findOne('prayer.view');

      expect(permission.isBase).toBe(true);
      expect(permission.roles.sort()).toEqual(Object.values(Role).sort());
    });

    it('flags platform-only permissions and grants them to super_admin alone', () => {
      const permission = service.findOne('platform.manage');

      expect(permission.isPlatformOnly).toBe(true);
      // The mosque_admin exclusion, asserted from the outside: this is the permission that stops a
      // mosque admin reaching the platform.
      expect(permission.roles).toEqual([Role.super_admin]);
    });

    it('reports which roles already carry a permission', () => {
      const permission = service.findOne('finance.manage');

      expect(permission.isPlatformOnly).toBe(false);
      expect(permission.roles).toEqual(
        expect.arrayContaining([Role.super_admin, Role.mosque_admin, Role.treasurer]),
      );
      expect(permission.roles).not.toContain(Role.cashier);
      expect(permission.roles).not.toContain(Role.member);
    });

    it('rejects a string the registry does not declare, without echoing it back', () => {
      expect(() => service.findOne('finance.<script>')).toThrow(NotFoundException);

      try {
        service.findOne('finance.<script>');
      } catch (error) {
        const response = (error as NotFoundException).getResponse();

        expect(response).toEqual({
          code: 'PERMISSION_NOT_FOUND',
          message: 'That is not a permission this API recognises.',
        });
        expect(JSON.stringify(response)).not.toContain('script');
      }
    });
  });
});
