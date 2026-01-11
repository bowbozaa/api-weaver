const TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function getConfig() {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;
  
  if (!baseUrl || !apiKey) {
    throw new Error("N8N_BASE_URL and N8N_API_KEY not configured. Add them to Secrets.");
  }
  
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

function getHeaders() {
  const { apiKey } = getConfig();
  return {
    "X-N8N-API-KEY": apiKey,
    "Content-Type": "application/json",
  };
}

export async function listWorkflows(): Promise<any> {
  const { baseUrl } = getConfig();
  
  const response = await fetchWithTimeout(`${baseUrl}/api/v1/workflows`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getWorkflow(workflowId: string): Promise<any> {
  const { baseUrl } = getConfig();
  
  const response = await fetchWithTimeout(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function executeWorkflow(workflowId: string, data?: any): Promise<any> {
  const { baseUrl } = getConfig();
  
  const response = await fetchWithTimeout(`${baseUrl}/api/v1/workflows/${workflowId}/execute`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data || {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listExecutions(workflowId?: string, limit: number = 20): Promise<any> {
  const { baseUrl } = getConfig();
  
  let url = `${baseUrl}/api/v1/executions?limit=${limit}`;
  if (workflowId) {
    url += `&workflowId=${workflowId}`;
  }

  const response = await fetchWithTimeout(url, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getN8nStatus(): boolean {
  return !!(process.env.N8N_BASE_URL && process.env.N8N_API_KEY);
}
