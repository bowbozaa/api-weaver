import CryptoJS from 'crypto-js';
import { db } from '../db';
import { auditLogs, type InsertAuditLog, type AuditLog } from '@shared/models/auth';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

const ENCRYPTION_KEY = process.env.AUDIT_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'internal-only';
const SENSITIVE_FIELDS = ['ip', 'userAgent', 'details'];

function encryptValue(value: string | object): string {
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
  return CryptoJS.AES.encrypt(stringValue, ENCRYPTION_KEY).toString();
}

function decryptValue(encryptedValue: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return encryptedValue;
  }
}

function isEncrypted(value: string): boolean {
  try {
    const decoded = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
    const result = decoded.toString(CryptoJS.enc.Utf8);
    return result.length > 0;
  } catch {
    return false;
  }
}

export async function logEncryptedAuditEvent(event: Omit<InsertAuditLog, 'id' | 'createdAt'>): Promise<void> {
  const encryptedEvent: InsertAuditLog = {
    eventType: event.eventType,
    severity: event.severity,
    userId: event.userId,
    ip: event.ip ? encryptValue(event.ip) : undefined,
    userAgent: event.userAgent ? encryptValue(event.userAgent) : undefined,
    path: event.path,
    method: event.method,
    details: event.details ? encryptValue(event.details) : undefined,
  };
  
  await db.insert(auditLogs).values(encryptedEvent);
}

export async function getDecryptedAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const logs = await db.select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  
  return logs.map(log => decryptAuditLog(log));
}

function decryptAuditLog(log: AuditLog): AuditLog {
  const decrypted: AuditLog = { ...log };
  
  if (log.ip && isEncrypted(log.ip)) {
    decrypted.ip = decryptValue(log.ip);
  }
  
  if (log.userAgent && isEncrypted(log.userAgent)) {
    decrypted.userAgent = decryptValue(log.userAgent);
  }
  
  if (log.details) {
    const detailsStr = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
    if (isEncrypted(detailsStr)) {
      try {
        decrypted.details = JSON.parse(decryptValue(detailsStr));
      } catch {
        decrypted.details = decryptValue(detailsStr);
      }
    }
  }
  
  return decrypted;
}

export async function getDecryptedAuditLogsBySeverity(
  severity: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const logs = await db.select()
    .from(auditLogs)
    .where(eq(auditLogs.severity, severity))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  
  return logs.map(log => decryptAuditLog(log));
}

export async function getDecryptedAuditLogsByUser(
  userId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const logs = await db.select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  
  return logs.map(log => decryptAuditLog(log));
}

export async function searchDecryptedAuditLogs(
  eventType?: string,
  severity?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<AuditLog[]> {
  let query = db.select().from(auditLogs);
  
  const conditions = [];
  
  if (eventType) {
    conditions.push(eq(auditLogs.eventType, eventType));
  }
  
  if (severity) {
    conditions.push(eq(auditLogs.severity, severity));
  }
  
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  
  const logs = await db.select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  
  return logs.map(log => decryptAuditLog(log));
}

export function getEncryptionStatus(): {
  enabled: boolean;
  algorithm: string;
  encryptedFields: string[];
} {
  return {
    enabled: true,
    algorithm: 'AES-256',
    encryptedFields: SENSITIVE_FIELDS,
  };
}
