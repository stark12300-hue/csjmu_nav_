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

    if (candidateToken && verifySignedAdminToken(candidateToken)) {
      return true;
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
 * Bug Reports management endpoint for Vercel.
 * Requires admin authentication to view, update, or delete bug reports.
 * Allows viewing and managing persisted bug reports from GitHub data/bugReports.json.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Admin authorization verification: GET, PATCH, and DELETE all require valid admin privileges
    if (!verifyAdminRequest(req)) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Admin authorization required to view or manage bug reports.',
      });
    }

    const token = String(process.env.GITHUB_TOKEN || '').trim();
    let repo = String(process.env.GITHUB_REPO || 'stark12300-hue/csjmu_nav').trim();
    if (!repo || repo.toLowerCase().includes('campus-navigator') || repo === 'csjmu_nav') {
      repo = 'stark12300-hue/csjmu_nav';
    }
    const branch = String(process.env.GITHUB_BRANCH || 'main').trim();
    const filePath = String(process.env.GITHUB_BUG_REPORTS_FILE_PATH || 'data/bugReports.json').trim();

    const [owner, repoName] = repo.includes('/') ? repo.split('/') : ['stark12300-hue', 'csjmu_nav'];
    const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;
    const headers: any = {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CSJMU-Campus-Navigator',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fetchReports = async () => {
      try {
        const getRes = await fetch(`${apiBase}/contents/${filePath}?ref=${encodeURIComponent(branch)}&ts=${Date.now()}`, { headers });
        if (!getRes.ok) return { reports: [], sha: undefined };
        const fileData = await getRes.json().catch(() => ({}));
        if (!fileData.content) return { reports: [], sha: fileData.sha };
        const raw = Buffer.from(String(fileData.content).replace(/\s/g, ''), 'base64').toString('utf8');
        const parsed = JSON.parse(raw);
        return { reports: Array.isArray(parsed) ? parsed : [], sha: fileData.sha };
      } catch {
        return { reports: [], sha: undefined };
      }
    };

    const saveReports = async (reports: any[], sha?: string, msg?: string) => {
      if (!token) return false;
      try {
        const contentStr = JSON.stringify(reports, null, 2) + '\n';
        const body: any = {
          message: msg || `Update CSJMU bug reports (${reports.length} reports)`,
          content: Buffer.from(contentStr, 'utf8').toString('base64'),
          branch,
          ...(sha ? { sha } : {}),
        };
        const putRes = await fetch(`${apiBase}/contents/${filePath}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
        return putRes.ok;
      } catch {
        return false;
      }
    };

    if (req.method === 'GET') {
      const { reports } = await fetchReports();
      return res.status(200).json({
        success: true,
        targetEmail: 'stark12300@gmail.com',
        total: reports.length,
        reports,
      });
    }

    if (req.method === 'PATCH') {
      let body = req.body || {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      const { reportId, status, notes, action } = body;
      if (!reportId) {
        return res.status(400).json({ success: false, message: 'reportId is required' });
      }

      const { reports, sha } = await fetchReports();
      const index = reports.findIndex((r) => r.id === reportId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }

      if (action === 'delete') {
        const next = reports.filter((r) => r.id !== reportId);
        await saveReports(next, sha, `Delete bug report #${reportId}`);
        return res.status(200).json({ success: true, reports: next });
      }

      reports[index] = {
        ...reports[index],
        status: status || reports[index].status || 'reviewed',
        notes: notes !== undefined ? notes : reports[index].notes,
        updatedAt: new Date().toISOString(),
      };

      await saveReports(reports, sha, `Update bug report #${reportId} status to ${status || 'reviewed'}`);
      return res.status(200).json({ success: true, report: reports[index], reports });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}

