type SupportedLanguage = "javascript" | "python" | "curl";

interface SdkOutput {
  language: SupportedLanguage;
  code: string;
  filename: string;
}

interface LanguageInfo {
  language: SupportedLanguage;
  displayName: string;
  extension: string;
  description: string;
}

const languages: LanguageInfo[] = [
  {
    language: "javascript",
    displayName: "JavaScript / Node.js",
    extension: ".js",
    description: "JavaScript SDK using fetch API with async/await",
  },
  {
    language: "python",
    displayName: "Python",
    extension: ".py",
    description: "Python SDK using the requests library",
  },
  {
    language: "curl",
    displayName: "cURL",
    extension: ".sh",
    description: "cURL command examples for shell scripting",
  },
];

export function getSupportedLanguages(): LanguageInfo[] {
  return languages;
}

export function generateSDK(
  language: SupportedLanguage,
  swaggerSpec: Record<string, unknown>
): SdkOutput {
  const info = languages.find((l) => l.language === language);
  if (!info) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${languages.map((l) => l.language).join(", ")}`
    );
  }

  const title = (swaggerSpec.info as Record<string, string>)?.title || "API";
  const basePath =
    (swaggerSpec.basePath as string) ||
    ((swaggerSpec.servers as { url: string }[])?.[0]?.url) ||
    "";
  const paths = (swaggerSpec.paths as Record<string, Record<string, unknown>>) || {};

  let code: string;
  switch (language) {
    case "javascript":
      code = generateJavaScript(title, basePath, paths);
      break;
    case "python":
      code = generatePython(title, basePath, paths);
      break;
    case "curl":
      code = generateCurl(title, basePath, paths);
      break;
  }

  return {
    language,
    code,
    filename: `api-client${info.extension}`,
  };
}

function generateJavaScript(
  title: string,
  basePath: string,
  paths: Record<string, Record<string, unknown>>
): string {
  const methods: string[] = [];

  for (const [path, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const op = operations[method] as Record<string, unknown>;
        const opId =
          (op.operationId as string) ||
          `${method}${path.replace(/[^a-zA-Z]/g, "_")}`;
        const hasBody = ["post", "put", "patch"].includes(method);

        methods.push(`
  async ${opId}(${hasBody ? "data, " : ""}options = {}) {
    const response = await fetch(\`\${this.baseUrl}${path}\`, {
      method: "${method.toUpperCase()}",
      headers: {
        ...this.headers,
        ...options.headers,
      },${hasBody ? `\n      body: JSON.stringify(data),` : ""}
    });
    if (!response.ok) {
      throw new Error(\`API error: \${response.status} \${response.statusText}\`);
    }
    return response.json();
  }`);
      }
    }
  }

  return `// ${title} SDK - Auto-generated
class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl || "${basePath}";
    this.headers = {
      "Content-Type": "application/json",
      ...(apiKey ? { "Authorization": \`Bearer \${apiKey}\` } : {}),
    };
  }
${methods.join("\n")}
}

module.exports = { ApiClient };
`;
}

function generatePython(
  title: string,
  basePath: string,
  paths: Record<string, Record<string, unknown>>
): string {
  const methods: string[] = [];

  for (const [path, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const op = operations[method] as Record<string, unknown>;
        const opId =
          (op.operationId as string) ||
          `${method}${path.replace(/[^a-zA-Z]/g, "_")}`;
        const hasBody = ["post", "put", "patch"].includes(method);

        methods.push(`
    def ${opId}(self${hasBody ? ", data=None" : ""}, **kwargs):
        response = requests.${method}(
            f"{self.base_url}${path}",
            headers={**self.headers, **kwargs.get("headers", {})},${hasBody ? "\n            json=data," : ""}
        )
        response.raise_for_status()
        return response.json()`);
      }
    }
  }

  return `# ${title} SDK - Auto-generated
import requests


class ApiClient:
    def __init__(self, base_url="${basePath}", api_key=None):
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
${methods.join("\n")}
`;
}

function generateCurl(
  title: string,
  basePath: string,
  paths: Record<string, Record<string, unknown>>
): string {
  const commands: string[] = [`#!/bin/bash`, `# ${title} SDK - Auto-generated`, ``];
  commands.push(`BASE_URL="\${API_BASE_URL:-${basePath}}"`);
  commands.push(`API_KEY="\${API_KEY:-your-api-key}"`);
  commands.push(``);

  for (const [path, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const op = operations[method] as Record<string, unknown>;
        const summary = (op.summary as string) || `${method.toUpperCase()} ${path}`;
        const hasBody = ["post", "put", "patch"].includes(method);

        commands.push(`# ${summary}`);
        let cmd = `curl -X ${method.toUpperCase()} "$BASE_URL${path}"`;
        cmd += ` \\\n  -H "Content-Type: application/json"`;
        cmd += ` \\\n  -H "Authorization: Bearer $API_KEY"`;
        if (hasBody) {
          cmd += ` \\\n  -d '{"key": "value"}'`;
        }
        commands.push(cmd);
        commands.push(``);
      }
    }
  }

  return commands.join("\n");
}
