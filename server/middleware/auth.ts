import type { Request, Response, NextFunction } from "express";
import { notifyApiKeyMisuse } from "../services/notificationService";
import { logAuditEvent } from "../services/auditService";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for non-API routes (frontend routes handled by Vite/client-side router)
  // This ensures all frontend routes like /guide, /users, /terms, /license work without API key
  // /api-docs is a frontend route (not a backend API), so skip auth for it
  if ((!req.path.startsWith("/api") && !req.path.startsWith("/mcp")) || req.path === "/api-docs") {
    return next();
  }
  
  // Public API endpoints (no auth required)
  const publicApiPaths = [
    "/api/stats", "/api/logs", "/api/health",
    "/api/notifications",
    "/api-docs-spec",
    "/api/ws/status",
    "/api/email/status",
    "/api/status/services",
    "/api/playground/endpoints",
    "/api/playground/samples",
    "/api/playground/execute",
    "/api/a2a/agents",
    "/api/a2a/sessions",
    "/api/sdk/languages",
    "/api/webhooks/events",
    "/api/rate-limit/tiers",
  ];
  
  // Public API prefixes (auth endpoints handled by session, not API key)
  const publicApiPrefixes = [
    "/api/health/",
    "/api/login",
    "/api/logout", 
    "/api/callback",
    "/api/auth",
    "/api/2fa/status/",
  ];
  
  // Check exact public API paths
  if (publicApiPaths.includes(req.path)) {
    return next();
  }
  
  // Check public API prefixes
  if (publicApiPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }

  // Session-authenticated endpoints (dashboard users with Replit Auth session)
  const sessionProtectedPaths = [
    "/api/security/status", "/api/security/events", "/api/security/generate-key",
    "/api/audit/logs", "/api/audit/summary", "/api/audit/encryption-status",
    "/api/key-rotation/status", "/api/key-rotation/history",
    "/api/security-alerts", "/api/security-alerts/history",
    "/api/ip-whitelist", "/api/request-signing/status",
    "/api/sessions",
  ];
  
  const sessionProtectedPrefixes = [
    "/api/2fa/", "/api/key-rotation/", "/api/cache/", "/api/request-queue/",
    "/api/tiered-rate-limit/", "/api/webhooks/", "/api/analytics/",
    "/api/teams/", "/api/api-versioning/", "/api/sdk/", "/api/playground/",
    "/api/status/", "/api/a2a/",
  ];
  
  const isSessionProtected = sessionProtectedPaths.includes(req.path) ||
    sessionProtectedPrefixes.some(prefix => req.path.startsWith(prefix));
  
  if (isSessionProtected) {
    const user = (req as any).user;
    if (user && user.claims) {
      return next();
    }
    const apiKey = (req.headers["x-api-key"] as string) || (req.query.api_key as string);
    const validApiKey = process.env.API_KEY;
    if (apiKey && validApiKey && apiKey === validApiKey) {
      return next();
    }
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Authentication required" 
    });
  }

  // For all other protected endpoints (including /mcp), require API key
  const apiKey = (req.headers["x-api-key"] as string) || (req.query.api_key as string);
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.error("API_KEY environment variable not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (!apiKey) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    notifyApiKeyMisuse(ip, req.path, "missing");
    logAuditEvent({
      eventType: "api.key_missing",
      severity: "warning",
      ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing X-API-KEY header or api_key query parameter" 
    });
  }

  if (apiKey !== validApiKey) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    notifyApiKeyMisuse(ip, req.path, "invalid");
    logAuditEvent({
      eventType: "api.key_invalid",
      severity: "error",
      ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Invalid API key" 
    });
  }

  next();
}
