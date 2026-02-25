import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  Smartphone, 
  Laptop, 
  RefreshCw, 
  Trash2, 
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionInfo {
  sid: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  isCurrentSession: boolean;
}

export default function SessionManagement() {
  const { toast } = useToast();
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ sessions: SessionInfo[] }>({
    queryKey: ["/api/sessions"],
    refetchInterval: 30000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sid: string) => {
      return await apiRequest("DELETE", `/api/sessions/${sid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session Revoked",
        description: "The session has been successfully logged out.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke session",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setRevoking(null);
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/sessions/revoke-all");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Sessions Revoked",
        description: `Successfully logged out ${data.revokedCount || 0} other device(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke sessions",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviceIcon = (index: number) => {
    const icons = [Monitor, Laptop, Smartphone];
    const Icon = icons[index % icons.length];
    return <Icon className="h-5 w-5" />;
  };

  const sessions = data?.sessions || [];
  const otherSessions = sessions.filter(s => !s.isCurrentSession);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Active Sessions
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your active sessions and logout from other devices
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-sessions"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {otherSessions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid="button-revoke-all-sessions"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Logout All Others
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Logout from all other devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will end {otherSessions.length} session(s) on other devices. 
                      You will remain logged in on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-revoke-all">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => revokeAllMutation.mutate()}
                      disabled={revokeAllMutation.isPending}
                      data-testid="button-confirm-revoke-all"
                    >
                      {revokeAllMutation.isPending ? "Logging out..." : "Logout All"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="sessions-loading">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="sessions-empty-state">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>No active sessions found</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="sessions-list">
            {sessions.map((session, index) => (
              <div
                key={session.sid}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  session.isCurrentSession
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30"
                }`}
                data-testid={`session-item-${session.sid}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    session.isCurrentSession ? "bg-primary/10 text-primary" : "bg-muted"
                  }`}>
                    {getDeviceIcon(index)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" data-testid={`session-email-${session.sid}`}>
                        {session.email}
                      </span>
                      {session.isCurrentSession && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1" data-testid={`session-created-${session.sid}`}>
                        <Clock className="h-3 w-3" />
                        Created: {formatDate(session.createdAt)}
                      </span>
                      <span data-testid={`session-expires-${session.sid}`}>Expires: {formatDate(session.expiresAt)}</span>
                    </div>
                  </div>
                </div>
                {!session.isCurrentSession && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revoking === session.sid}
                        data-testid={`button-revoke-session-${session.sid}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Logout this device?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will end the session for {session.email}. 
                          They will need to login again to access the app.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid={`button-cancel-revoke-${session.sid}`}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setRevoking(session.sid);
                            revokeSessionMutation.mutate(session.sid);
                          }}
                          data-testid={`button-confirm-revoke-${session.sid}`}
                        >
                          Logout Device
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground" data-testid="sessions-expiry-notice">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Sessions automatically expire after 7 days of inactivity
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
