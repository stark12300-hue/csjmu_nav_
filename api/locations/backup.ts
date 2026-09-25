import fs from 'fs';
import path from 'path';

let inMemoryBackup: any = null;

function getBackupFilePath(): string {
  return path.join(process.cwd(), 'data', 'locationsBackup.json');
}

function loadBackup(): any {
  if (inMemoryBackup) return inMemoryBackup;
  try {
    const file = getBackupFilePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed) {
        inMemoryBackup = parsed;
        return parsed;
      }
    }
  } catch {}
  return inMemoryBackup;
}

function saveBackup(data: any): void {
  inMemoryBackup = data;
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getBackupFilePath(), JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const backup = loadBackup();
    return res.status(200).json({
      success: true,
      backup,
      data: backup?.data || null,
      updatedAt: backup?.updatedAt || null,
    });
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const backupPayload = {
      updatedAt: new Date().toISOString(),
      data: body.data || body,
    };

    saveBackup(backupPayload);

    return res.status(200).json({
      success: true,
      message: 'Campus data backup safely saved to persistent server storage',
      updatedAt: backupPayload.updatedAt,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
