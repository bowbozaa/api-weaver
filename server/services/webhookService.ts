interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number;
  response?: string;
  sentAt: Date;
}

const webhooks: Map<string, Webhook> = new Map();
const webhookLogs: WebhookLog[] = [];

const SUPPORTED_EVENTS = [
  "api.request",
  "api.error",
  "auth.login",
  "auth.logout",
  "security.alert",
  "key.rotated",
];

export function getSupportedEvents(): string[] {
  return SUPPORTED_EVENTS;
}

export function listWebhooks(): Webhook[] {
  return Array.from(webhooks.values());
}

export function registerWebhook(url: string, events: string[], secret?: string): Webhook {
  const id = crypto.randomUUID();
  const webhook: Webhook = {
    id,
    url,
    events,
    secret,
    active: true,
    createdAt: new Date(),
  };
  webhooks.set(id, webhook);
  return webhook;
}

export function deleteWebhook(id: string): boolean {
  return webhooks.delete(id);
}

export function getWebhookLogs(limit = 50): WebhookLog[] {
  return webhookLogs.slice(-limit).reverse();
}

export async function triggerWebhooks(event: string, payload: any): Promise<void> {
  for (const webhook of webhooks.values()) {
    if (!webhook.active || !webhook.events.includes(event)) continue;

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });

      webhookLogs.push({
        id: crypto.randomUUID(),
        webhookId: webhook.id,
        event,
        statusCode: res.status,
        sentAt: new Date(),
      });
    } catch (error) {
      webhookLogs.push({
        id: crypto.randomUUID(),
        webhookId: webhook.id,
        event,
        statusCode: 0,
        response: String(error),
        sentAt: new Date(),
      });
    }
  }
}
