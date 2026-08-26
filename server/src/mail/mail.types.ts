/**
 * Options for sending an email message.
 */
export interface SendMailOptions {
  /** One or more recipient email addresses. */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** HTML body content. */
  html?: string;
  /** Plain text fallback content. */
  text?: string;
  /** Optional custom sender formatted as "Name <address@domain>" or plain address. */
  from?: string;
  /** Optional reply-to address. */
  replyTo?: string;
  /** Optional CC recipients. */
  cc?: string | string[];
  /** Optional BCC recipients. */
  bcc?: string | string[];
}

/**
 * Result of an email dispatch operation.
 */
export interface MailSendResult {
  /** Whether the message was accepted by the SMTP server. */
  success: boolean;
  /** Message-ID returned by the SMTP server upon acceptance. */
  messageId?: string;
  /** Error message if transmission failed. */
  error?: string;
}

/**
 * Diagnostic status of the SMTP transport connection.
 */
export interface MailConnectionStatus {
  /** Whether the SMTP handshake and authentication succeeded. */
  ok: boolean;
  /** Descriptive outcome message. */
  message: string;
  /** Configured SMTP hostname. */
  host: string;
  /** Configured SMTP port. */
  port: number;
  /** Whether TLS/SSL is enforced. */
  secure: boolean;
  /** Whether authentication credentials (user/password) are present. */
  configured: boolean;
  /** Timestamp when verification was conducted. */
  timestamp: Date;
}
