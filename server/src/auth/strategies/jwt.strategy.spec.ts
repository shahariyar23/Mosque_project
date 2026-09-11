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
    expect(mockPrisma.mosque.findUnique).not.toHaveBeenCalled();
  });

  it('strictly rejects x-mosque-id header when user is not super_admin', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(MOSQUE_ADMIN_USER);

    const req = {
      headers: { 'x-mosque-id': 'mosque-002' },
    } as unknown as Request;

    const result = await strategy.validate(req, { sub: MOSQUE_ADMIN_USER.id } as any);

    expect(result.mosqueId).toBe('mosque-001'); // strictly locked to own mosque
    expect(mockPrisma.mosque.findUnique).not.toHaveBeenCalled();
  });

  it('switches mosqueId when super_admin passes a valid existing target mosque', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(SUPER_ADMIN_USER);
    mockPrisma.mosque.findUnique.mockResolvedValue({ id: 'mosque-002' });

    const req = {
      headers: { 'x-mosque-id': 'mosque-002' },
    } as unknown as Request;

    const result = await strategy.validate(req, { sub: SUPER_ADMIN_USER.id } as any);

    expect(mockPrisma.mosque.findUnique).toHaveBeenCalledWith({
      where: { id: 'mosque-002' },
      select: { id: true },
    });
    expect(result.mosqueId).toBe('mosque-002');
  });

  it('retains original mosqueId when super_admin passes non-existent mosque ID', async () => {
    jest.spyOn(resolveSubjectModule, 'resolveSubject').mockResolvedValue(SUPER_ADMIN_USER);
    mockPrisma.mosque.findUnique.mockResolvedValue(null);

    const req = {
      headers: { 'x-mosque-id': 'non-existent-mosque-id' },
    } as unknown as Request;

    const result = await strategy.validate(req, { sub: SUPER_ADMIN_USER.id } as any);

    expect(result.mosqueId).toBe('mosque-001');
  });
});
