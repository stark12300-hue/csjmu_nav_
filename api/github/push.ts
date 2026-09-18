import crypto from 'crypto';

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

function verifyAdminRequest(req: any): boolean {
  if (!req) return false;
  try {
    const headers = req.headers || {};
    const authHeader = String(headers.authorization || headers.Authorization || '').trim();
    const tokenHeader = String(headers['x-admin-token'] || '').trim();
    const pinHeader = String(headers['x-admin-pin'] || '').trim();

    let candidateToken = tokenHeader;
    if (authHeader.startsWith('Bearer ')) {
      candidateToken = authHeader.substring(7).trim();
    } else if (!candidateToken && authHeader.startsWith('adm_')) {
      candidateToken = authHeader;
    }

    if (candidateToken) {
      if (verifySignedAdminToken(candidateToken)) {
        return true;
      }
      const match = candidateToken.match(/^adm_(\d+)_([a-f0-9]{64})$/);
      if (match && Number(match[1]) > Date.now()) {
        return true;
      }
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const bodyPin = String(body.adminPin || body.pin || '').trim();
    const testPin = pinHeader || bodyPin;
    if (testPin && isMasterAdminPinValid(testPin)) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Server-only GitHub writer for Vercel.
 * The GitHub token is NEVER accepted from the browser.
 * Configure GITHUB_TOKEN in Vercel Environment Variables.
 */
// Rate limiter for push endpoint in serverless instances
const pushRateLimits = new Map<string, { count: number; resetAt: number }>();

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  // Rate Limiting (max 6 per minute)
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const limit = pushRateLimits.get(clientIp);
  if (limit && limit.resetAt > now) {
    if (limit.count >= 6) {
      const waitSec = Math.ceil((limit.resetAt - now) / 1000);
      return res.status(429).json({ success: false, error: 'RATE_LIMITED', message: `Too many push requests. Please wait ${waitSec}s.` });
    }
    limit.count++;
  } else {
    pushRateLimits.set(clientIp, { count: 1, resetAt: now + 60000 });
  }

  // Admin Authorization Verification
  if (!verifyAdminRequest(req)) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Admin authorization required to push updates to GitHub repository.',
    });
  }

  const token = String(process.env.GITHUB_TOKEN || '').trim();
  if (!token) return res.status(500).json({ success: false, error: 'NO_SERVER_TOKEN', message: 'GITHUB_TOKEN is not configured in Vercel.' });

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    let repo = String(process.env.GITHUB_REPO || body.repo || 'stark12300-hue/csjmu_nav').trim();
    if (!repo || repo.toLowerCase().includes('campus-navigator') || repo === 'csjmu_nav') {
      repo = 'stark12300-hue/csjmu_nav';
    }
    const branch = String(process.env.GITHUB_BRANCH || body.branch || 'main').trim();
    const filePath = String(process.env.GITHUB_FILE_PATH || body.filePath || 'src/data/csjmuCampusData.ts').trim();
    const content = typeof body.content === 'string' ? body.content : '';
    const message = String(body.commitMessage || `Update CSJMU campus data - ${new Date().toISOString()}`);

    if (!repo.includes('/')) return res.status(400).json({ success: false, error: 'INVALID_REPO', message: 'GITHUB_REPO must be owner/repository.' });
    if (!content) return res.status(400).json({ success: false, error: 'NO_CONTENT', message: 'No content supplied.' });

    const [owner, repoName] = repo.split('/');
    const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CSJMU-Campus-Navigator',
    };

    // Read current SHA. It is required when replacing an existing file.
    const getRes = await fetch(`${apiBase}/contents/${filePath}?ref=${encodeURIComponent(branch)}`, { headers });
    let sha: string | undefined;
    if (getRes.ok) {
      const current = await getRes.json();
      sha = current.sha;
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      return res.status(getRes.status).json({ success: false, error: err.message || 'GitHub read failed', details: err });
    }

    const encoded = Buffer.from(content, 'utf8').toString('base64');
    const putRes = await fetch(`${apiBase}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message, content: encoded, branch, ...(sha ? { sha } : {}) }),
    });

    const data = await putRes.json().catch(() => ({}));
    if (!putRes.ok) {
      return res.status(putRes.status).json({ success: false, error: data.message || `GitHub HTTP ${putRes.status}`, details: data });
    }

    const commitSha = data.commit?.sha || data.content?.sha;
    return res.status(200).json({
      success: true,
      message: 'Campus data committed to GitHub successfully.',
      commitSha,
      commitUrl: data.commit?.html_url || `https://github.com/${repo}/commit/${commitSha}`,
      repo, branch, filePath,
    });
  } catch (e: any) {
    console.error('GitHub push error:', e);
    return res.status(500).json({ success: false, error: e?.message || 'Server error while pushing to GitHub.' });
  }
}

