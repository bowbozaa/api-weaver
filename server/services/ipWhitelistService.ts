import { db } from '../db';
import { ipWhitelist, type InsertIPWhitelist, type IPWhitelist } from '@shared/models/auth';
import { eq, isNotNull } from 'drizzle-orm';
import { logAuditEvent } from './auditService';

let cachedWhitelist: string[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 60000;

export async function refreshWhitelistCache(): Promise<void> {
  try {
    const entries = await db.select()
      .from(ipWhitelist)
      .where(isNotNull(ipWhitelist.enabled));
    
    cachedWhitelist = (entries || []).map(e => e.ip);
    lastCacheUpdate = Date.now();
  } catch (error) {
    console.error('Error refreshing whitelist cache:', error);
    cachedWhitelist = [];
    lastCacheUpdate = Date.now();
  }
}

export async function isIPWhitelisted(ip: string): Promise<boolean> {
  const whitelistEnabled = await isWhitelistEnabled();
  if (!whitelistEnabled) {
    return true;
  }
  
  if (Date.now() - lastCacheUpdate > CACHE_TTL) {
    await refreshWhitelistCache();
  }
  
  const normalizedIP = normalizeIP(ip);
  
  for (const whitelistedIP of cachedWhitelist) {
    if (matchIP(normalizedIP, whitelistedIP)) {
      return true;
    }
  }
  
  return false;
}

function normalizeIP(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

function matchIP(ip: string, pattern: string): boolean {
  if (pattern.includes('/')) {
    return matchCIDR(ip, pattern);
  }
  
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
    return regex.test(ip);
  }
  
  return ip === pattern;
}

function matchCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);
  
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);
  const maskLong = -1 << (32 - mask);
  
  return (ipLong & maskLong) === (rangeLong & maskLong);
}

function ipToLong(ip: string): number {
  const parts = ip.split('.');
  return parts.reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0;
}

export async function isWhitelistEnabled(): Promise<boolean> {
  try {
    const entries = await db.select()
      .from(ipWhitelist)
      .where(isNotNull(ipWhitelist.enabled));
    
    return (entries || []).length > 0;
  } catch (error) {
    console.error('Error checking whitelist status:', error);
    return false;
  }
}

export async function addIPToWhitelist(
  ip: string,
  description?: string,
  createdBy?: string
): Promise<IPWhitelist> {
  const [entry] = await db.insert(ipWhitelist)
    .values({
      ip,
      description,
      createdBy,
      enabled: new Date(),
    })
    .returning();
  
  await refreshWhitelistCache();
  
  await logAuditEvent({
    eventType: 'ip_whitelist_added',
    severity: 'info',
    userId: createdBy,
    ip,
    details: { description },
  });
  
  return entry;
}

export async function removeIPFromWhitelist(id: string, removedBy?: string): Promise<boolean> {
  const [entry] = await db.select().from(ipWhitelist).where(eq(ipWhitelist.id, id));
  
  if (!entry) {
    return false;
  }
  
  await db.delete(ipWhitelist).where(eq(ipWhitelist.id, id));
  await refreshWhitelistCache();
  
  await logAuditEvent({
    eventType: 'ip_whitelist_removed',
    severity: 'warning',
    userId: removedBy,
    ip: entry.ip,
    details: { description: entry.description },
  });
  
  return true;
}

export async function toggleIPWhitelist(id: string, enabled: boolean): Promise<boolean> {
  const [entry] = await db.select().from(ipWhitelist).where(eq(ipWhitelist.id, id));
  
  if (!entry) {
    return false;
  }
  
  await db.update(ipWhitelist)
    .set({ enabled: enabled ? new Date() : null })
    .where(eq(ipWhitelist.id, id));
  
  await refreshWhitelistCache();
  
  return true;
}

export async function getAllWhitelistedIPs(): Promise<IPWhitelist[]> {
  try {
    const result = await db.select().from(ipWhitelist);
    return result || [];
  } catch (error) {
    console.error('Error getting whitelisted IPs:', error);
    return [];
  }
}
