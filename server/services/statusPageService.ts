import { randomUUID } from "crypto";

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";
type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
type IncidentSeverity = "minor" | "major" | "critical";

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  lastChecked: Date;
  uptime: number;
}

interface IncidentUpdate {
  status: IncidentStatus;
  message: string;
  updatedAt: Date;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedServices: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  updates: IncidentUpdate[];
}

interface UptimeEntry {
  date: string;
  uptimePercent: number;
  incidents: number;
}

const services = new Map<string, ServiceInfo>([
  [
    "api-gateway",
    {
      name: "API Gateway",
      status: "operational",
      lastChecked: new Date(),
      uptime: 99.99,
    },
  ],
  [
    "authentication",
    {
      name: "Authentication Service",
      status: "operational",
      lastChecked: new Date(),
      uptime: 99.95,
    },
  ],
  [
    "ai-service",
    {
      name: "AI Service",
      status: "operational",
      lastChecked: new Date(),
      uptime: 99.9,
    },
  ],
  [
    "file-service",
    {
      name: "File Service",
      status: "operational",
      lastChecked: new Date(),
      uptime: 99.98,
    },
  ],
  [
    "webhook-service",
    {
      name: "Webhook Service",
      status: "operational",
      lastChecked: new Date(),
      uptime: 99.97,
    },
  ],
  [
    "database",
    {
      name: "Database",
      status: "operational",
      lastChecked: new Date(),
      uptime: 99.99,
    },
  ],
]);

const incidents: Incident[] = [];

export function getSystemStatus(): {
  status: ServiceStatus;
  message: string;
  services: ServiceInfo[];
  activeIncidents: number;
} {
  const allServices = Array.from(services.values());
  let overallStatus: ServiceStatus = "operational";

  for (const svc of allServices) {
    if (svc.status === "outage") {
      overallStatus = "outage";
      break;
    }
    if (svc.status === "degraded") {
      overallStatus = "degraded";
    }
    if (svc.status === "maintenance" && overallStatus === "operational") {
      overallStatus = "maintenance";
    }
  }

  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;

  const messages: Record<ServiceStatus, string> = {
    operational: "All systems operational",
    degraded: "Some systems are experiencing degraded performance",
    outage: "Major outage detected",
    maintenance: "Scheduled maintenance in progress",
  };

  return {
    status: overallStatus,
    message: messages[overallStatus],
    services: allServices,
    activeIncidents,
  };
}

export function getServiceStatuses(): ServiceInfo[] {
  return Array.from(services.values());
}

export function updateServiceStatus(
  serviceName: string,
  status: ServiceStatus
): ServiceInfo | null {
  const service = services.get(serviceName);
  if (!service) return null;
  service.status = status;
  service.lastChecked = new Date();
  return service;
}

export function getIncidents(
  includeResolved: boolean = false
): Incident[] {
  if (includeResolved) return [...incidents];
  return incidents.filter((i) => i.status !== "resolved");
}

export function createIncident(
  title: string,
  description: string,
  severity: IncidentSeverity,
  affectedServices: string[] = []
): Incident {
  if (!title || !title.trim()) {
    throw new Error("Incident title is required");
  }

  const incident: Incident = {
    id: randomUUID(),
    title: title.trim(),
    description: description || "",
    severity,
    status: "investigating",
    affectedServices,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    updates: [
      {
        status: "investigating",
        message: `Incident created: ${description}`,
        updatedAt: new Date(),
      },
    ],
  };

  for (const svcName of affectedServices) {
    const svc = services.get(svcName);
    if (svc) {
      svc.status = severity === "critical" ? "outage" : "degraded";
      svc.lastChecked = new Date();
    }
  }

  incidents.unshift(incident);
  return incident;
}

export function updateIncident(
  id: string,
  status: IncidentStatus,
  message?: string
): Incident | null {
  const incident = incidents.find((i) => i.id === id);
  if (!incident) return null;

  incident.status = status;
  incident.updatedAt = new Date();

  if (status === "resolved") {
    incident.resolvedAt = new Date();
    for (const svcName of incident.affectedServices) {
      const svc = services.get(svcName);
      if (svc) {
        svc.status = "operational";
        svc.lastChecked = new Date();
      }
    }
  }

  incident.updates.push({
    status,
    message: message || `Status updated to ${status}`,
    updatedAt: new Date(),
  });

  return incident;
}

export function getUptimeHistory(days: number = 30): UptimeEntry[] {
  const history: UptimeEntry[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayIncidents = incidents.filter((inc) => {
      const created = inc.createdAt.toISOString().split("T")[0];
      return created === dateStr;
    });

    let uptimePercent = 100;
    for (const inc of dayIncidents) {
      if (inc.severity === "critical") uptimePercent -= 5;
      else if (inc.severity === "major") uptimePercent -= 2;
      else uptimePercent -= 0.5;
    }

    history.push({
      date: dateStr,
      uptimePercent: Math.max(0, Math.min(100, uptimePercent)),
      incidents: dayIncidents.length,
    });
  }

  return history;
}
