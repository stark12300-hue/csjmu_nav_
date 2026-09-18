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

function verifySignedAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const match = trimmed.match(/^adm_(\d+)_([a-f0-9]{64})$/);
  if (!match) return false;

  const expiresAt = Number(match[1]);
  const providedSignature = match[2];

  if (isNaN(expiresAt) || expiresAt <= Date.now()) return false;

  const secret = getAdminSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`csjmu_admin_session:${expiresAt}`)
    .digest('hex');

  if (providedSignature.length !== expectedSignature.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
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
 * Unified Server-Side Admin handler for Vercel.
 * Fully self-contained to eliminate any module loading failures.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const action = req.query?.action || body.action || (req.method === 'GET' ? 'session' : 'verify');

    if (action === 'session') {
      const valid = Boolean(token && verifySignedAdminToken(token));
      return res.status(valid ? 200 : 401).json({ success: valid, authenticated: valid });
    }

    if (action === 'verify') {
      const clientIp = extractClientIp(req);
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

      const pin = String(body.pin || body.password || '').trim();
      if (pin && isPinValid(pin)) {
        recordSuccessfulAdminLogin(clientIp);
        const { token: sessionToken, expiresAt } = generateSignedAdminToken();
        return res.status(200).json({
          success: true,
          token: sessionToken,
          message: 'Admin authenticated successfully',
          expiresIn: Math.floor((expiresAt - Date.now()) / 1000),
        });
      }

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
        remainingAttempts: failure.remainingAttempts,
        message: `Invalid Admin Security PIN. ${failure.remainingAttempts} attempt(s) remaining.`,
      });
    }

    if (action === 'logout') {
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }

    return res.status(400).json({ success: false, message: 'Unknown action' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
}

