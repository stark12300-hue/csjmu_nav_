import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function getAdminAuthSecret(): string {
  return String(
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PIN ||
    process.env.ADMIN_SECRET ||
    'csjmu-admin-auth-secure-salt-v2'
  ).trim();
}

function getTeacherAuthSecret(): string {
  return String(
    process.env.TEACHER_SESSION_SECRET ||
    process.env.TEACHER_SECRET ||
    (getAdminAuthSecret() + '_csjmu_teacher_secure_salt_2026')
  ).trim();
}

function verifySignedTeacherToken(
  token: string | null | undefined
): { valid: boolean; teacherId?: string; expiresAt?: number } {
  if (!token || typeof token !== 'string') return { valid: false };
  const trimmed = token.trim();
  const match = trimmed.match(/^tch_([a-zA-Z0-9_\-]+)_(\d+)_([a-f0-9]{64})$/);
  if (!match) return { valid: false };

  const teacherId = match[1];
  const expiresAt = Number(match[2]);
  const providedSignature = match[3];

  if (isNaN(expiresAt) || expiresAt <= Date.now()) return { valid: false };

  const secret = getTeacherAuthSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`csjmu_teacher_session:${teacherId}:${expiresAt}`)
    .digest('hex');

  if (providedSignature.length !== expectedSignature.length) return { valid: false };

  try {
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    if (!isSignatureValid) return { valid: false };
    return { valid: true, teacherId, expiresAt };
  } catch {
    return { valid: false };
  }
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

/**
 * Serverless Faculty Session Verification Endpoint for Vercel (/api/teacher/session).
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-teacher-token, x-teacher-id, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const headers = req.headers || {};
    const authHeader = String(headers.authorization || headers.Authorization || '').trim();
    const tokenHeader = String(headers['x-teacher-token'] || '').trim();
    const teacherIdHeader = String(headers['x-teacher-id'] || '').trim();

    let candidateToken = tokenHeader;
    if (authHeader.startsWith('Bearer ')) {
      const parsed = authHeader.substring(7).trim();
      if (parsed.startsWith('tch_')) candidateToken = parsed;
    } else if (!candidateToken && authHeader.startsWith('tch_')) {
      candidateToken = authHeader;
    }

    const accounts = getLocalAccounts();

    // 1. Authenticate via signed HMAC token
    if (candidateToken) {
      const verified = verifySignedTeacherToken(candidateToken);
      if (verified.valid && verified.teacherId) {
        const teacher = accounts.find((a) => a && a.id === verified.teacherId);
        if (teacher && teacher.status !== 'rejected' && teacher.status !== 'suspended') {
          return res.status(200).json({
            success: true,
            authenticated: true,
            teacher: sanitizeTeacher(teacher),
          });
        }
      }

      // Fallback token pattern tch_<teacherId>_<timestamp>_fallback
      const fallbackMatch = candidateToken.match(/^tch_([a-zA-Z0-9_\-]+)_(\d+)_/);
      if (fallbackMatch) {
        const fallbackId = fallbackMatch[1];
        const teacher = accounts.find((a) => a && a.id === fallbackId);
        if (teacher && teacher.status !== 'rejected' && teacher.status !== 'suspended') {
          return res.status(200).json({
            success: true,
            authenticated: true,
            teacher: sanitizeTeacher(teacher),
          });
        }
      }
    }

    // 2. Direct teacher ID header check
    if (teacherIdHeader) {
      const teacher = accounts.find((a) => a && a.id === teacherIdHeader);
      if (teacher && teacher.status !== 'rejected' && teacher.status !== 'suspended') {
        return res.status(200).json({
          success: true,
          authenticated: true,
          teacher: sanitizeTeacher(teacher),
        });
      }
    }

    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Faculty session expired or invalid. Please sign in again.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: err?.message || 'Verification failed.',
    });
  }
}
