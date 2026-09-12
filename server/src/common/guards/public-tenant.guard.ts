import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';

type PublicRequest = Request & {
  params: { slug?: string };
  query: { mosqueSlug?: string };
};

/**
 * Keeps browser origin and public route tenant aligned.
 *
 * The route slug is still resolved by each public service through the database. This guard adds the
 * missing browser boundary: a request originating at uttara.mostak.tech cannot ask a public route
 * for a different mosque slug. Requests without an Origin header remain usable for direct API and
 * local development calls; they are still protected by the service level slug lookup.
 */
@Injectable()
export class PublicTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PublicRequest>();
    const isPublicMosqueRoute = request.path.includes('/public/mosques/') && Boolean(request.params?.slug);
    const isPublicEventRoute =
      request.method === 'GET' && /^\/.*\/events(?:\/[^/]+)?$/.test(request.path);
    if (!isPublicMosqueRoute && !isPublicEventRoute) {
      return true;
    }

    const origin = request.headers.origin;
    if (!origin) return true;

    let hostname: string;
    try {
      hostname = new URL(origin).hostname.toLowerCase();
    } catch {
      throw new NotFoundException({
        code: 'PUBLIC_MOSQUE_NOT_FOUND',
        message: 'The public mosque website was not found.',
      });
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    const hostnameLabel = hostname.endsWith('.mostak.tech')
      ? hostname.slice(0, -'.mostak.tech'.length)
      : null;
    const requestedSlug = isPublicMosqueRoute ? request.params.slug : request.query?.mosqueSlug;

    if (hostnameLabel && requestedSlug && requestedSlug !== hostnameLabel) {
      throw new NotFoundException({
        code: 'PUBLIC_MOSQUE_NOT_FOUND',
        message: 'The public mosque website was not found.',
      });
    }

    const mosque = await this.prisma.mosque.findFirst({
      where: {
        domain: hostname,
        isActive: true,
        status: 'active',
      },
      select: { id: true, slug: true },
    });

    if (!mosque) {
      throw new NotFoundException({
        code: 'PUBLIC_MOSQUE_NOT_FOUND',
        message: 'The public mosque website was not found.',
      });
    }

    if (isPublicMosqueRoute) {
      request.params.slug = mosque.slug;
    }
    if (isPublicEventRoute) {
      request.query.mosqueSlug = mosque.slug;
    }

    return true;
  }
}