# API Server - MCP + REST API

A comprehensive API server providing Model Context Protocol (MCP) support, RESTful endpoints for file operations, command execution, project management, and AI integration.

## Features

- **MCP Server**: Model Context Protocol compatible server for AI assistants
- **REST API**: RESTful endpoints for remote development control
- **Real-time Communication**: Server-Sent Events (SSE) for MCP
- **Security**: API key authentication, rate limiting, input validation
- **Monitoring**: Request logging and statistics dashboard
- **Documentation**: Interactive Swagger/OpenAPI documentation

## Quick Start

### 1. Set Up API Key

The API key is stored in Replit Secrets as `API_KEY`. All authenticated endpoints require this key.

### 2. Access the Dashboard

Visit the root URL (`/`) to access the API dashboard with:
- Real-time statistics
- Request logs
- Endpoint documentation
- Security information

### 3. View API Documentation

Visit `/docs` for interactive Swagger documentation.

## Authentication

All API endpoints (except `/`, `/docs`, `/api/stats`, `/api/logs`) require authentication via either:

1. **HTTP Header** (recommended for REST API):
```bash
curl -X GET \
  -H "X-API-KEY: your-api-key" \
  https://your-repl.repl.co/api/project
```

2. **Query Parameter** (for SSE connections):
```
GET /mcp?api_key=your-api-key
```

## REST API Endpoints

### File Operations

#### Create/Update File
```bash
POST /api/files
Content-Type: application/json
X-API-KEY: your-api-key

{
  "path": "src/hello.ts",
  "content": "console.log('Hello World');"
}
```

#### Read File
```bash
GET /api/files/src/hello.ts
X-API-KEY: your-api-key
```

#### Delete File
```bash
DELETE /api/files/src/hello.ts
X-API-KEY: your-api-key
```

### Command Execution

Execute safe shell commands (whitelisted commands only):

```bash
POST /api/execute
Content-Type: application/json
X-API-KEY: your-api-key

{
  "command": "ls -la",
  "timeout": 10000
}
```

**Allowed Commands**: `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `find`, `echo`, `pwd`, `date`, `whoami`, `env`, `node`, `npm`, `npx`, `pnpm`, `yarn`, `git`, `which`, `mkdir`, `touch`, `cp`, `mv`, `rm`

### Project Structure

```bash
GET /api/project?depth=3
X-API-KEY: your-api-key
```

### AI Prompts

```bash
POST /api/ai
Content-Type: application/json
X-API-KEY: your-api-key

{
  "prompt": "Explain this code",
  "context": "function add(a, b) { return a + b; }",
  "maxTokens": 1000
}
```

## MCP Server

The MCP (Model Context Protocol) server is available at `/mcp` and supports:

### SSE Connection (GET /mcp)

Connect via Server-Sent Events for real-time MCP communication:

```javascript
// Use query parameter for authentication (EventSource doesn't support custom headers)
const eventSource = new EventSource('/mcp?api_key=your-api-key');

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

// Handle connection open
eventSource.onopen = () => {
  console.log('MCP connection established');
};

// Handle errors
eventSource.onerror = (error) => {
  console.error('MCP connection error:', error);
};
```

Note: The SSE endpoint supports `api_key` query parameter since EventSource API doesn't support custom headers.

### JSON-RPC Tool Calls (POST /mcp)

Send MCP tool calls via HTTP:

```bash
POST /mcp
Content-Type: application/json
X-API-KEY: your-api-key

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "package.json"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents |
| `write_file` | Create or update files |
| `list_files` | List directory contents |
| `delete_file` | Delete files or directories |
| `execute_command` | Run safe shell commands |
| `get_project_structure` | Get file tree |
| `create_directory` | Create new directories |

## SSH Access Setup

Replit supports SSH access for remote development with VSCode, Cursor, or any SSH client.

### Step 1: Generate SSH Keys

If you don't have SSH keys, generate them:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### Step 2: Add Public Key to Replit

1. Go to [Replit Account Settings](https://replit.com/account)
2. Navigate to "SSH Keys" section
3. Click "Add SSH Key"
4. Paste your public key (`~/.ssh/id_ed25519.pub`)
5. Save the key

### Step 3: Get Your Repl's SSH Address

1. Open your Repl
2. Click on the three dots menu
3. Select "Connect via SSH"
4. Copy the SSH address (format: `ssh <repl-id>@ssh.replit.com`)

### Step 4: Configure SSH Client

Add to your `~/.ssh/config`:

```
Host replit
    HostName ssh.replit.com
    User YOUR_REPL_ID
    IdentityFile ~/.ssh/id_ed25519
    ForwardAgent yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Replace `YOUR_REPL_ID` with your actual Repl ID.

### Step 5: Connect

```bash
ssh replit
```

### VSCode/Cursor Setup

1. Install "Remote - SSH" extension
2. Press `Ctrl+Shift+P` → "Remote-SSH: Connect to Host"
3. Select "replit" from the list
4. VSCode will open a new window connected to your Repl

## Security Features

### Rate Limiting
- 100 requests per 15 minutes per IP
- Returns `429 Too Many Requests` when exceeded

### Input Validation
- All inputs validated with Zod schemas
- File paths sanitized to prevent directory traversal
- Commands whitelisted for safe execution

### Path Traversal Protection
- Paths normalized and validated
- `..` patterns rejected
- All file operations confined to project directory

### Command Sandboxing
- Only whitelisted commands allowed
- Shell operators (`|`, `;`, `&&`, etc.) blocked
- Timeout enforcement on all commands

## Monitoring

### API Statistics
```bash
GET /api/stats
```

Returns:
- Total requests
- Success/failure counts
- Average response time
- Server uptime

### Request Logs
```bash
GET /api/logs?limit=100
```

Returns recent API requests with:
- Timestamp
- Method and path
- Status code
- Response time

## Error Handling

All errors return JSON responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing API key)
- `403` - Forbidden (invalid API key)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Development

### Running Locally

```bash
npm run dev
```

### Project Structure

```
├── client/           # React frontend
│   └── src/
│       ├── pages/    # Page components
│       └── components/
├── server/           # Express backend
│   ├── middleware/   # Auth, logging, security
│   ├── services/     # File, command, MCP services
│   ├── routes.ts     # API routes
│   └── swagger.ts    # OpenAPI spec
├── shared/           # Shared types/schemas
│   └── schema.ts
└── README.md
```

## License

MIT License
