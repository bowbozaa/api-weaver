# API Weaver - MCP Architecture Monorepo

## Overview

A comprehensive API server with MCP (Model Context Protocol) Architecture as a Monorepo:
- **Gateway MCP** (Port 3000): API Gateway for routing requests to Content and Integration MCPs
- **Content MCP** (Port 3001): Handles AI, files, and content operations
- **Integration MCP** (Port 3002): Handles external service integrations
- **Main API Server** (Port 5000): REST API with dashboard and Swagger docs
- **Dashboard**: Real-time monitoring with statistics and request logs
- **Security**: API key authentication, rate limiting, input validation

## Recent Changes

- **2026-02-16**: Auth Protection & Agent Skills
  - Added ProtectedRoute component for frontend auth guards
  - Protected pages: /playground, /analytics, /teams, /users, /a2a (redirect to login if unauthenticated)
  - Public pages remain accessible: /, /guide, /terms, /license, /api-docs, /status, /login
  - Landing page "Sign In" and "Get Started" buttons now use /api/login directly (Replit OIDC)
  - Created 3 Agent Skills in .agents/skills/:
    - mcp-routing-pattern: MCP Architecture documentation
    - api-security-practices: Security layers and patterns
    - multi-ai-provider-pattern: Multi-AI provider and A2A system

- **2026-02-10**: UX & SEO Improvements
  - Added OpenGraph meta tags (og:image, og:title, og:description, twitter:card) for social sharing
  - Generated og-image.png banner for link previews
  - Added apple-touch-icon and theme-color meta tags
  - Created usePageTitle hook for per-page SEO titles (13 pages)
  - Created ErrorBoundary component wrapping entire app
  - Created SessionTimeoutWarning component with idle detection (25min threshold)
  - Created DashboardSkeleton and A2ASkeleton loading states
  - Made Dashboard header responsive with mobile dropdown menu
  - Made TabsList horizontally scrollable on mobile
  - Made A2A mode grid responsive (1 column on mobile)
  - Fixed not-found page dark mode colors

- **2026-02-09**: A2A (Agent-to-Agent) Multi-Agent Chat System
  - Created agentOrchestrator.ts service for multi-AI agent conversations
  - Supports 4 conversation modes: Chain, Debate, Consensus, Sub-Agent
  - 5 AI agents: Claude, GPT, Gemini, Perplexity, Comet ML
  - Each agent has a defined role (Analytical Thinker, Creative Synthesizer, Research Specialist, etc.)
  - Added A2A page (/a2a) with configuration panel and real-time conversation display
  - Added API routes: GET /api/a2a/agents, POST /api/a2a/chat, GET/DELETE /api/a2a/sessions
  - Session cleanup with max 100 sessions in memory
  - Agent validation: checks valid IDs and API key availability before starting
  - Added A2A Chat link to dashboard navigation

- **2026-02-09**: 14 Enterprise Features Implementation
  - Phase A (Security): TwoFactorSetup, IPWhitelistManager, KeyRotationManager, AuditLogViewer components
  - Phase B (Platform): CacheService, RequestQueueService, TieredRateLimitService (free/pro/enterprise tiers)
  - Phase C (Developer Tools): WebhookManager, SDKGenerator, APIVersioning, CacheMonitor components
  - Phase C (Pages): API Playground (/playground), Analytics (/analytics), Status Page (/status)
  - Phase D (Organization): Team Management (/teams) with role-based access
  - Added 10 backend services: cacheService, requestQueueService, tieredRateLimitService, webhookService, analyticsService, teamService, apiVersioningService, sdkGeneratorService, playgroundService, statusPageService
  - Added 50+ new API routes across 10 route groups
  - Added Developer Tools tab to dashboard with quick links
  - Updated Security tab with component-based management

- **2026-01-28**: Session Management & Login Page
  - Created dedicated /login page with sign-in options (Google, GitHub, Apple)
  - Added SessionManagement component in Settings tab to view/revoke active sessions
  - Created sessionService.ts with getUserSessions(), deleteSession(), deleteAllOtherSessions()
  - Added /api/sessions endpoints for session management (GET, DELETE, revoke-all)
  - Sessions are stored in PostgreSQL with 7-day TTL and filtered by expiry

- **2026-01-28**: Email Notifications & Resend Integration
  - Added Resend email service integration using Replit Connector
  - Created resendService.ts with HTML email templates for security alerts
  - Added sendSecurityAlertEmail() function with severity-based colors
  - Added /api/email/status endpoint (public) to check email service status
  - Added /api/email/test endpoint (protected) to send test emails
  - Integrated email notifications with Security Alert service
  - Added EmailStatusCard component to Settings tab in dashboard
  - Updated securityAlertService.ts sendEmailAlert() to use Resend

- **2026-01-23**: Authentication & User Management
  - Added Replit Auth integration with OIDC (OpenID Connect)
  - Created PostgreSQL database with users and sessions tables
  - Added Landing page for non-authenticated users with feature showcase
  - Added User Guide page with documentation tabs (Getting Started, Architecture, Services, API Reference, Deployment)
  - Added License page with MIT license and third-party licenses
  - Added Terms of Use page with usage policies and conditions
  - Added User Management page to view all registered users (protected)
  - Added UserMenu component with avatar, name, and logout button
  - Added navigation links to Guide, Users, Terms, and License in dashboard header
  - Protected dashboard routes - only authenticated users can access

- **2026-01-22**: Connection Guide & System Documentation
  - Created comprehensive CONNECTION_GUIDE.md with examples for all 11 services
  - Added code examples for AI services, GitHub, Supabase, Notion, Vercel, n8n, Google Cloud, Comet ML
  - Documented zero-downtime deployment practices
  - Added Endpoints tab to dashboard with API reference

- **2026-01-19**: Dashboard v2.0 Major Upgrade
  - Complete UI redesign with modern layout and gradient styling
  - Added interactive charts: API Traffic (Area chart), Request Methods (Pie chart), Response Time Distribution (Bar chart)
  - New tabs: AI Assistant, Monitoring, Alerts
  - AI Code Assistant panel with 7 actions (analyze, improve, explain, generate, refactor, debug, review)
  - Export functionality: Download logs as JSON/CSV, stats as JSON
  - Real-time monitoring: Rate limit display, requests/min, active services count
  - Security events display with severity levels
  - Enhanced service cards with gradient colors and status indicators
  - 11 services now connected: Claude, GPT, Gemini, Perplexity, GitHub, Supabase, Notion, Vercel, n8n, Google Cloud, Comet ML

- **2026-01-11**: MCP Services Migration Complete
  - Migrated all Content MCP services: aiService, cometService, notionService, fileService, commandService
  - Migrated all Integration MCP services: githubService, vercelService, supabaseService, gcloudService, n8nService, mcpService
  - Added security middleware to Content MCP for file/command validation
  - Updated routes for all MCP servers with full endpoint coverage
  - Updated MIGRATION_GUIDE.md with complete endpoint documentation

- **2026-01-11**: MCP Architecture Monorepo restructuring
  - Created 3 separate MCP server packages (gateway, content-mcp, integration-mcp)
  - Added API Gateway with http-proxy-middleware for request routing
  - Added tsconfig.json for each MCP package
  - Created MIGRATION_GUIDE.md with architecture documentation

- **2026-01-11**: Security improvements and MCP enhancements
  - Fixed path sanitization to properly handle nested paths (e.g., "server/routes.ts") while preventing traversal
  - Added query parameter authentication (`api_key`) for SSE connections
  - Improved MCP session handling with proper SSE keep-alive and disconnection
  - Enhanced path validation to strip leading `../` sequences
  
- **2026-01-11**: Initial implementation
  - Created MCP server with 7 tools (read_file, write_file, list_files, delete_file, execute_command, get_project_structure, create_directory)
  - Implemented REST API endpoints (/api/files, /api/execute, /api/project, /api/ai)
  - Added Swagger documentation at /docs
  - Built admin dashboard with stats and logs
  - Implemented security middleware (auth, rate limiting, path sanitization)

## Architecture

### MCP Architecture (Monorepo)
```
server/
├── gateway/                    # API Gateway (Port 3000)
│   ├── index.ts               # Gateway server with proxy middleware
│   ├── config.ts              # MCP routing configuration
│   └── package.json
├── content-mcp/               # Content MCP (Port 3001)
│   ├── index.ts               # Content server
│   ├── routes/index.ts        # Content API routes
│   ├── services/              # Migrated services:
│   │   ├── aiService.ts       # Claude, GPT, Gemini, Perplexity
│   │   ├── cometService.ts    # Comet ML
│   │   ├── notionService.ts   # Notion API
│   │   ├── fileService.ts     # File operations
│   │   └── commandService.ts  # Command execution
│   ├── middleware/security.ts # Security validation
│   └── package.json
└── integration-mcp/           # Integration MCP (Port 3002)
    ├── index.ts               # Integration server
    ├── routes/index.ts        # Integration API routes
    ├── services/              # Migrated services:
    │   ├── githubService.ts   # GitHub API
    │   ├── vercelService.ts   # Vercel API
    │   ├── supabaseService.ts # Supabase API
    │   ├── gcloudService.ts   # Google Cloud API
    │   ├── n8nService.ts      # n8n API
    │   └── mcpService.ts      # MCP protocol
    └── package.json
```

### Backend (Express.js - Port 5000)
- `server/routes.ts` - Main API routes with Swagger annotations
- `server/middleware/auth.ts` - API key authentication
- `server/middleware/logging.ts` - Request logging
- `server/middleware/security.ts` - Path/command validation
- `server/services/fileService.ts` - File operations
- `server/services/commandService.ts` - Command execution
- `server/services/mcpService.ts` - MCP protocol handling
- `server/swagger.ts` - OpenAPI specification
- `server/storage.ts` - In-memory storage for logs/stats

### Frontend (React + Vite)
- `client/src/pages/home.tsx` - Dashboard v2.0 with tabs:
  - Overview: Stats cards, API Traffic chart, Request Methods pie chart
  - Integrations: Service cards for 11 connected services
  - AI Assistant: Code analysis with 7 actions (analyze, improve, explain, generate, refactor, debug, review)
  - Monitoring: Rate limit, requests/min, active services, response time chart
  - Logs: Request logs with export (JSON/CSV)
  - Security: Auth status, rate limiting, security events
  - Alerts: Notification history
  - Settings: Service configuration, export data
- Uses shadcn/ui components with Recharts for visualizations
- TanStack Query for real-time data fetching

### Shared
- `shared/schema.ts` - Zod schemas for validation

## Key Endpoints

### Direct Routes (Main Server)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | / | Dashboard | No |
| GET | /docs | Swagger UI | No |
| GET | /api/stats | API statistics | No |
| GET | /api/logs | Request logs | No |
| GET | /api/health | Services health status | No |
| POST | /api/files | Create/update file | Yes |
| GET | /api/files/* | Read file | Yes |
| DELETE | /api/files/* | Delete file | Yes |
| POST | /api/execute | Execute command | Yes |
| GET | /api/project | Project structure | Yes |
| POST | /api/ai | AI prompt | Yes |
| GET | /mcp | MCP SSE connection | Yes |
| POST | /mcp | MCP tool call | Yes |

### MCP Proxy Routes
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/content/ai/claude | Claude AI | Yes |
| POST | /api/content/ai/gpt | OpenAI GPT | Yes |
| POST | /api/content/ai/gemini | Google Gemini | Yes |
| POST | /api/content/ai/perplexity | Perplexity Search | Yes |
| GET | /api/integration/github/* | GitHub API | Yes |
| GET | /api/integration/supabase/* | Supabase API | Yes |
| GET | /api/integration/vercel/* | Vercel API | Yes |
| GET | /api/integration/n8n/* | n8n Workflows | Yes |
| GET | /api/integration/gcloud/* | Google Cloud | Yes |

## Environment Variables

- `API_KEY` - Required for authenticated endpoints (stored in Secrets)

## Security Features

All servers (Main API, Gateway, Content MCP, Integration MCP) include:

1. **API Key Auth**: X-API-KEY header or `api_key` query parameter for protected endpoints
2. **Rate Limiting**: 100 requests per 15 minutes per IP
3. **Path Sanitization**: Prevents directory traversal attacks (strips `../`, null bytes, normalizes paths)
4. **Command Whitelist**: Only safe commands allowed (ls, cat, git, npm, etc.)
5. **Input Validation**: Zod schemas validate all inputs
6. **Path Boundary Check**: All file operations confirmed within project directory

## MCP Access Routes

From Main Server (Port 5000):
- `/api/content/*` → Proxies to Content MCP (3001)
- `/api/integration/*` → Proxies to Integration MCP (3002)

From Gateway (Port 3000):
- `/api/content/*` → Proxies to Content MCP (3001)
- `/api/integration/*` → Proxies to Integration MCP (3002)

## Running the Application

The application runs with `npm run dev` which starts both the Express backend and Vite frontend on port 5000.

## Deployment

### Replit Deployment
Use the built-in Replit deployment for easy publishing.

### Google Cloud Run
See `DEPLOY.md` for detailed instructions on deploying to Google Cloud Run.

```bash
# Quick deploy
gcloud run deploy api-weaver --source . --port 5000 --region us-central1
```
