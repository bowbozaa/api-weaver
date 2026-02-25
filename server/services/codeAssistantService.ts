import { callClaude } from "./aiService";
import type { AIResponse } from "@shared/schema";

export type CodeAction = "analyze" | "improve" | "explain" | "generate" | "refactor" | "debug" | "review";

export interface CodeAssistantRequest {
  action: CodeAction;
  code?: string;
  language?: string;
  prompt?: string;
  context?: string;
  maxTokens?: number;
}

export interface CodeAssistantResponse {
  action: CodeAction;
  result: string;
  suggestions?: string[];
  codeBlocks?: Array<{
    language: string;
    code: string;
    description?: string;
  }>;
  tokensUsed?: number;
  model?: string;
}

const SYSTEM_PROMPTS: Record<CodeAction, string> = {
  analyze: `You are an expert code analyzer. Analyze the provided code and identify:
- Potential bugs or errors
- Performance issues
- Security vulnerabilities
- Code style issues
- Best practices violations

Provide a detailed analysis with specific line references where applicable. Format your response clearly with sections for each type of issue found.`,

  improve: `You are an expert code optimizer. Your task is to improve the provided code by:
- Fixing any bugs or errors
- Optimizing performance
- Improving readability
- Following best practices
- Adding proper error handling

Provide the improved code along with explanations of what was changed and why.`,

  explain: `You are an expert code explainer. Explain the provided code in detail:
- What the code does overall
- How each major section/function works
- Any algorithms or patterns used
- Dependencies and their purposes
- Potential edge cases

Use clear, beginner-friendly language while still being technically accurate.`,

  generate: `You are an expert code generator. Based on the user's requirements, generate clean, well-structured code that:
- Follows best practices for the specified language
- Includes proper error handling
- Is well-commented
- Is production-ready
- Includes example usage if appropriate

Provide complete, working code that can be used immediately.`,

  refactor: `You are an expert code refactorer. Refactor the provided code to:
- Improve code structure and organization
- Apply SOLID principles where appropriate
- Reduce code duplication
- Improve naming conventions
- Enhance maintainability

Provide the refactored code with explanations of the changes made.`,

  debug: `You are an expert debugger. Analyze the provided code to:
- Identify the root cause of any bugs
- Trace the execution flow
- Find logical errors
- Detect edge cases that might cause issues
- Suggest fixes with explanations

Provide step-by-step debugging analysis and fixed code.`,

  review: `You are an expert code reviewer. Review the provided code for:
- Code quality and maintainability
- Security concerns
- Performance implications
- Test coverage recommendations
- Documentation needs

Provide a comprehensive code review with actionable feedback and ratings.`,
};

function buildPrompt(request: CodeAssistantRequest): string {
  const { action, code, language, prompt, context } = request;
  
  let fullPrompt = SYSTEM_PROMPTS[action] + "\n\n";
  
  if (language) {
    fullPrompt += `Programming Language: ${language}\n\n`;
  }
  
  if (context) {
    fullPrompt += `Context: ${context}\n\n`;
  }
  
  if (code) {
    fullPrompt += `Code to ${action}:\n\`\`\`${language || ""}\n${code}\n\`\`\`\n\n`;
  }
  
  if (prompt) {
    fullPrompt += `Additional Instructions: ${prompt}\n`;
  }
  
  return fullPrompt;
}

function parseCodeBlocks(text: string): Array<{ language: string; code: string; description?: string }> {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string; description?: string }> = [];
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || "text",
      code: match[2].trim(),
    });
  }
  
  return blocks;
}

function extractSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  const lines = text.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*•]\s+.+/) || trimmed.match(/^\d+\.\s+.+/)) {
      const suggestion = trimmed.replace(/^[-*•\d.]+\s+/, "").trim();
      if (suggestion.length > 10 && suggestion.length < 200) {
        suggestions.push(suggestion);
      }
    }
  }
  
  return suggestions.slice(0, 10);
}

export async function processCodeAssistant(request: CodeAssistantRequest): Promise<CodeAssistantResponse> {
  const { action, maxTokens = 2000 } = request;
  
  if (action === "generate" && !request.prompt) {
    throw new Error("Prompt is required for generate action");
  }
  
  if (action !== "generate" && !request.code) {
    throw new Error("Code is required for " + action + " action");
  }
  
  const prompt = buildPrompt(request);
  
  const aiResponse: AIResponse = await callClaude({
    prompt,
    maxTokens,
  });
  
  const codeBlocks = parseCodeBlocks(aiResponse.response);
  const suggestions = extractSuggestions(aiResponse.response);
  
  return {
    action,
    result: aiResponse.response,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
    tokensUsed: aiResponse.tokensUsed,
    model: aiResponse.model,
  };
}

export function getAvailableActions(): CodeAction[] {
  return ["analyze", "improve", "explain", "generate", "refactor", "debug", "review"];
}
