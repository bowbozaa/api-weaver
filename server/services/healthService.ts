import { getAIServiceStatus } from "./aiService";
import { getGitHubStatus } from "./githubService";
import { getSupabaseStatus } from "./supabaseService";
import { getNotionStatus } from "./notionService";
import { getVercelStatus } from "./vercelService";
import { getN8nStatus } from "./n8nService";
import { getGCloudStatus } from "./gcloudService";
import { getCometStatus } from "./cometService";

export interface ServiceHealth {
  name: string;
  status: "connected" | "not_configured" | "error";
  configured: boolean;
  message?: string;
}

export interface AllServicesHealth {
  ai: {
    claude: ServiceHealth;
    gpt: ServiceHealth;
    gemini: ServiceHealth;
    perplexity: ServiceHealth;
  };
  github: ServiceHealth;
  supabase: ServiceHealth;
  notion: ServiceHealth;
  vercel: ServiceHealth;
  n8n: ServiceHealth;
  gcloud: ServiceHealth;
  comet: ServiceHealth;
}

function createServiceHealth(name: string, configured: boolean): ServiceHealth {
  return {
    name,
    status: configured ? "connected" : "not_configured",
    configured,
    message: configured ? "API key configured" : "API key not configured",
  };
}

export function getServiceHealth(service: string): ServiceHealth {
  const statusMap: Record<string, () => boolean> = {
    claude: () => !!process.env.ANTHROPIC_API_KEY,
    gpt: () => !!process.env.OPENAI_API_KEY,
    gemini: () => !!process.env.GOOGLE_AI_API_KEY,
    perplexity: () => !!process.env.PERPLEXITY_API_KEY,
    github: getGitHubStatus,
    supabase: getSupabaseStatus,
    notion: getNotionStatus,
    vercel: getVercelStatus,
    n8n: getN8nStatus,
    gcloud: getGCloudStatus,
    comet: getCometStatus,
  };

  const checkFn = statusMap[service];
  if (!checkFn) {
    return {
      name: service,
      status: "error",
      configured: false,
      message: `Unknown service: ${service}`,
    };
  }

  return createServiceHealth(service, checkFn());
}

export function getAllServicesHealth(): AllServicesHealth {
  const aiStatus = getAIServiceStatus();
  
  return {
    ai: {
      claude: createServiceHealth("claude", aiStatus.claude),
      gpt: createServiceHealth("gpt", aiStatus.gpt),
      gemini: createServiceHealth("gemini", aiStatus.gemini),
      perplexity: createServiceHealth("perplexity", aiStatus.perplexity),
    },
    github: createServiceHealth("github", getGitHubStatus()),
    supabase: createServiceHealth("supabase", getSupabaseStatus()),
    notion: createServiceHealth("notion", getNotionStatus()),
    vercel: createServiceHealth("vercel", getVercelStatus()),
    n8n: createServiceHealth("n8n", getN8nStatus()),
    gcloud: createServiceHealth("gcloud", getGCloudStatus()),
    comet: createServiceHealth("comet", getCometStatus()),
  };
}
