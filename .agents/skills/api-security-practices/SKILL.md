# API Security Best Practices Skill

## Overview
This skill describes the security patterns implemented in API Weaver. The project uses multiple layers of security to protect API endpoints.

## Security Layers

### 1. Authentication (server/middleware/auth.ts)
Three authentication mechanisms:
- **API Key Auth**: `X-API-KEY` header or `api_key` query parameter for external API access
- **Session Auth**: Replit OIDC (OpenID Connect) for dashboard users via passport.js
- **Dual Auth**: Some endpoints accept either API key OR session auth

#### Route Classification
```typescript
// Public: No auth needed
const publicApiPaths = ["/api/stats", "/api/health", ...];

// Session-protected: Dashboard features (session OR API key)
const sessionProtectedPaths = ["/api/security/status", ...];

// API Key required: External API access
// All other /api/* and /mcp routes
```

### 2. Rate Limiting (express-rate-limit)
- 100 requests per 15-minute window per IP
- Applied to `/api` and `/mcp` routes
- Tiered rate limiting: free/pro/enterprise tiers (server/services/tieredRateLimitService.ts)

### 3. Input Validation (Zod)
- All request bodies validated with Zod schemas from `shared/schema.ts`
- Type-safe validation before processing

### 4. Path Sanitization (server/middleware/security.ts)
- Strips `../` sequences to prevent directory traversal
- Removes null bytes
- Normalizes paths
- Validates all file operations stay within project directory

### 5. Command Whitelist
- Only safe commands allowed: `ls`, `cat`, `git`, `npm`, etc.
- Prevents arbitrary command execution

### 6. Security Headers
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

### 7. CSRF Protection
- Custom CSRF middleware for state-changing operations

### Key Files
- `server/middleware/auth.ts` - API key and session authentication
- `server/middleware/security.ts` - Path sanitization, headers, CSRF
- `server/replit_integrations/auth/` - OIDC auth setup
- `server/services/auditService.ts` - Security event logging
- `server/services/securityAlertService.ts` - Alert notifications

### Adding Protected Routes
```typescript
// For session-protected routes (dashboard users):
// Add path to sessionProtectedPaths or sessionProtectedPrefixes in auth.ts

// For API key-protected routes:
// All /api/* routes are API key-protected by default

// For public routes:
// Add to publicApiPaths or publicApiPrefixes in auth.ts
```
