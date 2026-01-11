import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Server - MCP + REST API + Multi-Service Integrations",
      version: "2.0.0",
      description: `
A comprehensive API server providing:
- **MCP Server**: Model Context Protocol compatible server for AI assistants
- **REST API**: RESTful endpoints for file operations, command execution, and project management
- **AI Services**: Integration with Claude, GPT, Gemini, and Perplexity
- **External Services**: GitHub, Supabase, Notion, Vercel, n8n, Google Cloud, Comet ML
- **Real-time**: Server-Sent Events (SSE) for MCP communication

## Authentication
All endpoints (except documentation) require API key authentication via \`X-API-KEY\` header.

## Rate Limiting
- 100 requests per 15 minutes per IP
- MCP connections: 10 concurrent connections per IP

## Service Integrations
Configure service API keys in Replit Secrets panel:
- AI: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY, PERPLEXITY_API_KEY
- GitHub: GITHUB_TOKEN
- Supabase: SUPABASE_URL, SUPABASE_ANON_KEY
- Notion: NOTION_API_KEY
- Vercel: VERCEL_TOKEN
- n8n: N8N_BASE_URL, N8N_API_KEY
- Google Cloud: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_CREDENTIALS
- Comet ML: COMET_API_KEY
      `,
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-KEY",
          description: "API key for authentication",
        },
      },
      schemas: {
        FileOperation: {
          type: "object",
          required: ["path"],
          properties: {
            path: {
              type: "string",
              description: "File path relative to project root",
              example: "src/index.ts",
            },
            content: {
              type: "string",
              description: "File content (for write operations)",
              example: "console.log('Hello World');",
            },
          },
        },
        FileResponse: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path",
            },
            content: {
              type: "string",
              description: "File content (for read operations)",
            },
            size: {
              type: "number",
              description: "File size in bytes",
            },
            isDirectory: {
              type: "boolean",
              description: "Whether the path is a directory",
            },
            modifiedAt: {
              type: "string",
              format: "date-time",
              description: "Last modification time",
            },
          },
        },
        ExecuteCommand: {
          type: "object",
          required: ["command"],
          properties: {
            command: {
              type: "string",
              description: "Shell command to execute",
              example: "ls -la",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds (1000-30000)",
              default: 10000,
              minimum: 1000,
              maximum: 30000,
            },
            cwd: {
              type: "string",
              description: "Working directory for command execution",
            },
          },
        },
        ExecuteResponse: {
          type: "object",
          properties: {
            stdout: {
              type: "string",
              description: "Standard output",
            },
            stderr: {
              type: "string",
              description: "Standard error",
            },
            exitCode: {
              type: "number",
              description: "Exit code (0 = success)",
            },
            timedOut: {
              type: "boolean",
              description: "Whether the command timed out",
            },
          },
        },
        ProjectStructure: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "File or directory name",
            },
            path: {
              type: "string",
              description: "Relative path",
            },
            type: {
              type: "string",
              enum: ["file", "directory"],
              description: "Entry type",
            },
            size: {
              type: "number",
              description: "File size (for files only)",
            },
            children: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ProjectStructure",
              },
              description: "Child entries (for directories)",
            },
          },
        },
        AIPrompt: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to process",
              example: "Explain this code",
            },
            context: {
              type: "string",
              description: "Additional context for the prompt",
            },
            maxTokens: {
              type: "number",
              description: "Maximum tokens in response",
              default: 1000,
              minimum: 1,
              maximum: 4000,
            },
          },
        },
        AIResponse: {
          type: "object",
          properties: {
            response: {
              type: "string",
              description: "AI-generated response",
            },
            tokensUsed: {
              type: "number",
              description: "Number of tokens used",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error type",
            },
            message: {
              type: "string",
              description: "Error message",
            },
          },
        },
        APIStats: {
          type: "object",
          properties: {
            totalRequests: {
              type: "number",
              description: "Total number of requests",
            },
            successfulRequests: {
              type: "number",
              description: "Number of successful requests",
            },
            failedRequests: {
              type: "number",
              description: "Number of failed requests",
            },
            averageResponseTime: {
              type: "number",
              description: "Average response time in ms",
            },
            uptime: {
              type: "number",
              description: "Server uptime in seconds",
            },
          },
        },
        APILog: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Log entry ID",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Request timestamp",
            },
            method: {
              type: "string",
              description: "HTTP method",
            },
            path: {
              type: "string",
              description: "Request path",
            },
            status: {
              type: "number",
              description: "Response status code",
            },
            duration: {
              type: "number",
              description: "Response time in ms",
            },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ["./server/routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
