type VersionStatus = "active" | "deprecated" | "sunset";

interface DeprecatedEndpoint {
  method: string;
  path: string;
  deprecatedIn: string;
  removedIn: string | null;
  alternative: string;
}

interface ApiVersion {
  version: string;
  releaseDate: string;
  status: VersionStatus;
  changesFromPrevious: string[];
  deprecatedEndpoints: DeprecatedEndpoint[];
}

const versions: ApiVersion[] = [
  {
    version: "v1",
    releaseDate: "2024-01-15",
    status: "deprecated",
    changesFromPrevious: [
      "Initial API release",
      "Basic CRUD operations for files",
      "Command execution endpoint",
      "AI prompt endpoint",
      "MCP tool integration",
    ],
    deprecatedEndpoints: [
      {
        method: "GET",
        path: "/api/v1/files",
        deprecatedIn: "v2",
        removedIn: null,
        alternative: "GET /api/v2/files",
      },
      {
        method: "POST",
        path: "/api/v1/execute",
        deprecatedIn: "v2",
        removedIn: null,
        alternative: "POST /api/v2/execute",
      },
    ],
  },
  {
    version: "v2",
    releaseDate: "2025-06-01",
    status: "active",
    changesFromPrevious: [
      "Enhanced authentication with API key rotation",
      "Two-factor authentication support",
      "IP whitelisting",
      "Request signing",
      "Webhook support",
      "Team management",
      "SDK generation",
      "API playground",
      "Analytics dashboard",
      "Tiered rate limiting",
    ],
    deprecatedEndpoints: [],
  },
];

export function getVersions(): ApiVersion[] {
  return versions;
}

export function getVersionInfo(version: string): ApiVersion | undefined {
  return versions.find((v) => v.version === version);
}

export function getCurrentVersion(): ApiVersion {
  const active = versions.find((v) => v.status === "active");
  if (!active) {
    return versions[versions.length - 1];
  }
  return active;
}

export function getDeprecatedEndpoints(): DeprecatedEndpoint[] {
  const deprecated: DeprecatedEndpoint[] = [];
  for (const v of versions) {
    deprecated.push(...v.deprecatedEndpoints);
  }
  return deprecated;
}
