import { db } from '../db';
import { securityAlerts, alertHistory, type InsertSecurityAlert, type SecurityAlert, type InsertAlertHistory } from '@shared/models/auth';
import { eq, desc, isNotNull, and } from 'drizzle-orm';
import { logAuditEvent } from './auditService';

export type AlertChannel = 'email' | 'sms' | 'webhook' | 'slack';
export type AlertType = 'critical' | 'error' | 'warning' | 'all';

interface AlertConfig {
  userId?: string;
  alertType: AlertType;
  channel: AlertChannel;
  destination: string;
}

const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1,
};

export async function configureAlert(config: AlertConfig): Promise<SecurityAlert> {
  const [alert] = await db.insert(securityAlerts)
    .values({
      userId: config.userId,
      alertType: config.alertType,
      channel: config.channel,
      destination: config.destination,
      enabled: new Date(),
    })
    .returning();
  
  await logAuditEvent({
    eventType: 'security_alert_configured',
    severity: 'info',
    userId: config.userId,
    details: { channel: config.channel, alertType: config.alertType },
  });
  
  return alert;
}

export async function removeAlert(id: string): Promise<boolean> {
  const [alert] = await db.select().from(securityAlerts).where(eq(securityAlerts.id, id));
  
  if (!alert) {
    return false;
  }
  
  await db.delete(securityAlerts).where(eq(securityAlerts.id, id));
  
  await logAuditEvent({
    eventType: 'security_alert_removed',
    severity: 'info',
    details: { alertId: id },
  });
  
  return true;
}

export async function toggleAlert(id: string, enabled: boolean): Promise<boolean> {
  const [alert] = await db.select().from(securityAlerts).where(eq(securityAlerts.id, id));
  
  if (!alert) {
    return false;
  }
  
  await db.update(securityAlerts)
    .set({ enabled: enabled ? new Date() : null })
    .where(eq(securityAlerts.id, id));
  
  return true;
}

export async function getConfiguredAlerts(): Promise<SecurityAlert[]> {
  try {
    const result = await db.select().from(securityAlerts);
    return result || [];
  } catch (error) {
    console.error('Error getting configured alerts:', error);
    return [];
  }
}

export async function getActiveAlerts(): Promise<SecurityAlert[]> {
  try {
    const result = await db.select()
      .from(securityAlerts)
      .where(isNotNull(securityAlerts.enabled));
    return result || [];
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return [];
  }
}

export async function triggerAlert(
  severity: string,
  eventType: string,
  message: string,
  auditLogId?: string
): Promise<void> {
  const activeAlerts = await getActiveAlerts();
  
  for (const alert of activeAlerts) {
    const shouldTrigger = 
      alert.alertType === 'all' ||
      alert.alertType === severity ||
      (alert.alertType === 'critical' && severity === 'critical') ||
      (alert.alertType === 'error' && SEVERITY_PRIORITY[severity] >= SEVERITY_PRIORITY['error']) ||
      (alert.alertType === 'warning' && SEVERITY_PRIORITY[severity] >= SEVERITY_PRIORITY['warning']);
    
    if (shouldTrigger) {
      await sendAlert(alert, severity, eventType, message, auditLogId);
    }
  }
}

async function sendAlert(
  alert: SecurityAlert,
  severity: string,
  eventType: string,
  message: string,
  auditLogId?: string
): Promise<void> {
  let status = 'sent';
  let errorMessage: string | undefined;
  
  try {
    switch (alert.channel) {
      case 'email':
        await sendEmailAlert(alert.destination, severity, eventType, message);
        break;
      case 'sms':
        await sendSMSAlert(alert.destination, severity, eventType, message);
        break;
      case 'webhook':
        await sendWebhookAlert(alert.destination, severity, eventType, message);
        break;
      case 'slack':
        await sendSlackAlert(alert.destination, severity, eventType, message);
        break;
      default:
        status = 'failed';
        errorMessage = `Unknown channel: ${alert.channel}`;
    }
  } catch (error) {
    status = 'failed';
    errorMessage = String(error);
  }
  
  const historyEntry: InsertAlertHistory = {
    alertType: severity,
    channel: alert.channel,
    destination: alert.destination,
    message: `[${eventType}] ${message}`,
    status,
    auditLogId,
  };
  
  await db.insert(alertHistory).values(historyEntry);
  
  if (status === 'failed') {
    console.error(`[SecurityAlert] Failed to send ${alert.channel} alert:`, errorMessage);
  }
}

async function sendEmailAlert(
  to: string,
  severity: string,
  eventType: string,
  message: string
): Promise<void> {
  try {
    const { sendSecurityAlertEmail, isResendConfigured } = await import('./resendService');
    
    if (await isResendConfigured()) {
      const result = await sendSecurityAlertEmail(to, severity, eventType, message);
      if (result.success) {
        console.log(`[SecurityAlert] EMAIL sent to ${to}: [${severity.toUpperCase()}] ${eventType}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } else {
      console.log(`[SecurityAlert] EMAIL (Resend not configured) to ${to}: [${severity.toUpperCase()}] ${eventType} - ${message}`);
    }
  } catch (error) {
    console.error(`[SecurityAlert] EMAIL failed to ${to}:`, error);
    throw error;
  }
}

async function sendSMSAlert(
  to: string,
  severity: string,
  eventType: string,
  message: string
): Promise<void> {
  console.log(`[SecurityAlert] SMS to ${to}: [${severity.toUpperCase()}] ${eventType} - ${message}`);
}

async function sendWebhookAlert(
  url: string,
  severity: string,
  eventType: string,
  message: string
): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity,
        eventType,
        message,
        timestamp: new Date().toISOString(),
        source: 'API Weaver Security',
      }),
    });
    console.log(`[SecurityAlert] Webhook sent to ${url}`);
  } catch (error) {
    throw new Error(`Webhook failed: ${error}`);
  }
}

async function sendSlackAlert(
  webhookUrl: string,
  severity: string,
  eventType: string,
  message: string
): Promise<void> {
  const color = severity === 'critical' ? '#dc2626' : 
                severity === 'error' ? '#ea580c' : 
                severity === 'warning' ? '#ca8a04' : '#3b82f6';
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `Security Alert: ${eventType}`,
          text: message,
          fields: [
            { title: 'Severity', value: severity.toUpperCase(), short: true },
            { title: 'Time', value: new Date().toISOString(), short: true },
          ],
          footer: 'API Weaver Security',
        }],
      }),
    });
    console.log(`[SecurityAlert] Slack notification sent`);
  } catch (error) {
    throw new Error(`Slack webhook failed: ${error}`);
  }
}

export async function getAlertHistory(limit: number = 50): Promise<any[]> {
  try {
    const result = await db.select()
      .from(alertHistory)
      .orderBy(desc(alertHistory.sentAt))
      .limit(limit);
    return result || [];
  } catch (error) {
    console.error('Error getting alert history:', error);
    return [];
  }
}

export async function testAlert(alertId: string): Promise<boolean> {
  try {
    const records = await db.select().from(securityAlerts).where(eq(securityAlerts.id, alertId));
    const alert = records?.[0];
    
    if (!alert) {
      return false;
    }
    
    await sendAlert(
      alert,
      'info',
      'test_alert',
      'This is a test alert from API Weaver Security System',
      undefined
    );
    
    return true;
  } catch (error) {
    console.error('Error testing alert:', error);
    return false;
  }
}
