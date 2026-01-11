import { z } from "zod";

// API Request/Response schemas

// File operations
export const fileOperationSchema = z.object({
  path: z.string().min(1, "Path is required"),
  content: z.string().optional(),
});

export const fileResponseSchema = z.object({
  path: z.string(),
  content: z.string().optional(),
  size: z.number().optional(),
  isDirectory: z.boolean().optional(),
  modifiedAt: z.string().optional(),
});

export type FileOperation = z.infer<typeof fileOperationSchema>;
export type FileResponse = z.infer<typeof fileResponseSchema>;

// Command execution
export const executeCommandSchema = z.object({
  command: z.string().min(1, "Command is required"),
  timeout: z.number().min(1000).max(30000).optional().default(10000),
  cwd: z.string().optional(),
});

export const executeResponseSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  timedOut: z.boolean().optional(),
});

export type ExecuteCommand = z.infer<typeof executeCommandSchema>;
export type ExecuteResponse = z.infer<typeof executeResponseSchema>;

// Project structure
export const projectStructureSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(["file", "directory"]),
  children: z.array(z.lazy(() => projectStructureSchema)).optional(),
  size: z.number().optional(),
});

export type ProjectStructure = z.infer<typeof projectStructureSchema>;

// AI prompt
export const aiPromptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  context: z.string().optional(),
  maxTokens: z.number().min(1).max(4000).optional().default(1000),
});

export const aiResponseSchema = z.object({
  response: z.string(),
  tokensUsed: z.number().optional(),
});

export type AIPrompt = z.infer<typeof aiPromptSchema>;
export type AIResponse = z.infer<typeof aiResponseSchema>;

// MCP Tool definitions
export const mcpToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
});

export const mcpToolCallSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.any()).optional(),
});

export type MCPTool = z.infer<typeof mcpToolSchema>;
export type MCPToolCall = z.infer<typeof mcpToolCallSchema>;

// API Log entry
export const apiLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  duration: z.number(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export type APILog = z.infer<typeof apiLogSchema>;

// API Stats
export const apiStatsSchema = z.object({
  totalRequests: z.number(),
  successfulRequests: z.number(),
  failedRequests: z.number(),
  averageResponseTime: z.number(),
  uptime: z.number(),
});

export type APIStats = z.infer<typeof apiStatsSchema>;

// Error response
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.number().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
