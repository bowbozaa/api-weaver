import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  RefreshCw,
  Shield,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SystemStatus {
  status: "operational" | "degraded" | "outage";
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  lastChecked: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface UptimeEntry {
  date: string;
  uptime: number;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  operational: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    label: "Operational",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    label: "Degraded",
  },
  outage: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    label: "Outage",
  },
  maintenance: {
    icon: Wrench,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    label: "Maintenance",
  },
};

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  minor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Status() {
  usePageTitle("System Status");
  const { data: systemStatus, isLoading: statusLoading } = useQuery<SystemStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 30000,
  });

  const { data: services, isLoading: servicesLoading } = useQuery<ServiceStatus[]>({
    queryKey: ["/api/status/services"],
    refetchInterval: 30000,
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/status/incidents"],
    refetchInterval: 30000,
  });

  const { data: uptimeData, isLoading: uptimeLoading } = useQuery<UptimeEntry[]>({
    queryKey: ["/api/status/uptime"],
    refetchInterval: 30000,
  });

  const overallConfig = statusConfig[systemStatus?.status || "operational"];
  const OverallIcon = overallConfig?.icon || CheckCircle2;

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
                <h1 className="text-xl font-bold" data-testid="text-page-title">System Status</h1>
                <p className="text-sm text-muted-foreground">Service health and uptime</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5" data-testid="badge-auto-refresh">
              <RefreshCw className="h-3 w-3" />
              Auto-refresh 30s
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {statusLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : (
          <Card
            className={`border-2 ${
              systemStatus?.status === "operational"
                ? "border-green-200 dark:border-green-800"
                : systemStatus?.status === "degraded"
                ? "border-yellow-200 dark:border-yellow-800"
                : "border-red-200 dark:border-red-800"
            }`}
            data-testid="card-system-status"
          >
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4">
                <div className={`p-3 rounded-full ${overallConfig?.bg}`}>
                  <OverallIcon className={`h-8 w-8 ${overallConfig?.color}`} />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold" data-testid="text-system-status">
                    {overallConfig?.label || "Unknown"}
                  </h2>
                  <p className="text-sm text-muted-foreground">All systems are monitored</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Service Status
          </h3>
          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => {
                const cfg = statusConfig[service.status] || statusConfig.operational;
                const Icon = cfg.icon;
                return (
                  <Card key={service.name} className="hover-elevate" data-testid={`card-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${cfg.bg}`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <span className="font-medium" data-testid={`text-service-name-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                            {service.name}
                          </span>
                        </div>
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.color}`} data-testid={`badge-service-status-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-services">
                <p className="text-sm">No service information available</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card data-testid="card-incidents">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : incidents && incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="p-4 rounded-md border bg-muted/30"
                    data-testid={`incident-${incident.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium" data-testid={`text-incident-title-${incident.id}`}>
                            {incident.title}
                          </h4>
                          <Badge variant="outline" className={severityColors[incident.severity] || ""}>
                            {incident.severity}
                          </Badge>
                          <Badge variant="secondary">{incident.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-incident-desc-${incident.id}`}>
                          {incident.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>Created: {new Date(incident.createdAt).toLocaleString()}</span>
                          <span>Updated: {new Date(incident.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-incidents">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active incidents</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-uptime">
          <CardHeader>
            <CardTitle className="text-base">Uptime History</CardTitle>
          </CardHeader>
          <CardContent>
            {uptimeLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : uptimeData && uptimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={uptimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[95, 100]} className="text-xs" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Uptime"]}
                  />
                  <Bar
                    dataKey="uptime"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground" data-testid="text-no-uptime">
                <p className="text-sm">No uptime data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
