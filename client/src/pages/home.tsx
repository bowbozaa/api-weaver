import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Server, 
  FileCode, 
  Terminal, 
  Key, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Zap,
  ExternalLink,
  Copy,
  Shield,
  Cloud,
  Bot,
  Database,
  GitBranch,
  Workflow,
  BarChart3,
  BookOpen,
  Rocket,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { APILog, APIStats } from "@shared/schema";

interface NotificationEvent {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "critical";
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  channels: string[];
  sent: boolean;
}

interface ServiceHealth {
  name: string;
  status: "connected" | "not_configured" | "error";
  configured: boolean;
  message?: string;
}

interface AllServicesHealth {
  ai: {
    claude: ServiceHealth;
    gpt: ServiceHealth;
    gemini: ServiceHealth;
    perplexity: ServiceHealth;
  };
  github: ServiceHealth;
  supabase: ServiceHealth;
  notion: ServiceHealth;
  vercel: ServiceHealth;
  n8n: ServiceHealth;
  gcloud: ServiceHealth;
  comet: ServiceHealth;
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function LogEntry({ log }: { log: APILog }) {
  const statusColor = log.status >= 200 && log.status < 300 
    ? "text-green-600 dark:text-green-400" 
    : log.status >= 400 
      ? "text-red-600 dark:text-red-400" 
      : "text-yellow-600 dark:text-yellow-400";

  return (
    <div 
      className="flex items-center justify-between py-3 px-4 hover-elevate rounded-md"
      data-testid={`log-entry-${log.id}`}
    >
      <div className="flex items-center gap-4">
        <Badge variant={log.status >= 200 && log.status < 300 ? "default" : "destructive"} className="font-mono text-xs">
          {log.method}
        </Badge>
        <span className="font-mono text-sm">{log.path}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className={statusColor}>{log.status}</span>
        <span>{log.duration}ms</span>
        <span className="text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function NotificationEntry({ notification }: { notification: NotificationEvent }) {
  const severityConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    info: { icon: Info, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    warning: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
    error: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
    critical: { icon: XCircle, color: "text-red-700 dark:text-red-300", bgColor: "bg-red-200 dark:bg-red-900/50" },
  };

  const config = severityConfig[notification.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div 
      className={`p-4 rounded-md border ${config.bgColor}`}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-medium ${config.color}`}>{notification.title}</h4>
            <span className="text-xs text-muted-foreground">
              {new Date(notification.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          {notification.metadata && (
            <div className="mt-2 text-xs font-mono bg-background/50 p-2 rounded overflow-auto">
              {Object.entries(notification.metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted-foreground">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {notification.type}
            </Badge>
            {notification.channels.map((channel) => (
              <Badge key={channel} variant="secondary" className="text-xs">
                {channel}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EndpointCard({ 
  method, 
  path, 
  description 
}: { 
  method: string; 
  path: string; 
  description: string; 
}) {
  const { toast } = useToast();
  const methodColors: Record<string, string> = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(path);
    toast({ title: "Copied!", description: "Endpoint path copied to clipboard" });
  };

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
      data-testid={`endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, '-')}`}
    >
      <div className="flex items-center gap-4">
        <Badge className={`font-mono text-xs ${methodColors[method] || ""}`} variant="outline">
          {method}
        </Badge>
        <code className="font-mono text-sm">{path}</code>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground max-w-xs truncate">{description}</span>
        <Button size="icon" variant="ghost" onClick={copyToClipboard} data-testid={`copy-${path.replace(/[/:]/g, '-')}`}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ServiceStatusCard({
  name,
  icon: Icon,
  health,
  endpoints,
}: {
  name: string;
  icon: React.ElementType;
  health?: ServiceHealth;
  endpoints: Array<{ method: string; path: string; description: string }>;
}) {
  const isConfigured = health?.configured ?? false;
  
  return (
    <Card data-testid={`service-card-${name.toLowerCase()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <Badge 
            variant={isConfigured ? "default" : "secondary"}
            className={isConfigured ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
          >
            {isConfigured ? "Connected" : "Not Configured"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {endpoints.slice(0, 3).map((ep) => (
          <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="font-mono text-xs">
              {ep.method}
            </Badge>
            <code className="text-xs text-muted-foreground truncate">{ep.path}</code>
          </div>
        ))}
        {endpoints.length > 3 && (
          <p className="text-xs text-muted-foreground">+{endpoints.length - 3} more endpoints</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<APIStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  const { data: logs, isLoading: logsLoading } = useQuery<APILog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 3000,
  });

  const { data: health } = useQuery<AllServicesHealth>({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<NotificationEvent[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 5000,
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const coreEndpoints = [
    { method: "POST", path: "/api/files", description: "Create or update files" },
    { method: "GET", path: "/api/files/:path", description: "Read file content" },
    { method: "DELETE", path: "/api/files/:path", description: "Delete files" },
    { method: "POST", path: "/api/execute", description: "Execute shell commands" },
    { method: "GET", path: "/api/project", description: "Get project structure" },
    { method: "GET", path: "/mcp", description: "MCP Server (SSE)" },
    { method: "GET", path: "/api/health", description: "Check all services health" },
  ];

  const serviceEndpoints = {
    ai: [
      { method: "POST", path: "/api/ai/claude", description: "Send prompt to Claude" },
      { method: "POST", path: "/api/ai/gpt", description: "Send prompt to GPT" },
      { method: "POST", path: "/api/ai/gemini", description: "Send prompt to Gemini" },
      { method: "POST", path: "/api/ai/perplexity", description: "Search with Perplexity" },
      { method: "POST", path: "/api/ai/compare", description: "Compare all AIs" },
    ],
    github: [
      { method: "GET", path: "/api/github/repos", description: "List repositories" },
      { method: "GET", path: "/api/github/repos/:owner/:repo", description: "Get repo details" },
      { method: "GET", path: "/api/github/repos/:owner/:repo/contents/*", description: "Get file content" },
      { method: "POST", path: "/api/github/repos/:owner/:repo/contents/*", description: "Create/update file" },
      { method: "GET", path: "/api/github/repos/:owner/:repo/issues", description: "List issues" },
      { method: "POST", path: "/api/github/repos/:owner/:repo/issues", description: "Create issue" },
    ],
    supabase: [
      { method: "GET", path: "/api/supabase/tables", description: "List all tables" },
      { method: "GET", path: "/api/supabase/query", description: "Execute select query" },
      { method: "POST", path: "/api/supabase/insert", description: "Insert data" },
      { method: "PUT", path: "/api/supabase/update", description: "Update data" },
      { method: "DELETE", path: "/api/supabase/delete", description: "Delete data" },
    ],
    notion: [
      { method: "GET", path: "/api/notion/pages", description: "List pages" },
      { method: "GET", path: "/api/notion/pages/:id", description: "Get page content" },
      { method: "POST", path: "/api/notion/pages", description: "Create new page" },
      { method: "PATCH", path: "/api/notion/pages/:id", description: "Update page" },
      { method: "POST", path: "/api/notion/search", description: "Search Notion" },
    ],
    vercel: [
      { method: "GET", path: "/api/vercel/projects", description: "List projects" },
      { method: "GET", path: "/api/vercel/deployments", description: "List deployments" },
      { method: "POST", path: "/api/vercel/deployments", description: "Trigger deployment" },
      { method: "GET", path: "/api/vercel/deployments/:id", description: "Get deployment status" },
    ],
    n8n: [
      { method: "GET", path: "/api/n8n/workflows", description: "List workflows" },
      { method: "GET", path: "/api/n8n/workflows/:id", description: "Get workflow details" },
      { method: "POST", path: "/api/n8n/workflows/:id/execute", description: "Execute workflow" },
      { method: "GET", path: "/api/n8n/executions", description: "List executions" },
    ],
    gcloud: [
      { method: "GET", path: "/api/gcloud/projects", description: "List projects" },
      { method: "GET", path: "/api/gcloud/compute/instances", description: "List instances" },
      { method: "POST", path: "/api/gcloud/compute/instances", description: "Create instance" },
      { method: "GET", path: "/api/gcloud/storage/buckets", description: "List buckets" },
    ],
    comet: [
      { method: "GET", path: "/api/comet/projects", description: "List projects" },
      { method: "GET", path: "/api/comet/experiments", description: "List experiments" },
      { method: "GET", path: "/api/comet/experiments/:id/metrics", description: "Get metrics" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">API Server</h1>
                <p className="text-sm text-muted-foreground">MCP + REST API Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Online
              </Badge>
              <Button variant="outline" size="sm" asChild data-testid="button-docs">
                <a href="/docs" target="_blank" rel="noopener noreferrer">
                  <FileCode className="h-4 w-4 mr-2" />
                  API Docs
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList data-testid="tabs-navigation">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Cloud className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="endpoints" data-testid="tab-endpoints">
              <Zap className="h-4 w-4 mr-2" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <Terminal className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Requests"
                value={stats?.totalRequests ?? 0}
                description="All time API calls"
                icon={Activity}
              />
              <StatCard
                title="Success Rate"
                value={stats ? `${((stats.successfulRequests / (stats.totalRequests || 1)) * 100).toFixed(1)}%` : "0%"}
                description="Successful responses"
                icon={CheckCircle2}
              />
              <StatCard
                title="Avg Response"
                value={stats ? `${stats.averageResponseTime.toFixed(0)}ms` : "0ms"}
                description="Average response time"
                icon={Clock}
              />
              <StatCard
                title="Uptime"
                value={stats ? formatUptime(stats.uptime) : "0m"}
                description="Server uptime"
                icon={Server}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Start</CardTitle>
                  <CardDescription>Get started with the API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Authentication</p>
                    <code className="text-xs font-mono block bg-background p-2 rounded">
                      X-API-KEY: your-api-key
                    </code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Example Request</p>
                    <code className="text-xs font-mono block bg-background p-2 rounded whitespace-pre">
{`curl -X GET \\
  -H "X-API-KEY: your-key" \\
  /api/project`}
                    </code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest API requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {logsLoading ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Loading...
                      </div>
                    ) : logs && logs.length > 0 ? (
                      <div className="space-y-1">
                        {logs.slice(0, 5).map((log) => (
                          <LogEntry key={log.id} log={log} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No recent activity
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <ServiceStatusCard
                name="AI Services"
                icon={Bot}
                health={health?.ai?.claude}
                endpoints={serviceEndpoints.ai}
              />
              <ServiceStatusCard
                name="GitHub"
                icon={GitBranch}
                health={health?.github}
                endpoints={serviceEndpoints.github}
              />
              <ServiceStatusCard
                name="Supabase"
                icon={Database}
                health={health?.supabase}
                endpoints={serviceEndpoints.supabase}
              />
              <ServiceStatusCard
                name="Notion"
                icon={BookOpen}
                health={health?.notion}
                endpoints={serviceEndpoints.notion}
              />
              <ServiceStatusCard
                name="Vercel"
                icon={Rocket}
                health={health?.vercel}
                endpoints={serviceEndpoints.vercel}
              />
              <ServiceStatusCard
                name="n8n"
                icon={Workflow}
                health={health?.n8n}
                endpoints={serviceEndpoints.n8n}
              />
              <ServiceStatusCard
                name="Google Cloud"
                icon={Cloud}
                health={health?.gcloud}
                endpoints={serviceEndpoints.gcloud}
              />
              <ServiceStatusCard
                name="Comet ML"
                icon={BarChart3}
                health={health?.comet}
                endpoints={serviceEndpoints.comet}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Configure Integrations</CardTitle>
                <CardDescription>
                  Add the required API keys in Replit Secrets panel to enable each service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">AI Services</p>
                    <code className="text-xs font-mono block">ANTHROPIC_API_KEY, OPENAI_API_KEY</code>
                    <code className="text-xs font-mono block">GOOGLE_AI_API_KEY, PERPLEXITY_API_KEY</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">GitHub</p>
                    <code className="text-xs font-mono block">GITHUB_TOKEN</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Supabase</p>
                    <code className="text-xs font-mono block">SUPABASE_URL, SUPABASE_ANON_KEY</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Notion</p>
                    <code className="text-xs font-mono block">NOTION_API_KEY</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Vercel</p>
                    <code className="text-xs font-mono block">VERCEL_TOKEN</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">n8n</p>
                    <code className="text-xs font-mono block">N8N_BASE_URL, N8N_API_KEY</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Google Cloud</p>
                    <code className="text-xs font-mono block">GOOGLE_CLOUD_PROJECT_ID</code>
                    <code className="text-xs font-mono block">GOOGLE_CLOUD_CREDENTIALS</code>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Comet ML</p>
                    <code className="text-xs font-mono block">COMET_API_KEY</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Core API Endpoints</CardTitle>
                <CardDescription>
                  All API endpoints require authentication via X-API-KEY header
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {coreEndpoints.map((endpoint) => (
                  <EndpointCard key={`${endpoint.method}-${endpoint.path}`} {...endpoint} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Logs</CardTitle>
                <CardDescription>Real-time API request monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {logsLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Loading logs...
                    </div>
                  ) : logs && logs.length > 0 ? (
                    <div className="space-y-1">
                      {logs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Terminal className="h-12 w-12 mb-4 opacity-50" />
                      <p>No logs yet</p>
                      <p className="text-sm">API requests will appear here</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Key Authentication
                  </CardTitle>
                  <CardDescription>All endpoints are protected with API key authentication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Header Format</p>
                    <code className="text-xs font-mono block bg-background p-2 rounded">
                      X-API-KEY: [your-api-key]
                    </code>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>The API key is stored securely in environment variables and must be included in all requests.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Features
                  </CardTitle>
                  <CardDescription>Built-in security measures</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Rate limiting (100 requests/15min)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Input validation with Zod schemas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Path traversal protection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Command execution sandboxing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">CORS configuration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Request logging and monitoring</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Security Alerts
                    </CardTitle>
                    <CardDescription>Critical events and security notifications</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {notifications?.length ?? 0} alerts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <NotificationEntry key={notification.id} notification={notification} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Bell className="h-12 w-12 mb-4 opacity-50" />
                      <p>No alerts yet</p>
                      <p className="text-sm">Security events will appear here</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Types</CardTitle>
                  <CardDescription>Events that trigger alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">API Key Misuse (missing or invalid)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Server Errors (500+ status codes)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-700" />
                      <span className="text-sm">MCP Service Unavailable</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Rate Limit Exceeded</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-700" />
                      <span className="text-sm">Security Threats (path traversal, etc.)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Channels</CardTitle>
                  <CardDescription>Configure alert delivery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        <span className="text-sm">Console Logging</span>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Webhook</span>
                      </div>
                      <Badge variant="secondary">Set NOTIFICATION_WEBHOOK_URL</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm">Email</span>
                      </div>
                      <Badge variant="secondary">Set NOTIFICATION_EMAIL_RECIPIENTS</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
