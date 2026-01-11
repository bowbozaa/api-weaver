# 🔄 Migration Guide: MCP Architecture

## ✅ Migration Status: COMPLETE (Production Ready)

All services have been successfully migrated to the MCP Architecture with security hardening.

## 🔐 Security Features

All MCP servers now include:
- **API Key Authentication**: X-API-KEY header or api_key query parameter required
- **Mandatory Configuration**: Server returns 500 error if API_KEY is not configured (fail-fast)
- **Credential Forwarding**: Proxies forward X-API-KEY to downstream MCP servers
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Zod schemas validate all inputs
- **Path Sanitization**: Prevents directory traversal attacks
- **Command Whitelist**: Only safe commands allowed for execution

### Required Environment Variable
```bash
API_KEY=your-secure-api-key-here
```
This must be set in Replit Secrets for all servers to function correctly.

## 📊 Services Migration Map

### Content MCP (Port 3001) ✅
Services migrated to `server/content-mcp/services/`:
- ✅ aiService.ts - AI generation (Claude, GPT, Gemini, Perplexity)
- ✅ cometService.ts - Comet ML experiments
- ✅ notionService.ts - Notion content management
- ✅ fileService.ts - File operations
- ✅ commandService.ts - CLI operations

**Endpoints:**
- `POST /api/ai/claude` - Call Claude AI
- `POST /api/ai/gpt` - Call OpenAI GPT
- `POST /api/ai/gemini` - Call Google Gemini
- `POST /api/ai/perplexity` - Call Perplexity AI
- `POST /api/ai/compare` - Compare all AI models
- `GET /api/comet/projects` - List Comet projects
- `GET /api/comet/experiments/:projectId` - List experiments
- `GET /api/comet/metrics/:experimentKey` - Get metrics
- `GET /api/notion/pages` - List Notion pages
- `GET /api/notion/pages/:pageId` - Get page
- `POST /api/notion/pages` - Create page
- `PATCH /api/notion/pages/:pageId` - Update page
- `POST /api/notion/databases/:id/query` - Query database
- `POST /api/notion/search` - Search Notion
- `GET /api/files` - List files
- `GET /api/files/*` - Read file
- `POST /api/files` - Write file
- `DELETE /api/files/*` - Delete file
- `GET /api/project` - Get project structure
- `POST /api/execute` - Execute command

### Integration MCP (Port 3002) ✅
Services migrated to `server/integration-mcp/services/`:
- ✅ githubService.ts - GitHub integration
- ✅ vercelService.ts - Vercel deployments
- ✅ supabaseService.ts - Supabase database
- ✅ gcloudService.ts - Google Cloud services
- ✅ n8nService.ts - n8n workflow automation
- ✅ mcpService.ts - MCP protocol handler

**Endpoints:**
- `GET /api/github/repos` - List repos
- `GET /api/github/repos/:owner/:repo` - Get repo
- `GET /api/github/repos/:owner/:repo/contents/*` - Get contents
- `PUT /api/github/repos/:owner/:repo/contents/*` - Create/update file
- `DELETE /api/github/repos/:owner/:repo/contents/*` - Delete file
- `GET /api/github/repos/:owner/:repo/issues` - List issues
- `POST /api/github/repos/:owner/:repo/issues` - Create issue
- `GET /api/vercel/projects` - List projects
- `GET /api/vercel/deployments` - List deployments
- `POST /api/vercel/deployments` - Create deployment
- `GET /api/vercel/deployments/:id` - Get deployment
- `PATCH /api/vercel/deployments/:id/cancel` - Cancel deployment
- `GET /api/supabase/tables` - List tables
- `GET /api/supabase/query/:table` - Query table
- `POST /api/supabase/:table` - Insert data
- `PATCH /api/supabase/:table` - Update data
- `DELETE /api/supabase/:table` - Delete data
- `GET /api/gcloud/projects` - List GCloud projects
- `GET /api/gcloud/instances` - List compute instances
- `POST /api/gcloud/instances` - Create instance
- `DELETE /api/gcloud/instances/:name` - Delete instance
- `GET /api/gcloud/buckets` - List storage buckets
- `GET /api/n8n/workflows` - List workflows
- `GET /api/n8n/workflows/:id` - Get workflow
- `POST /api/n8n/workflows/:id/execute` - Execute workflow
- `GET /api/n8n/executions` - List executions
- `GET /api/mcp/tools` - List MCP tools
- `GET /api/mcp` - MCP SSE connection
- `POST /api/mcp` - MCP tool call

## 🚀 Quick Start

### Run all 3 MCP servers:

Terminal 1 (Gateway):
```bash
cd server/gateway && npm run dev
```

Terminal 2 (Content MCP):
```bash
cd server/content-mcp && npm run dev
```

Terminal 3 (Integration MCP):
```bash
cd server/integration-mcp && npm run dev
```

### Test endpoints:
- Gateway: http://localhost:3000
- Gateway Status: http://localhost:3000/api/status
- Content MCP Health: http://localhost:3001/health
- Integration MCP Health: http://localhost:3002/health

### Access through Gateway (Port 3000):
- Content endpoints: http://localhost:3000/api/content/*
- Integration endpoints: http://localhost:3000/api/integration/*

### Access through Main Server (Port 5000):
- Content endpoints: http://localhost:5000/api/content/*
- Integration endpoints: http://localhost:5000/api/integration/*

### Authentication:
All protected endpoints require API key:
```bash
# Using header
curl -H "X-API-KEY: your-api-key" http://localhost:5000/api/content/files

# Using query parameter
curl "http://localhost:5000/api/content/files?api_key=your-api-key"
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Weaver Gateway                        │
│                      (Port 3000)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   /health   │  │ /api/status │  │   Proxy Middleware  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│           ┌──────────────┴──────────────┐                   │
│           ▼                              ▼                   │
│  ┌────────────────┐           ┌─────────────────────┐       │
│  │ /api/content/* │           │ /api/integration/* │       │
│  └────────┬───────┘           └──────────┬──────────┘       │
└───────────│───────────────────────────────│─────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐     ┌───────────────────────────┐
│    Content MCP        │     │    Integration MCP        │
│     (Port 3001)       │     │       (Port 3002)         │
├───────────────────────┤     ├───────────────────────────┤
│ ✅ AI Service         │     │ ✅ GitHub Service         │
│ ✅ Comet Service      │     │ ✅ Vercel Service         │
│ ✅ Notion Service     │     │ ✅ n8n Service            │
│ ✅ File Service       │     │ ✅ Supabase Service       │
│ ✅ Command Service    │     │ ✅ GCloud Service         │
└───────────────────────┘     └───────────────────────────┘
```

## 🔐 Environment Variables

Environment variables are managed securely via Replit Secrets.

### Content MCP Required Secrets:
- `ANTHROPIC_API_KEY` - Claude AI
- `OPENAI_API_KEY` - OpenAI GPT
- `GOOGLE_AI_API_KEY` - Google Gemini
- `PERPLEXITY_API_KEY` - Perplexity AI
- `COMET_API_KEY` - Comet ML
- `NOTION_API_KEY` - Notion

### Integration MCP Required Secrets:
- `GITHUB_TOKEN` - GitHub
- `VERCEL_TOKEN` - Vercel
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `GOOGLE_CLOUD_PROJECT_ID` - GCloud project
- `GOOGLE_CLOUD_CREDENTIALS` - GCloud credentials (JSON)
- `N8N_BASE_URL` - n8n instance URL
- `N8N_API_KEY` - n8n API key

## 📁 File Structure

```
server/
├── gateway/                    # API Gateway (Port 3000)
│   ├── index.ts               # Gateway server
│   ├── config.ts              # MCP routing configuration
│   └── package.json
├── content-mcp/               # Content MCP (Port 3001)
│   ├── index.ts               # Content server
│   ├── routes/
│   │   └── index.ts           # Content routes
│   ├── services/
│   │   ├── aiService.ts       # AI integrations
│   │   ├── cometService.ts    # Comet ML
│   │   ├── notionService.ts   # Notion API
│   │   ├── fileService.ts     # File operations
│   │   └── commandService.ts  # Command execution
│   ├── middleware/
│   │   └── security.ts        # Security middleware
│   └── package.json
└── integration-mcp/           # Integration MCP (Port 3002)
    ├── index.ts               # Integration server
    ├── routes/
    │   └── index.ts           # Integration routes
    ├── services/
    │   ├── githubService.ts   # GitHub API
    │   ├── vercelService.ts   # Vercel API
    │   ├── supabaseService.ts # Supabase API
    │   ├── gcloudService.ts   # Google Cloud API
    │   ├── n8nService.ts      # n8n API
    │   └── mcpService.ts      # MCP protocol
    └── package.json
```

Migration complete! 🎉
