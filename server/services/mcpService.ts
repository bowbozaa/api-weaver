import type { Response } from "express";
import { readFile, writeFile, listFiles, deleteFile, getProjectStructure } from "./fileService";
import { executeCommand } from "./commandService";
import type { MCPTool, MCPToolCall } from "@shared/schema";

// MCP Protocol version
const MCP_VERSION = "2024-11-05";

// Define available tools
export const MCP_TOOLS: MCPTool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to read",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with the given content",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to write",
        },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to list (default: current directory)",
        },
      },
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or directory",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to delete",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "execute_command",
    description: "Execute a safe shell command",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 10000, max: 30000)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "get_project_structure",
    description: "Get the project file structure as a tree",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The root path (default: current directory)",
        },
        depth: {
          type: "number",
          description: "Maximum depth to traverse (default: 3)",
        },
      },
    },
  },
  {
    name: "create_directory",
    description: "Create a new directory",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to create",
        },
      },
      required: ["path"],
    },
  },
];

// Handle MCP tool calls
async function handleToolCall(
  name: string,
  args: Record<string, any>
): Promise<any> {
  switch (name) {
    case "read_file":
      return await readFile(args.path);

    case "write_file":
      return await writeFile(args.path, args.content);

    case "list_files":
      return await listFiles(args.path || ".");

    case "delete_file":
      await deleteFile(args.path);
      return { success: true, message: `Deleted ${args.path}` };

    case "execute_command":
      return await executeCommand({
        command: args.command,
        timeout: args.timeout,
      });

    case "get_project_structure":
      return await getProjectStructure(args.path || ".", args.depth || 3);

    case "create_directory":
      await writeFile(`${args.path}/.gitkeep`, "");
      return { success: true, message: `Created directory ${args.path}` };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create JSON-RPC response
function createResponse(id: string | number, result: any) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

// Create JSON-RPC error response
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

// SSE helper to send events
function sendSSEEvent(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// MCP Session management for SSE connections
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

// Handle MCP SSE connection initialization
export function handleMCPConnection(res: Response): MCPSession {
  const session = new MCPSession(res);

  // Send initialization message with server capabilities
  session.sendMessage({
    jsonrpc: "2.0",
    method: "server/initialized",
    params: {
      protocolVersion: MCP_VERSION,
      serverInfo: {
        name: "replit-mcp-server",
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

// Process incoming MCP message (can be used for both SSE and HTTP)
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
            name: "replit-mcp-server",
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
        // Client acknowledged initialization
        response = createResponse(id, {});
        break;

      case "tools/list":
        response = createResponse(id, { tools: MCP_TOOLS });
        break;

      case "tools/call":
        if (!params?.name) {
          response = createErrorResponse(id, -32602, "Missing tool name");
        } else {
          try {
            const result = await handleToolCall(params.name, params.arguments || {});
            response = createResponse(id, {
              content: [
                {
                  type: "text",
                  text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
                },
              ],
            });
          } catch (toolError: any) {
            response = createResponse(id, {
              content: [
                {
                  type: "text",
                  text: `Error: ${toolError.message}`,
                },
              ],
              isError: true,
            });
          }
        }
        break;

      case "ping":
        response = createResponse(id, {});
        break;

      case "notifications/cancelled":
        // Handle cancellation notification
        response = createResponse(id, {});
        break;

      default:
        response = createErrorResponse(id, -32601, `Method not found: ${method}`);
    }

    // Send response through SSE if session is provided
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

// Parse incoming SSE message data
export function parseSSEMessage(data: string): MCPToolCall | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
