const VERCEL_API = "https://api.vercel.com";
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

function getHeaders() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN not configured. Add it to Secrets.");
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listProjects(): Promise<any> {
  const response = await fetchWithTimeout(`${VERCEL_API}/v9/projects`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listDeployments(projectId?: string, limit: number = 20): Promise<any> {
  let url = `${VERCEL_API}/v6/deployments?limit=${limit}`;
  if (projectId) {
    url += `&projectId=${projectId}`;
  }

  const response = await fetchWithTimeout(url, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createDeployment(
  name: string,
  gitSource?: { repo: string; ref?: string }
): Promise<any> {
  const body: any = { name };
  
  if (gitSource) {
    body.gitSource = {
      type: "github",
      repo: gitSource.repo,
      ref: gitSource.ref || "main",
    };
  }

  const response = await fetchWithTimeout(`${VERCEL_API}/v13/deployments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getDeployment(deploymentId: string): Promise<any> {
  const response = await fetchWithTimeout(`${VERCEL_API}/v13/deployments/${deploymentId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function cancelDeployment(deploymentId: string): Promise<any> {
  const response = await fetchWithTimeout(`${VERCEL_API}/v12/deployments/${deploymentId}/cancel`, {
    method: "PATCH",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getVercelStatus(): boolean {
  return !!process.env.VERCEL_TOKEN;
}
