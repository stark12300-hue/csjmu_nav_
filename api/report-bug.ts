export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {}
    }
    body = body || {};

    const {
      category,
      categoryName,
      name,
      emailOrPhone,
      departmentOrCourse,
      locationName,
      coordinates,
      description,
      timestamp,
      userAgent,
    } = body;

    const report = {
      id: `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: category || "other",
      categoryName: categoryName || "Issue Report",
      name: name || "Anonymous",
      emailOrPhone: emailOrPhone || "",
      departmentOrCourse: departmentOrCourse || "",
      locationName: locationName || "",
      coordinates: coordinates || null,
      description: description || "",
      targetEmail: "stark12300@gmail.com",
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || "",
      status: "received",
    };

    console.log(`[BUG REPORT TO stark12300@gmail.com on Vercel] Issue #${report.id}:`, JSON.stringify(report, null, 2));

    // Cloud persistence: save to GitHub data/bugReports.json if token is available
    const token = String(process.env.GITHUB_TOKEN || '').trim();
    let repo = String(process.env.GITHUB_REPO || 'stark12300-hue/csjmu_nav').trim();
    if (!repo || repo.toLowerCase().includes('campus-navigator') || repo === 'csjmu_nav') {
      repo = 'stark12300-hue/csjmu_nav';
    }
    const branch = String(process.env.GITHUB_BRANCH || 'main').trim();
    const filePath = String(process.env.GITHUB_BUG_REPORTS_FILE_PATH || 'data/bugReports.json').trim();

    if (token && repo.includes('/')) {
      try {
        const [owner, repoName] = repo.split('/');
        const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;
        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'CSJMU-Campus-Navigator',
        };

        const getRes = await fetch(`${apiBase}/contents/${filePath}?ref=${encodeURIComponent(branch)}&ts=${Date.now()}`, { headers });
        let reports: any[] = [];
        let sha: string | undefined;

        if (getRes.ok) {
          const fileData = await getRes.json().catch(() => ({}));
          sha = fileData.sha;
          if (fileData.content) {
            const raw = Buffer.from(String(fileData.content).replace(/\s/g, ''), 'base64').toString('utf8');
            try {
              const parsed = JSON.parse(raw);
              reports = Array.isArray(parsed) ? parsed : [];
            } catch {}
          }
        }

        reports.unshift(report);

        await fetch(`${apiBase}/contents/${filePath}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `Log bug report #${report.id}: ${report.categoryName}`,
            content: Buffer.from(JSON.stringify(reports, null, 2) + '\n', 'utf8').toString('base64'),
            branch,
            ...(sha ? { sha } : {}),
          }),
        });
      } catch (cloudErr) {
        console.warn('Could not persist bug report to GitHub cloud:', cloudErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Report logged successfully and persisted. Forwarding to stark12300@gmail.com",
      reportId: report.id,
      targetEmail: "stark12300@gmail.com",
    });
  } catch (err: any) {
    console.error("Error processing bug report on Vercel:", err);
    return res.status(500).json({ error: "Failed to record bug report" });
  }
}
