import crypto from 'crypto';

import fs from 'fs';
import path from 'path';

// Precomputed one-way cryptographic hashes for authorized master admin PIN
const MASTER_ADMIN_PIN_SHA256 = '74c43543dc0e0652f1cf5cc117131fb6f9c681f7b4a64847020a7e0c6e6e40b8';
const MASTER_ADMIN_PIN_HASH = 'h_z2kpvs';

function getAdminConfig(): { customPinHash?: string; lastUpdated?: string } {
  try {
    const primaryDir = path.join(process.cwd(), 'data', 'adminConfig.json');
    if (fs.existsSync(primaryDir)) {
      const raw = fs.readFileSync(primaryDir, 'utf8');
      return JSON.parse(raw) || {};
    }
  } catch {}
  return {};
}

function getAdminSecret(): string {
  return String(
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PIN ||
    process.env.ADMIN_SECRET ||
    'csjmu-admin-auth-secure-salt-v2'
  ).trim();
}

function generateSignedAdminToken(durationMs: number = 24 * 60 * 60 * 1000): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + durationMs;
  const secret = getAdminSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`csjmu_admin_session:${expiresAt}`)
    .digest('hex');
  return { token: `adm_${expiresAt}_${signature}`, expiresAt };
}

function hashAdminPin(pin: string): string {
  const secret = getAdminSecret();
  return crypto.createHmac('sha256', secret).update(`csjmu_pin:${pin.trim()}`).digest('hex');
}

function hashLegacyAdminSecret(secret: string): string {
  let hash = 0;
  const salt = 'csjmu_sec_salt_2026';
  const str = salt + secret + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

function isPinValid(pin: string): boolean {
  const trimmed = String(pin || '').trim();
  if (!trimmed) return false;

  const envPin = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_PIN || process.env.ADMIN_SECRET || '').trim();
  if (envPin && (trimmed === envPin || crypto.createHash('sha256').update(trimmed).digest('hex') === crypto.createHash('sha256').update(envPin).digest('hex'))) {
    return true;
  }

  const shaHash = crypto.createHash('sha256').update(trimmed).digest('hex');
  if (shaHash === MASTER_ADMIN_PIN_SHA256) return true;

  const legacyHash = hashLegacyAdminSecret(trimmed);
  if (legacyHash === MASTER_ADMIN_PIN_HASH) return true;

  const cfg = getAdminConfig();
  if (cfg.customPinHash) {
    const hmacHash = hashAdminPin(trimmed);
    if (cfg.customPinHash === shaHash || cfg.customPinHash === hmacHash || cfg.customPinHash === legacyHash) {
      return true;
    }
  }
  return false;
}

function extractClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
  if (forwarded) {
    const ip = String(forwarded).split(',')[0].trim();
    if (ip) return ip;
  }
  return String(req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1');
}

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkAdminRateLimit(ip: string): { allowed: boolean; remainingSeconds: number; message: string; isLocked: boolean } {
  const record = loginAttempts.get(ip);
  const now = Date.now();
  if (record && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      isLocked: true,
      remainingSeconds,
      message: `Security Lockout Active. Please wait ${remainingSeconds}s.`,
    };
  }
  return { allowed: true, remainingSeconds: 0, message: '', isLocked: false };
}

function recordSuccessfulAdminLogin(ip: string) {
  loginAttempts.delete(ip);
}

function recordFailedAdminPinAttempt(ip: string): { isLocked: boolean; remainingSeconds: number; remainingAttempts: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= 5) {
    const lockDuration = 15 * 60 * 1000;
    record.lockedUntil = now + lockDuration;
    loginAttempts.set(ip, record);
    return { isLocked: true, remainingSeconds: Math.ceil(lockDuration / 1000), remainingAttempts: 0 };
  }

  loginAttempts.set(ip, record);
  return { isLocked: false, remainingSeconds: 0, remainingAttempts: Math.max(0, 5 - record.count) };
}

/**
 * Server-Side Admin Authentication Endpoint for Vercel.
 * Features strict rate-limiting, lockout backoff, and signed session tokens.
 * Fully self-contained.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const clientIp = extractClientIp(req);

    // 1. Check rate limit & lockout status
    const rateCheck = checkAdminRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.remainingSeconds));
      return res.status(429).json({
        success: false,
        isLocked: rateCheck.isLocked,
        remainingSeconds: rateCheck.remainingSeconds,
        message: rateCheck.message,
      });
    }

    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const pin = String(body.pin || body.password || '').trim();
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    let isMatch = isPinValid(pin);

    if (!isMatch) {
      const failure = recordFailedAdminPinAttempt(clientIp);
      if (failure.isLocked) {
        res.setHeader('Retry-After', String(failure.remainingSeconds));
        return res.status(429).json({
          success: false,
          isLocked: true,
          remainingSeconds: failure.remainingSeconds,
          remainingAttempts: failure.remainingAttempts,
          message: `Too many failed attempts. Locked out for ${failure.remainingSeconds}s.`,
        });
      }

      return res.status(401).json({
        success: false,
        isLocked: false,
        remainingSeconds: 0,
        remainingAttempts: failure.remainingAttempts,
        message: `Invalid Admin Security PIN. ${failure.remainingAttempts} attempt(s) remaining.`,
      });
    }

    // Success: clear failed attempts for this client
    recordSuccessfulAdminLogin(clientIp);

    // Generate cryptographically signed HMAC server session token
    const { token, expiresAt } = generateSignedAdminToken();

    return res.status(200).json({
      success: true,
      token,
      message: 'Admin authenticated successfully',
      expiresIn: Math.floor((expiresAt - Date.now()) / 1000),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Verification failed' });
  }
}

