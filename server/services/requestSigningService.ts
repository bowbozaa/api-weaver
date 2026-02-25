import CryptoJS from 'crypto-js';
import { logAuditEvent } from './auditService';

const SIGNING_SECRET = process.env.SIGNING_SECRET || process.env.SESSION_SECRET || 'internal-only';
const SIGNATURE_HEADER = 'X-Request-Signature';
const TIMESTAMP_HEADER = 'X-Request-Timestamp';
const MAX_TIMESTAMP_DIFF = 5 * 60 * 1000;

export interface SignedRequest {
  signature: string;
  timestamp: string;
}

export function generateSignature(
  method: string,
  path: string,
  body: string | object,
  timestamp: string
): string {
  const bodyString = typeof body === 'object' ? JSON.stringify(body) : body;
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyString}`;
  
  const signature = CryptoJS.HmacSHA256(payload, SIGNING_SECRET).toString(CryptoJS.enc.Hex);
  return signature;
}

export function signRequest(
  method: string,
  path: string,
  body: string | object = ''
): SignedRequest {
  const timestamp = Date.now().toString();
  const signature = generateSignature(method, path, body, timestamp);
  
  return {
    signature,
    timestamp,
  };
}

export async function verifySignature(
  method: string,
  path: string,
  body: string | object,
  providedSignature: string,
  providedTimestamp: string,
  ip?: string
): Promise<{ valid: boolean; reason?: string }> {
  const timestamp = parseInt(providedTimestamp, 10);
  const now = Date.now();
  
  if (isNaN(timestamp) || Math.abs(now - timestamp) > MAX_TIMESTAMP_DIFF) {
    await logAuditEvent({
      eventType: 'request_signature_expired',
      severity: 'warning',
      ip,
      path,
      method,
      details: { providedTimestamp, currentTime: now },
    });
    
    return { valid: false, reason: 'Request timestamp expired or invalid' };
  }
  
  const expectedSignature = generateSignature(method, path, body, providedTimestamp);
  
  if (!timingSafeEqual(providedSignature, expectedSignature)) {
    await logAuditEvent({
      eventType: 'request_signature_invalid',
      severity: 'error',
      ip,
      path,
      method,
      details: { action: 'Invalid request signature' },
    });
    
    return { valid: false, reason: 'Invalid request signature' };
  }
  
  return { valid: true };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

export function getSignatureHeaders(): { signatureHeader: string; timestampHeader: string } {
  return {
    signatureHeader: SIGNATURE_HEADER,
    timestampHeader: TIMESTAMP_HEADER,
  };
}

export function isSigningEnabled(): boolean {
  return process.env.REQUIRE_REQUEST_SIGNING === 'true';
}

export function generateClientSigningExample(method: string, path: string): string {
  const timestamp = Date.now().toString();
  const body = '{}';
  const signature = generateSignature(method, path, body, timestamp);
  
  return `
// Example: Signing a request
const method = '${method}';
const path = '${path}';
const body = ${body};
const timestamp = '${timestamp}';

// Headers to include:
// X-Request-Signature: ${signature}
// X-Request-Timestamp: ${timestamp}

fetch('https://your-api.com${path}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-Signature': signature,
    'X-Request-Timestamp': timestamp,
  },
  body: JSON.stringify(body),
});
`;
}
