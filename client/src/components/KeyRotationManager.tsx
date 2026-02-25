import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound,
  RefreshCw,
  Clock,
  RotateCcw,
  Copy,
  CheckCircle2,
  Calendar,
  Timer,
} from "lucide-react";

interface KeyRotationStatus {
  autoRotationEnabled: boolean;
  intervalDays: number;
  cronSchedule: string;
  nextRotation: string | null;
}

interface RotationEntry {
  id: string;
  rotationType: string;
  rotatedAt: string;
  rotatedBy: string;
  expiresAt: string;
}

interface RotationHistory {
  rotations: RotationEntry[];
}

interface RotateResponse {
  newKey?: string;
  message?: string;
}

export default function KeyRotationManager() {
  const { toast } = useToast();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<KeyRotationStatus>({
    queryKey: ["/api/key-rotation/status"],
  });

  const { data: history, isLoading: historyLoading } = useQuery<RotationHistory>({
    queryKey: ["/api/key-rotation/history"],
  });

  const rotateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/key-rotation/rotate");
      return res.json() as Promise<RotateResponse>;
    },
    onSuccess: (data) => {
      if (data.newKey) {
        setNewKey(data.newKey);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/key-rotation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/key-rotation/history"] });
      toast({ title: "Key Rotated", description: data.message || "API key has been rotated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Rotation Failed", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "New key copied to clipboard." });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isLoading = statusLoading || historyLoading;
  const rotations = history?.rotations?.slice(0, 5) || [];

  return (
    <Card className="hover-elevate" data-testid="card-key-rotation">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-key-rotation">
              <KeyRound className="h-5 w-5 text-primary" />
              API Key Rotation
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-key-rotation">
              Manage API key rotation and view rotation history
            </CardDescription>
          </div>
          <Button
            onClick={() => rotateMutation.mutate()}
            disabled={rotateMutation.isPending}
            data-testid="button-rotate-now"
          >
            {rotateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Rotate Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-key-rotation">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-md border" data-testid="display-auto-rotation">
                <p className="text-xs text-muted-foreground mb-1">Auto-Rotation</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={status?.autoRotationEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                      : ""}
                    data-testid="badge-auto-rotation"
                  >
                    {status?.autoRotationEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {status?.autoRotationEnabled && (
                    <span className="text-sm text-muted-foreground" data-testid="text-interval">
                      every {status.intervalDays} days
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-md border" data-testid="display-next-rotation">
                <p className="text-xs text-muted-foreground mb-1">Next Rotation</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-next-rotation">
                    {status?.nextRotation ? formatDate(status.nextRotation) : "Not scheduled"}
                  </span>
                </div>
              </div>
            </div>

            {newKey && (
              <>
                <Separator />
                <div className="p-3 rounded-md border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" data-testid="display-new-key">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2 text-green-800 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    New API Key
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 rounded-md bg-background border font-mono text-xs break-all" data-testid="text-new-key">
                      {newKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newKey)}
                      data-testid="button-copy-new-key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Save this key securely. It will not be shown again.
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3" data-testid="label-rotation-history">Rotation History</p>
              {rotations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground" data-testid="empty-state-rotation-history">
                  <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No rotation history</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-2" data-testid="list-rotation-history">
                    {rotations.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border"
                        data-testid={`rotation-entry-${entry.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs" data-testid={`badge-rotation-type-${entry.id}`}>
                                {entry.rotationType}
                              </Badge>
                              <span className="text-xs text-muted-foreground" data-testid={`text-rotated-by-${entry.id}`}>
                                by {entry.rotatedBy}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1" data-testid={`text-rotated-at-${entry.id}`}>
                                <Clock className="h-3 w-3" />
                                {formatDate(entry.rotatedAt)}
                              </span>
                              <span data-testid={`text-expires-at-${entry.id}`}>
                                Expires: {formatDate(entry.expiresAt)}
                              </span>
                            </div>
                          </div>
                        </div>
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
