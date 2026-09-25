import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const customUrl = process.env.CUSTOM_APK_URL || '';
  if (customUrl && !req.query.local) {
    return res.redirect(302, customUrl);
  }

  const localApkPath = path.join(process.cwd(), 'public', 'csjmu_nav.apk');
  const distApkPath = path.join(process.cwd(), 'dist', 'csjmu_nav.apk');
  const filePath = fs.existsSync(localApkPath) ? localApkPath : (fs.existsSync(distApkPath) ? distApkPath : null);

  if (filePath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="CSJMU-Navigation.apk"');
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  }

  if (customUrl) {
    return res.redirect(302, customUrl);
  }

  return res.status(404).send('APK file not available on server yet.');
}
