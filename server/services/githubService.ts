const GITHUB_API = "https://api.github.com";
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
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not configured. Add it to Secrets.");
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function listRepos(): Promise<any[]> {
  const response = await fetchWithTimeout(`${GITHUB_API}/user/repos?per_page=100`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getRepo(owner: string, repo: string): Promise<any> {
  const response = await fetchWithTimeout(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getRepoContents(owner: string, repo: string, path: string): Promise<any> {
  const response = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<any> {
  const body: any = {
    message,
    content: Buffer.from(content).toString("base64"),
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string
): Promise<any> {
  const response = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "DELETE",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listIssues(owner: string, repo: string): Promise<any[]> {
  const response = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/issues?per_page=100`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
): Promise<any> {
  const response = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, labels }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getGitHubStatus(): boolean {
  return !!process.env.GITHUB_TOKEN;
}
