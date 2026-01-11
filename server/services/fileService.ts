import fs from "fs/promises";
import path from "path";
import { sanitizePath, validateFilePath, isPathSafe } from "../middleware/security";
import type { FileResponse, ProjectStructure } from "@shared/schema";

const PROJECT_ROOT = process.cwd();

export async function readFile(filePath: string): Promise<FileResponse> {
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitized = validation.sanitized || sanitizePath(filePath);
  const fullPath = path.join(PROJECT_ROOT, sanitized);

  if (!isPathSafe(sanitized, PROJECT_ROOT)) {
    throw new Error("Access denied: path outside project directory");
  }

  try {
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      return {
        path: sanitized,
        isDirectory: true,
        modifiedAt: stats.mtime.toISOString(),
      };
    }

    const content = await fs.readFile(fullPath, "utf-8");
    
    return {
      path: sanitized,
      content,
      size: stats.size,
      isDirectory: false,
      modifiedAt: stats.mtime.toISOString(),
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error("File not found");
    }
    throw error;
  }
}

export async function writeFile(filePath: string, content: string): Promise<FileResponse> {
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitized = validation.sanitized || sanitizePath(filePath);
  const fullPath = path.join(PROJECT_ROOT, sanitized);

  if (!isPathSafe(sanitized, PROJECT_ROOT)) {
    throw new Error("Access denied: path outside project directory");
  }

  // Create directory if it doesn't exist
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(fullPath, content, "utf-8");
  
  const stats = await fs.stat(fullPath);

  return {
    path: sanitized,
    size: stats.size,
    isDirectory: false,
    modifiedAt: stats.mtime.toISOString(),
  };
}

export async function deleteFile(filePath: string): Promise<void> {
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitized = validation.sanitized || sanitizePath(filePath);
  const fullPath = path.join(PROJECT_ROOT, sanitized);

  if (!isPathSafe(sanitized, PROJECT_ROOT)) {
    throw new Error("Access denied: path outside project directory");
  }

  try {
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error("File not found");
    }
    throw error;
  }
}

export async function listFiles(dirPath: string = "."): Promise<FileResponse[]> {
  const sanitized = sanitizePath(dirPath);
  const fullPath = path.join(PROJECT_ROOT, sanitized);

  if (!isPathSafe(sanitized, PROJECT_ROOT)) {
    throw new Error("Access denied: path outside project directory");
  }

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files: FileResponse[] = [];

    for (const entry of entries) {
      // Skip hidden files and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      const entryPath = path.join(sanitized, entry.name);
      const fullEntryPath = path.join(PROJECT_ROOT, entryPath);
      
      try {
        const stats = await fs.stat(fullEntryPath);
        files.push({
          path: entryPath,
          isDirectory: entry.isDirectory(),
          size: entry.isFile() ? stats.size : undefined,
          modifiedAt: stats.mtime.toISOString(),
        });
      } catch {
        // Skip files we can't stat
      }
    }

    return files;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error("Directory not found");
    }
    throw error;
  }
}

export async function getProjectStructure(
  dirPath: string = ".",
  depth: number = 3
): Promise<ProjectStructure> {
  const sanitized = sanitizePath(dirPath);
  const fullPath = path.join(PROJECT_ROOT, sanitized);

  if (!isPathSafe(sanitized, PROJECT_ROOT)) {
    throw new Error("Access denied: path outside project directory");
  }

  async function buildTree(
    currentPath: string,
    currentDepth: number
  ): Promise<ProjectStructure> {
    const stats = await fs.stat(currentPath);
    const name = path.basename(currentPath) || ".";
    const relativePath = path.relative(PROJECT_ROOT, currentPath);

    if (stats.isFile()) {
      return {
        name,
        path: relativePath || ".",
        type: "file",
        size: stats.size,
      };
    }

    const structure: ProjectStructure = {
      name,
      path: relativePath || ".",
      type: "directory",
    };

    if (currentDepth < depth) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const children: ProjectStructure[] = [];

      for (const entry of entries) {
        // Skip hidden files and node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }

        try {
          const child = await buildTree(
            path.join(currentPath, entry.name),
            currentDepth + 1
          );
          children.push(child);
        } catch {
          // Skip entries we can't read
        }
      }

      structure.children = children.sort((a, b) => {
        // Directories first, then alphabetically
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }

    return structure;
  }

  return buildTree(fullPath, 0);
}
