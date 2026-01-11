const COMET_API = "https://www.comet.com/api/rest/v2";
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
  const apiKey = process.env.COMET_API_KEY;
  if (!apiKey) {
    throw new Error("COMET_API_KEY not configured. Add it to Secrets.");
  }
  return {
    "Authorization": apiKey,
    "Content-Type": "application/json",
  };
}

export async function listProjects(workspace?: string): Promise<any> {
  let url = `${COMET_API}/projects`;
  if (workspace) {
    url += `?workspaceName=${encodeURIComponent(workspace)}`;
  }

  const response = await fetchWithTimeout(url, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Comet API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listExperiments(projectId: string): Promise<any> {
  const response = await fetchWithTimeout(
    `${COMET_API}/experiments?projectId=${projectId}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Comet API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getExperimentMetrics(experimentKey: string): Promise<any> {
  const response = await fetchWithTimeout(
    `${COMET_API}/experiment/metrics?experimentKey=${experimentKey}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Comet API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getCometStatus(): boolean {
  return !!process.env.COMET_API_KEY;
}
