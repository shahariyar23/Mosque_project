import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService - Titan Email SMTP Transport', () => {
  let service: MailService;
  let configService: { get: jest.Mock };
  let mockTransporter: {
    verify: jest.Mock;
    sendMail: jest.Mock;
  };

  beforeEach(async () => {
    mockTransporter = {
      verify: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue({ messageId: '<test-message-id@titan.email>' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    configService = {
      get: jest.fn((key: string) => {
        const mockEnv: Record<string, unknown> = {
          EMAIL_HOST: 'smtp.titan.email',
          EMAIL_PORT: 465,
          EMAIL_SECURE: true,
          EMAIL_USER: 'noreply@mostak.tech',
          EMAIL_PASSWORD: 'test-secure-password',
          EMAIL_FROM: 'noreply@mostak.tech',
          EMAIL_FROM_NAME: 'NOOR',
        };
        return mockEnv[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes Titan SMTP transporter with configured parameters', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.titan.email',
      port: 465,
      secure: true,
      auth: {
        user: 'noreply@mostak.tech',
        pass: 'test-secure-password',
      },
    });
    expect(service.isConfigured()).toBe(true);
  });

  describe('verifyConnection', () => {
    it('returns ok=true when SMTP verification passes', async () => {
      mockTransporter.verify.mockResolvedValueOnce(true);

      const status = await service.verifyConnection();

      expect(status.ok).toBe(true);
      expect(status.configured).toBe(true);
      expect(status.host).toBe('smtp.titan.email');
      expect(status.port).toBe(465);
      expect(status.secure).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('returns ok=false and captures error message when SMTP verification fails', async () => {
      mockTransporter.verify.mockRejectedValueOnce(new Error('Invalid Titan credentials'));

      const status = await service.verifyConnection();

      expect(status.ok).toBe(false);
      expect(status.configured).toBe(true);
      expect(status.message).toContain('Invalid Titan credentials');
    });
  });

  describe('sendMail', () => {
    it('successfully sends email with default from sender identity', async () => {
      const result = await service.sendMail({
        to: 'user@example.com',
        subject: 'Welcome to NOOR',
        text: 'Test content',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<test-message-id@titan.email>');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"NOOR" <noreply@mostak.tech>',
        to: 'user@example.com',
        subject: 'Welcome to NOOR',
        html: '<p>Test content</p>',
        text: 'Test content',
        replyTo: undefined,
        cc: undefined,
        bcc: undefined,
      });
    });

    it('allows overriding the from address', async () => {
      await service.sendMail({
        from: '"Custom Sender" <custom@mostak.tech>',
        to: 'user@example.com',
        subject: 'Custom sender test',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Custom Sender" <custom@mostak.tech>',
        }),
      );
    });

    it('gracefully catches sendMail errors without throwing unhandled exceptions', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await service.sendMail({
        to: 'user@example.com',
        subject: 'Test subject',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('unconfigured state', () => {
    it('sets dormant mode when credentials are not configured or are default placeholders', async () => {
      const unconfiguredConfig = {
        get: jest.fn((key: string) => {
          if (key === 'EMAIL_PASSWORD') return 'replace-with-titan-password';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [MailService, { provide: ConfigService, useValue: unconfiguredConfig }],
      }).compile();

      const unconfiguredService = module.get<MailService>(MailService);
      expect(unconfiguredService.isConfigured()).toBe(false);

      const verifyStatus = await unconfiguredService.verifyConnection();
      expect(verifyStatus.ok).toBe(false);
      expect(verifyStatus.configured).toBe(false);

      const sendResult = await unconfiguredService.sendMail({
        to: 'test@example.com',
        subject: 'Test',
      });
      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toContain('not configured');
    });
  });
});
