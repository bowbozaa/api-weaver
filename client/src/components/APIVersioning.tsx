import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  GitBranch,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

interface APIVersion {
  version: string;
  releaseDate: string;
  status: string;
  endpoints: number;
  changes: string[];
}

interface VersionsResponse {
  versions: APIVersion[];
}

interface CurrentVersionResponse {
  version: string;
  releaseDate: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  deprecated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  sunset: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

export default function APIVersioning() {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const { data: versionsData, isLoading: versionsLoading } = useQuery<VersionsResponse>({
    queryKey: ["/api/versions"],
  });

  const { data: currentVersion, isLoading: currentLoading } = useQuery<CurrentVersionResponse>({
    queryKey: ["/api/versions/current"],
  });

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const versions = versionsData?.versions || [];
  const deprecatedCount = versions.filter((v) => v.status === "deprecated" || v.status === "sunset").length;
  const isLoading = versionsLoading || currentLoading;

  return (
    <Card className="hover-elevate" data-testid="card-api-versioning">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-api-versioning">
              <GitBranch className="h-5 w-5 text-primary" />
              API Versions
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-api-versioning">
              Track API version history and changelog
            </CardDescription>
          </div>
          <Badge variant="outline" data-testid="badge-version-count">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="loading-versions">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {currentVersion && (
              <div
                className="p-4 rounded-md border bg-primary/5 border-primary/20"
                data-testid="section-current-version"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium" data-testid="text-current-version">
                        Current: {currentVersion.version}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5" data-testid="text-current-release-date">
                        <Calendar className="h-3 w-3" />
                        Released {formatDate(currentVersion.releaseDate)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_STYLES[currentVersion.status] || ""}
                    data-testid="badge-current-status"
                  >
                    {currentVersion.status}
                  </Badge>
                </div>
              </div>
            )}

            {deprecatedCount > 0 && (
              <div
                className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
                data-testid="warning-deprecated-versions"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-sm">
                  {deprecatedCount} version{deprecatedCount !== 1 ? "s" : ""} deprecated or sunset. Consider migrating endpoints.
                </p>
              </div>
            )}

            {versions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground" data-testid="empty-state-versions">
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No versions available</p>
              </div>
            ) : (
              <div className="space-y-2" data-testid="list-versions">
                {versions.map((ver) => (
                  <Collapsible
                    key={ver.version}
                    open={expandedVersions.has(ver.version)}
                    onOpenChange={() => toggleVersion(ver.version)}
                  >
                    <div
                      className="rounded-md border"
                      data-testid={`version-entry-${ver.version}`}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="lg"
                          className="w-full justify-start rounded-md"
                          data-testid={`button-toggle-version-${ver.version}`}
                        >
                          <div className="flex items-center justify-between gap-3 w-full flex-wrap">
                            <div className="flex items-center gap-3">
                              {expandedVersions.has(ver.version) ? (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              )}
                              <span className="font-medium" data-testid={`text-version-string-${ver.version}`}>
                                {ver.version}
                              </span>
                              <Badge
                                variant="outline"
                                className={STATUS_STYLES[ver.status] || ""}
                                data-testid={`badge-version-status-${ver.version}`}
                              >
                                {ver.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1" data-testid={`text-version-date-${ver.version}`}>
                                <Clock className="h-3 w-3" />
                                {formatDate(ver.releaseDate)}
                              </span>
                              <span className="flex items-center gap-1" data-testid={`text-version-endpoints-${ver.version}`}>
                                <Layers className="h-3 w-3" />
                                {ver.endpoints} endpoint{ver.endpoints !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-1" data-testid={`section-changes-${ver.version}`}>
                          {ver.changes && ver.changes.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground mb-2" data-testid={`label-changelog-${ver.version}`}>
                                Changelog
                              </p>
                              <ul className="space-y-1" data-testid={`list-changes-${ver.version}`}>
                                {ver.changes.map((change, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-muted-foreground flex items-start gap-2"
                                    data-testid={`text-change-${ver.version}-${idx}`}
                                  >
                                    <span className="text-primary mt-1.5 shrink-0 h-1 w-1 rounded-full bg-primary inline-block" />
                                    {change}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground" data-testid={`text-no-changes-${ver.version}`}>
                              No changes documented for this version.
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
