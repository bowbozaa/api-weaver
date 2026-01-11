import path from "path";

const SAFE_COMMANDS = [
  "ls", "cat", "head", "tail", "wc", "grep", "find", "echo", "pwd", "date",
  "whoami", "env", "node", "npm", "npx", "pnpm", "yarn", "git", "which",
  "mkdir", "touch", "cp", "mv", "rm"
];

const BLOCKED_PATTERNS = [
  /[;&|`$()]/,
  /\/etc\//,
  /\/proc\//,
  /\/sys\//,
  /rm\s+-rf\s+\//,
  /sudo/,
  /chmod\s+777/,
  /curl.*\|.*sh/,
  /wget.*\|.*sh/,
];

export function sanitizePath(inputPath: string): string {
  let sanitized = inputPath.replace(/\0/g, "");
  sanitized = path.normalize(sanitized);
  sanitized = sanitized.replace(/^\/+/, "");
  while (sanitized.startsWith("../") || sanitized === "..") {
    sanitized = sanitized.replace(/^\.\.\//, "").replace(/^\.\./, "");
  }
  return sanitized;
}

export function isPathSafe(inputPath: string, basePath: string = process.cwd()): boolean {
  const sanitized = sanitizePath(inputPath);
  const absolutePath = path.resolve(basePath, sanitized);
  const normalizedBase = path.resolve(basePath);
  return absolutePath === normalizedBase || absolutePath.startsWith(normalizedBase + path.sep);
}

export function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Command contains blocked pattern: ${pattern}` };
    }
  }

  const baseCommand = command.trim().split(/\s+/)[0];
  
  if (!baseCommand) {
    return { safe: false, reason: "Empty command" };
  }

  if (!SAFE_COMMANDS.includes(baseCommand)) {
    return { safe: false, reason: `Command '${baseCommand}' is not in the allowed list` };
  }

  return { safe: true };
}

export function validateFilePath(filePath: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!filePath || typeof filePath !== "string") {
    return { valid: false, error: "File path is required" };
  }

  if (filePath.length > 500) {
    return { valid: false, error: "File path too long" };
  }

  if (filePath.includes("\0")) {
    return { valid: false, error: "Invalid characters in path" };
  }

  const sanitized = sanitizePath(filePath);
  
  if (!isPathSafe(sanitized)) {
    return { valid: false, error: "Path outside project directory" };
  }

  return { valid: true, sanitized };
}
