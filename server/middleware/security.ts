import path from "path";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  const isProduction = process.env.NODE_ENV === "production";
  
  // Swagger UI needs unsafe-inline for scripts to work
  const isSwaggerRoute = req.path.startsWith("/docs") || req.path.startsWith("/api-docs-spec");
  
  let cspDirectives: string[];
  
  if (isSwaggerRoute) {
    // More permissive CSP for Swagger UI documentation (assets loaded from CDN)
    cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.replit.dev https://*.replit.com https://*.replit.app wss://*.replit.dev wss://*.replit.app",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ];
  } else if (isProduction) {
    cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.replit.dev https://*.replit.com https://*.replit.app wss://*.replit.dev wss://*.replit.app",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ];
  } else {
    cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' ws: wss: https://*.replit.dev https://*.replit.com https://*.replit.app wss://*.replit.dev wss://*.replit.app",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ];
  }

  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  
  if (safeMethods.includes(req.method)) {
    return next();
  }

  if (!req.path.startsWith("/api") && !req.path.startsWith("/mcp")) {
    return next();
  }

  const origin = req.get("Origin");
  const host = req.get("Host");
  
  if (!origin) {
    return next();
  }

  try {
    const originUrl = new URL(origin);
    const allowedHosts = [
      host,
      "localhost",
      "127.0.0.1",
    ];

    const isAllowedOrigin = allowedHosts.some(allowedHost => {
      if (!allowedHost) return false;
      return originUrl.host === allowedHost || 
             originUrl.host.endsWith(`.${allowedHost}`) ||
             originUrl.host.includes("replit");
    });

    if (!isAllowedOrigin) {
      console.warn(`CSRF: Blocked request from origin ${origin} to host ${host}`);
      logSecurityEvent(req, "csrf_blocked", { origin, host });
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cross-origin request blocked" 
      });
    }
  } catch (e) {
    console.warn(`CSRF: Invalid origin header: ${origin}`);
    logSecurityEvent(req, "csrf_blocked", { origin, error: "invalid_origin" });
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Invalid origin header" 
    });
  }

  next();
}

function logSecurityEvent(req: Request, eventType: string, details: Record<string, unknown>) {
  import("../services/auditService").then(({ logAuditEvent }) => {
    logAuditEvent({
      eventType: `security.${eventType}` as any,
      severity: "warning",
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
      path: req.path,
      method: req.method,
      details,
    });
  }).catch(console.error);
}

// Allowed commands for safe execution
const SAFE_COMMANDS = [
  "ls", "cat", "head", "tail", "wc", "grep", "find", "echo", "pwd", "date",
  "whoami", "env", "node", "npm", "npx", "pnpm", "yarn", "git", "which",
  "mkdir", "touch", "cp", "mv", "rm"
];

// Blocked patterns that could be dangerous
const BLOCKED_PATTERNS = [
  /[;&|`$()]/,      // Shell operators
  /\/etc\//,         // System files
  /\/proc\//,        // Process info
  /\/sys\//,         // System info
  /rm\s+-rf\s+\//,   // Recursive delete from root
  /sudo/,            // Privilege escalation
  /chmod\s+777/,     // Overly permissive chmod
  /curl.*\|.*sh/,    // Piping curl to shell
  /wget.*\|.*sh/,    // Piping wget to shell
];

export function sanitizePath(inputPath: string): string {
  // Remove null bytes
  let sanitized = inputPath.replace(/\0/g, "");
  
  // Normalize the path to resolve . and .. properly
  sanitized = path.normalize(sanitized);
  
  // Remove leading slashes to prevent absolute paths
  sanitized = sanitized.replace(/^\/+/, "");
  
  // Remove any leading ../ sequences that could escape directory
  while (sanitized.startsWith("../") || sanitized === "..") {
    sanitized = sanitized.replace(/^\.\.\//, "").replace(/^\.\./, "");
  }
  
  return sanitized;
}

export function isPathSafe(inputPath: string, basePath: string = process.cwd()): boolean {
  // First sanitize the input to remove traversal attempts
  const sanitized = sanitizePath(inputPath);
  
  // Resolve to absolute path
  const absolutePath = path.resolve(basePath, sanitized);
  
  // Check if the resolved path is within the base directory
  const normalizedBase = path.resolve(basePath);
  
  // Path must either be the base itself or be a child path starting with base + separator
  return absolutePath === normalizedBase || absolutePath.startsWith(normalizedBase + path.sep);
}

export function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Command contains blocked pattern: ${pattern}` };
    }
  }

  // Extract the base command
  const baseCommand = command.trim().split(/\s+/)[0];
  
  if (!baseCommand) {
    return { safe: false, reason: "Empty command" };
  }

  // Check if base command is in allowed list
  if (!SAFE_COMMANDS.includes(baseCommand)) {
    return { safe: false, reason: `Command '${baseCommand}' is not in the allowed list` };
  }

  return { safe: true };
}

export function validateFilePath(filePath: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!filePath || typeof filePath !== "string") {
    return { valid: false, error: "File path is required" };
  }

  if (filePath.length > 500) {
    return { valid: false, error: "File path too long" };
  }

  if (filePath.includes("\0")) {
    return { valid: false, error: "Invalid characters in path" };
  }

  const sanitized = sanitizePath(filePath);
  
  // Check if path tries to escape the project directory
  if (!isPathSafe(sanitized)) {
    return { valid: false, error: "Path outside project directory" };
  }

  return { valid: true, sanitized };
}
