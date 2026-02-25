import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  ShieldOff,
  KeyRound,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface TwoFactorStatus {
  isSetup: boolean;
  isEnabled: boolean;
  backupCodesRemaining: number;
}

interface SetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface TwoFactorSetupProps {
  userId: string;
}

export default function TwoFactorSetup({ userId }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);

  const { data: status, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ["/api/2fa/status", `userId=${userId}`],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/setup", { userId });
      return res.json() as Promise<SetupResponse>;
    },
    onSuccess: (data) => {
      setSetupData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      toast({ title: "2FA Setup Initiated", description: "Scan the QR code or enter the secret manually." });
    },
    onError: (error: Error) => {
      toast({ title: "Setup Failed", description: error.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/verify", { userId, token });
      return res.json();
    },
    onSuccess: () => {
      setToken("");
      setSetupData(null);
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      toast({ title: "2FA Verified", description: "Two-factor authentication is now enabled." });
    },
    onError: (error: Error) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/disable", { userId });
      return res.json();
    },
    onSuccess: () => {
      setSetupData(null);
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been disabled." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard." });
  };

  const getStatusBadge = () => {
    if (!status) return null;
    if (status.isEnabled) {
      return (
        <Badge data-testid="badge-2fa-status" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" variant="outline">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Enabled
        </Badge>
      );
    }
    if (status.isSetup) {
      return (
        <Badge data-testid="badge-2fa-status" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" variant="outline">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Setup (Not Verified)
        </Badge>
      );
    }
    return (
      <Badge data-testid="badge-2fa-status" variant="secondary">
        Not Setup
      </Badge>
    );
  };

  return (
    <Card className="hover-elevate" data-testid="card-two-factor-setup">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-two-factor">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-two-factor">
              Secure your account with TOTP-based two-factor authentication
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-2fa">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {status && !status.isSetup && !status.isEnabled && (
              <Button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
                data-testid="button-setup-2fa"
              >
                {setupMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Setup Two-Factor Authentication
              </Button>
            )}

            {setupData && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2" data-testid="label-qr-url">QR Code URL</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 p-3 rounded-md border bg-muted/50 font-mono text-xs break-all"
                        data-testid="display-qr-url"
                      >
                        {setupData.qrCodeUrl}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(setupData.qrCodeUrl)}
                        data-testid="button-copy-qr-url"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2" data-testid="label-secret">Secret Key</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 p-3 rounded-md border bg-muted/50 font-mono text-sm"
                        data-testid="display-secret"
                      >
                        {setupData.secret}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(setupData.secret)}
                        data-testid="button-copy-secret"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2" data-testid="label-backup-codes">Backup Codes</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="display-backup-codes">
                      {setupData.backupCodes.map((code, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-md border bg-muted/50 font-mono text-sm text-center"
                          data-testid={`backup-code-${i}`}
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-2" data-testid="label-verify-token">Enter TOTP Code to Verify</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        data-testid="input-totp-code"
                      />
                      <Button
                        onClick={() => verifyMutation.mutate()}
                        disabled={verifyMutation.isPending || token.length < 6}
                        data-testid="button-verify-2fa"
                      >
                        {verifyMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {status?.isEnabled && (
              <>
                <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50" data-testid="display-backup-remaining">
                  <span className="text-sm text-muted-foreground">Backup codes remaining</span>
                  <Badge variant="outline" data-testid="badge-backup-count">
                    {status.backupCodesRemaining}
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => disableMutation.mutate()}
                  disabled={disableMutation.isPending}
                  data-testid="button-disable-2fa"
                >
                  {disableMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldOff className="h-4 w-4 mr-2" />
                  )}
                  Disable Two-Factor Authentication
                </Button>
              </>
            )}

            {status?.isSetup && !status.isEnabled && !setupData && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground" data-testid="text-pending-verification">
                  2FA has been set up but not yet verified. Enter your TOTP code to complete setup.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    data-testid="input-totp-code-pending"
                  />
                  <Button
                    onClick={() => verifyMutation.mutate()}
                    disabled={verifyMutation.isPending || token.length < 6}
                    data-testid="button-verify-2fa-pending"
                  >
                    {verifyMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Verify
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
