/**
 * Email Service using Brevo (formerly Sendinblue)
 *
 * Configuration:
 * - BREVO_API_KEY: Your Brevo API key
 * - BREVO_SENDER_EMAIL: Verified sender email address
 * - BREVO_SENDER_NAME: Sender display name
 */

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

interface BrevoResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send an email using Brevo API
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'AgencyOS';

  if (!apiKey) {
    console.warn('BREVO_API_KEY not configured - email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  if (!senderEmail) {
    console.warn('BREVO_SENDER_EMAIL not configured - email not sent');
    return { success: false, error: 'Sender email not configured' };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: recipients.map(email => ({ email })),
    subject: options.subject,
    htmlContent: options.html,
    textContent: options.text,
    replyTo: options.replyTo ? { email: options.replyTo } : undefined,
    tags: options.tags,
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: BrevoResponse = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to AgencyOS</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi${userName ? ` ${userName}` : ''},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account has been created. Please set your password to access your client portal.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Set Your Password
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you didn't request this email, you can safely ignore it.
    </p>

    <p style="font-size: 14px; color: #6b7280;">
      This link will expire in 24 hours.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      <a href="${appUrl}" style="color: #6b7280;">AgencyOS</a> - Your Client Portal
    </p>
  </div>
</body>
</html>
`;

  const text = `
Welcome to AgencyOS

Hi${userName ? ` ${userName}` : ''},

Your account has been created. Please set your password to access your client portal.

Set your password: ${resetLink}

If you didn't request this email, you can safely ignore it.
This link will expire in 24 hours.

- AgencyOS Team
`;

  return sendEmail({
    to: email,
    subject: 'Set Your Password - AgencyOS',
    html,
    text,
    tags: ['password-reset', 'onboarding'],
  });
}

/**
 * Send notification email for status change
 */
export async function sendStatusChangeEmail(
  email: string,
  requestTitle: string,
  oldStatus: string,
  newStatus: string,
  requestUrl: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const statusColors: Record<string, string> = {
    queue: '#6b7280',
    active: '#3b82f6',
    review: '#f59e0b',
    done: '#10b981',
  };

  const statusLabels: Record<string, string> = {
    queue: 'In Queue',
    active: 'Active',
    review: 'In Review',
    done: 'Completed',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Status Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">Request Status Updated</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi${userName ? ` ${userName}` : ''},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your request "<strong>${requestTitle}</strong>" has been updated.
    </p>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="background: ${statusColors[oldStatus] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
          ${statusLabels[oldStatus] || oldStatus}
        </span>
        <span style="color: #9ca3af;">&rarr;</span>
        <span style="background: ${statusColors[newStatus] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
          ${statusLabels[newStatus] || newStatus}
        </span>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${requestUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        View Request
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      You're receiving this because you have email notifications enabled.
    </p>
  </div>
</body>
</html>
`;

  const text = `
Request Status Updated

Hi${userName ? ` ${userName}` : ''},

Your request "${requestTitle}" has been updated.

Status: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}

View request: ${requestUrl}

- AgencyOS Team
`;

  return sendEmail({
    to: email,
    subject: `Request Update: ${requestTitle}`,
    html,
    text,
    tags: ['status-change', 'notification'],
  });
}

/**
 * Send notification email for new comment
 */
export async function sendCommentNotificationEmail(
  email: string,
  requestTitle: string,
  commenterName: string,
  commentPreview: string,
  requestUrl: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Comment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">New Comment on Your Request</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi${userName ? ` ${userName}` : ''},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${commenterName}</strong> commented on "<strong>${requestTitle}</strong>":
    </p>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0;">
      <p style="margin: 0; color: #4b5563; font-style: italic;">
        "${commentPreview}${commentPreview.length >= 200 ? '...' : ''}"
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${requestUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        View & Reply
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      You're receiving this because you have email notifications enabled.
    </p>
  </div>
</body>
</html>
`;

  const text = `
New Comment on Your Request

Hi${userName ? ` ${userName}` : ''},

${commenterName} commented on "${requestTitle}":

"${commentPreview}${commentPreview.length >= 200 ? '...' : ''}"

View & Reply: ${requestUrl}

- AgencyOS Team
`;

  return sendEmail({
    to: email,
    subject: `New Comment: ${requestTitle}`,
    html,
    text,
    tags: ['comment', 'notification'],
  });
}

/**
 * Send welcome email for new company
 */
export async function sendWelcomeEmail(
  email: string,
  companyName: string,
  loginUrl: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AgencyOS</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to AgencyOS!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi${userName ? ` ${userName}` : ''},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account for <strong>${companyName}</strong> is now active. Here's what you can do:
    </p>

    <ul style="font-size: 16px; color: #4b5563; margin: 20px 0; padding-left: 20px;">
      <li style="margin-bottom: 10px;">Submit and track your requests</li>
      <li style="margin-bottom: 10px;">Communicate with your team via comments</li>
      <li style="margin-bottom: 10px;">Upload files and assets</li>
      <li style="margin-bottom: 10px;">Get notified on progress updates</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Go to Dashboard
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Need help getting started? Just reply to this email and we'll be happy to assist.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      You're receiving this because you signed up for AgencyOS.
    </p>
  </div>
</body>
</html>
`;

  const text = `
Welcome to AgencyOS!

Hi${userName ? ` ${userName}` : ''},

Your account for ${companyName} is now active. Here's what you can do:

- Submit and track your requests
- Communicate with your team via comments
- Upload files and assets
- Get notified on progress updates

Go to Dashboard: ${loginUrl}

Need help getting started? Just reply to this email and we'll be happy to assist.

- AgencyOS Team
`;

  return sendEmail({
    to: email,
    subject: `Welcome to AgencyOS - ${companyName}`,
    html,
    text,
    tags: ['welcome', 'onboarding'],
  });
}
