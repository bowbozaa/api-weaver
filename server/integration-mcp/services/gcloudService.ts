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
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;
  
  if (!projectId || !credentialsJson) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_CREDENTIALS not configured. Add them to Secrets.");
  }
  
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS must be valid JSON.");
  }
  
  return { projectId, credentials };
}

async function getAccessToken(): Promise<string> {
  const { credentials } = getConfig();
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signatureInput = `${base64Header}.${base64Claim}`;
  
  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(credentials.private_key, "base64url");
  
  const jwt = `${signatureInput}.${signature}`;
  
  const tokenResponse = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Google OAuth error: ${tokenResponse.status} - ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function getHeaders() {
  const token = await getAccessToken();
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listProjects(): Promise<any> {
  const headers = await getHeaders();
  
  const response = await fetchWithTimeout(
    "https://cloudresourcemanager.googleapis.com/v1/projects",
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Cloud API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listComputeInstances(zone: string = "us-central1-a"): Promise<any> {
  const { projectId } = getConfig();
  const headers = await getHeaders();
  
  const response = await fetchWithTimeout(
    `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Cloud API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createComputeInstance(
  name: string,
  zone: string = "us-central1-a",
  machineType: string = "e2-micro"
): Promise<any> {
  const { projectId } = getConfig();
  const headers = await getHeaders();
  
  const body = {
    name,
    machineType: `zones/${zone}/machineTypes/${machineType}`,
    disks: [{
      boot: true,
      autoDelete: true,
      initializeParams: {
        sourceImage: "projects/debian-cloud/global/images/family/debian-11",
      },
    }],
    networkInterfaces: [{
      network: "global/networks/default",
      accessConfigs: [{ type: "ONE_TO_ONE_NAT", name: "External NAT" }],
    }],
  };

  const response = await fetchWithTimeout(
    `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Cloud API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function deleteComputeInstance(name: string, zone: string = "us-central1-a"): Promise<any> {
  const { projectId } = getConfig();
  const headers = await getHeaders();
  
  const response = await fetchWithTimeout(
    `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${name}`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Cloud API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listStorageBuckets(): Promise<any> {
  const { projectId } = getConfig();
  const headers = await getHeaders();
  
  const response = await fetchWithTimeout(
    `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Cloud API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getGCloudStatus(): boolean {
  return !!(process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_CREDENTIALS);
}
