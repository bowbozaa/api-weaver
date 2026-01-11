const NOTION_API = "https://api.notion.com/v1";
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
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error("NOTION_API_KEY not configured. Add it to Secrets.");
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
}

export async function listPages(): Promise<any> {
  const response = await fetchWithTimeout(`${NOTION_API}/search`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      page_size: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getPage(pageId: string): Promise<any> {
  const response = await fetchWithTimeout(`${NOTION_API}/pages/${pageId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createPage(parentId: string, title: string, content?: any): Promise<any> {
  const body: any = {
    parent: { page_id: parentId },
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
    },
  };

  if (content) {
    body.children = content;
  }

  const response = await fetchWithTimeout(`${NOTION_API}/pages`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function updatePage(pageId: string, properties: any): Promise<any> {
  const response = await fetchWithTimeout(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function queryDatabase(databaseId: string, filter?: any, sorts?: any): Promise<any> {
  const body: any = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  const response = await fetchWithTimeout(`${NOTION_API}/databases/${databaseId}/query`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function search(query: string): Promise<any> {
  const response = await fetchWithTimeout(`${NOTION_API}/search`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query, page_size: 100 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export function getNotionStatus(): boolean {
  return !!process.env.NOTION_API_KEY;
}
