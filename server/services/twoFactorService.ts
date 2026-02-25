import { generateSecret as otpGenerateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import { db } from '../db';
import { user2FA, type Insert2FA, type User2FA } from '@shared/models/auth';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from './auditService';
import CryptoJS from 'crypto-js';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'internal-only';
const APP_NAME = 'API Weaver';

function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function generateSecret(): string {
  return otpGenerateSecret();
}

function generateTOTPUri(email: string, secret: string): string {
  return generateURI({ issuer: APP_NAME, label: email, secret });
}

async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ token, secret });
    return result.valid === true;
  } catch {
    return false;
  }
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

export async function setup2FA(userId: string, email: string): Promise<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}> {
  const secret = generateSecret();
  const otpauth = generateTOTPUri(email, secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  const backupCodes = generateBackupCodes();
  
  const encryptedSecret = encrypt(secret);
  const encryptedBackupCodes = backupCodes.map(code => encrypt(code));
  
  const existing = await db.select().from(user2FA).where(eq(user2FA.userId, userId));
  
  if (existing.length > 0) {
    await db.update(user2FA)
      .set({
        secret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        enabled: null,
        updatedAt: new Date(),
      })
      .where(eq(user2FA.userId, userId));
  } else {
    await db.insert(user2FA).values({
      userId,
      secret: encryptedSecret,
      backupCodes: encryptedBackupCodes,
    });
  }
  
  await logAuditEvent({
    eventType: '2fa_setup_initiated',
    severity: 'info',
    userId,
    details: { action: '2FA setup started' },
  });
  
  return { secret, qrCode, backupCodes };
}

export async function verify2FA(userId: string, token: string): Promise<boolean> {
  const [record] = await db.select().from(user2FA).where(eq(user2FA.userId, userId));
  
  if (!record) {
    return false;
  }
  
  const secret = decrypt(record.secret);
  const isValid = await verifyTOTP(token, secret);
  
  if (isValid && !record.enabled) {
    await db.update(user2FA)
      .set({ enabled: new Date(), updatedAt: new Date() })
      .where(eq(user2FA.userId, userId));
    
    await logAuditEvent({
      eventType: '2fa_enabled',
      severity: 'info',
      userId,
      details: { action: '2FA successfully enabled' },
    });
  }
  
  return isValid;
}

export async function validate2FAToken(userId: string, token: string): Promise<boolean> {
  const [record] = await db.select().from(user2FA).where(eq(user2FA.userId, userId));
  
  if (!record || !record.enabled) {
    return true;
  }
  
  const secret = decrypt(record.secret);
  const isValid = await verifyTOTP(token, secret);
  
  if (!isValid) {
    const backupCodes = (record.backupCodes as string[]) || [];
    for (let i = 0; i < backupCodes.length; i++) {
      const decryptedCode = decrypt(backupCodes[i]);
      if (decryptedCode === token.toUpperCase()) {
        const newCodes = [...backupCodes];
        newCodes.splice(i, 1);
        await db.update(user2FA)
          .set({ backupCodes: newCodes, updatedAt: new Date() })
          .where(eq(user2FA.userId, userId));
        
        await logAuditEvent({
          eventType: '2fa_backup_code_used',
          severity: 'warning',
          userId,
          details: { remainingCodes: newCodes.length },
        });
        
        return true;
      }
    }
    
    await logAuditEvent({
      eventType: '2fa_validation_failed',
      severity: 'warning',
      userId,
      details: { action: 'Invalid 2FA token' },
    });
    
    return false;
  }
  
  return true;
}

export async function disable2FA(userId: string): Promise<boolean> {
  const [record] = await db.select().from(user2FA).where(eq(user2FA.userId, userId));
  
  if (!record) {
    return false;
  }
  
  await db.update(user2FA)
    .set({ enabled: null, updatedAt: new Date() })
    .where(eq(user2FA.userId, userId));
  
  await logAuditEvent({
    eventType: '2fa_disabled',
    severity: 'warning',
    userId,
    details: { action: '2FA disabled' },
  });
  
  return true;
}

export async function get2FAStatus(userId: string): Promise<{
  isSetup: boolean;
  isEnabled: boolean;
  backupCodesRemaining: number;
}> {
  try {
    const records = await db.select().from(user2FA).where(eq(user2FA.userId, userId));
    const record = records?.[0];
    
    if (!record) {
      return { isSetup: false, isEnabled: false, backupCodesRemaining: 0 };
    }
    
    const backupCodes = (record.backupCodes as string[]) || [];
    
    return {
      isSetup: true,
      isEnabled: !!record.enabled,
      backupCodesRemaining: backupCodes.length,
    };
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    return { isSetup: false, isEnabled: false, backupCodesRemaining: 0 };
  }
}

export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const [record] = await db.select().from(user2FA).where(eq(user2FA.userId, userId));
  
  if (!record) {
    throw new Error('2FA not set up for this user');
  }
  
  const backupCodes = generateBackupCodes();
  const encryptedBackupCodes = backupCodes.map(code => encrypt(code));
  
  await db.update(user2FA)
    .set({ backupCodes: encryptedBackupCodes, updatedAt: new Date() })
    .where(eq(user2FA.userId, userId));
  
  await logAuditEvent({
    eventType: '2fa_backup_codes_regenerated',
    severity: 'info',
    userId,
    details: { action: 'Backup codes regenerated' },
  });
  
  return backupCodes;
}
