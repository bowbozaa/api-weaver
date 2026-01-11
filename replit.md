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
- `client/src/pages/home.tsx` - Dashboard with tabs (Overview, Integrations, Endpoints, Logs, Security)
- Uses shadcn/ui components
- TanStack Query for data fetching

### Shared
- `shared/schema.ts` - Zod schemas for validation

## Key Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | / | Dashboard | No |
| GET | /docs | Swagger UI | No |
| GET | /api/stats | API statistics | No |
| GET | /api/logs | Request logs | No |
| POST | /api/files | Create/update file | Yes |
| GET | /api/files/* | Read file | Yes |
| DELETE | /api/files/* | Delete file | Yes |
| POST | /api/execute | Execute command | Yes |
| GET | /api/project | Project structure | Yes |
| POST | /api/ai | AI prompt | Yes |
| GET | /mcp | MCP SSE connection | Yes |
| POST | /mcp | MCP tool call | Yes |

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
