import { exec } from "child_process";
import { promisify } from "util";
import { isCommandSafe } from "../middleware/security";
import type { ExecuteCommand, ExecuteResponse } from "@shared/schema";

const execAsync = promisify(exec);

export async function executeCommand(params: ExecuteCommand): Promise<ExecuteResponse> {
  const { command, timeout = 10000, cwd } = params;

  // Validate command safety
  const safety = isCommandSafe(command);
  if (!safety.safe) {
    throw new Error(`Command rejected: ${safety.reason}`);
  }

  try {
    const result = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout,
      maxBuffer: 1024 * 1024, // 1MB
      env: {
        ...process.env,
        PATH: process.env.PATH,
      },
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      timedOut: false,
    };
  } catch (error: any) {
    if (error.killed && error.signal === "SIGTERM") {
      return {
        stdout: error.stdout || "",
        stderr: error.stderr || "Command timed out",
        exitCode: 124,
        timedOut: true,
      };
    }

    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
      timedOut: false,
    };
  }
}
