import { renderForgotPasswordHtml, renderForgotPasswordText } from './forgot-password.template';
import {
  formatDeviceSummary,
  formatLoginTime,
  renderLoginAlertHtml,
  renderLoginAlertText,
} from './login-alert.template';
import { renderPasswordSuccessHtml, renderPasswordSuccessText } from './password-success.template';

describe('NOOR Mail Templates', () => {
  describe('renderForgotPasswordHtml', () => {
    it('renders HTML containing the reset link, expiration, and NOOR styling', () => {
      const html = renderForgotPasswordHtml({
        resetUrl: 'https://mostak.tech/reset-password?token=abc123xyz',
        expiresIn: '30 minutes',
        userName: 'Brother Ahmad',
        mosqueName: 'Noor Community Mosque',
        supportEmail: 'support@mostak.tech',
        websiteUrl: 'https://mostak.tech',
        websiteDisplay: 'www.mostak.tech',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('href="https://mostak.tech/reset-password?token=abc123xyz"');
      expect(html).toContain('Reset Password');
      expect(html).toContain('This link is valid for 30 minutes.');
      expect(html).toContain('NOOR COMMUNITY MOSQUE');
      expect(html).toContain('mailto:support@mostak.tech');
      expect(html).toContain('#073a2d'); // Deep emerald
      expect(html).toContain('#c79a45'); // Gold
    });

    it('falls back to default values when optional fields are omitted', () => {
      const html = renderForgotPasswordHtml({
        resetUrl: 'http://localhost:3000/reset-password?token=test-token',
      });

      expect(html).toContain('href="http://localhost:3000/reset-password?token=test-token"');
      expect(html).toContain('This link is valid for 30 minutes.');
      expect(html).toContain('NOOR • COMMUNITY MOSQUE');
      expect(html).toContain('mailto:info@mostak.tech');
    });
  });

  describe('renderForgotPasswordText', () => {
    it('renders clean plaintext with reset link and instructions', () => {
      const text = renderForgotPasswordText({
        resetUrl: 'https://mostak.tech/reset-password?token=abc123xyz',
        expiresIn: '30 minutes',
        supportEmail: 'support@mostak.tech',
      });

      expect(text).toContain('Password Reset Request');
      expect(text).toContain('https://mostak.tech/reset-password?token=abc123xyz');
      expect(text).toContain('This link is valid for 30 minutes.');
      expect(text).toContain('support@mostak.tech');
    });
  });

  describe('renderPasswordSuccessHtml', () => {
    it('renders HTML confirming password change with sign in CTA', () => {
      const html = renderPasswordSuccessHtml({
        loginUrl: 'https://mostak.tech/login',
        userName: 'Brother Ahmad',
        mosqueName: 'Noor Community Mosque',
        supportEmail: 'support@mostak.tech',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('href="https://mostak.tech/login"');
      expect(html).toContain('Sign In Now');
      expect(html).toContain('Password Updated');
      expect(html).toContain('Your password has been successfully changed.');
      expect(html).toContain('NOOR COMMUNITY MOSQUE');
    });
  });

  describe('renderPasswordSuccessText', () => {
    it('renders clean plaintext confirmation with sign-in link', () => {
      const text = renderPasswordSuccessText({
        loginUrl: 'https://mostak.tech/login',
        supportEmail: 'support@mostak.tech',
      });

      expect(text).toContain('Password Updated');
      expect(text).toContain('https://mostak.tech/login');
      expect(text).toContain('Your password has been successfully changed.');
    });
  });

  describe('renderLoginAlertHtml', () => {
    it('renders HTML with device, location, timestamp, and Secure Account CTA', () => {
      const html = renderLoginAlertHtml({
        device: 'macOS, Safari',
        location: 'Dhaka, Bangladesh (approx.)',
        time: 'Aug 27, 2026, 2:30 AM BDT',
        securityUrl: 'https://mostak.tech/forgot-password',
        userName: 'Brother Ahmad',
        mosqueName: 'Noor Community Mosque',
        supportEmail: 'support@mostak.tech',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('New Sign-In Detected');
      expect(html).toContain(
        'We noticed a new sign-in to your NOOR account from an unrecognized device.',
      );
      expect(html).toContain('macOS, Safari');
      expect(html).toContain('Dhaka, Bangladesh (approx.)');
      expect(html).toContain('Aug 27, 2026, 2:30 AM BDT');
      expect(html).toContain('href="https://mostak.tech/forgot-password"');
      expect(html).toContain('Secure Account');
      expect(html).toContain('NOOR COMMUNITY MOSQUE');
    });

    it('falls back to default placeholders when optional fields are omitted', () => {
      const html = renderLoginAlertHtml({});

      expect(html).toContain('New Sign-In Detected');
      expect(html).toContain('Web Browser');
      expect(html).toContain('Dhaka, Bangladesh (approx.)');
      expect(html).toContain('Secure Account');
      expect(html).toContain('NOOR • COMMUNITY MOSQUE');
    });
  });

  describe('renderLoginAlertText', () => {
    it('renders clean plaintext with device and security link', () => {
      const text = renderLoginAlertText({
        device: 'Windows, Chrome',
        location: 'Sylhet, Bangladesh (approx.)',
        time: 'Aug 27, 2026, 3:00 AM BDT',
        securityUrl: 'https://mostak.tech/forgot-password',
        supportEmail: 'support@mostak.tech',
      });

      expect(text).toContain('New Sign-In Detected');
      expect(text).toContain('DEVICE:   Windows, Chrome');
      expect(text).toContain('LOCATION: Sylhet, Bangladesh (approx.)');
      expect(text).toContain('https://mostak.tech/forgot-password');
    });
  });

  describe('formatDeviceSummary', () => {
    it('parses Windows Chrome user agent', () => {
      const summary = formatDeviceSummary(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      expect(summary).toBe('Windows, Chrome');
    });

    it('parses macOS Safari user agent', () => {
      const summary = formatDeviceSummary(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      );
      expect(summary).toBe('macOS, Safari');
    });

    it('parses iPhone Safari user agent', () => {
      const summary = formatDeviceSummary(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      );
      expect(summary).toBe('iOS, Safari');
    });

    it('handles undefined or unknown user agent gracefully', () => {
      expect(formatDeviceSummary(undefined)).toBe('Web Browser');
      expect(formatDeviceSummary('unknown')).toBe('Web Browser');
      expect(formatDeviceSummary('jest')).toBe('Web Browser');
    });
  });

  describe('formatLoginTime', () => {
    it('formats date into a readable timestamp string with BDT', () => {
      const formatted = formatLoginTime(new Date('2026-08-27T02:30:00Z'));
      expect(formatted).toContain('2026');
      expect(formatted).toContain('BDT');
    });
  });

  describe('renderIftarSponsorshipHtml & renderIftarSponsorshipText', () => {
    it('renders confirmed Iftar sponsorship template correctly', async () => {
      const { renderIftarSponsorshipHtml, renderIftarSponsorshipText } = await import(
        './iftar-sponsorship.template'
      );
      const html = renderIftarSponsorshipHtml({
        sponsorName: 'Abdul Karim',
        date: '2026-03-01',
        year: 1447,
        status: 'confirmed',
        numberOfServings: 150,
        estimatedCost: '25000',
        currency: 'BDT',
        menuDetails: 'Khichuri, Dates, Fruit, Mutton',
      });

      expect(html).toContain('Abdul Karim');
      expect(html).toContain('CONFIRMED');
      expect(html).toContain('2026-03-01');
      expect(html).toContain('150 people');
      expect(html).toContain('BDT 25000');
      expect(html).toContain('Khichuri, Dates, Fruit, Mutton');

      const text = renderIftarSponsorshipText({
        sponsorName: 'Abdul Karim',
        date: '2026-03-01',
        year: 1447,
        status: 'confirmed',
        numberOfServings: 150,
      });

      expect(text).toContain('Abdul Karim');
      expect(text).toContain('CONFIRMED');
      expect(text).toContain('2026-03-01');
    });

    it('renders cancelled Iftar sponsorship template appropriately', async () => {
      const { renderIftarSponsorshipHtml } = await import('./iftar-sponsorship.template');
      const html = renderIftarSponsorshipHtml({
        sponsorName: 'Abdul Karim',
        date: '2026-03-01',
        year: 1447,
        status: 'cancelled',
      });

      expect(html).toContain('CANCELLED');
      expect(html).toContain('has been cancelled');
    });
  });
});
