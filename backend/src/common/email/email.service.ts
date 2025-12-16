import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Email sending options
 */
interface EmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  html: string;
  /** Plain text fallback (optional) */
  text?: string;
}

/**
 * SendGrid API response structure
 */
interface SendGridErrorResponse {
  errors?: { message: string; field?: string }[];
}

/**
 * Email service using SendGrid for transactional emails.
 * Gracefully handles missing configuration by disabling email functionality.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean;

  private static readonly SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SENDGRID_API_KEY', '');
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL', 'noreply@co-op.ai');
    this.fromName = this.configService.get<string>('SENDGRID_FROM_NAME', 'Co-Op AI');
    this.isConfigured = Boolean(this.apiKey);

    if (this.isConfigured) {
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn('SendGrid API key not configured - email sending disabled');
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Send an email via SendGrid
   * @param options - Email options including recipient, subject, and content
   * @returns true if email was sent successfully, false otherwise
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Email to ${options.to} not sent - SendGrid not configured`);
      return false;
    }

    // Validate email format
    if (!this.isValidEmail(options.to)) {
      this.logger.error(`Invalid email address: ${options.to}`);
      return false;
    }

    try {
      const response = await fetch(EmailService.SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: this.fromEmail, name: this.fromName },
          subject: options.subject,
          content: this.buildEmailContent(options),
        }),
      });

      if (!response.ok) {
        await this.handleSendGridError(response, options.to);
        return false;
      }

      this.logger.log(`Email sent successfully to ${this.maskEmail(options.to)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${this.maskEmail(options.to)}`, error);
      return false;
    }
  }

  /**
   * Send a session summary email
   * @param to - Recipient email address
   * @param sessionTitle - Title of the session
   * @param summary - Session summary content
   * @param sessionUrl - URL to view the full session
   */
  async sendSessionSummary(
    to: string,
    sessionTitle: string,
    summary: string,
    sessionUrl: string,
  ): Promise<boolean> {
    const sanitizedTitle = this.escapeHtml(sessionTitle);
    const sanitizedSummary = this.escapeHtml(summary);

    const html = this.buildSessionSummaryHtml(sanitizedTitle, sanitizedSummary, sessionUrl);
    const text = this.buildSessionSummaryText(sessionTitle, summary, sessionUrl);

    return this.send({
      to,
      subject: `Session Summary: ${sessionTitle}`,
      html,
      text,
    });
  }

  // Private helper methods

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const maskedLocal = local.length > 2 
      ? `${local[0]}***${local[local.length - 1]}`
      : '***';
    return `${maskedLocal}@${domain}`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private buildEmailContent(options: EmailOptions): { type: string; value: string }[] {
    const content: { type: string; value: string }[] = [];
    if (options.text) {
      content.push({ type: 'text/plain', value: options.text });
    }
    content.push({ type: 'text/html', value: options.html });
    return content;
  }

  private async handleSendGridError(response: Response, recipient: string): Promise<void> {
    try {
      const errorBody = await response.json() as SendGridErrorResponse;
      const errorMessage = errorBody.errors?.[0]?.message ?? `HTTP ${response.status}`;
      this.logger.error(`SendGrid error for ${this.maskEmail(recipient)}: ${errorMessage}`);
    } catch {
      this.logger.error(`SendGrid error for ${this.maskEmail(recipient)}: HTTP ${response.status}`);
    }
  }

  private buildSessionSummaryHtml(title: string, summary: string, sessionUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin: 24px 0 12px;
      color: #1a1a1a;
    }
    .content {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      white-space: pre-wrap;
      font-size: 14px;
      line-height: 1.7;
    }
    .button {
      display: inline-block;
      background: #1a1a1a;
      color: #ffffff !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 24px;
      font-weight: 500;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Co-Op</div>
  </div>
  <h1 class="title">${title}</h1>
  <div class="content">${summary.replace(/\n/g, '<br>')}</div>
  <a href="${sessionUrl}" class="button">View Full Session</a>
  <div class="footer">
    <p>This email was sent from Co-Op AI because you requested a session summary.</p>
    <p>If you didn't request this email, you can safely ignore it.</p>
  </div>
</body>
</html>`;
  }

  private buildSessionSummaryText(title: string, summary: string, sessionUrl: string): string {
    return `${title}

${summary}

---
View full session: ${sessionUrl}

This email was sent from Co-Op AI because you requested a session summary.`;
  }
}
