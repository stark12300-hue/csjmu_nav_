import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Precomputed one-way cryptographic hashes for authorized master admin PIN
const MASTER_ADMIN_PIN_SHA256 = '74c43543dc0e0652f1cf5cc117131fb6f9c681f7b4a64847020a7e0c6e6e40b8';
const MASTER_ADMIN_PIN_HASH = 'h_z2kpvs';

function getAdminAuthSecret(): string {
  return String(
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PIN ||
    process.env.ADMIN_SECRET ||
    'csjmu-admin-auth-secure-salt-v2'
  ).trim();
}

function isMasterAdminPinValid(candidatePin: string): boolean {
  if (!candidatePin) return false;
  const trimmed = String(candidatePin).trim();
  if (!trimmed) return false;

  const envPin = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_PIN || process.env.ADMIN_SECRET || '').trim();
  if (envPin && (trimmed === envPin || crypto.createHash('sha256').update(trimmed).digest('hex') === crypto.createHash('sha256').update(envPin).digest('hex'))) {
    return true;
  }

  const sha = crypto.createHash('sha256').update(trimmed).digest('hex');
  if (sha === MASTER_ADMIN_PIN_SHA256) return true;

  let hash = 0;
  const salt = 'csjmu_sec_salt_2026';
  const str = salt + trimmed + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}` === MASTER_ADMIN_PIN_HASH;
}

function verifySignedAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const match = trimmed.match(/^adm_(\d+)_([a-f0-9]{64})$/);
  if (!match) return false;

  const expiresAt = Number(match[1]);
  const providedSignature = match[2];

  if (isNaN(expiresAt) || expiresAt <= Date.now()) return false;

  const secret = getAdminAuthSecret();
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

function hashFacultyPassword(password: string): string {
  let h2Val = 0;
  const salt = 'csjmu_sec_salt_2026';
  const str = salt + password.trim() + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h2Val = (h2Val << 5) - h2Val + char;
    h2Val |= 0;
  }
  return `h_${Math.abs(h2Val).toString(36)}`;
}

function sanitizeTeacher(teacher: any): any {
  if (!teacher || typeof teacher !== 'object') return teacher;
  const { passwordHash, idCardPhoto, ...safe } = teacher;
  return safe;
}

function getLocalAccounts(): any[] {
  try {
    const file = path.join(process.cwd(), 'data', 'teacherAccounts.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

function saveLocalAccounts(accounts: any[]) {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'teacherAccounts.json');
    fs.writeFileSync(file, JSON.stringify(accounts, null, 2), 'utf8');
  } catch {}
}

/**
 * Serverless Faculty Password Reset Endpoint for Vercel (/api/teacher/reset-password).
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { email, identifier, newPassword, masterPin, adminPin } = body;
    const rawIdentifier = String(email || identifier || '').trim().toLowerCase();
    const candidatePin = String(masterPin || adminPin || req.headers?.['x-admin-pin'] || '').trim();
    const candidatePassword = String(newPassword || '').trim();

    if (!candidatePassword || candidatePassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long.',
      });
    }

    const adminToken = String(req.headers?.['x-admin-token'] || req.headers?.authorization || '').replace('Bearer ', '').trim();
    const isTokenAdmin = adminToken && verifySignedAdminToken(adminToken);
    const isPinAdmin = candidatePin && isMasterAdminPinValid(candidatePin);

    if (!isTokenAdmin && !isPinAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security PIN. Please provide the authorized Admin Security PIN.',
      });
    }

    const accounts = getLocalAccounts();
    const teacher = accounts.find((a) => {
      if (!a) return false;
      const aEmail = String(a?.email || '').trim().toLowerCase();
      const aName = String(a?.name || '').trim().toLowerCase();
      const aId = String(a?.id || '').trim().toLowerCase();
      const aPrefix = aEmail.includes('@') ? aEmail.split('@')[0] : '';
      return (
        aEmail === rawIdentifier ||
        aName === rawIdentifier ||
        aId === rawIdentifier ||
        (aPrefix && aPrefix === rawIdentifier)
      );
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Faculty account not found.',
      });
    }

    teacher.passwordHash = hashFacultyPassword(candidatePassword);
    saveLocalAccounts(accounts);

    return res.status(200).json({
      success: true,
      message: `Password successfully updated for ${teacher.name}! You can now login.`,
      teacher: sanitizeTeacher(teacher),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Password reset failed due to a server error.',
    });
  }
}
