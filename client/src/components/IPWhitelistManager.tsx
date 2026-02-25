import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  Globe,
  Clock,
} from "lucide-react";

interface IPWhitelistEntry {
  id: string;
  ip: string;
  description: string | null;
  enabled: boolean;
  createdAt: string;
}

interface IPWhitelistData {
  enabled: boolean;
  entries: IPWhitelistEntry[];
}

export default function IPWhitelistManager() {
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading } = useQuery<IPWhitelistData>({
    queryKey: ["/api/ip-whitelist"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ip-whitelist", {
        ip: newIp,
        description: newDescription,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewIp("");
      setNewDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/ip-whitelist"] });
      toast({ title: "IP Added", description: "IP address has been added to the whitelist." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ip-whitelist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ip-whitelist"] });
      toast({ title: "IP Removed", description: "IP address has been removed from the whitelist." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const entries = data?.entries || [];

  return (
    <Card className="hover-elevate" data-testid="card-ip-whitelist">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-ip-whitelist">
              <Shield className="h-5 w-5 text-primary" />
              IP Whitelist
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-ip-whitelist">
              Manage allowed IP addresses for API access
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={data?.enabled
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
              : ""}
            data-testid="badge-whitelist-status"
          >
            {data?.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-ip-whitelist">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px] space-y-1">
                <label className="text-sm font-medium" data-testid="label-ip-address">IP Address</label>
                <Input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="192.168.1.1"
                  data-testid="input-ip-address"
                />
              </div>
              <div className="flex-1 min-w-[180px] space-y-1">
                <label className="text-sm font-medium" data-testid="label-ip-description">Description</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Office network"
                  data-testid="input-ip-description"
                />
              </div>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !newIp.trim()}
                size="default"
                data-testid="button-add-ip"
              >
                {addMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add
              </Button>
            </div>

            <Separator />

            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-state-ip-whitelist">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No IP addresses in whitelist</p>
                <p className="text-xs mt-1">Add an IP address above to get started</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2" data-testid="list-ip-entries">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border"
                      data-testid={`ip-entry-${entry.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium" data-testid={`ip-address-${entry.id}`}>
                            {entry.ip}
                          </p>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground truncate" data-testid={`ip-description-${entry.id}`}>
                              {entry.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5" data-testid={`ip-created-${entry.id}`}>
                            <Clock className="h-3 w-3" />
                            {formatDate(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMutation.mutate(entry.id)}
                        disabled={removeMutation.isPending}
                        data-testid={`button-remove-ip-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
