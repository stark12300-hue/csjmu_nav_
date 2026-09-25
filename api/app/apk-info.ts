import fs from 'fs';
import path from 'path';

let apkSettings = {
  version: '1.2.0',
  releaseDate: '2026-03-15',
  fileName: 'CSJMU-Navigation.apk',
  customDownloadUrl: process.env.CUSTOM_APK_URL || '',
  packageId: 'in.ac.csjmu.campusnav',
  notes: 'Official Android APK release with offline campus maps, live GPS navigation, and faculty directory.',
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const localApkPath = path.join(process.cwd(), 'public', 'csjmu_nav.apk');
  const distApkPath = path.join(process.cwd(), 'dist', 'csjmu_nav.apk');
  const filePath = fs.existsSync(localApkPath) ? localApkPath : (fs.existsSync(distApkPath) ? distApkPath : null);
  let sizeBytes = 0;
  if (filePath) {
    try {
      sizeBytes = fs.statSync(filePath).size;
    } catch {}
  }
  const hasApk = Boolean(filePath || apkSettings.customDownloadUrl);

  return res.status(200).json({
    available: hasApk,
    version: apkSettings.version,
    releaseDate: apkSettings.releaseDate,
    fileName: apkSettings.fileName,
    sizeBytes,
    sizeFormatted: sizeBytes > 0 ? (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : '1.90 MB',
    downloadUrl: apkSettings.customDownloadUrl || '/csjmu_nav.apk',
    customDownloadUrl: apkSettings.customDownloadUrl,
    packageId: apkSettings.packageId,
    notes: apkSettings.notes,
  });
}
