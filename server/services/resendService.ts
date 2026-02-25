// Resend Integration for sending transactional emails
// Uses Replit Connector for secure API key management

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@api-weaver.app'
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const emailPayload: any = {
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };
    
    if (options.html) {
      emailPayload.html = options.html;
    }
    if (options.text) {
      emailPayload.text = options.text;
    }
    
    const result = await client.emails.send(emailPayload);

    if (result.error) {
      console.error('[Resend] Error sending email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Resend] Email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error: any) {
    console.error('[Resend] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendSecurityAlertEmail(
  to: string,
  severity: string,
  eventType: string,
  message: string,
  details?: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const severityColors: Record<string, string> = {
    critical: '#dc2626',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">API Weaver Security Alert</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: ${severityColors[severity] || '#6b7280'}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; text-transform: uppercase; font-size: 12px;">
            ${severity}
          </div>
          <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px;">${eventType.replace(/_/g, ' ').toUpperCase()}</h2>
          <p style="color: #475569; font-size: 16px;">${message}</p>
          ${details ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0;">
              <h3 style="color: #64748b; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">Details</h3>
              <pre style="background: #f1f5f9; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; color: #334155;">${JSON.stringify(details, null, 2)}</pre>
            </div>
          ` : ''}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated security alert from API Weaver. 
              <br>Time: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
API Weaver Security Alert

Severity: ${severity.toUpperCase()}
Event: ${eventType.replace(/_/g, ' ')}

${message}

${details ? `Details:\n${JSON.stringify(details, null, 2)}` : ''}

Time: ${new Date().toISOString()}
  `.trim();

  return sendEmail({
    to,
    subject: `[${severity.toUpperCase()}] API Weaver Security Alert: ${eventType}`,
    html,
    text,
  });
}

export async function isResendConfigured(): Promise<boolean> {
  try {
    await getCredentials();
    return true;
  } catch {
    return false;
  }
}
