import type { Request, Response, NextFunction } from "express";
import { notifyApiKeyMisuse } from "../services/notificationService";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public endpoints and Vite development assets
  const publicPaths = ["/", "/docs", "/api-docs", "/api/stats", "/api/logs"];
  const publicPrefixes = [
    "/docs",
    "/@vite",
    "/@react-refresh",
    "/@replit",
    "/@fs",
    "/src",
    "/node_modules",
    "/client",
    "/assets",
    "/favicon",
  ];
  
  // Check exact paths
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  // Check prefixes for public paths
  if (publicPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }

  // Check for static file extensions (not API routes)
  const staticExtensions = [".js", ".css", ".ts", ".tsx", ".jsx", ".html", ".png", ".svg", ".ico", ".json", ".map"];
  if (staticExtensions.some(ext => req.path.endsWith(ext)) && !req.path.startsWith("/api")) {
    return next();
  }

  // For all protected endpoints (including /mcp), require API key
  // Support both header and query parameter for SSE connections
  const apiKey = (req.headers["x-api-key"] as string) || (req.query.api_key as string);
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.error("API_KEY environment variable not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (!apiKey) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    notifyApiKeyMisuse(ip, req.path, "missing");
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Missing X-API-KEY header or api_key query parameter" 
    });
  }

  if (apiKey !== validApiKey) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    notifyApiKeyMisuse(ip, req.path, "invalid");
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Invalid API key" 
    });
  }

  next();
}
