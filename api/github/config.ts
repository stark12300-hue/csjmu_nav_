export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false });

  const token = String(process.env.GITHUB_TOKEN || '').trim();
  let repo = String(process.env.GITHUB_REPO || 'stark12300-hue/csjmu_nav').trim();
  if (!repo || repo.toLowerCase().includes('campus-navigator') || repo === 'csjmu_nav') {
    repo = 'stark12300-hue/csjmu_nav';
  }
  const branch = String(process.env.GITHUB_BRANCH || 'main').trim();
  const filePath = String(process.env.GITHUB_FILE_PATH || 'src/data/csjmuCampusData.ts').trim();

  return res.status(200).json({
    success: true,
    configured: Boolean(token),
    hasToken: Boolean(token),
    repo, branch, filePath,
    autoSync: Boolean(token),
    isVercel: Boolean(process.env.VERCEL),
  });
}
