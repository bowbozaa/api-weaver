import type { Response } from "express";

const MCP_VERSION = "2024-11-05";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface MCPToolCall {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

export const MCP_TOOLS: MCPTool[] = [
  {
    name: "github_list_repos",
    description: "List GitHub repositories",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "github_get_repo",
    description: "Get a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "vercel_list_projects",
    description: "List Vercel projects",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "vercel_list_deployments",
    description: "List Vercel deployments",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID (optional)" },
        limit: { type: "number", description: "Limit (default: 20)" },
      },
    },
  },
  {
    name: "supabase_query",
    description: "Query Supabase table",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name" },
        select: { type: "string", description: "Select columns (default: *)" },
        filter: { type: "object", description: "Filter conditions" },
      },
      required: ["table"],
    },
  },
  {
    name: "n8n_list_workflows",
    description: "List n8n workflows",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "n8n_execute_workflow",
    description: "Execute an n8n workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string", description: "Workflow ID" },
        data: { type: "object", description: "Input data" },
      },
      required: ["workflowId"],
    },
  },
  {
    name: "gcloud_list_instances",
    description: "List Google Cloud compute instances",
    inputSchema: {
      type: "object",
      properties: {
        zone: { type: "string", description: "Zone (default: us-central1-a)" },
      },
    },
  },
];

function createResponse(id: string | number, result: any) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function createErrorResponse(id: string | number | null, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

function sendSSEEvent(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export class MCPSession {
  private res: Response;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = true;

  constructor(res: Response) {
    this.res = res;
    this.startKeepAlive();
  }

  private startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected) {
        try {
          this.res.write(":ping\n\n");
        } catch {
          this.disconnect();
        }
      }
    }, 30000);
  }

  sendEvent(event: string, data: any) {
    if (this.isConnected) {
      try {
        sendSSEEvent(this.res, event, data);
      } catch {
        this.disconnect();
      }
    }
  }

  sendMessage(data: any) {
    this.sendEvent("message", data);
  }

  disconnect() {
    this.isConnected = false;
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  isActive() {
    return this.isConnected;
  }
}

export function handleMCPConnection(res: Response): MCPSession {
  const session = new MCPSession(res);

  session.sendMessage({
    jsonrpc: "2.0",
    method: "server/initialized",
    params: {
      protocolVersion: MCP_VERSION,
      serverInfo: {
        name: "integration-mcp-server",
        version: "1.0.0",
      },
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
    },
  });

  return session;
}

export async function processMCPMessage(
  message: MCPToolCall,
  session?: MCPSession
): Promise<any> {
  const { id, method, params } = message;

  try {
    let response: any;

    switch (method) {
      case "initialize":
        response = createResponse(id, {
          protocolVersion: MCP_VERSION,
          serverInfo: {
            name: "integration-mcp-server",
            version: "1.0.0",
          },
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
        });
        break;

      case "initialized":
        response = createResponse(id, {});
        break;

      case "tools/list":
        response = createResponse(id, { tools: MCP_TOOLS });
        break;

      case "tools/call":
        if (!params?.name) {
          response = createErrorResponse(id, -32602, "Missing tool name");
        } else {
          response = createResponse(id, {
            content: [
              {
                type: "text",
                text: `Tool ${params.name} called with args: ${JSON.stringify(params.arguments || {})}`,
              },
            ],
          });
        }
        break;

      case "ping":
        response = createResponse(id, {});
        break;

      default:
        response = createErrorResponse(id, -32601, `Method not found: ${method}`);
    }

    if (session && session.isActive()) {
      session.sendMessage(response);
    }

    return response;
  } catch (error: any) {
    const errorResponse = createErrorResponse(id, -32000, error.message);
    
    if (session && session.isActive()) {
      session.sendMessage(errorResponse);
    }

    return errorResponse;
  }
}

export function parseSSEMessage(data: string): MCPToolCall | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
