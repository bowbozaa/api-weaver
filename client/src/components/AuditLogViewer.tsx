import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  RefreshCw,
  Download,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Globe,
  Activity,
} from "lucide-react";

interface AuditEvent {
  id: string;
  eventType: string;
  severity: string;
  userId: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  details: Record<string, unknown> | string;
  createdAt: string;
}

interface AuditLogData {
  events: AuditEvent[];
}

const severityStyles: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  critical: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700 font-bold",
};

export default function AuditLogViewer() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [eventTypeSearch, setEventTypeSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery<AuditLogData>({
    queryKey: ["/api/audit-logs", "limit=50"],
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEvents = (data?.events || []).filter((event) => {
    if (severityFilter !== "all" && event.severity !== severityFilter) return false;
    if (eventTypeSearch && !event.eventType.toLowerCase().includes(eventTypeSearch.toLowerCase())) return false;
    return true;
  });

  const exportAsJson = () => {
    const exportData = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredEvents.length} events.` });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDetails = (details: Record<string, unknown> | string) => {
    if (typeof details === "string") {
      try {
        return JSON.stringify(JSON.parse(details), null, 2);
      } catch {
        return details;
      }
    }
    return JSON.stringify(details, null, 2);
  };

  return (
    <Card className="hover-elevate" data-testid="card-audit-log">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-audit-log">
              <FileText className="h-5 w-5 text-primary" />
              Audit Logs
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-audit-log">
              Review system events and security audit trail
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-audit"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsJson}
              disabled={filteredEvents.length === 0}
              data-testid="button-export-audit"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-audit-log">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1 min-w-[160px]">
                <label className="text-sm font-medium" data-testid="label-severity-filter">Severity</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger data-testid="select-severity-filter">
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-severity-all">All</SelectItem>
                    <SelectItem value="info" data-testid="option-severity-info">Info</SelectItem>
                    <SelectItem value="warning" data-testid="option-severity-warning">Warning</SelectItem>
                    <SelectItem value="error" data-testid="option-severity-error">Error</SelectItem>
                    <SelectItem value="critical" data-testid="option-severity-critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-sm font-medium" data-testid="label-event-type-filter">Event Type</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={eventTypeSearch}
                    onChange={(e) => setEventTypeSearch(e.target.value)}
                    placeholder="Search event types..."
                    className="pl-9"
                    data-testid="input-event-type-filter"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground" data-testid="text-event-count">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
            </div>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-state-audit-log">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No audit events found</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2" data-testid="list-audit-events">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-md border p-3"
                      data-testid={`audit-event-${event.id}`}
                    >
                      <div
                        className="flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => toggleExpand(event.id)}
                        data-testid={`button-expand-${event.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-xs ${severityStyles[event.severity] || ""}`}
                            data-testid={`badge-severity-${event.id}`}
                          >
                            {event.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium" data-testid={`text-event-type-${event.id}`}>
                            {event.eventType}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-timestamp-${event.id}`}>
                            <Clock className="h-3 w-3" />
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-ip-${event.id}`}>
                            <Globe className="h-3 w-3" />
                            {event.ip}
                          </span>
                          {expandedIds.has(event.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {event.method && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-method-${event.id}`}>
                            {event.method}
                          </Badge>
                        )}
                        {event.path && (
                          <span className="font-mono" data-testid={`text-path-${event.id}`}>{event.path}</span>
                        )}
                      </div>

                      {expandedIds.has(event.id) && event.details && (
                        <div className="mt-3" data-testid={`details-${event.id}`}>
                          <Separator className="mb-3" />
                          <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                            {formatDetails(event.details)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
