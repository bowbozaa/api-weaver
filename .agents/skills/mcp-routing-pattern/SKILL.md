# MCP Routing Pattern Skill

## Overview
This skill describes the Model Context Protocol (MCP) Architecture used in API Weaver. The project uses a monorepo structure with 3 MCP servers that handle different concerns.

## Architecture

### Three-Server Design
1. **Gateway MCP** (Port 3000) - API Gateway that routes requests to Content and Integration MCPs
2. **Content MCP** (Port 3001) - Handles AI services, files, and content operations  
3. **Integration MCP** (Port 3002) - Handles external service integrations (GitHub, Vercel, Supabase, etc.)

### Request Flow
```
Client Request → Main Server (Port 5000) → Gateway MCP (Port 3000)
                                              ├── Content MCP (3001) → AI Services
                                              └── Integration MCP (3002) → External APIs
```

### Proxy Configuration
The main server uses `http-proxy-middleware` to route requests:
- `/api/content/*` → Content MCP (Port 3001)
- `/api/integration/*` → Integration MCP (Port 3002)

### Key Files
- `server/gateway/index.ts` - Gateway server with proxy middleware
- `server/gateway/config.ts` - MCP routing configuration
- `server/content-mcp/index.ts` - Content server
- `server/integration-mcp/index.ts` - Integration server
- `server/routes.ts` - Main server routes with proxy setup (lines ~119-174)

### Adding a New MCP Service
1. Create a new directory under `server/` (e.g., `server/new-mcp/`)
2. Add `index.ts` with Express server setup
3. Add `routes/index.ts` with service routes
4. Add `services/` directory for business logic
5. Add proxy middleware in `server/routes.ts`
6. Update `server/gateway/config.ts` with new routing rules

### Best Practices
- Each MCP server should handle a single domain of responsibility
- Use API key forwarding in proxy middleware (`proxyReq.setHeader`)
- Handle proxy errors gracefully with `notifyMcpUnavailable`
- Each MCP server should have its own security middleware
- Use environment variables for MCP host/port configuration
