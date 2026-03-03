// Re-export AI provider functions for use within server/services
// The content-mcp aiService has ESM resolution issues when imported cross-directory

const TIMEOUT_MS = 30000;

interface AIPrompt {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

interface AIResponse {
  response: string;
  tokensUsed?: number;
  model?: string;
}

const AI_CONFIGS = {
  claude: { baseUrl: "https://api.anthropic.com/v1/messages", defaultModel: "claude-3-5-sonnet-20241022" },
  gpt: { baseUrl: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/models", defaultModel: "gemini-1.5-flash" },
  perplexity: { baseUrl: "https://api.perplexity.ai/chat/completions", defaultModel: "llama-3.1-sonar-small-128k-online" },
};

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function callClaude(prompt: AIPrompt): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const response = await fetchWithTimeout(AI_CONFIGS.claude.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: prompt.model || AI_CONFIGS.claude.defaultModel, max_tokens: prompt.maxTokens || 1000, messages: [{ role: "user", content: prompt.prompt }] }),
  });
  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const data = await response.json();
  return { response: data.content[0]?.text || "", tokensUsed: data.usage?.output_tokens, model: data.model };
}

export async function callGPT(prompt: AIPrompt): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const response = await fetchWithTimeout(AI_CONFIGS.gpt.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: prompt.model || AI_CONFIGS.gpt.defaultModel, max_tokens: prompt.maxTokens || 1000, messages: [{ role: "user", content: prompt.prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  return { response: data.choices[0]?.message?.content || "", tokensUsed: data.usage?.total_tokens, model: data.model };
}

export async function callGemini(prompt: AIPrompt): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");
  const model = prompt.model || AI_CONFIGS.gemini.defaultModel;
  const response = await fetchWithTimeout(`${AI_CONFIGS.gemini.baseUrl}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt.prompt }] }], generationConfig: { maxOutputTokens: prompt.maxTokens || 1000 } }),
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return { response: data.candidates?.[0]?.content?.parts?.[0]?.text || "", tokensUsed: data.usageMetadata?.totalTokenCount, model };
}

export async function callPerplexity(prompt: AIPrompt): Promise<AIResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not configured");
  const response = await fetchWithTimeout(AI_CONFIGS.perplexity.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: prompt.model || AI_CONFIGS.perplexity.defaultModel, max_tokens: prompt.maxTokens || 1000, messages: [{ role: "user", content: prompt.prompt }] }),
  });
  if (!response.ok) throw new Error(`Perplexity API error: ${response.status}`);
  const data = await response.json();
  return { response: data.choices[0]?.message?.content || "", tokensUsed: data.usage?.total_tokens, model: data.model };
}
