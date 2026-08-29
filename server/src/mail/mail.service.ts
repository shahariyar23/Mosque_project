import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { env, type AppConfig } from '../config/app.config';
import type { MailConnectionStatus, MailSendResult, SendMailOptions } from './mail.types';
import {
  renderForgotPasswordHtml,
  renderForgotPasswordText,
  type ForgotPasswordTemplateData,
} from './templates/forgot-password.template';
import {
  renderLoginAlertHtml,
  renderLoginAlertText,
  type LoginAlertTemplateData,
} from './templates/login-alert.template';
import {
  renderPasswordSuccessHtml,
  renderPasswordSuccessText,
  type PasswordSuccessTemplateData,
} from './templates/password-success.template';
import {
  renderReceiptIssuedHtml,
  renderReceiptIssuedText,
  type ReceiptIssuedTemplateData,
} from './templates/receipt-issued.template';

/**
 * Reusable email transport and workflow delivery service using Titan Email SMTP.
 *
 * Provides resilient email dispatch, templating, and safe transport verification without leaking credentials.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(@Inject(ConfigService) private readonly config: AppConfig) {
    this.initializeTransporter();
  }

  /**
   * Initializes the Nodemailer transport with configured Titan SMTP settings.
   */
  private initializeTransporter(): void {
    if (env.nodeEnv(this.config) === 'test') {
      this.transporter = null;
      return;
    }

    const host = env.emailHost(this.config);
    const port = env.emailPort(this.config);
    const secure = env.emailSecure(this.config);
    const user = env.emailUser(this.config);
    const pass = env.emailPassword(this.config);

    if (!user || !pass || pass === 'replace-with-titan-password' || pass === 'replace-me') {
      this.logger.warn(
        `Email credentials (EMAIL_USER / EMAIL_PASSWORD) not fully configured. Mail transport is currently dormant.`,
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(
      `Titan SMTP transport configured for ${user} via ${host}:${port} (SSL/TLS=${secure})`,
    );
  }

  /**
   * Checks whether the transport has valid credentials configured.
   */
  public isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Safe development-only SMTP connection diagnostic.
   *
   * Verifies DNS resolution, TLS handshake, and authentication without sending real emails.
   */
  public async verifyConnection(): Promise<MailConnectionStatus> {
    const host = env.emailHost(this.config);
    const port = env.emailPort(this.config);
    const secure = env.emailSecure(this.config);

    if (!this.transporter) {
      return {
        ok: false,
        message:
          'Mail transport is not configured. Missing or placeholder EMAIL_USER/EMAIL_PASSWORD.',
        host,
        port,
        secure,
        configured: false,
        timestamp: new Date(),
      };
    }

    try {
      await this.transporter.verify();
      this.logger.log(
        `Titan SMTP connection and authentication verified successfully on ${host}:${port}`,
      );
      return {
        ok: true,
        message: 'Titan SMTP transport connection and authentication verified successfully.',
        host,
        port,
        secure,
        configured: true,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Titan SMTP connection verification failed for ${host}:${port}: ${errorMessage}`,
      );
      return {
        ok: false,
        message: `Titan SMTP verification failed: ${errorMessage}`,
        host,
        port,
        secure,
        configured: true,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Dispatches an email message using Titan SMTP.
   *
   * Fails gracefully without throwing unhandled exceptions into business transaction boundaries.
   */
  public async sendMail(options: SendMailOptions): Promise<MailSendResult> {
    if (!this.transporter) {
      const msg =
        'Cannot send email: Titan SMTP transport is not configured. Please set valid EMAIL_USER and EMAIL_PASSWORD.';
      this.logger.warn(msg);
      return { success: false, error: msg };
    }

    const defaultFrom = `"${env.emailFromName(this.config)}" <${env.emailFrom(this.config)}>`;

    try {
      const info = (await this.transporter.sendMail({
        from: options.from ?? defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
      })) as { messageId?: string };

      const messageId = typeof info?.messageId === 'string' ? info.messageId : undefined;
      const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      this.logger.log(
        `Email dispatched: "${options.subject}" to ${recipient} [MessageId: ${messageId ?? 'unknown'}]`,
      );
      return { success: true, ...(messageId ? { messageId } : {}) };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email "${options.subject}": ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sends the password reset recovery link email using template 03-forgot-password.html.
   */
  public async sendPasswordResetEmail(
    to: string,
    data: ForgotPasswordTemplateData,
  ): Promise<MailSendResult> {
    const html = renderForgotPasswordHtml(data);
    const text = renderForgotPasswordText(data);

    return this.sendMail({
      to,
      subject: 'Reset Your NOOR Password',
      html,
      text,
    });
  }

  /**
   * Sends the password reset success confirmation email using template 04-password-success.html.
   */
  public async sendPasswordResetSuccessEmail(
    to: string,
    data: PasswordSuccessTemplateData,
  ): Promise<MailSendResult> {
    const html = renderPasswordSuccessHtml(data);
    const text = renderPasswordSuccessText(data);

    return this.sendMail({
      to,
      subject: 'Your NOOR Password Has Been Changed',
      html,
      text,
    });
  }

  /**
   * Sends a login notification alert email using template 05-login-alert.html.
   */
  public async sendLoginAlertEmail(
    to: string,
    data: LoginAlertTemplateData,
  ): Promise<MailSendResult> {
    const html = renderLoginAlertHtml(data);
    const text = renderLoginAlertText(data);

    return this.sendMail({
      to,
      subject: 'New Sign-In Detected — NOOR',
      html,
      text,
    });
  }

  /**
   * Sends an official payment receipt confirmation email.
   * Fails gracefully if recipient email is empty or mail transport is dormant.
   */
  public async sendReceiptIssuedEmail(
    to: string,
    data: ReceiptIssuedTemplateData,
  ): Promise<MailSendResult> {
    if (!to || !to.trim() || !to.includes('@')) {
      return { success: false, error: 'No valid recipient email provided.' };
    }

    const html = renderReceiptIssuedHtml(data);
    const text = renderReceiptIssuedText(data);

    return this.sendMail({
      to: to.trim(),
      subject: `Payment Receipt: ${data.receiptNumber} — ${data.mosqueName || 'NOOR'}`,
      html,
      text,
    });
  }
}
