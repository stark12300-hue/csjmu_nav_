export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ success: false });

  const token = String(process.env.GITHUB_TOKEN || '').trim();
  let repo = String(process.env.GITHUB_REPO || 'stark12300-hue/csjmu_nav').trim();
  if (!repo || repo.toLowerCase().includes('campus-navigator') || repo === 'csjmu_nav') {
    repo = 'stark12300-hue/csjmu_nav';
  }
  if (!token) return res.status(500).json({ success: false, message: 'GITHUB_TOKEN is not configured in Vercel.' });

  try {
    const [owner, repoName] = repo.split('/');
    const r = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CSJMU-Campus-Navigator' },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ success: false, message: data.message || `GitHub HTTP ${r.status}` });
    return res.status(200).json({ success: true, message: `Connected to ${data.full_name} (${data.private ? 'Private' : 'Public'})`, repoInfo: { fullName: data.full_name, private: data.private, defaultBranch: data.default_branch } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Connection failed' });
  }
}
