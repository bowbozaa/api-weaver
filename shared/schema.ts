import { z } from "zod";

// Re-export all Drizzle tables and types from auth model
export * from "./models/auth";

// ==================== ZOD VALIDATION SCHEMAS ====================

export const fileOperationSchema = z.object({
  path: z.string().min(1, "File path is required"),
  content: z.string().optional(),
  encoding: z.string().optional().default("utf-8"),
});

export const executeCommandSchema = z.object({
  command: z.string().min(1, "Command is required"),
  cwd: z.string().optional(),
  timeout: z.number().optional().default(30000),
});

export const aiPromptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.string().optional().default("gpt-4"),
  maxTokens: z.number().optional().default(2048),
  temperature: z.number().optional().default(0.7),
  systemPrompt: z.string().optional(),
});

export const mcpToolCallSchema = z.object({
  toolName: z.string().min(1, "Tool name is required"),
  arguments: z.record(z.unknown()).optional().default({}),
  serverId: z.string().optional(),
});

// ==================== TYPE INTERFACES ====================

export interface AIPrompt {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface FileResponse {
  path: string;
  content: string;
  size: number;
  encoding: string;
}

export interface ProjectStructure {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: ProjectStructure[];
  size?: number;
}

export interface ExecuteCommand {
  command: string;
  cwd?: string;
  timeout?: number;
}

export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCall {
  toolName: string;
  arguments: Record<string, unknown>;
  serverId?: string;
}
