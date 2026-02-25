import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SessionManagement from "@/components/SessionManagement";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import IPWhitelistManager from "@/components/IPWhitelistManager";
import KeyRotationManager from "@/components/KeyRotationManager";
import AuditLogViewer from "@/components/AuditLogViewer";
import WebhookManager from "@/components/WebhookManager";
import SDKGenerator from "@/components/SDKGenerator";
import APIVersioning from "@/components/APIVersioning";
import CacheMonitor from "@/components/CacheMonitor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Info,
  Settings,
  Lock,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Gauge,
  Code,
  Play,
  Send,
  RefreshCw,
  Eye,
  Sparkles,
  Layers,
  ShieldCheck,
  ShieldAlert,
  FileJson,
  FileText,
  LogOut,
  Scale,
  Mail,
  Wrench,
  Globe,
  Hash,
  Package,
  BarChart as BarChartIcon,
  UsersRound,
  Webhook,
  Trash2,
  Menu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import type { APILog, APIStats } from "@shared/schema";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

interface CodeAssistantResponse {
  action: string;
  result: string;
  model: string;
  tokensUsed: number;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: "auth_failure" | "rate_limit" | "path_violation" | "command_blocked" | "suspicious_activity";
  severity: "low" | "medium" | "high" | "critical";
  ip: string;
  path: string;
  details: string;
}

interface SecurityStatus {
  apiKey: {
    isSet: boolean;
    keyLength: number | null;
    isSecureLength: boolean;
    recommendations: string[];
  };
  audit: {
    totalEvents: number;
    criticalEvents: number;
    errorEvents: number;
    warningEvents: number;
    infoEvents: number;
  };
  recommendations: string[];
  securityHeaders: {
    csp: boolean;
    hsts: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
  };
  protections: {
    csrfProtection: boolean;
    rateLimiting: boolean;
    inputValidation: boolean;
    pathSanitization: boolean;
    commandWhitelist: boolean;
  };
}


const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  trendValue
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`} className="relative overflow-visible">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && trendValue && (
            <span className={`text-xs flex items-center gap-1 ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
              {trendValue}
            </span>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LogEntry({ log }: { log: APILog }) {
  const methodColors: Record<string, string> = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    PATCH: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  };

  const statusColor = log.status >= 200 && log.status < 300 
    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" 
    : log.status >= 400 
      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30" 
      : "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30";

  return (
    <div 
      className="flex items-center justify-between py-3 px-4 hover-elevate rounded-md border border-transparent hover:border-border transition-all"
      data-testid={`log-entry-${log.id}`}
    >
      <div className="flex items-center gap-3">
        <Badge className={`font-mono text-xs px-2 py-0.5 ${methodColors[log.method] || ""}`} variant="outline">
          {log.method}
        </Badge>
        <span className="font-mono text-sm truncate max-w-[300px]">{log.path}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={`font-mono text-xs ${statusColor}`}>
          {log.status}
        </Badge>
        <span className="text-xs text-muted-foreground w-16 text-right">{log.duration}ms</span>
        <span className="text-xs text-muted-foreground w-20">{new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function NotificationEntry({ notification }: { notification: NotificationEvent }) {
  const severityConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
    info: { icon: Info, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-800" },
    warning: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30", borderColor: "border-yellow-200 dark:border-yellow-800" },
    error: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-800" },
    critical: { icon: XCircle, color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900/50", borderColor: "border-red-300 dark:border-red-700" },
  };

  const config = severityConfig[notification.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div 
      className={`p-4 rounded-md border ${config.bgColor} ${config.borderColor}`}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-md ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className={`font-medium text-sm ${config.color}`}>{notification.title}</h4>
            <span className="text-xs text-muted-foreground">
              {new Date(notification.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {notification.type}
            </Badge>
            {notification.channels.map((channel) => (
              <Badge key={channel} variant="secondary" className="text-xs">
                {channel}
              </Badge>
            ))}
            {notification.sent && (
              <Badge variant="secondary" className="text-xs">
                Sent
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  name,
  icon: Icon,
  health,
  color,
}: {
  name: string;
  icon: React.ElementType;
  health?: ServiceHealth;
  color: string;
}) {
  const isConfigured = health?.configured ?? false;
  
  return (
    <Card 
      data-testid={`service-card-${name.toLowerCase().replace(/\s+/g, '-')}`}
      className={`hover-elevate transition-all ${isConfigured ? 'ring-1 ring-green-500/20' : ''}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-md ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className={`h-3 w-3 rounded-full ${isConfigured ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
        </div>
        <h3 className="font-semibold text-lg">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isConfigured ? "Connected" : "Not configured"}
        </p>
        {health?.message && (
          <p className="text-xs text-muted-foreground mt-2 truncate">{health.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SecurityEventEntry({ event }: { event: SecurityEvent }) {
  const severityConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
    low: { color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", icon: Info },
    medium: { color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30", icon: AlertTriangle },
    high: { color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", icon: AlertCircle },
    critical: { color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30", icon: ShieldAlert },
  };

  const config = severityConfig[event.severity] || severityConfig.low;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-md border ${config.bgColor}`} data-testid={`security-event-${event.id}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${config.color}`}>
                {event.severity.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {event.type.replace(/_/g, ' ')}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm mt-2">{event.details}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>IP: {event.ip}</span>
            <span>Path: {event.path}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailStatusCard() {
  const { data: emailStatus, isLoading, refetch } = useQuery<{ configured: boolean; service: string; message: string }>({
    queryKey: ['/api/email/status'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Checking email service...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {emailStatus?.configured ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <p className="font-medium">{emailStatus?.service || 'Email Service'}</p>
            <p className="text-sm text-muted-foreground">{emailStatus?.message || 'Status unknown'}</p>
          </div>
        </div>
        <Badge variant={emailStatus?.configured ? 'default' : 'secondary'}>
          {emailStatus?.configured ? 'Connected' : 'Not Configured'}
        </Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => refetch()}
        className="w-full"
        data-testid="button-email-refresh"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Status
      </Button>
    </div>
  );
}

function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();
  
  if (!user) return null;
  
  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email || 'User';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium hidden md:inline">{displayName}</span>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => logout()}
        disabled={isLoggingOut}
        data-testid="button-logout"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Home() {
  usePageTitle("Dashboard");
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected: wsConnected } = useWebSocket({
    onConnect: () => {
      console.log('[Dashboard] WebSocket connected - real-time updates enabled');
    },
    onDisconnect: () => {
      console.log('[Dashboard] WebSocket disconnected');
    },
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [codeInput, setCodeInput] = useState("");
  const [codeAction, setCodeAction] = useState("analyze");
  const [codeResult, setCodeResult] = useState<CodeAssistantResponse | null>(null);

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

  const { data: securityEvents } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security/events"],
    refetchInterval: 10000,
  });

  const { data: securityStatus } = useQuery<SecurityStatus>({
    queryKey: ["/api/security/status"],
    refetchInterval: 30000,
  });


  const codeAssistantMutation = useMutation({
    mutationFn: async ({ action, code }: { action: string; code: string }) => {
      const response = await apiRequest("POST", "/api/ai/code-assistant", { action, code });
      return response.json();
    },
    onSuccess: (data) => {
      setCodeResult(data);
      toast({ title: "Analysis Complete", description: `Used ${data.tokensUsed} tokens` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const exportData = (type: "logs" | "stats", format: "json" | "csv") => {
    let data: string;
    let filename: string;
    
    if (type === "logs") {
      if (format === "json") {
        data = JSON.stringify(logs, null, 2);
        filename = `api-logs-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        const headers = "id,method,path,status,duration,timestamp\n";
        const rows = logs?.map(l => `${l.id},${l.method},${l.path},${l.status},${l.duration},${l.timestamp}`).join("\n") || "";
        data = headers + rows;
        filename = `api-logs-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      data = JSON.stringify(stats, null, 2);
      filename = `api-stats-${new Date().toISOString().split('T')[0]}.json`;
    }

    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Downloaded ${filename}` });
  };

  const countConfiguredServices = () => {
    let count = 0;
    if (health?.ai?.claude?.configured) count++;
    if (health?.ai?.gpt?.configured) count++;
    if (health?.ai?.gemini?.configured) count++;
    if (health?.ai?.perplexity?.configured) count++;
    if (health?.github?.configured) count++;
    if (health?.supabase?.configured) count++;
    if (health?.notion?.configured) count++;
    if (health?.vercel?.configured) count++;
    if (health?.n8n?.configured) count++;
    if (health?.gcloud?.configured) count++;
    if (health?.comet?.configured) count++;
    return count;
  };

  const trafficData = logs?.slice(0, 20).reverse().map((log, i) => ({
    time: new Date(log.timestamp).toLocaleTimeString().slice(0, 5),
    requests: 1,
    duration: log.duration,
    status: log.status >= 200 && log.status < 300 ? "success" : "error"
  })) || [];

  const methodDistribution = logs?.reduce((acc, log) => {
    acc[log.method] = (acc[log.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieData = Object.entries(methodDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const rateLimit = {
    current: stats?.totalRequests || 0,
    limit: 100,
    remaining: 100 - ((stats?.totalRequests || 0) % 100),
    resetIn: "15 min"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="p-2 md:p-2.5 rounded-md bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 shrink-0">
                <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <span className="truncate">API Weaver</span>
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">v2.0</Badge>
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">MCP Architecture Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-2 md:px-3 hidden sm:flex" data-testid="badge-ws-status">
                <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                {wsConnected ? 'Live' : 'Polling'}
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-2 md:px-3 hidden sm:flex">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {countConfiguredServices()}/11
              </Badge>
              <div className="hidden xl:flex items-center gap-1">
                <Link href="/guide">
                  <Button variant="ghost" size="sm" data-testid="link-guide">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Guide
                  </Button>
                </Link>
                <Link href="/a2a">
                  <Button variant="ghost" size="sm" data-testid="link-a2a">
                    <Bot className="h-4 w-4 mr-2" />
                    A2A Chat
                  </Button>
                </Link>
                <Link href="/playground">
                  <Button variant="ghost" size="sm" data-testid="link-playground">
                    <Wrench className="h-4 w-4 mr-2" />
                    Playground
                  </Button>
                </Link>
                <Link href="/api-docs">
                  <Button variant="ghost" size="sm" data-testid="link-api-docs">
                    <FileCode className="h-4 w-4 mr-2" />
                    API Docs
                  </Button>
                </Link>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-nav-menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <Link href="/guide">
                    <DropdownMenuItem data-testid="menu-guide">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Guide
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/a2a">
                    <DropdownMenuItem data-testid="menu-a2a">
                      <Bot className="h-4 w-4 mr-2" />
                      A2A Chat
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/playground">
                    <DropdownMenuItem data-testid="menu-playground">
                      <Wrench className="h-4 w-4 mr-2" />
                      Playground
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/analytics">
                    <DropdownMenuItem data-testid="menu-analytics">
                      <BarChartIcon className="h-4 w-4 mr-2" />
                      Analytics
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/status">
                    <DropdownMenuItem data-testid="menu-status">
                      <Globe className="h-4 w-4 mr-2" />
                      Status
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/teams">
                    <DropdownMenuItem data-testid="menu-teams">
                      <UsersRound className="h-4 w-4 mr-2" />
                      Teams
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/api-docs">
                    <DropdownMenuItem data-testid="menu-api-docs">
                      <FileCode className="h-4 w-4 mr-2" />
                      API Docs
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <Link href="/users">
                    <DropdownMenuItem data-testid="menu-users">
                      <Users className="h-4 w-4 mr-2" />
                      Users
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/terms">
                    <DropdownMenuItem data-testid="menu-terms">
                      <FileText className="h-4 w-4 mr-2" />
                      Terms
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/license">
                    <DropdownMenuItem data-testid="menu-license">
                      <Scale className="h-4 w-4 mr-2" />
                      License
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/docs" target="_blank" rel="noopener noreferrer" data-testid="menu-docs">
                      <FileCode className="h-4 w-4 mr-2" />
                      API Docs
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-6 py-4 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <ScrollArea className="w-full">
          <TabsList className="bg-muted/50 p-1 inline-flex w-max" data-testid="tabs-navigation">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
              <Cloud className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="code-assistant" className="gap-2" data-testid="tab-code-assistant">
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2" data-testid="tab-monitoring">
              <Gauge className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
              <Terminal className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-2" data-testid="tab-endpoints">
              <Zap className="h-4 w-4" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2" data-testid="tab-security">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2" data-testid="tab-notifications">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="devtools" className="gap-2" data-testid="tab-devtools">
              <Wrench className="h-4 w-4" />
              Dev Tools
            </TabsTrigger>
            {user && (
              <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>
          <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Requests"
                value={stats?.totalRequests ?? 0}
                description="All time API calls"
                icon={Activity}
                trend="up"
                trendValue="+12%"
              />
              <StatCard
                title="Success Rate"
                value={stats ? `${((stats.successfulRequests / (stats.totalRequests || 1)) * 100).toFixed(1)}%` : "0%"}
                description="Successful responses"
                icon={CheckCircle2}
                trend={stats && stats.successfulRequests / (stats.totalRequests || 1) > 0.95 ? "up" : "down"}
                trendValue={stats ? `${stats.successfulRequests}/${stats.totalRequests}` : "0/0"}
              />
              <StatCard
                title="Avg Response"
                value={stats ? `${stats.averageResponseTime.toFixed(0)}ms` : "0ms"}
                description="Average response time"
                icon={Clock}
                trend={stats && stats.averageResponseTime < 100 ? "up" : "neutral"}
                trendValue={stats && stats.averageResponseTime < 100 ? "Fast" : "Normal"}
              />
              <StatCard
                title="Uptime"
                value={stats ? formatUptime(stats.uptime) : "0m"}
                description="Server uptime"
                icon={Server}
                trend="up"
                trendValue="99.9%"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
                  <div>
                    <CardTitle>API Traffic</CardTitle>
                    <CardDescription>Response time over recent requests</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/logs"] })}
                      data-testid="button-refresh-traffic"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trafficData}>
                        <defs>
                          <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="duration" 
                          stroke="#6366f1" 
                          fillOpacity={1} 
                          fill="url(#colorDuration)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Request Methods</CardTitle>
                  <CardDescription>Distribution by HTTP method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Start</CardTitle>
                  <CardDescription>Get started with the API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-md border">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Authentication
                    </p>
                    <code className="text-xs font-mono block bg-background p-3 rounded-md border">
                      X-API-KEY: your-api-key
                    </code>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-md border">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Example Request
                    </p>
                    <code className="text-xs font-mono block bg-background p-3 rounded-md whitespace-pre border">
{`curl -X GET \\
  -H "X-API-KEY: your-key" \\
  /api/project`}
                    </code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest API requests</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("logs")} data-testid="button-view-all-logs">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[220px]">
                    {logsLoading ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : logs && logs.length > 0 ? (
                      <div className="space-y-2">
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
              <ServiceCard
                name="Claude AI"
                icon={Bot}
                health={health?.ai?.claude}
                color="bg-gradient-to-br from-orange-500 to-orange-600"
              />
              <ServiceCard
                name="OpenAI GPT"
                icon={Bot}
                health={health?.ai?.gpt}
                color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              />
              <ServiceCard
                name="Gemini"
                icon={Bot}
                health={health?.ai?.gemini}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <ServiceCard
                name="Perplexity"
                icon={Bot}
                health={health?.ai?.perplexity}
                color="bg-gradient-to-br from-purple-500 to-purple-600"
              />
              <ServiceCard
                name="GitHub"
                icon={GitBranch}
                health={health?.github}
                color="bg-gradient-to-br from-gray-700 to-gray-800"
              />
              <ServiceCard
                name="Supabase"
                icon={Database}
                health={health?.supabase}
                color="bg-gradient-to-br from-green-500 to-green-600"
              />
              <ServiceCard
                name="Notion"
                icon={BookOpen}
                health={health?.notion}
                color="bg-gradient-to-br from-gray-800 to-black"
              />
              <ServiceCard
                name="Vercel"
                icon={Rocket}
                health={health?.vercel}
                color="bg-gradient-to-br from-gray-900 to-black"
              />
              <ServiceCard
                name="n8n"
                icon={Workflow}
                health={health?.n8n}
                color="bg-gradient-to-br from-red-500 to-red-600"
              />
              <ServiceCard
                name="Google Cloud"
                icon={Cloud}
                health={health?.gcloud}
                color="bg-gradient-to-br from-blue-400 to-blue-500"
              />
              <ServiceCard
                name="Comet ML"
                icon={BarChart3}
                health={health?.comet}
                color="bg-gradient-to-br from-indigo-500 to-indigo-600"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Service Configuration</CardTitle>
                <CardDescription>
                  Add API keys in Replit Secrets panel to enable services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-md">
                    <h4 className="font-medium text-sm mb-2">AI Services</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• ANTHROPIC_API_KEY</li>
                      <li>• OPENAI_API_KEY</li>
                      <li>• GOOGLE_GENERATIVE_AI_API_KEY</li>
                      <li>• PERPLEXITY_API_KEY</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-md">
                    <h4 className="font-medium text-sm mb-2">Dev Tools</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• GITHUB_TOKEN</li>
                      <li>• VERCEL_TOKEN</li>
                      <li>• N8N_API_KEY + N8N_BASE_URL</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-md">
                    <h4 className="font-medium text-sm mb-2">Data Services</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• SUPABASE_URL + SUPABASE_ANON_KEY</li>
                      <li>• NOTION_API_KEY</li>
                      <li>• GOOGLE_CLOUD_CREDENTIALS</li>
                      <li>• COMET_API_KEY</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code-assistant" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Code Assistant
                  </CardTitle>
                  <CardDescription>
                    Analyze, improve, and debug your code with Claude AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={codeAction} onValueChange={setCodeAction} data-testid="select-code-action">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analyze">Analyze Code</SelectItem>
                        <SelectItem value="improve">Improve Code</SelectItem>
                        <SelectItem value="explain">Explain Code</SelectItem>
                        <SelectItem value="generate">Generate Code</SelectItem>
                        <SelectItem value="refactor">Refactor</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                        <SelectItem value="review">Code Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => codeAssistantMutation.mutate({ action: codeAction, code: codeInput })}
                      disabled={!codeInput || codeAssistantMutation.isPending}
                      data-testid="button-run-assistant"
                    >
                      {codeAssistantMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setCodeInput(""); setCodeResult(null); }}
                      disabled={!codeInput && !codeResult}
                      data-testid="button-clear-assistant"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste your code here..."
                    className="font-mono text-sm min-h-[300px]"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    data-testid="textarea-code-input"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Result
                  </CardTitle>
                  <CardDescription>
                    {codeResult ? `${codeResult.action} - ${codeResult.tokensUsed} tokens used` : "Run an action to see results"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[340px]">
                    {codeAssistantMutation.isPending ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : codeResult ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs whitespace-pre-wrap">
                          {codeResult.result}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                        <p>Select an action and run to analyze your code</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Rate Limit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rateLimit.remaining}/{rateLimit.limit}</div>
                  <Progress value={(rateLimit.remaining / rateLimit.limit) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">Resets in {rateLimit.resetIn}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Requests/min
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {logs ? Math.round(logs.length / Math.max(1, (stats?.uptime || 60) / 60)) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Average request rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{countConfiguredServices()}</div>
                  <p className="text-xs text-muted-foreground mt-2">Out of 11 total services</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Errors (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {logs?.filter(l => l.status >= 400).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Failed requests</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>Response times across recent requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="duration" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
                <div>
                  <CardTitle>Request Logs</CardTitle>
                  <CardDescription>All API requests with details</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportData("logs", "json")}
                    data-testid="button-export-logs-json"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportData("logs", "csv")}
                    data-testid="button-export-logs-csv"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/logs"] })}
                    data-testid="button-refresh-logs"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {logsLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Loading logs...
                    </div>
                  ) : logs && logs.length > 0 ? (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Terminal className="h-12 w-12 mb-4 opacity-20" />
                      <p>No logs available</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
                <CardDescription>Available REST API endpoints with authentication requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Public Endpoints (No Auth Required)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/stats</code>
                        <span className="text-sm text-muted-foreground ml-auto">API statistics</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/logs</code>
                        <span className="text-sm text-muted-foreground ml-auto">Request logs</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/health</code>
                        <span className="text-sm text-muted-foreground ml-auto">Services health status</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/notifications</code>
                        <span className="text-sm text-muted-foreground ml-auto">Notification history</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Protected Endpoints (API Key Required)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/files</code>
                        <span className="text-sm text-muted-foreground ml-auto">Create/update files</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/files/:path</code>
                        <span className="text-sm text-muted-foreground ml-auto">Read file content</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">DELETE</Badge>
                        <code className="font-mono text-sm">/api/files/:path</code>
                        <span className="text-sm text-muted-foreground ml-auto">Delete files</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/execute</code>
                        <span className="text-sm text-muted-foreground ml-auto">Execute shell commands</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/project</code>
                        <span className="text-sm text-muted-foreground ml-auto">Project structure</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/ai/code-assistant</code>
                        <span className="text-sm text-muted-foreground ml-auto">AI Code Assistant</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      MCP Proxy Routes (AI Services via Content MCP)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/content/ai/claude</code>
                        <span className="text-sm text-muted-foreground ml-auto">Claude AI</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/content/ai/gpt</code>
                        <span className="text-sm text-muted-foreground ml-auto">OpenAI GPT</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/content/ai/gemini</code>
                        <span className="text-sm text-muted-foreground ml-auto">Google Gemini</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="secondary">POST</Badge>
                        <code className="font-mono text-sm">/api/content/ai/perplexity</code>
                        <span className="text-sm text-muted-foreground ml-auto">Perplexity Search</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      MCP Proxy Routes (Integration MCP)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/integration/github/*</code>
                        <span className="text-sm text-muted-foreground ml-auto">GitHub API</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/integration/supabase/*</code>
                        <span className="text-sm text-muted-foreground ml-auto">Supabase API</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/integration/vercel/*</code>
                        <span className="text-sm text-muted-foreground ml-auto">Vercel API</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/integration/n8n/*</code>
                        <span className="text-sm text-muted-foreground ml-auto">n8n Workflows</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <Badge variant="outline">GET</Badge>
                        <code className="font-mono text-sm">/api/integration/gcloud/*</code>
                        <span className="text-sm text-muted-foreground ml-auto">Google Cloud</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    API Key Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${securityStatus?.apiKey?.isSet ? "text-green-600" : "text-red-600"}`}>
                    {securityStatus?.apiKey?.isSet ? "Active" : "Not Set"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {securityStatus?.apiKey?.keyLength 
                      ? `Key length: ${securityStatus.apiKey.keyLength} chars`
                      : "API key authentication"
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Security Headers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {securityStatus?.securityHeaders ? Object.values(securityStatus.securityHeaders).filter(Boolean).length : 0}/5
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">CSP, HSTS, X-Frame-Options</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-500" />
                    Protections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {securityStatus?.protections ? Object.values(securityStatus.protections).filter(Boolean).length : 0}/5
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">CSRF, Rate limit, Validation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Audit Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className="text-red-600">{securityStatus?.audit?.criticalEvents || 0}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-yellow-600">{securityStatus?.audit?.warningEvents || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Critical / Warning events</p>
                </CardContent>
              </Card>
            </div>

            {securityStatus?.recommendations && securityStatus.recommendations.length > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    Security Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {securityStatus.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Recent security-related events and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {securityEvents && securityEvents.length > 0 ? (
                    <div className="space-y-3">
                      {securityEvents.map((event) => (
                        <SecurityEventEntry key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ShieldCheck className="h-12 w-12 mb-4 opacity-20 text-green-500" />
                      <p>No security events</p>
                      <p className="text-xs mt-1">Your system is secure</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Features</CardTitle>
                <CardDescription>Active protection mechanisms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">API Key Authentication</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        All protected endpoints require X-API-KEY header
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Rate Limiting</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        100 requests per 15 minutes per IP address
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Path Sanitization</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prevents directory traversal and path injection attacks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Command Whitelist</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Only safe commands (ls, git, npm, etc.) are allowed
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {user && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TwoFactorSetup userId={user.id} />
                  <IPWhitelistManager />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <KeyRotationManager />
                  <AuditLogViewer />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
                <div>
                  <CardTitle>Alerts & Notifications</CardTitle>
                  <CardDescription>System alerts and notification history</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] })}
                  data-testid="button-refresh-notifications"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <NotificationEntry key={notification.id} notification={notification} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Bell className="h-12 w-12 mb-4 opacity-20" />
                      <p>No notifications</p>
                      <p className="text-xs mt-1">System alerts will appear here</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devtools" className="space-y-6" data-testid="tab-content-devtools">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SDKGenerator />
              <APIVersioning />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WebhookManager />
              <CacheMonitor />
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Quick Links
                  </CardTitle>
                  <CardDescription>Jump to developer tools</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/playground">
                    <Card className="hover-elevate cursor-pointer" data-testid="card-link-playground">
                      <CardContent className="pt-6 flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                          <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">API Playground</p>
                          <p className="text-xs text-muted-foreground">Test endpoints interactively</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/analytics">
                    <Card className="hover-elevate cursor-pointer" data-testid="card-link-analytics">
                      <CardContent className="pt-6 flex items-center gap-3">
                        <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                          <BarChartIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Analytics</p>
                          <p className="text-xs text-muted-foreground">API usage insights</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/status">
                    <Card className="hover-elevate cursor-pointer" data-testid="card-link-status">
                      <CardContent className="pt-6 flex items-center gap-3">
                        <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                          <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Status Page</p>
                          <p className="text-xs text-muted-foreground">Service health overview</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/teams">
                    <Card className="hover-elevate cursor-pointer" data-testid="card-link-teams">
                      <CardContent className="pt-6 flex items-center gap-3">
                        <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/30">
                          <UsersRound className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Teams</p>
                          <p className="text-xs text-muted-foreground">Organization management</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {user && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  API Configuration
                </CardTitle>
                <CardDescription>
                  Manage your API keys and service configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Security Notice</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        API keys should be added through Replit Secrets panel for security. 
                        Never expose API keys in frontend code or version control.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Configured Services ({countConfiguredServices()})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {health?.ai?.claude?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Bot className="h-4 w-4 text-green-600" />
                            Claude AI
                          </div>
                        )}
                        {health?.ai?.gpt?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Bot className="h-4 w-4 text-green-600" />
                            OpenAI GPT
                          </div>
                        )}
                        {health?.ai?.gemini?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Bot className="h-4 w-4 text-green-600" />
                            Google Gemini
                          </div>
                        )}
                        {health?.ai?.perplexity?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Bot className="h-4 w-4 text-green-600" />
                            Perplexity
                          </div>
                        )}
                        {health?.github?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <GitBranch className="h-4 w-4 text-green-600" />
                            GitHub
                          </div>
                        )}
                        {health?.supabase?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Database className="h-4 w-4 text-green-600" />
                            Supabase
                          </div>
                        )}
                        {health?.notion?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <BookOpen className="h-4 w-4 text-green-600" />
                            Notion
                          </div>
                        )}
                        {health?.vercel?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Rocket className="h-4 w-4 text-green-600" />
                            Vercel
                          </div>
                        )}
                        {health?.n8n?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Workflow className="h-4 w-4 text-green-600" />
                            n8n
                          </div>
                        )}
                        {health?.gcloud?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <Cloud className="h-4 w-4 text-green-600" />
                            Google Cloud
                          </div>
                        )}
                        {health?.comet?.configured && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <BarChart3 className="h-4 w-4 text-green-600" />
                            Comet ML
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Export Data</CardTitle>
                      <CardDescription>Download logs and statistics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => exportData("logs", "json")}
                        data-testid="button-settings-export-logs"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Logs (JSON)
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => exportData("logs", "csv")}
                        data-testid="button-settings-export-csv"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Logs (CSV)
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => exportData("stats", "json")}
                        data-testid="button-settings-export-stats"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Statistics (JSON)
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Notifications
                    </CardTitle>
                    <CardDescription>Configure email alerts for security events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmailStatusCard />
                  </CardContent>
                </Card>

                <SessionManagement />
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
