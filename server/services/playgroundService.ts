interface PlaygroundRequest {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface PlaygroundResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

interface EndpointInfo {
  method: string;
  path: string;
  description: string;
  requiresAuth: boolean;
}

interface SampleRequest {
  name: string;
  description: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

const availableEndpoints: EndpointInfo[] = [
  { method: "GET", path: "/api/health", description: "Health check endpoint", requiresAuth: false },
  { method: "GET", path: "/api/stats", description: "API statistics", requiresAuth: false },
  { method: "GET", path: "/api/logs", description: "API request logs", requiresAuth: false },
  { method: "GET", path: "/api/files", description: "List project files", requiresAuth: true },
  { method: "POST", path: "/api/files/read", description: "Read a file", requiresAuth: true },
  { method: "POST", path: "/api/files/write", description: "Write a file", requiresAuth: true },
  { method: "POST", path: "/api/execute", description: "Execute a command", requiresAuth: true },
  { method: "POST", path: "/api/ai/prompt", description: "Send AI prompt", requiresAuth: true },
  { method: "GET", path: "/api/mcp/tools", description: "List MCP tools", requiresAuth: true },
  { method: "GET", path: "/api/security/audit-logs", description: "View audit logs", requiresAuth: true },
  { method: "GET", path: "/api/security/events", description: "Security events", requiresAuth: false },
  { method: "GET", path: "/api/a2a/agents", description: "List A2A agents", requiresAuth: false },
  { method: "GET", path: "/api/a2a/sessions", description: "A2A sessions", requiresAuth: false },
  { method: "GET", path: "/api/analytics", description: "API analytics", requiresAuth: true },
  { method: "GET", path: "/api/analytics/top", description: "Top endpoints", requiresAuth: true },
  { method: "GET", path: "/api/analytics/errors", description: "Error analytics", requiresAuth: true },
  { method: "GET", path: "/api/webhooks", description: "List webhooks", requiresAuth: true },
  { method: "GET", path: "/api/webhooks/events", description: "Webhook event types", requiresAuth: false },
  { method: "GET", path: "/api/teams", description: "List teams", requiresAuth: true },
  { method: "GET", path: "/api/sdk/languages", description: "SDK languages", requiresAuth: false },
  { method: "GET", path: "/api/status/system", description: "System status", requiresAuth: false },
  { method: "GET", path: "/api/status/services", description: "Service statuses", requiresAuth: false },
  { method: "GET", path: "/api/status/uptime", description: "Uptime history", requiresAuth: false },
  { method: "GET", path: "/api/cache/stats", description: "Cache statistics", requiresAuth: true },
  { method: "GET", path: "/api/rate-limit/tiers", description: "Rate limit tiers", requiresAuth: false },
  { method: "GET", path: "/api/notifications", description: "Notification history", requiresAuth: false },
];

const sampleRequests: SampleRequest[] = [
  {
    name: "Health Check",
    description: "Check if the API server is running and all services are connected",
    method: "GET",
    path: "/api/health",
    headers: {},
  },
  {
    name: "API Statistics",
    description: "Get current API usage stats: request counts, response times, error rates",
    method: "GET",
    path: "/api/stats",
    headers: {},
  },
  {
    name: "Request Logs",
    description: "View recent API request logs with method, path, status, and duration",
    method: "GET",
    path: "/api/logs",
    headers: {},
  },
  {
    name: "System Status",
    description: "Check overall system health and uptime metrics",
    method: "GET",
    path: "/api/status/system",
    headers: {},
  },
  {
    name: "Service Statuses",
    description: "View individual service health for all 11 connected services",
    method: "GET",
    path: "/api/status/services",
    headers: {},
  },
  {
    name: "A2A Available Agents",
    description: "List all AI agents available for multi-agent conversations",
    method: "GET",
    path: "/api/a2a/agents",
    headers: {},
  },
  {
    name: "A2A Sessions",
    description: "List all multi-agent conversation sessions",
    method: "GET",
    path: "/api/a2a/sessions",
    headers: {},
  },
  {
    name: "Start A2A Debate",
    description: "Start a debate between Claude and GPT about REST vs GraphQL",
    method: "POST",
    path: "/api/a2a/chat",
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      topic: "Compare REST API vs GraphQL: which is better for modern web apps?",
      mode: "debate",
      agents: ["claude", "gpt"],
      maxRounds: 2,
    },
  },
  {
    name: "Webhook Event Types",
    description: "List all supported webhook event types for subscriptions",
    method: "GET",
    path: "/api/webhooks/events",
    headers: {},
  },
  {
    name: "SDK Languages",
    description: "List supported languages for SDK generation",
    method: "GET",
    path: "/api/sdk/languages",
    headers: {},
  },
  {
    name: "Rate Limit Tiers",
    description: "View rate limit tiers (Free, Pro, Enterprise) and their quotas",
    method: "GET",
    path: "/api/rate-limit/tiers",
    headers: {},
  },
  {
    name: "Security Events",
    description: "View recent security events with severity levels",
    method: "GET",
    path: "/api/security/events",
    headers: {},
  },
  {
    name: "Notification History",
    description: "View notification history including alerts and system messages",
    method: "GET",
    path: "/api/notifications",
    headers: {},
  },
  {
    name: "List Files (Auth Required)",
    description: "List all project files - requires API key authentication",
    method: "GET",
    path: "/api/files",
    headers: {
      "X-API-KEY": "your-api-key",
    },
  },
  {
    name: "Read package.json (Auth Required)",
    description: "Read the project's package.json file contents",
    method: "POST",
    path: "/api/files/read",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "your-api-key",
    },
    body: {
      path: "package.json",
    },
  },
  {
    name: "Execute Command (Auth Required)",
    description: "Execute 'echo Hello' shell command safely",
    method: "POST",
    path: "/api/execute",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "your-api-key",
    },
    body: {
      command: "echo 'Hello from API Weaver'",
      timeout: 5000,
    },
  },
  {
    name: "AI Prompt (Auth Required)",
    description: "Send a prompt to the AI assistant (Claude) for analysis",
    method: "POST",
    path: "/api/ai/prompt",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "your-api-key",
    },
    body: {
      prompt: "Explain what an API gateway is in 3 sentences",
      maxTokens: 500,
    },
  },
  {
    name: "Register Webhook (Auth Required)",
    description: "Register a new webhook to receive event notifications",
    method: "POST",
    path: "/api/webhooks",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "your-api-key",
    },
    body: {
      url: "https://example.com/webhook",
      events: ["api.request", "security.alert"],
    },
  },
];

export async function executePlaygroundRequest(
  request: PlaygroundRequest
): Promise<PlaygroundResponse> {
  const { method, path, headers = {}, body } = request;

  if (!method || !path) {
    throw new Error("Method and path are required");
  }

  const baseUrl =
    process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${process.env.PORT || 5000}`;

  const url = `${baseUrl}${path}`;
  const start = Date.now();

  try {
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(30000),
    };

    if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - start;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody, null, 2),
      duration,
    };
  } catch (err) {
    const duration = Date.now() - start;
    return {
      status: 0,
      statusText: "Error",
      headers: {},
      body: JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" }),
      duration,
    };
  }
}

export function getAvailableEndpoints(): EndpointInfo[] {
  return availableEndpoints;
}

export function getSampleRequests(): SampleRequest[] {
  return sampleRequests;
}
