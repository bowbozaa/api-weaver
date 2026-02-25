import { db } from "../db";
import { auditLogs, type InsertAuditLog } from "@shared/models/auth";
import { desc, eq } from "drizzle-orm";

export type AuditEventType = 
  | "auth.login" 
  | "auth.logout" 
  | "auth.failed_login"
  | "api.key_missing"
  | "api.key_invalid"
  | "api.rate_limited"
  | "security.csrf_blocked"
  | "security.path_traversal_blocked"
  | "security.command_blocked"
  | "file.read"
  | "file.write"
  | "file.delete"
  | "command.execute"
  | "2fa_setup_initiated"
  | "2fa_enabled"
  | "2fa_backup_code_used"
  | "2fa_validation_failed"
  | "2fa_disabled"
  | "2fa_backup_codes_regenerated"
  | "ip_whitelist_added"
  | "ip_whitelist_removed"
  | "request_signature_expired"
  | "request_signature_invalid"
  | "api_key_rotated"
  | "api_key_rotation_failed"
  | "security_alert_configured"
  | "security_alert_removed";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

interface AuditLogParams {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const logEntry: InsertAuditLog = {
      eventType: params.eventType,
      severity: params.severity,
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      path: params.path,
      method: params.method,
      details: params.details,
    };

    await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

export async function getAuditLogs(limit = 100, eventType?: AuditEventType) {
  try {
    if (eventType) {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.eventType, eventType))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return [];
  }
}

export async function getSecuritySummary() {
  try {
    const recentLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(1000);

    const summary = {
      totalEvents: recentLogs.length,
      criticalEvents: recentLogs.filter(l => l.severity === "critical").length,
      errorEvents: recentLogs.filter(l => l.severity === "error").length,
      warningEvents: recentLogs.filter(l => l.severity === "warning").length,
      infoEvents: recentLogs.filter(l => l.severity === "info").length,
      recentSecurityEvents: recentLogs
        .filter(l => l.eventType.startsWith("security.") || 
                     l.eventType.startsWith("api.key"))
        .slice(0, 10),
    };

    return summary;
  } catch (error) {
    console.error("Failed to get security summary:", error);
    return {
      totalEvents: 0,
      criticalEvents: 0,
      errorEvents: 0,
      warningEvents: 0,
      infoEvents: 0,
      recentSecurityEvents: [],
    };
  }
}
