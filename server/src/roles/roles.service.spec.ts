import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { ALL_PERMISSIONS, BASE_PERMISSIONS } from '../common/constants/permissions';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  const service = new RolesService();

  describe('findMany', () => {
    it('returns every role in the schema, and only those', () => {
      const { rows, meta } = service.findMany();

      expect(rows.map((row) => row.id)).toEqual(Object.values(Role));
      expect(meta.total).toBe(Object.values(Role).length);
      // There is no `president`: that is a Position, and the authority to sign something off is
      // `workflow.approve`.
      expect(rows.map((row) => row.id)).not.toContain('president');
    });

    it('gives every role a label and a description', () => {
      const { rows } = service.findMany();

      expect(rows.every((row) => row.name.length > 0 && row.description.length > 0)).toBe(true);
      expect(rows.find((row) => row.id === Role.mosque_admin)?.name).toBe('Mosque Admin');
    });

    it('marks only the roles that reach past a single mosque', () => {
      const platform = service
        .findMany()
        .rows.filter((row) => row.isPlatformRole)
        .map((row) => row.id);

      expect(platform).toEqual([Role.super_admin]);
    });
  });

  describe('findOne', () => {
    it('resolves the whole registry for a super admin', () => {
      const role = service.findOne(Role.super_admin);

      expect(role.permissionCount).toBe(ALL_PERMISSIONS.length);
      expect(role.permissions).toEqual([...ALL_PERMISSIONS].sort());
    });

    it('withholds the platform permissions from a mosque admin', () => {
      const role = service.findOne(Role.mosque_admin);

      expect(role.permissions).not.toContain('platform.manage');
      expect(role.permissions).not.toContain('mosque.create');
      expect(role.permissions).not.toContain('workflow.selfApprove');
      expect(role.permissions).toContain('role.assign');
      expect(role.permissions).toContain('permission.assign');
    });

    it('folds the base set into every role', () => {
      const member = service.findOne(Role.member);

      expect(member.permissions).toEqual(expect.arrayContaining([...BASE_PERMISSIONS]));
      // A member still has no back office: the base set is not `dashboard.view`.
      expect(member.permissions).not.toContain('dashboard.view');
      expect(member.permissionCount).toBe(member.permissions.length);
    });

    it('keeps a treasurer out of governance and a secretary out of finance', () => {
      expect(service.findOne(Role.treasurer).permissions).not.toContain('workflow.approve');
      expect(service.findOne(Role.secretary).permissions).not.toContain('finance.view');
    });

    it('rejects anything that is not a role, case included', () => {
      expect(() => service.findOne('president')).toThrow(NotFoundException);
      expect(() => service.findOne('SUPER_ADMIN')).toThrow(NotFoundException);

      try {
        service.findOne('SUPER_ADMIN');
      } catch (error) {
        expect((error as NotFoundException).getResponse()).toEqual({
          code: 'ROLE_NOT_FOUND',
          message: 'That is not a role this API recognises.',
        });
      }
    });

    it('hands out a copy, not the registry', () => {
      service.findOne(Role.imam).permissions.push('platform.manage');

      expect(service.findOne(Role.imam).permissions).not.toContain('platform.manage');
    });
  });

  describe('findPermissions', () => {
    it('describes exactly what the role resolves to', () => {
      const role = service.findOne(Role.cashier);
      const { rows, meta } = service.findPermissions(Role.cashier);

      expect(meta.total).toBe(role.permissionCount);
      expect(rows.map((row) => row.id).sort()).toEqual(role.permissions);
      expect(rows.every((row) => row.roles.includes(Role.cashier))).toBe(true);
    });

    it('lists the groups those permissions fall in, and no others', () => {
      const { rows, meta } = service.findPermissions(Role.imam);

      expect(meta.groups).toContain('prayer');
      expect(meta.groups).not.toContain('platform');
      expect(new Set(rows.map((row) => row.group))).toEqual(new Set(meta.groups));
    });

    it('rejects an unknown role', () => {
      expect(() => service.findPermissions('accountant')).toThrow(NotFoundException);
    });
  });
});
