import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Send,
} from "lucide-react";

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

interface WebhookEventsData {
  events: string[];
}

interface DeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  response: string;
  deliveredAt: string;
}

export default function WebhookManager() {
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: webhooks, isLoading: webhooksLoading } = useQuery<WebhookEntry[]>({
    queryKey: ["/api/webhooks"],
  });

  const { data: availableEvents } = useQuery<WebhookEventsData>({
    queryKey: ["/api/webhooks/events"],
  });

  const { data: deliveryLogs, isLoading: logsLoading } = useQuery<DeliveryLog[]>({
    queryKey: ["/api/webhooks/logs"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/webhooks", {
        url: newUrl,
        events: selectedEvents,
        secret: newSecret || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewUrl("");
      setNewSecret("");
      setSelectedEvents([]);
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook Added", description: "Webhook subscription has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/logs"] });
      toast({ title: "Webhook Deleted", description: "Webhook subscription has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const webhookList = webhooks || [];
  const logList = deliveryLogs || [];
  const eventOptions = availableEvents?.events || [];

  return (
    <Card className="hover-elevate" data-testid="card-webhook-manager">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-webhook-manager">
              <Webhook className="h-5 w-5 text-primary" />
              Webhook Subscriptions
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-webhook-manager">
              Manage webhook endpoints and view delivery logs
            </CardDescription>
          </div>
          <Badge variant="outline" data-testid="badge-webhook-count">
            {webhookList.length} webhook{webhookList.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {webhooksLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-webhooks">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 p-4 rounded-md border">
              <p className="text-sm font-medium" data-testid="label-add-webhook">Add Webhook</p>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-xs text-muted-foreground" data-testid="label-webhook-url">URL</label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    data-testid="input-webhook-url"
                  />
                </div>
                <div className="min-w-[160px] space-y-1">
                  <label className="text-xs text-muted-foreground" data-testid="label-webhook-secret">Secret (optional)</label>
                  <Input
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    placeholder="webhook-secret"
                    type="password"
                    data-testid="input-webhook-secret"
                  />
                </div>
              </div>

              {eventOptions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" data-testid="label-webhook-events">Events</label>
                  <div className="flex flex-wrap gap-3" data-testid="list-event-checkboxes">
                    {eventOptions.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                        data-testid={`checkbox-label-${event}`}
                      >
                        <Checkbox
                          checked={selectedEvents.includes(event)}
                          onCheckedChange={() => toggleEvent(event)}
                          data-testid={`checkbox-event-${event}`}
                        />
                        {event}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !newUrl.trim() || selectedEvents.length === 0}
                size="sm"
                data-testid="button-add-webhook"
              >
                {addMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Webhook
              </Button>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3" data-testid="label-webhook-list">Active Webhooks</p>
              {webhookList.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground" data-testid="empty-state-webhooks">
                  <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No webhooks configured</p>
                  <p className="text-xs mt-1">Add a webhook URL above to get started</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2" data-testid="list-webhooks">
                    {webhookList.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border"
                        data-testid={`webhook-entry-${webhook.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm truncate" data-testid={`webhook-url-${webhook.id}`}>
                              {webhook.url}
                            </span>
                            <Badge
                              variant="outline"
                              className={webhook.active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"}
                              data-testid={`badge-active-${webhook.id}`}
                            >
                              {webhook.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap" data-testid={`webhook-events-${webhook.id}`}>
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="secondary" className="text-xs" data-testid={`badge-event-${webhook.id}-${event}`}>
                                {event}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1" data-testid={`webhook-created-${webhook.id}`}>
                            <Clock className="h-3 w-3" />
                            {formatDate(webhook.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(webhook.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-webhook-${webhook.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3" data-testid="label-delivery-logs">Recent Delivery Logs</p>
              {logsLoading ? (
                <div className="flex items-center justify-center py-4" data-testid="loading-delivery-logs">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : logList.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground" data-testid="empty-state-delivery-logs">
                  <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No delivery logs yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2" data-testid="list-delivery-logs">
                    {logList.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border"
                        data-testid={`delivery-log-${log.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-log-event-${log.id}`}>
                            {log.event}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              log.status === "success"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                            }
                            data-testid={`badge-log-status-${log.id}`}
                          >
                            {log.status === "success" ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {log.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0" data-testid={`text-delivered-${log.id}`}>
                          <Clock className="h-3 w-3" />
                          {formatDate(log.deliveredAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
