import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  HardDrive,
} from "lucide-react";

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

function getPerformanceLevel(hitRate: number): { label: string; className: string } {
  if (hitRate >= 80) {
    return {
      label: "Good",
      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    };
  }
  if (hitRate >= 50) {
    return {
      label: "Fair",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    };
  }
  return {
    label: "Poor",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CacheMonitor() {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<CacheStats>({
    queryKey: ["/api/cache/stats"],
    refetchInterval: 5000,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cache/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "cache-admin",
        },
        credentials: "include",
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cache/stats"] });
      toast({
        title: "Cache Cleared",
        description: "All cached data has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hitRate = stats?.hitRate ?? 0;
  const performance = getPerformanceLevel(hitRate);

  return (
    <Card className="hover-elevate" data-testid="card-cache-monitor">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-cache-monitor">
              <Database className="h-5 w-5 text-primary" />
              Cache Monitor
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-cache-monitor">
              Real-time cache performance metrics (auto-refreshes every 5s)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <Badge
                variant="outline"
                className={performance.className}
                data-testid="badge-cache-performance"
              >
                {performance.label}
              </Badge>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              data-testid="button-clear-cache"
            >
              {clearMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Cache
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-cache-stats">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="space-y-2" data-testid="section-hit-rate">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium flex items-center gap-2" data-testid="label-hit-rate">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Hit Rate
                </span>
                <span className="text-sm font-medium" data-testid="text-hit-rate-value">
                  {hitRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={hitRate} data-testid="progress-hit-rate" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="section-cache-stats">
              <div className="p-4 rounded-md border space-y-1" data-testid="stat-total-hits">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span data-testid="label-total-hits">Total Hits</span>
                </div>
                <p className="text-2xl font-semibold" data-testid="text-total-hits-value">
                  {stats.hits.toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-md border space-y-1" data-testid="stat-total-misses">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span data-testid="label-total-misses">Total Misses</span>
                </div>
                <p className="text-2xl font-semibold" data-testid="text-total-misses-value">
                  {stats.misses.toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-md border space-y-1" data-testid="stat-cache-size">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  <span data-testid="label-cache-size">Cache Size</span>
                </div>
                <p className="text-2xl font-semibold" data-testid="text-cache-size-value">
                  {formatSize(stats.size)}
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground flex items-center gap-2"
              data-testid="notice-auto-refresh"
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              Stats refresh automatically every 5 seconds
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground" data-testid="empty-state-cache">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unable to load cache statistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
