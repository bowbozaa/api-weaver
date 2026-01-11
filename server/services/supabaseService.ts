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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY not configured. Add them to Secrets.");
  }
  
  return { url, key };
}

function getHeaders() {
  const { key } = getConfig();
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

export async function listTables(): Promise<any[]> {
  const { url } = getConfig();
  
  const response = await fetchWithTimeout(
    `${url}/rest/v1/?apikey=${process.env.SUPABASE_ANON_KEY}`,
    {
      method: "OPTIONS",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase API error: ${response.status} - ${error}`);
  }

  const openapi = await response.json();
  const paths = openapi.paths || {};
  const tables = Object.keys(paths)
    .filter(p => p.startsWith("/") && !p.includes("rpc"))
    .map(p => p.replace("/", ""));
  
  return tables;
}

export async function query(
  table: string,
  select: string = "*",
  filter?: Record<string, string>
): Promise<any[]> {
  const { url } = getConfig();
  
  let queryUrl = `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      queryUrl += `&${key}=eq.${encodeURIComponent(value)}`;
    }
  }
  
  const response = await fetchWithTimeout(queryUrl, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function insert(table: string, data: any | any[]): Promise<any> {
  const { url } = getConfig();
  
  const response = await fetchWithTimeout(
    `${url}/rest/v1/${table}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function update(
  table: string,
  data: any,
  match: Record<string, string>
): Promise<any> {
  const { url } = getConfig();
  
  let queryUrl = `${url}/rest/v1/${table}?`;
  const matchParams = Object.entries(match)
    .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
    .join("&");
  queryUrl += matchParams;
  
  const response = await fetchWithTimeout(queryUrl, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function deleteRows(
  table: string,
  match: Record<string, string>
): Promise<any> {
  const { url } = getConfig();
  
  let queryUrl = `${url}/rest/v1/${table}?`;
  const matchParams = Object.entries(match)
    .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
    .join("&");
  queryUrl += matchParams;
  
  const response = await fetchWithTimeout(queryUrl, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getSupabaseStatus(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}
