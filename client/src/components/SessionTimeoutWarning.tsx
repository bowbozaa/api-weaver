import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, X } from "lucide-react";

const SESSION_CHECK_INTERVAL = 60 * 1000;
const WARNING_THRESHOLD = 5 * 60 * 1000;

export function SessionTimeoutWarning() {
  const { isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, [isAuthenticated, updateActivity]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity;
      if (idle > 25 * 60 * 1000) {
        setShowWarning(true);
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  const handleExtend = async () => {
    try {
      await fetch("/api/auth/user", { credentials: "include" });
      updateActivity();
    } catch {
      window.location.href = "/";
    }
  };

  if (!showWarning || !isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-4">
      <Card className="w-80 border-yellow-500/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-yellow-500/10 shrink-0">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Session expiring soon</p>
              <p className="text-xs text-muted-foreground mb-3">
                Your session will expire due to inactivity. Click below to stay signed in.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={handleExtend} data-testid="button-extend-session">
                  Stay signed in
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowWarning(false)} data-testid="button-dismiss-warning">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
