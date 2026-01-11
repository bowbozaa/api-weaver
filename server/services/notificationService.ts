import { storage } from "../storage";

export type NotificationSeverity = "info" | "warning" | "error" | "critical";
export type NotificationChannel = "console" | "webhook" | "email";

export interface NotificationEvent {
  id: string;
  timestamp: Date;
  severity: NotificationSeverity;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  channels: NotificationChannel[];
  sent: boolean;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    console: boolean;
    webhook: {
      enabled: boolean;
      url?: string;
    };
    email: {
      enabled: boolean;
      recipients?: string[];
    };
  };
  minSeverity: NotificationSeverity;
}

const defaultConfig: NotificationConfig = {
  enabled: true,
  channels: {
    console: true,
    webhook: {
      enabled: false,
      url: process.env.NOTIFICATION_WEBHOOK_URL,
    },
    email: {
      enabled: false,
      recipients: process.env.NOTIFICATION_EMAIL_RECIPIENTS?.split(","),
    },
  },
  minSeverity: "warning",
};

let config: NotificationConfig = { ...defaultConfig };
const notificationHistory: NotificationEvent[] = [];
const MAX_HISTORY = 1000;

const severityLevels: Record<NotificationSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function shouldNotify(severity: NotificationSeverity): boolean {
  if (!config.enabled) return false;
  return severityLevels[severity] >= severityLevels[config.minSeverity];
}

async function sendToConsole(event: NotificationEvent): Promise<void> {
  const severityColors: Record<NotificationSeverity, string> = {
    info: "\x1b[36m",
    warning: "\x1b[33m",
    error: "\x1b[31m",
    critical: "\x1b[35m",
  };
  const reset = "\x1b[0m";
  const color = severityColors[event.severity];
  
  console.log(
    `${color}[NOTIFICATION - ${event.severity.toUpperCase()}]${reset} ${event.title}`
  );
  console.log(`  Message: ${event.message}`);
  if (event.metadata) {
    console.log(`  Metadata:`, JSON.stringify(event.metadata, null, 2));
  }
}

async function sendToWebhook(event: NotificationEvent): Promise<void> {
  if (!config.channels.webhook.url) return;
  
  try {
    const response = await fetch(config.channels.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        severity: event.severity,
        type: event.type,
        title: event.title,
        message: event.message,
        metadata: event.metadata,
        timestamp: event.timestamp.toISOString(),
      }),
    });
    
    if (!response.ok) {
      console.error(`Webhook notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to send webhook notification:", error);
  }
}

async function sendToEmail(event: NotificationEvent): Promise<void> {
  if (!config.channels.email.recipients?.length) return;
  console.log(`[EMAIL NOTIFICATION] Would send to: ${config.channels.email.recipients.join(", ")}`);
  console.log(`  Subject: [${event.severity.toUpperCase()}] ${event.title}`);
  console.log(`  Body: ${event.message}`);
}

export async function notify(
  severity: NotificationSeverity,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<NotificationEvent | null> {
  if (!shouldNotify(severity)) return null;
  
  const channels: NotificationChannel[] = [];
  
  const event: NotificationEvent = {
    id: generateId(),
    timestamp: new Date(),
    severity,
    type,
    title,
    message,
    metadata,
    channels,
    sent: false,
  };
  
  try {
    if (config.channels.console) {
      await sendToConsole(event);
      channels.push("console");
    }
    
    if (config.channels.webhook.enabled) {
      await sendToWebhook(event);
      channels.push("webhook");
    }
    
    if (config.channels.email.enabled) {
      await sendToEmail(event);
      channels.push("email");
    }
    
    event.channels = channels;
    event.sent = true;
  } catch (error) {
    console.error("Notification delivery failed:", error);
    event.sent = false;
  }
  
  notificationHistory.unshift(event);
  if (notificationHistory.length > MAX_HISTORY) {
    notificationHistory.pop();
  }
  
  return event;
}

export function notifyApiKeyMisuse(
  ip: string,
  path: string,
  reason: "missing" | "invalid"
): Promise<NotificationEvent | null> {
  return notify(
    "warning",
    "api_key_misuse",
    `API Key ${reason === "missing" ? "Missing" : "Invalid"}`,
    `Unauthorized access attempt from ${ip} to ${path}`,
    { ip, path, reason, timestamp: new Date().toISOString() }
  );
}

export function notifyServerError(
  error: string,
  path: string,
  statusCode: number,
  stack?: string
): Promise<NotificationEvent | null> {
  return notify(
    statusCode >= 500 ? "error" : "warning",
    "server_error",
    `Server Error (${statusCode})`,
    `Error on ${path}: ${error}`,
    { path, statusCode, error, stack: stack?.slice(0, 500) }
  );
}

export function notifyMcpUnavailable(
  mcpName: string,
  errorMessage: string
): Promise<NotificationEvent | null> {
  return notify(
    "critical",
    "mcp_unavailable",
    `MCP Service Unavailable: ${mcpName}`,
    `The ${mcpName} service is not responding`,
    { mcpName, error: errorMessage }
  );
}

export function notifyRateLimitExceeded(
  ip: string,
  path: string
): Promise<NotificationEvent | null> {
  return notify(
    "warning",
    "rate_limit_exceeded",
    "Rate Limit Exceeded",
    `IP ${ip} exceeded rate limit on ${path}`,
    { ip, path }
  );
}

export function notifySecurityThreat(
  ip: string,
  path: string,
  threatType: string,
  details: string
): Promise<NotificationEvent | null> {
  return notify(
    "critical",
    "security_threat",
    `Security Threat: ${threatType}`,
    details,
    { ip, path, threatType }
  );
}

export function getNotificationHistory(limit: number = 100): NotificationEvent[] {
  return notificationHistory.slice(0, limit);
}

export function getNotificationConfig(): NotificationConfig {
  return { ...config };
}

export function updateNotificationConfig(updates: Partial<NotificationConfig>): NotificationConfig {
  if (updates.enabled !== undefined) {
    config.enabled = updates.enabled;
  }
  if (updates.minSeverity !== undefined) {
    config.minSeverity = updates.minSeverity;
  }
  if (updates.channels) {
    if (updates.channels.console !== undefined) {
      config.channels.console = updates.channels.console;
    }
    if (updates.channels.webhook) {
      config.channels.webhook = {
        ...config.channels.webhook,
        ...updates.channels.webhook,
      };
    }
    if (updates.channels.email) {
      config.channels.email = {
        ...config.channels.email,
        ...updates.channels.email,
      };
    }
  }
  return { ...config };
}

export function clearNotificationHistory(): void {
  notificationHistory.length = 0;
}
