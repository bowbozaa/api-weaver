import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Activity,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TimeSeriesPoint {
  timestamp: string;
  requests: number;
  errors: number;
  avgDuration: number;
}

interface AnalyticsData {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoint: string;
  timeSeries: TimeSeriesPoint[];
}

interface TopEndpoint {
  path: string;
  method: string;
  count: number;
  avgDuration: number;
  errorRate: number;
}

interface ErrorEntry {
  status: number;
  count: number;
  lastOccurred: string;
}

interface ErrorAnalytics {
  topErrors: ErrorEntry[];
}

const TIME_RANGES = ["1h", "6h", "24h", "7d", "30d"] as const;

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function Analytics() {
  usePageTitle("Analytics");
  const [range, setRange] = useState<string>("24h");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", range],
    refetchInterval: 10000,
  });

  const { data: topEndpoints, isLoading: topLoading } = useQuery<TopEndpoint[]>({
    queryKey: ["/api/analytics/top", "limit=10"],
    refetchInterval: 10000,
  });

  const { data: errorData, isLoading: errorsLoading } = useQuery<ErrorAnalytics>({
    queryKey: ["/api/analytics/errors"],
    refetchInterval: 10000,
  });

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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
                <h1 className="text-xl font-bold" data-testid="text-page-title">Analytics</h1>
                <p className="text-sm text-muted-foreground">API usage and performance metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5" data-testid="badge-auto-refresh">
                <RefreshCw className="h-3 w-3" />
                Auto-refresh 10s
              </Badge>
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                {TIME_RANGES.map((r) => (
                  <Button
                    key={r}
                    variant={range === r ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setRange(r)}
                    data-testid={`button-range-${r}`}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card data-testid="stat-total-requests">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="value-total-requests">
                    {analytics?.totalRequests?.toLocaleString() ?? 0}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stat-avg-response">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="value-avg-response">
                    {analytics?.avgResponseTime ?? 0}ms
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stat-error-rate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="value-error-rate">
                    {analytics?.errorRate != null ? `${analytics.errorRate.toFixed(1)}%` : "0%"}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stat-top-endpoint">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Endpoint</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold font-mono truncate" data-testid="value-top-endpoint">
                    {analytics?.topEndpoint ?? "N/A"}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card data-testid="chart-request-volume">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Request Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTimestamp}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    labelFormatter={formatTimestamp}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    name="Requests"
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.1}
                    name="Errors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground" data-testid="text-no-chart-data">
                <p className="text-sm">No time series data available for this range</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="table-top-endpoints">
            <CardHeader>
              <CardTitle className="text-base">Top Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topEndpoints && topEndpoints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                      <TableHead className="text-right">Error Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topEndpoints.map((ep, i) => (
                      <TableRow key={i} data-testid={`row-endpoint-${i}`}>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs font-mono ${methodColors[ep.method] || ""}`}>
                              {ep.method}
                            </Badge>
                            <span className="font-mono text-sm truncate">{ep.path}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" data-testid={`value-endpoint-count-${i}`}>{ep.count}</TableCell>
                        <TableCell className="text-right">{ep.avgDuration}ms</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={ep.errorRate > 5 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : ""}
                          >
                            {ep.errorRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-top-endpoints">
                  No endpoint data available
                </p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="table-error-analytics">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Error Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : errorData?.topErrors && errorData.topErrors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Last Occurred</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorData.topErrors.map((err, i) => (
                      <TableRow key={i} data-testid={`row-error-${i}`}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              err.status >= 500
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }
                          >
                            {err.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`value-error-count-${i}`}>
                          {err.count}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(err.lastOccurred).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-errors">
                  No error data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
