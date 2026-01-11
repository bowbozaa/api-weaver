import path from "path";

// Allowed commands for safe execution
const SAFE_COMMANDS = [
  "ls", "cat", "head", "tail", "wc", "grep", "find", "echo", "pwd", "date",
  "whoami", "env", "node", "npm", "npx", "pnpm", "yarn", "git", "which",
  "mkdir", "touch", "cp", "mv", "rm"
];

// Blocked patterns that could be dangerous
const BLOCKED_PATTERNS = [
  /[;&|`$()]/,      // Shell operators
  /\/etc\//,         // System files
  /\/proc\//,        // Process info
  /\/sys\//,         // System info
  /rm\s+-rf\s+\//,   // Recursive delete from root
  /sudo/,            // Privilege escalation
  /chmod\s+777/,     // Overly permissive chmod
  /curl.*\|.*sh/,    // Piping curl to shell
  /wget.*\|.*sh/,    // Piping wget to shell
];

export function sanitizePath(inputPath: string): string {
  // Remove null bytes
  let sanitized = inputPath.replace(/\0/g, "");
  
  // Normalize the path to resolve . and .. properly
  sanitized = path.normalize(sanitized);
  
  // Remove leading slashes to prevent absolute paths
  sanitized = sanitized.replace(/^\/+/, "");
  
  // Remove any leading ../ sequences that could escape directory
  while (sanitized.startsWith("../") || sanitized === "..") {
    sanitized = sanitized.replace(/^\.\.\//, "").replace(/^\.\./, "");
  }
  
  return sanitized;
}

export function isPathSafe(inputPath: string, basePath: string = process.cwd()): boolean {
  // First sanitize the input to remove traversal attempts
  const sanitized = sanitizePath(inputPath);
  
  // Resolve to absolute path
  const absolutePath = path.resolve(basePath, sanitized);
  
  // Check if the resolved path is within the base directory
  const normalizedBase = path.resolve(basePath);
  
  // Path must either be the base itself or be a child path starting with base + separator
  return absolutePath === normalizedBase || absolutePath.startsWith(normalizedBase + path.sep);
}

export function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Command contains blocked pattern: ${pattern}` };
    }
  }

  // Extract the base command
  const baseCommand = command.trim().split(/\s+/)[0];
  
  if (!baseCommand) {
    return { safe: false, reason: "Empty command" };
  }

  // Check if base command is in allowed list
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
  
  // Check if path tries to escape the project directory
  if (!isPathSafe(sanitized)) {
    return { valid: false, error: "Path outside project directory" };
  }

  return { valid: true, sanitized };
}
