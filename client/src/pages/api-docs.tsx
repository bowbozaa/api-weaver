import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Copy,
  Check,
  BookOpen,
  Server,
  Shield,
  Bot,
  Database,
  Activity,
  GitBranch,
  Cloud,
  Workflow,
  Gauge,
  Users,
  Webhook,
  Code,
  Layers,
  FileJson,
} from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  request?: {
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
  response?: {
    status: number;
    body: unknown;
  };
}

interface EndpointCategory {
  name: string;
  icon: typeof Server;
  description: string;
  endpoints: EndpointDoc[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const API_CATEGORIES: EndpointCategory[] = [
  {
    name: "Health & Status",
    icon: Activity,
    description: "Server health checks and system status monitoring",
    endpoints: [
      {
        method: "GET",
        path: "/api/health",
        description: "Returns the health status of all connected services and overall system status.",
        auth: false,
        response: {
          status: 200,
          body: {
            status: "ok",
            timestamp: "2026-02-10T12:00:00Z",
            services: { claude: "connected", gpt: "disconnected" },
            uptime: 86400,
          },
        },
      },
      {
        method: "GET",
        path: "/api/stats",
        description: "Returns API usage statistics including request counts, response times, and error rates.",
        auth: false,
        response: {
          status: 200,
          body: {
            totalRequests: 1250,
            avgResponseTime: 145,
            errorRate: 0.02,
            activeServices: 8,
          },
        },
      },
      {
        method: "GET",
        path: "/api/logs",
        description: "Returns recent API request logs with method, path, status, and duration.",
        auth: false,
        response: {
          status: 200,
          body: [
            {
              method: "GET",
              path: "/api/health",
              status: 200,
              duration: 12,
              timestamp: "2026-02-10T12:00:00Z",
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/api/status/system",
        description: "Overall system status with uptime metrics and component health.",
        auth: false,
        response: {
          status: 200,
          body: { status: "operational", uptime: 99.9, components: [] },
        },
      },
      {
        method: "GET",
        path: "/api/status/services",
        description: "Individual service statuses across all connected services.",
        auth: false,
      },
      {
        method: "GET",
        path: "/api/status/uptime",
        description: "Historical uptime data for trend analysis.",
        auth: false,
      },
    ],
  },
  {
    name: "Authentication & Sessions",
    icon: Shield,
    description: "User authentication via Replit OIDC and session management",
    endpoints: [
      {
        method: "GET",
        path: "/api/auth/user",
        description: "Returns the currently authenticated user's profile information.",
        auth: true,
        response: {
          status: 200,
          body: { id: 1, username: "user", profileImageUrl: "https://...", createdAt: "2026-01-01" },
        },
      },
      {
        method: "GET",
        path: "/api/sessions",
        description: "Lists all active sessions for the current user.",
        auth: true,
        response: {
          status: 200,
          body: [{ id: "sess_123", userAgent: "Chrome/120", createdAt: "2026-02-10", expiresAt: "2026-02-17" }],
        },
      },
      {
        method: "DELETE",
        path: "/api/sessions/:id",
        description: "Revokes a specific session by its ID.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/sessions/revoke-all",
        description: "Revokes all other sessions except the current one.",
        auth: true,
      },
    ],
  },
  {
    name: "File Operations",
    icon: FileJson,
    description: "Read, write, and manage project files securely",
    endpoints: [
      {
        method: "GET",
        path: "/api/files/*",
        description: "Read the contents of a file at the specified path.",
        auth: true,
        request: { headers: { "X-API-KEY": "your-api-key" } },
        response: {
          status: 200,
          body: { path: "src/index.ts", content: "console.log('hello');", size: 25 },
        },
      },
      {
        method: "POST",
        path: "/api/files",
        description: "Create or update a file with the specified content.",
        auth: true,
        request: {
          headers: { "X-API-KEY": "your-api-key", "Content-Type": "application/json" },
          body: { path: "src/index.ts", content: "console.log('hello');" },
        },
        response: { status: 200, body: { message: "File written", path: "src/index.ts" } },
      },
      {
        method: "DELETE",
        path: "/api/files/*",
        description: "Delete a file at the specified path.",
        auth: true,
        request: { headers: { "X-API-KEY": "your-api-key" } },
      },
      {
        method: "GET",
        path: "/api/project",
        description: "Returns the full project directory structure.",
        auth: true,
        response: {
          status: 200,
          body: { name: "project", type: "directory", children: [] },
        },
      },
    ],
  },
  {
    name: "Command Execution",
    icon: Code,
    description: "Execute whitelisted shell commands safely",
    endpoints: [
      {
        method: "POST",
        path: "/api/execute",
        description: "Execute a whitelisted shell command. Only safe commands (ls, cat, git, npm, etc.) are allowed.",
        auth: true,
        request: {
          headers: { "X-API-KEY": "your-api-key", "Content-Type": "application/json" },
          body: { command: "echo 'Hello World'", timeout: 5000 },
        },
        response: {
          status: 200,
          body: { stdout: "Hello World\n", stderr: "", exitCode: 0, duration: 15 },
        },
      },
    ],
  },
  {
    name: "AI Services",
    icon: Bot,
    description: "Multi-model AI integration with Claude, GPT, Gemini, and Perplexity",
    endpoints: [
      {
        method: "POST",
        path: "/api/ai",
        description: "Send a prompt to the default AI model (Claude).",
        auth: true,
        request: {
          headers: { "X-API-KEY": "your-api-key", "Content-Type": "application/json" },
          body: { prompt: "Explain what an API gateway is", maxTokens: 500 },
        },
        response: {
          status: 200,
          body: { response: "An API gateway is...", model: "claude-3-5-sonnet", tokensUsed: 350 },
        },
      },
      {
        method: "POST",
        path: "/api/content/ai/claude",
        description: "Send a prompt specifically to Claude (Anthropic).",
        auth: true,
        request: {
          body: { prompt: "Analyze this code", maxTokens: 1000 },
        },
      },
      {
        method: "POST",
        path: "/api/content/ai/gpt",
        description: "Send a prompt to GPT (OpenAI).",
        auth: true,
        request: {
          body: { prompt: "Generate a creative solution", maxTokens: 1000 },
        },
      },
      {
        method: "POST",
        path: "/api/content/ai/gemini",
        description: "Send a prompt to Gemini (Google).",
        auth: true,
        request: { body: { prompt: "Research this topic", maxTokens: 1000 } },
      },
      {
        method: "POST",
        path: "/api/content/ai/perplexity",
        description: "Send a prompt to Perplexity AI for web-search-backed answers.",
        auth: true,
        request: { body: { prompt: "What are the latest trends in AI?", maxTokens: 1000 } },
      },
    ],
  },
  {
    name: "A2A Multi-Agent Chat",
    icon: Users,
    description: "Agent-to-Agent conversations with multiple AI models",
    endpoints: [
      {
        method: "GET",
        path: "/api/a2a/agents",
        description: "List all available AI agents with their availability status.",
        auth: false,
        response: {
          status: 200,
          body: [
            { id: "claude", name: "Claude (Anthropic)", role: "Analytical Thinker", available: true },
          ],
        },
      },
      {
        method: "POST",
        path: "/api/a2a/chat",
        description: "Start a multi-agent conversation with specified agents and mode.",
        auth: false,
        request: {
          body: {
            topic: "Compare REST vs GraphQL",
            mode: "debate",
            agents: ["claude", "gpt"],
            maxRounds: 3,
          },
        },
      },
      {
        method: "POST",
        path: "/api/a2a/chat/stream",
        description: "Start a streaming multi-agent conversation with real-time SSE events.",
        auth: false,
        request: {
          body: {
            topic: "Best practices for microservices",
            mode: "chain",
            agents: ["claude", "gemini"],
          },
        },
      },
      {
        method: "GET",
        path: "/api/a2a/sessions",
        description: "List all conversation sessions.",
        auth: false,
      },
      {
        method: "DELETE",
        path: "/api/a2a/sessions/:id",
        description: "Delete a specific conversation session.",
        auth: false,
      },
    ],
  },
  {
    name: "GitHub Integration",
    icon: GitBranch,
    description: "GitHub API proxy for repository and user management",
    endpoints: [
      {
        method: "GET",
        path: "/api/integration/github/user",
        description: "Get the authenticated GitHub user profile.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/integration/github/repos",
        description: "List repositories for the authenticated user.",
        auth: true,
        response: {
          status: 200,
          body: [{ name: "my-repo", full_name: "user/my-repo", private: false }],
        },
      },
      {
        method: "GET",
        path: "/api/integration/github/repos/:owner/:repo",
        description: "Get details of a specific repository.",
        auth: true,
      },
    ],
  },
  {
    name: "Supabase Integration",
    icon: Database,
    description: "Supabase API proxy for database and storage operations",
    endpoints: [
      {
        method: "GET",
        path: "/api/integration/supabase/tables",
        description: "List all tables in the Supabase database.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/integration/supabase/table/:name",
        description: "Query data from a specific table.",
        auth: true,
      },
    ],
  },
  {
    name: "Google Cloud",
    icon: Cloud,
    description: "Google Cloud Platform service integration",
    endpoints: [
      {
        method: "GET",
        path: "/api/integration/gcloud/projects",
        description: "List Google Cloud projects.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/integration/gcloud/services",
        description: "List enabled GCP services.",
        auth: true,
      },
    ],
  },
  {
    name: "n8n Workflows",
    icon: Workflow,
    description: "n8n workflow automation platform integration",
    endpoints: [
      {
        method: "GET",
        path: "/api/integration/n8n/workflows",
        description: "List all n8n workflows.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/integration/n8n/workflows/:id/execute",
        description: "Execute a specific n8n workflow.",
        auth: true,
      },
    ],
  },
  {
    name: "Security & Audit",
    icon: Shield,
    description: "Security events, audit logs, and API key management",
    endpoints: [
      {
        method: "GET",
        path: "/api/security/events",
        description: "List recent security events with severity levels.",
        auth: false,
      },
      {
        method: "GET",
        path: "/api/security/audit-logs",
        description: "Retrieve detailed audit logs for compliance.",
        auth: true,
        response: {
          status: 200,
          body: [
            { eventType: "api.access", severity: "info", timestamp: "2026-02-10T12:00:00Z" },
          ],
        },
      },
      {
        method: "GET",
        path: "/api/security/api-key-status",
        description: "Check the current API key status and rotation recommendations.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/security/generate-key",
        description: "Generate a new secure API key.",
        auth: true,
      },
    ],
  },
  {
    name: "Webhooks",
    icon: Webhook,
    description: "Register and manage webhook subscriptions for events",
    endpoints: [
      {
        method: "GET",
        path: "/api/webhooks",
        description: "List all registered webhooks.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/webhooks",
        description: "Register a new webhook for specific events.",
        auth: true,
        request: {
          body: { url: "https://example.com/webhook", events: ["api.request", "security.alert"] },
        },
      },
      {
        method: "DELETE",
        path: "/api/webhooks/:id",
        description: "Delete a webhook subscription.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/webhooks/events",
        description: "List all supported webhook event types.",
        auth: false,
      },
    ],
  },
  {
    name: "Analytics & Monitoring",
    icon: Gauge,
    description: "API analytics, endpoint statistics, and performance metrics",
    endpoints: [
      {
        method: "GET",
        path: "/api/analytics",
        description: "Get overall API analytics data.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/analytics/endpoints",
        description: "Per-endpoint usage statistics.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/analytics/top",
        description: "Top most-used endpoints ranked by request count.",
        auth: true,
      },
      {
        method: "GET",
        path: "/api/analytics/errors",
        description: "Error analytics with breakdown by type and endpoint.",
        auth: true,
      },
    ],
  },
  {
    name: "Teams & Access Control",
    icon: Users,
    description: "Team management with role-based access control",
    endpoints: [
      {
        method: "GET",
        path: "/api/teams",
        description: "List all teams.",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/teams",
        description: "Create a new team.",
        auth: true,
        request: { body: { name: "Engineering", description: "Backend team" } },
      },
      {
        method: "GET",
        path: "/api/teams/:id",
        description: "Get team details including members.",
        auth: true,
      },
      {
        method: "DELETE",
        path: "/api/teams/:id",
        description: "Delete a team.",
        auth: true,
      },
    ],
  },
  {
    name: "SDK Generator",
    icon: Layers,
    description: "Auto-generate client SDKs in multiple languages",
    endpoints: [
      {
        method: "GET",
        path: "/api/sdk/languages",
        description: "List supported SDK languages (JavaScript, Python, Go, etc.).",
        auth: false,
      },
      {
        method: "POST",
        path: "/api/sdk/generate",
        description: "Generate a client SDK for the specified language.",
        auth: true,
        request: { body: { language: "javascript", version: "v2" } },
      },
    ],
  },
  {
    name: "MCP Protocol",
    icon: Server,
    description: "Model Context Protocol server for AI assistant integration",
    endpoints: [
      {
        method: "GET",
        path: "/mcp",
        description: "Establish an SSE connection for MCP communication. Use api_key query parameter for auth.",
        auth: true,
      },
      {
        method: "POST",
        path: "/mcp",
        description: "Send an MCP tool call request (read_file, write_file, execute_command, etc.).",
        auth: true,
        request: {
          body: {
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: "read_file", arguments: { path: "package.json" } },
          },
        },
      },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" onClick={copy} data-testid="button-copy-code">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function EndpointItem({ endpoint }: { endpoint: EndpointDoc }) {
  const [open, setOpen] = useState(false);
  const hasDetails = endpoint.request || endpoint.response;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="w-full flex items-center gap-3 p-3 rounded-md hover-elevate text-left"
          data-testid={`endpoint-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[/:*]/g, "-")}`}
        >
          <Badge
            variant="outline"
            className={`font-mono text-xs min-w-[4rem] justify-center ${METHOD_COLORS[endpoint.method]}`}
          >
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono flex-1 truncate">{endpoint.path}</code>
          <div className="flex items-center gap-2 shrink-0">
            {endpoint.auth ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Unlock className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
            {hasDetails && (
              open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          <p className="text-sm text-muted-foreground pl-[5.5rem]">{endpoint.description}</p>

          {endpoint.request?.headers && (
            <div className="pl-[5.5rem]">
              <span className="text-xs font-medium text-muted-foreground block mb-1">Headers</span>
              <div className="bg-muted/50 rounded-md p-3 relative">
                <pre className="font-mono text-xs whitespace-pre-wrap">
                  {JSON.stringify(endpoint.request.headers, null, 2)}
                </pre>
                <div className="absolute top-1 right-1">
                  <CopyButton text={JSON.stringify(endpoint.request.headers, null, 2)} />
                </div>
              </div>
            </div>
          )}

          {endpoint.request?.body && (
            <div className="pl-[5.5rem]">
              <span className="text-xs font-medium text-muted-foreground block mb-1">Request Body</span>
              <div className="bg-muted/50 rounded-md p-3 relative">
                <pre className="font-mono text-xs whitespace-pre-wrap">
                  {JSON.stringify(endpoint.request.body, null, 2)}
                </pre>
                <div className="absolute top-1 right-1">
                  <CopyButton text={JSON.stringify(endpoint.request.body, null, 2)} />
                </div>
              </div>
            </div>
          )}

          {endpoint.response && (
            <div className="pl-[5.5rem]">
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                Response ({endpoint.response.status})
              </span>
              <div className="bg-muted/50 rounded-md p-3 relative">
                <pre className="font-mono text-xs whitespace-pre-wrap">
                  {JSON.stringify(endpoint.response.body, null, 2)}
                </pre>
                <div className="absolute top-1 right-1">
                  <CopyButton text={JSON.stringify(endpoint.response.body, null, 2)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocsPage() {
  usePageTitle("API Documentation");
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(API_CATEGORIES.map((c) => c.name))
  );

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return API_CATEGORIES;
    const q = search.toLowerCase();
    return API_CATEGORIES.map((cat) => ({
      ...cat,
      endpoints: cat.endpoints.filter(
        (ep) =>
          ep.path.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q) ||
          ep.method.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.endpoints.length > 0);
  }, [search]);

  const totalEndpoints = API_CATEGORIES.reduce((sum, c) => sum + c.endpoints.length, 0);
  const publicEndpoints = API_CATEGORIES.reduce(
    (sum, c) => sum + c.endpoints.filter((e) => !e.auth).length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-page-title">
                  API Documentation
                </h1>
                <p className="text-sm text-muted-foreground">
                  {totalEndpoints} endpoints across {API_CATEGORIES.length} categories
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5" data-testid="badge-docs">
                <BookOpen className="h-3 w-3" />
                v2.0
              </Badge>
              <a href="/docs" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-swagger">
                  <Server className="h-3.5 w-3.5 mr-1.5" />
                  Swagger UI
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search endpoints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Total Endpoints</span>
                  <Badge variant="secondary">{totalEndpoints}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Public</span>
                  <Badge variant="secondary">{publicEndpoints}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Protected</span>
                  <Badge variant="secondary">{totalEndpoints - publicEndpoints}</Badge>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Authentication</span>
                  <p className="text-xs text-muted-foreground">
                    Protected endpoints require the <code className="text-xs bg-muted px-1 rounded">X-API-KEY</code> header.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Rate Limiting</span>
                  <p className="text-xs text-muted-foreground">
                    100 requests per 15 minutes per IP address.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Base URL</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded block" data-testid="text-base-url">
                    {typeof window !== "undefined" ? window.location.origin : "https://your-app.replit.app"}
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-1">
                    {API_CATEGORIES.map((cat) => (
                      <button
                        key={cat.name}
                        className="w-full flex items-center gap-2 p-2 rounded-md text-left text-sm hover-elevate"
                        onClick={() => {
                          document.getElementById(`cat-${cat.name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        data-testid={`nav-category-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <cat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{cat.name}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {cat.endpoints.length}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground" data-testid="text-no-results">
                    No endpoints match "{search}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCategories.map((cat) => (
                <Card key={cat.name} id={`cat-${cat.name}`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat.name)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <cat.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base" data-testid={`text-category-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}>
                            {cat.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{cat.endpoints.length}</Badge>
                        {expandedCategories.has(cat.name) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedCategories.has(cat.name) && (
                    <CardContent className="pt-0">
                      <div className="divide-y">
                        {cat.endpoints.map((ep, i) => (
                          <EndpointItem key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
