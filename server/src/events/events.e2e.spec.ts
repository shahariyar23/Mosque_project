import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../bootstrap';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { env, type AppConfig } from '../config/app.config';

describe('Events (E2E Integration)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: AppConfig;
  let testMosqueId: string;
  let testUserId: string;
  let bearerToken: string;
  let createdEventId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    config = app.get(ConfigService);

    // Get an active mosque and user
    const mosque = await prisma.mosque.findFirst({ where: { isActive: true } });
    if (!mosque) {
      throw new Error('No active mosque in test database');
    }
    testMosqueId = mosque.id;

    // Find or create admin user for test
    let user = await prisma.user.findFirst({
      where: { mosqueId: testMosqueId, role: 'super_admin', isActive: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { mosqueId: testMosqueId, isActive: true },
      });
    }

    if (!user) {
      throw new Error('No active user in test database');
    }

    testUserId = user.id;

    // Sign a real access token
    bearerToken = await jwt.signAsync(
      {
        sub: testUserId,
        email: user.email,
        role: 'super_admin',
        mosqueId: testMosqueId,
      },
      {
        secret: env.accessSecret(config),
        expiresIn: '1h',
      },
    );

    configureApp(app, config);
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (createdEventId) {
      await prisma.event.deleteMany({ where: { id: createdEventId } });
    }
    await app.close();
  });

  it('1. POST /api/v1/events — creates an event with live DB persistence', async () => {
    const payload = {
      title: 'Community Hadith Circle',
      category: 'education',
      date: '2026-09-20',
      startTime: '18:00',
      endTime: '19:30',
      location: 'Conference Room B',
      speaker: 'Ustadh Omar',
      description: 'Weekly in-depth reading of Imam Nawawi 40 Hadith.',
      capacity: 50,
      registrationRequired: true,
      contribution: 0,
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(payload)
      .expect(HttpStatus.CREATED);

    const body = res.body.data ?? res.body;
    expect(body).toHaveProperty('id');
    expect(body.title).toBe('Community Hadith Circle');
    expect(body.category).toBe('education');
    expect(body.slug).toContain('community-hadith-circle');
    expect(body.registered).toBe(0);

    createdEventId = body.id;
  });

  it('2. GET /api/v1/events — lists events with search and category filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/events?category=education&search=Hadith')
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(HttpStatus.OK);

    const body = res.body.data ?? res.body;
    expect(body).toHaveProperty('rows');
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBeGreaterThanOrEqual(1);

    const found = body.rows.find((e: any) => e.id === createdEventId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Community Hadith Circle');
  });

  it('3. GET /api/v1/events/:id — gets single event by ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/events/${createdEventId}`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(HttpStatus.OK);

    const body = res.body.data ?? res.body;
    expect(body.id).toBe(createdEventId);
    expect(body.speaker).toBe('Ustadh Omar');
  });

  it('4. PATCH /api/v1/events/:id — updates event details', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/events/${createdEventId}`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        capacity: 80,
        speaker: 'Ustadh Omar & Shaykh Bilal',
      })
      .expect(HttpStatus.OK);

    const body = res.body.data ?? res.body;
    expect(body.capacity).toBe(80);
    expect(body.speaker).toBe('Ustadh Omar & Shaykh Bilal');
  });

  it('5. DELETE /api/v1/events/:id — soft deletes / cancels event', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/events/${createdEventId}`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(HttpStatus.OK);

    const body = res.body.data ?? res.body;
    expect(body.status).toBe('cancelled');

    // Confirm it no longer appears in default list
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(HttpStatus.OK);

    const listBody = listRes.body.data ?? listRes.body;
    const found = listBody.rows.find((e: any) => e.id === createdEventId);
    expect(found).toBeUndefined();
  });
});
