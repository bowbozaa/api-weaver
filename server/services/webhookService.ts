import { randomUUID } from "crypto";
import crypto from "crypto";

type WebhookEvent =
  | "api.request"
  | "api.error"
  | "security.alert"
  | "auth.login"
  | "auth.logout";

interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: Date;
}

interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: "success" | "failed";
  statusCode: number | null;
  error: string | null;
  deliveredAt: Date;
  duration: number;
}

const SUPPORTED_EVENTS: WebhookEvent[] = [
  "api.request",
  "api.error",
  "security.alert",
  "auth.login",
  "auth.logout",
];

const webhooks = new Map<string, WebhookSubscription>();
const deliveryLogs: WebhookDeliveryLog[] = [];
const MAX_LOGS = 1000;

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function registerWebhook(
  url: string,
  events: WebhookEvent[],
  secret?: string
): WebhookSubscription {
  const invalidEvents = events.filter((e) => !SUPPORTED_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    throw new Error(
      `Invalid events: ${invalidEvents.join(", ")}. Supported: ${SUPPORTED_EVENTS.join(", ")}`
    );
  }

  const webhook: WebhookSubscription = {
    id: randomUUID(),
    url,
    events,
    secret: secret || crypto.randomBytes(32).toString("hex"),
    active: true,
    createdAt: new Date(),
  };

  webhooks.set(webhook.id, webhook);
  return webhook;
}

export function deleteWebhook(id: string): boolean {
  return webhooks.delete(id);
}

export function listWebhooks(): WebhookSubscription[] {
  return Array.from(webhooks.values());
}

export function getWebhook(id: string): WebhookSubscription | undefined {
  return webhooks.get(id);
}

export async function triggerWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<WebhookDeliveryLog[]> {
  const matchingWebhooks = Array.from(webhooks.values()).filter(
    (wh) => wh.active && wh.events.includes(event)
  );

  const logs: WebhookDeliveryLog[] = [];

  for (const webhook of matchingWebhooks) {
    const start = Date.now();
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = signPayload(body, webhook.secret);

    let log: WebhookDeliveryLog;

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      log = {
        id: randomUUID(),
        webhookId: webhook.id,
        event,
        payload,
        status: response.ok ? "success" : "failed",
        statusCode: response.status,
        error: response.ok ? null : `HTTP ${response.status}`,
        deliveredAt: new Date(),
        duration: Date.now() - start,
      };
    } catch (err) {
      log = {
        id: randomUUID(),
        webhookId: webhook.id,
        event,
        payload,
        status: "failed",
        statusCode: null,
        error: err instanceof Error ? err.message : "Unknown error",
        deliveredAt: new Date(),
        duration: Date.now() - start,
      };
    }

    deliveryLogs.unshift(log);
    logs.push(log);
  }

  if (deliveryLogs.length > MAX_LOGS) {
    deliveryLogs.length = MAX_LOGS;
  }

  return logs;
}

export function getWebhookLogs(
  webhookId?: string,
  limit: number = 50
): WebhookDeliveryLog[] {
  let filtered = deliveryLogs;
  if (webhookId) {
    filtered = deliveryLogs.filter((l) => l.webhookId === webhookId);
  }
  return filtered.slice(0, limit);
}

export function getSupportedEvents(): WebhookEvent[] {
  return [...SUPPORTED_EVENTS];
}
