import { NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { PublicTenantGuard } from './public-tenant.guard';

function contextFor(input: {
  path: string;
  origin?: string;
  params?: { slug?: string };
  query?: { mosqueSlug?: string };
}): ExecutionContext {
  const request = {
    method: 'GET',
    path: input.path,
    params: input.params ?? {},
    query: input.query ?? {},
    headers: input.origin ? { origin: input.origin } : {},
  };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PublicTenantGuard', () => {
  it('accepts a matching public mosque domain and slug', async () => {
    const prisma = {
      mosque: {
        findFirst: jest.fn().mockResolvedValue({ id: 'uttara-id', slug: 'uttara' }),
      },
    };
    const guard = new PublicTenantGuard(prisma as never);

    await expect(
      guard.canActivate(
        contextFor({
          path: '/api/v1/public/mosques/uttara/events',
          origin: 'https://uttara.mostak.tech',
          params: { slug: 'uttara' },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects a cross-tenant public slug', async () => {
    const prisma = { mosque: { findFirst: jest.fn().mockResolvedValue(null) } };
    const guard = new PublicTenantGuard(prisma as never);

    await expect(
      guard.canActivate(
        contextFor({
          path: '/api/v1/public/mosques/noor-jame-masjid/mosque',
          origin: 'https://uttara.mostak.tech',
          params: { slug: 'noor-jame-masjid' },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an unknown public domain', async () => {
    const prisma = { mosque: { findFirst: jest.fn().mockResolvedValue(null) } };
    const guard = new PublicTenantGuard(prisma as never);

    await expect(
      guard.canActivate(
        contextFor({
          path: '/api/v1/public/mosques/north/events',
          origin: 'https://north.mostak.tech',
          params: { slug: 'north' },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('derives the generic public event slug from the origin', async () => {
    const prisma = {
      mosque: {
        findFirst: jest.fn().mockResolvedValue({ id: 'uttara-id', slug: 'uttara' }),
      },
    };
    const guard = new PublicTenantGuard(prisma as never);
    const context = contextFor({
      path: '/api/v1/events',
      origin: 'https://uttara.mostak.tech',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((context.switchToHttp().getRequest() as { query: { mosqueSlug?: string } }).query.mosqueSlug).toBe('uttara');
  });
});