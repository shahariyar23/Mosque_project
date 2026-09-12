import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import * as resolveSubjectModule from './resolve-subject';

describe('JwtStrategy — Multi-Tenant Context Switching & Isolation', () => {
  let strategy: JwtStrategy;
  let mockPrisma: any;
  let mockConfig: any;

  const SUPER_ADMIN_USER: AuthenticatedUser = {
    id: 'user-super-admin',
    mosqueId: 'mosque-001',
    email: 'super@noor.example',
    role: Role.super_admin,
    permissions: ['platform.manage', 'mosque.create'],
    deniedPermissions: [],
    isActive: true,
  };

  const MOSQUE_ADMIN_USER: AuthenticatedUser = {
    id: 'user-mosque-admin',
    mosqueId: 'mosque-001',
    email: 'admin@noor.example',
    role: Role.mosque_admin,
    permissions: ['mosque.manage'],
    deniedPermissions: [],
    isActive: true,
  };

  beforeEach(() => {
    mockConfig = {
      get: jest.fn().mockReturnValue('test-access-secret-for-jwt-strategy-spec-32b'),
    };

    mockPrisma = {
      mosque: {
        findUnique: jest.fn(),
      },
    };

    strategy = new JwtStrategy(mockConfig as any, mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns original user without modification when no x-mosque-id header is sent', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(SUPER_ADMIN_USER);

    const req = { headers: {} } as Request;
    const result = await strategy.validate(req, { sub: SUPER_ADMIN_USER.id } as any);

    expect(result.mosqueId).toBe('mosque-001');
    expect(result.tenantContext).toBe('global');
    expect(mockPrisma.mosque.findUnique).not.toHaveBeenCalled();
  });

  it('strictly rejects x-mosque-id header when user is not super_admin', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(MOSQUE_ADMIN_USER);

    const req = {
      headers: { 'x-mosque-id': 'mosque-002' },
    } as unknown as Request;

    const result = await strategy.validate(req, { sub: MOSQUE_ADMIN_USER.id } as any);

    expect(result.mosqueId).toBe('mosque-001'); // strictly locked to own mosque
    expect(result.tenantContext).toBe('mosque');
    expect(mockPrisma.mosque.findUnique).not.toHaveBeenCalled();
  });

  it('switches mosqueId when super_admin passes a valid existing target mosque', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(SUPER_ADMIN_USER);
    mockPrisma.mosque.findUnique.mockResolvedValue({ id: 'mosque-002', status: 'active', isActive: true });

    const req = {
      headers: { 'x-mosque-id': 'mosque-002' },
    } as unknown as Request;

    const result = await strategy.validate(req, { sub: SUPER_ADMIN_USER.id } as any);

    expect(mockPrisma.mosque.findUnique).toHaveBeenCalledWith({
      where: { id: 'mosque-002' },
      select: { id: true, status: true, isActive: true },
    });
    expect(result.mosqueId).toBe('mosque-002');
    expect(result.tenantContext).toBe('mosque');
  });

  it('rejects a non-existent mosque instead of falling back to the original mosque', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(SUPER_ADMIN_USER);
    mockPrisma.mosque.findUnique.mockResolvedValue(null);

    const req = {
      headers: { 'x-mosque-id': 'non-existent-mosque-id' },
    } as unknown as Request;

    await expect(strategy.validate(req, { sub: SUPER_ADMIN_USER.id } as any)).rejects.toThrow(
      'The selected mosque is unavailable.',
    );
  });

  it('rejects an inactive target mosque', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(SUPER_ADMIN_USER);
    mockPrisma.mosque.findUnique.mockResolvedValue({ id: 'mosque-002', status: 'suspended', isActive: false });

    const req = {
      headers: { 'x-mosque-id': 'mosque-002' },
    } as unknown as Request;

    await expect(strategy.validate(req, { sub: SUPER_ADMIN_USER.id } as any)).rejects.toThrow(
      'The selected mosque is unavailable.',
    );
  });
});
