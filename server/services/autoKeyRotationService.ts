import * as cron from 'node-cron';
import CryptoJS from 'crypto-js';
import { db } from '../db';
import { apiKeyRotations, apiKeyMetadata, type InsertAPIKeyRotation } from '@shared/models/auth';
import { desc, lte } from 'drizzle-orm';
import { logAuditEvent } from './auditService';

let rotationJob: cron.ScheduledTask | null = null;
let currentRotationInterval = 90;

function generateSecureKey(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function hashKey(key: string): string {
  return CryptoJS.SHA256(key).toString();
}

export async function rotateAPIKey(rotatedBy?: string): Promise<{
  newKey: string;
  expiresAt: Date;
}> {
  const currentKeyHash = process.env.API_KEY ? hashKey(process.env.API_KEY) : null;
  const newKey = generateSecureKey(64);
  const newKeyHash = hashKey(newKey);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + currentRotationInterval);
  
  const rotationRecord: InsertAPIKeyRotation = {
    previousKeyHash: currentKeyHash,
    newKeyHash,
    rotationType: rotatedBy ? 'manual' : 'automatic',
    rotatedBy,
    expiresAt,
  };
  
  await db.insert(apiKeyRotations).values(rotationRecord);
  
  await db.insert(apiKeyMetadata).values({
    keyHash: newKeyHash,
    expiresAt,
  });
  
  await logAuditEvent({
    eventType: 'api_key_rotated',
    severity: 'info',
    userId: rotatedBy,
    details: {
      rotationType: rotatedBy ? 'manual' : 'automatic',
      expiresAt: expiresAt.toISOString(),
    },
  });
  
  return { newKey, expiresAt };
}

export async function getRotationHistory(limit: number = 10): Promise<any[]> {
  try {
    const history = await db.select()
      .from(apiKeyRotations)
      .orderBy(desc(apiKeyRotations.rotatedAt))
      .limit(limit);
    
    return (history || []).map(record => ({
      id: record.id,
      rotationType: record.rotationType,
      rotatedAt: record.rotatedAt,
      rotatedBy: record.rotatedBy,
      expiresAt: record.expiresAt,
    }));
  } catch (error) {
    console.error('Error getting rotation history:', error);
    return [];
  }
}

export function setRotationInterval(days: number): void {
  if (days < 7 || days > 365) {
    throw new Error('Rotation interval must be between 7 and 365 days');
  }
  
  currentRotationInterval = days;
  
  if (rotationJob) {
    rotationJob.stop();
  }
  
  startAutoRotation();
}

export function getRotationInterval(): number {
  return currentRotationInterval;
}

export function startAutoRotation(): void {
  if (rotationJob) {
    rotationJob.stop();
  }
  
  rotationJob = cron.schedule('0 0 * * *', async () => {
    try {
      const expiredKeys = await db.select()
        .from(apiKeyMetadata)
        .where(lte(apiKeyMetadata.expiresAt, new Date()));
      
      if (expiredKeys.length > 0) {
        console.log('[AutoKeyRotation] Expired key detected, rotating...');
        await rotateAPIKey();
        console.log('[AutoKeyRotation] Key rotation completed');
      }
    } catch (error) {
      console.error('[AutoKeyRotation] Error during rotation check:', error);
      await logAuditEvent({
        eventType: 'api_key_rotation_failed',
        severity: 'error',
        details: { error: String(error) },
      });
    }
  });
  
  console.log(`[AutoKeyRotation] Started with ${currentRotationInterval}-day interval`);
}

export function stopAutoRotation(): void {
  if (rotationJob) {
    rotationJob.stop();
    rotationJob = null;
    console.log('[AutoKeyRotation] Stopped');
  }
}

export async function getNextRotationDate(): Promise<Date | null> {
  try {
    const results = await db.select()
      .from(apiKeyMetadata)
      .orderBy(desc(apiKeyMetadata.createdAt))
      .limit(1);
    
    const latestKey = results?.[0];
    if (!latestKey || !latestKey.expiresAt) {
      return null;
    }
    
    return latestKey.expiresAt;
  } catch (error) {
    console.error('Error getting next rotation date:', error);
    return null;
  }
}

export function getRotationStatus(): {
  autoRotationEnabled: boolean;
  intervalDays: number;
  cronSchedule: string;
} {
  return {
    autoRotationEnabled: rotationJob !== null,
    intervalDays: currentRotationInterval,
    cronSchedule: '0 0 * * * (daily at midnight)',
  };
}
