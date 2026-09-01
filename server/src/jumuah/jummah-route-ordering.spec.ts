import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { JumuahModule } from './jumuah.module';
import { JumuahService } from './jumuah.service';
import { JummahCollectionsService } from './jummah-collections.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('Jumuah Route Order & Routing Resolution (PART 8 Routing Audit)', () => {
  let app: INestApplication;

  const mockUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@noormosque.org',
    role: Role.mosque_admin,
    mosqueId: '22222222-2222-4222-8222-222222222222',
    permissions: [
      'prayer.view',
      'jumuah.manage',
      'jumuah_collection.view',
      'jumuah_collection.record',
      'jumuah_collection.manage',
    ],
    deniedPermissions: [],
    isActive: true,
  };

  const mockJumuahService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333' }),
  };

  const mockCollectionsService = {
    findAll: jest.fn().mockResolvedValue({
      rows: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          date: '2026-08-28',
          amount: '10000.00',
          currency: 'BDT',
          status: 'completed',
          fund: { id: 'fund-1', name: 'General Fund', slug: 'general' },
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JumuahModule],
    })
      .overrideProvider(JumuahService)
      .useValue(mockJumuahService)
      .overrideProvider(JummahCollectionsService)
      .useValue(mockCollectionsService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AuditLogService)
      .useValue({})
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /jummah/collections?page=1&limit=10 resolves to JummahCollectionsController.findAll (200 OK, not 400)', async () => {
    const res = await request(app.getHttpServer())
      .get('/jummah/collections?page=1&limit=10')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe('10000.00');
    expect(mockCollectionsService.findAll).toHaveBeenCalled();
  });

  it('2. GET /jummah/:id with a valid schedule UUID resolves to JumuahController.findOne', async () => {
    const validUuid = '33333333-3333-4333-8333-333333333333';
    const res = await request(app.getHttpServer())
      .get(`/jummah/${validUuid}`)
      .expect(200);

    expect(mockJumuahService.findOne).toHaveBeenCalledWith(mockUser.mosqueId, validUuid);
  });

  it('3. GET /jummah/:id with an invalid non-UUID string triggers ParseUUIDPipe (400 Bad Request)', async () => {
    const res = await request(app.getHttpServer())
      .get('/jummah/not-a-valid-uuid')
      .expect(400);

    expect(res.body.message).toContain('Validation failed (uuid is expected)');
  });
});
