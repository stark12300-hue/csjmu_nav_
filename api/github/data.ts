/** Server-side reader. Required for private GitHub repositories. */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false });

  const token = String(process.env.GITHUB_TOKEN || '').trim();
  let repo = String(process.env.GITHUB_REPO || 'stark12300-hue/csjmu_nav').trim();
  if (!repo || repo.toLowerCase().includes('campus-navigator') || repo === 'csjmu_nav') {
    repo = 'stark12300-hue/csjmu_nav';
  }
  const branch = String(process.env.GITHUB_BRANCH || 'main').trim();
  const filePath = String(process.env.GITHUB_FILE_PATH || 'src/data/csjmuCampusData.ts').trim();
  if (!token) return res.status(500).json({ success: false, error: 'NO_SERVER_TOKEN', message: 'GITHUB_TOKEN is not configured in Vercel.' });

  try {
    const [owner, repoName] = repo.split('/');
    const r = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${encodeURIComponent(branch)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CSJMU-Campus-Navigator' },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ success: false, error: data.message || `GitHub HTTP ${r.status}` });
    if (!data.content) return res.status(502).json({ success: false, error: 'GitHub returned no file content.' });

    const source = Buffer.from(String(data.content).replace(/\s/g, ''), 'base64').toString('utf8');
    return res.status(200).json({ success: true, source, sha: data.sha, repo, branch, filePath });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Server read failed' });
  }
}
