# 🔌 API Weaver Connection Guide

Complete guide for connecting to all API Weaver services with examples.

## 🌐 Access Points

| Port | Server | Description |
|------|--------|-------------|
| 5000 | Main Server | Primary REST API + MCP proxy routes |
| 3000 | Gateway | MCP routing only |
| 3001 | Content MCP | AI, files, content (direct) |
| 3002 | Integration MCP | External services (direct) |

### Route Types on Main Server (Port 5000)

**Direct Routes** (for basic operations):
- `/api/stats`, `/api/logs`, `/api/health` - Public monitoring
- `/api/files`, `/api/execute`, `/api/project` - File operations
- `/api/ai` - Generic AI endpoint
- `/mcp` - MCP protocol

**Proxy Routes** (for MCP microservices):
- `/api/content/*` → Content MCP (AI providers, Notion, Comet, files)
- `/api/integration/*` → Integration MCP (GitHub, Supabase, Vercel, n8n, GCloud)

**The examples below use proxy routes for full MCP service access.**

## 📋 Table of Contents
- [Authentication](#authentication)
- [AI Services](#ai-services)
- [GitHub Integration](#github-integration)
- [Supabase Integration](#supabase-integration)
- [Notion Integration](#notion-integration)
- [Vercel Integration](#vercel-integration)
- [n8n Integration](#n8n-integration)
- [Google Cloud Integration](#google-cloud-integration)
- [Comet ML Integration](#comet-ml-integration)
- [Code Assistant](#code-assistant)
- [File Operations](#file-operations)
- [MCP Protocol](#mcp-protocol)

---

## 🔐 Authentication

All protected endpoints require API key authentication.

### Header Authentication
```bash
curl -H "X-API-KEY: your-api-key" https://your-app.replit.app/api/endpoint
```

### Query Parameter Authentication
```bash
curl "https://your-app.replit.app/api/endpoint?api_key=your-api-key"
```

### Public Endpoints (No Auth Required)
| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | API statistics |
| `GET /api/logs` | Request logs |
| `GET /api/health` | Services health status |
| `GET /api/notifications` | Notification history |
| `GET /api/security/events` | Security events |
| `GET /docs` | Swagger documentation |

---

## 🤖 AI Services

### Claude AI
```bash
curl -X POST https://your-app.replit.app/api/content/ai/claude \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "prompt": "Explain how to use React hooks",
    "maxTokens": 1000
  }'
```

**Response:**
```json
{
  "response": "React hooks are functions that...",
  "tokensUsed": 245,
  "model": "claude-sonnet-4-20250514"
}
```

### OpenAI GPT
```bash
curl -X POST https://your-app.replit.app/api/content/ai/gpt \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "prompt": "Write a Python function to sort a list",
    "maxTokens": 500
  }'
```

### Google Gemini
```bash
curl -X POST https://your-app.replit.app/api/content/ai/gemini \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "prompt": "Explain machine learning in simple terms"
  }'
```

### Perplexity Search
```bash
curl -X POST https://your-app.replit.app/api/content/ai/perplexity \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "prompt": "What are the latest trends in web development 2026?"
  }'
```

### Compare All AI Models
```bash
curl -X POST https://your-app.replit.app/api/content/ai/compare \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "prompt": "Explain quantum computing"
  }'
```

---

## 💻 Code Assistant

### Available Actions
| Action | Description |
|--------|-------------|
| `analyze` | Analyze code structure and quality |
| `improve` | Suggest improvements |
| `explain` | Explain what code does |
| `generate` | Generate code from description |
| `refactor` | Refactor code |
| `debug` | Find and fix bugs |
| `review` | Code review with suggestions |

### Example: Analyze Code
```bash
curl -X POST https://your-app.replit.app/api/content/ai/code-assistant \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "action": "analyze",
    "code": "function add(a, b) { return a + b; }"
  }'
```

### Example: Generate Code
```bash
curl -X POST https://your-app.replit.app/api/content/ai/code-assistant \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "action": "generate",
    "code": "Create a React component for a user profile card with avatar, name, and bio"
  }'
```

### Example: Debug Code
```bash
curl -X POST https://your-app.replit.app/api/content/ai/code-assistant \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "action": "debug",
    "code": "function fetchData() { fetch('/api/data').then(res => res.json) }"
  }'
```

---

## 🐙 GitHub Integration

### List Repositories
```bash
curl -X GET https://your-app.replit.app/api/integration/github/repos \
  -H "X-API-KEY: your-api-key"
```

### Get Repository Details
```bash
curl -X GET https://your-app.replit.app/api/integration/github/repos/owner/repo-name \
  -H "X-API-KEY: your-api-key"
```

### Get File Contents
```bash
curl -X GET "https://your-app.replit.app/api/integration/github/repos/owner/repo/contents/src/index.ts" \
  -H "X-API-KEY: your-api-key"
```

### Create/Update File
```bash
curl -X PUT https://your-app.replit.app/api/integration/github/repos/owner/repo/contents/README.md \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "message": "Update README",
    "content": "base64-encoded-content"
  }'
```

### List Issues
```bash
curl -X GET https://your-app.replit.app/api/integration/github/repos/owner/repo/issues \
  -H "X-API-KEY: your-api-key"
```

### Create Issue
```bash
curl -X POST https://your-app.replit.app/api/integration/github/repos/owner/repo/issues \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "title": "Bug: Login not working",
    "body": "Description of the issue..."
  }'
```

---

## 🗄️ Supabase Integration

### List Tables
```bash
curl -X GET https://your-app.replit.app/api/integration/supabase/tables \
  -H "X-API-KEY: your-api-key"
```

### Query Table
```bash
curl -X GET "https://your-app.replit.app/api/integration/supabase/query/users?select=*&limit=10" \
  -H "X-API-KEY: your-api-key"
```

### Insert Data
```bash
curl -X POST https://your-app.replit.app/api/integration/supabase/users \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### Update Data
```bash
curl -X PATCH https://your-app.replit.app/api/integration/supabase/users \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "filter": { "id": 1 },
    "data": { "name": "Jane Doe" }
  }'
```

### Delete Data
```bash
curl -X DELETE "https://your-app.replit.app/api/integration/supabase/users?id=eq.1" \
  -H "X-API-KEY: your-api-key"
```

---

## 📝 Notion Integration

### List Pages
```bash
curl -X GET https://your-app.replit.app/api/content/notion/pages \
  -H "X-API-KEY: your-api-key"
```

### Get Page Content
```bash
curl -X GET https://your-app.replit.app/api/content/notion/pages/page-id \
  -H "X-API-KEY: your-api-key"
```

### Create Page
```bash
curl -X POST https://your-app.replit.app/api/content/notion/pages \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "parent": { "database_id": "database-id" },
    "properties": {
      "Name": { "title": [{ "text": { "content": "New Page" } }] }
    }
  }'
```

### Search Notion
```bash
curl -X POST https://your-app.replit.app/api/content/notion/search \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "query": "meeting notes"
  }'
```

---

## 🚀 Vercel Integration

### List Projects
```bash
curl -X GET https://your-app.replit.app/api/integration/vercel/projects \
  -H "X-API-KEY: your-api-key"
```

### List Deployments
```bash
curl -X GET https://your-app.replit.app/api/integration/vercel/deployments \
  -H "X-API-KEY: your-api-key"
```

### Trigger Deployment
```bash
curl -X POST https://your-app.replit.app/api/integration/vercel/deployments \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "projectId": "your-project-id",
    "target": "production"
  }'
```

### Get Deployment Status
```bash
curl -X GET https://your-app.replit.app/api/integration/vercel/deployments/deployment-id \
  -H "X-API-KEY: your-api-key"
```

---

## ⚡ n8n Integration

### List Workflows
```bash
curl -X GET https://your-app.replit.app/api/integration/n8n/workflows \
  -H "X-API-KEY: your-api-key"
```

### Get Workflow Details
```bash
curl -X GET https://your-app.replit.app/api/integration/n8n/workflows/workflow-id \
  -H "X-API-KEY: your-api-key"
```

### Execute Workflow
```bash
curl -X POST https://your-app.replit.app/api/integration/n8n/workflows/workflow-id/execute \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "data": { "key": "value" }
  }'
```

### List Executions
```bash
curl -X GET https://your-app.replit.app/api/integration/n8n/executions \
  -H "X-API-KEY: your-api-key"
```

---

## ☁️ Google Cloud Integration

### List Projects
```bash
curl -X GET https://your-app.replit.app/api/integration/gcloud/projects \
  -H "X-API-KEY: your-api-key"
```

### List Compute Instances
```bash
curl -X GET "https://your-app.replit.app/api/integration/gcloud/compute/instances?zone=us-central1-a" \
  -H "X-API-KEY: your-api-key"
```

### Create Compute Instance
```bash
curl -X POST https://your-app.replit.app/api/integration/gcloud/compute/instances \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "name": "my-instance",
    "zone": "us-central1-a",
    "machineType": "e2-micro"
  }'
```

### List Storage Buckets
```bash
curl -X GET https://your-app.replit.app/api/integration/gcloud/storage/buckets \
  -H "X-API-KEY: your-api-key"
```

---

## 📊 Comet ML Integration

### List Projects
```bash
curl -X GET https://your-app.replit.app/api/content/comet/projects \
  -H "X-API-KEY: your-api-key"
```

### List Experiments
```bash
curl -X GET https://your-app.replit.app/api/content/comet/experiments/project-id \
  -H "X-API-KEY: your-api-key"
```

### Get Experiment Metrics
```bash
curl -X GET https://your-app.replit.app/api/content/comet/experiments/experiment-key/metrics \
  -H "X-API-KEY: your-api-key"
```

---

## 📁 File Operations

### Create/Update File
```bash
curl -X POST https://your-app.replit.app/api/content/files \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "path": "src/hello.ts",
    "content": "console.log(\"Hello World\");"
  }'
```

### Read File
```bash
curl -X GET "https://your-app.replit.app/api/content/files/src/hello.ts" \
  -H "X-API-KEY: your-api-key"
```

### Delete File
```bash
curl -X DELETE "https://your-app.replit.app/api/content/files/src/hello.ts" \
  -H "X-API-KEY: your-api-key"
```

### Get Project Structure
```bash
curl -X GET https://your-app.replit.app/api/content/project \
  -H "X-API-KEY: your-api-key"
```

### Execute Command
```bash
curl -X POST https://your-app.replit.app/api/content/execute \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "command": "ls -la",
    "timeout": 5000
  }'
```

---

## 🔄 MCP Protocol

### SSE Connection
```javascript
const eventSource = new EventSource(
  'https://your-app.replit.app/api/content/mcp?api_key=your-api-key'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('MCP Event:', data);
};
```

### Tool Call
```bash
curl -X POST https://your-app.replit.app/api/content/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "tool": "read_file",
    "arguments": {
      "path": "package.json"
    }
  }'
```

### List Available Tools
```bash
curl -X GET https://your-app.replit.app/api/integration/mcp/tools \
  -H "X-API-KEY: your-api-key"
```

---

## 🛡️ Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit info in response headers
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp

---

## 🔧 Environment Variables

Add these to Replit Secrets:

| Variable | Service | Required |
|----------|---------|----------|
| `API_KEY` | Authentication | Yes |
| `ANTHROPIC_API_KEY` | Claude AI | Optional |
| `OPENAI_API_KEY` | OpenAI GPT | Optional |
| `GOOGLE_AI_API_KEY` | Gemini | Optional |
| `PERPLEXITY_API_KEY` | Perplexity | Optional |
| `GITHUB_TOKEN` | GitHub | Optional |
| `SUPABASE_URL` | Supabase | Optional |
| `SUPABASE_ANON_KEY` | Supabase | Optional |
| `NOTION_API_KEY` | Notion | Optional |
| `VERCEL_TOKEN` | Vercel | Optional |
| `N8N_BASE_URL` | n8n | Optional |
| `N8N_API_KEY` | n8n | Optional |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud | Optional |
| `GOOGLE_CLOUD_CREDENTIALS` | Google Cloud | Optional |
| `COMET_API_KEY` | Comet ML | Optional |

---

## ⚡ Zero-Downtime Updates

API Weaver supports graceful updates:

1. **Health Checks**: Use `/api/health` to verify service status before switching
2. **Rolling Updates**: New deployments are verified before traffic switch
3. **Graceful Shutdown**: Active requests complete before shutdown
4. **Connection Draining**: SSE connections are properly closed

### Best Practices for Production

```javascript
// Check health before using services
async function checkServices() {
  const response = await fetch('https://your-app.replit.app/api/health');
  const health = await response.json();
  
  // Verify required services are connected
  if (!health.ai.claude.configured) {
    console.warn('Claude AI not configured');
  }
  
  return health;
}

// Graceful SSE reconnection
function createMCPConnection() {
  const es = new EventSource('/mcp?api_key=key');
  
  es.onerror = () => {
    es.close();
    setTimeout(() => createMCPConnection(), 5000);
  };
  
  return es;
}
```

---

## 🔀 MCP Gateway Routing (Advanced)

For microservice-style access through the Gateway (port 3000) or Main Server (port 5000):

| Original Path | Gateway Route | Main Server Route |
|---------------|---------------|-------------------|
| Content MCP endpoints | `/api/content/*` | `/api/content/*` |
| Integration MCP endpoints | `/api/integration/*` | `/api/integration/*` |

### Example: Access via Gateway
```bash
# Through Gateway (port 3000)
curl -X GET http://localhost:3000/api/content/files \
  -H "X-API-KEY: your-api-key"

# Through Main Server (port 5000)
curl -X GET http://localhost:5000/api/content/files \
  -H "X-API-KEY: your-api-key"
```

### Direct MCP Access
For direct access to MCP servers without proxy:
- Content MCP: `http://localhost:3001/*`
- Integration MCP: `http://localhost:3002/*`

---

## 📞 Support

- **Dashboard**: https://your-app.replit.app
- **API Docs**: https://your-app.replit.app/docs
- **Health Check**: https://your-app.replit.app/api/health
