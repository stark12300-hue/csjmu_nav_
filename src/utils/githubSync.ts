import { CampusLocation, FacultyMember, CourseDepartmentMapping, CampusEvent } from '../types';
import { CSJMU_NODES, CSJMU_EDGES, CSJMU_CENTER, CAMPUS_BOUNDS, CAMPUS_EVENTS } from '../data/csjmuCampusData';
import { getAdminAuthHeaders, notifyAdminSessionExpired } from './storage';

export interface GitHubConfig {
  token: string;
  repo: string; // "stark12300-hue/csjmu_nav"
  branch: string; // e.g. "main"
  filePath: string; // e.g. "src/data/csjmuCampusData.ts"
  autoSync: boolean;
  lastSyncedAt?: string;
  lastCommitSha?: string;
  lastCommitUrl?: string;
}

const GITHUB_CONFIG_KEY = 'csjmu_github_sync_config_v4';

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  token: '',
  repo: 'stark12300-hue/csjmu_nav',
  branch: 'main',
  filePath: 'src/data/csjmuCampusData.ts',
  autoSync: true,
};

export interface ServerGitHubConfig {
  configured: boolean;
  hasToken: boolean;
  tokenMasked?: string;
  repo?: string;
  branch?: string;
  filePath?: string;
  autoSync?: boolean;
  isVercel?: boolean;
}

/**
 * Fetch GitHub configuration detected in server/Vercel environment variables.
 */
export async function fetchServerGitHubConfig(): Promise<ServerGitHubConfig | null> {
  try {
    const res = await fetch('/api/github/config');
    if (res.ok) {
      const data: ServerGitHubConfig = await res.json();
      if (data.hasToken || data.configured) {
        localStorage.setItem('csjmu_github_server_has_token', 'true');
        if (data.repo) localStorage.setItem('csjmu_github_server_repo', data.repo);
        if (data.branch) localStorage.setItem('csjmu_github_server_branch', data.branch);
        if (data.filePath) localStorage.setItem('csjmu_github_server_filepath', data.filePath);
      }
      return data;
    }
  } catch (e) {
    console.warn('Could not query /api/github/config:', e);
  }
  return null;
}

/**
 * Checks if GitHub token is configured either locally in browser storage,
 * client environment variables (VITE_GITHUB_TOKEN), or server/Vercel environment variables (GITHUB_TOKEN).
 */
export function isGitHubConfigured(): boolean {
  try {
    return localStorage.getItem('csjmu_github_server_has_token') === 'true';
  } catch {
    return false;
  }
}

export function getGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    const serverHasToken = localStorage.getItem('csjmu_github_server_has_token') === 'true';
    const serverRepo = localStorage.getItem('csjmu_github_server_repo');
    const serverBranch = localStorage.getItem('csjmu_github_server_branch');
    const serverFilePath = localStorage.getItem('csjmu_github_server_filepath');

    const envRepo = (import.meta as any).env?.VITE_GITHUB_REPO || '';
    const envBranch = (import.meta as any).env?.VITE_GITHUB_BRANCH || '';
    const envFilePath = (import.meta as any).env?.VITE_GITHUB_FILE_PATH || '';

    // Never expose a GitHub token to the browser. Authentication is server-side only.
    const effectiveToken = ''; 
    let effectiveRepo = parsed.repo || envRepo || serverRepo || DEFAULT_GITHUB_CONFIG.repo;
    if (
      !effectiveRepo ||
      effectiveRepo.toLowerCase().includes('campus-navigator') ||
      effectiveRepo === 'csjmu_nav' ||
      effectiveRepo === 'stark12300-hue/Csjmu-campus-navigator'
    ) {
      effectiveRepo = 'stark12300-hue/csjmu_nav';
    }
    if (parsed.repo && parsed.repo.toLowerCase().includes('campus-navigator')) {
      parsed.repo = 'stark12300-hue/csjmu_nav';
      try { localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(parsed)); } catch {}
    }
    if (serverRepo && serverRepo.toLowerCase().includes('campus-navigator')) {
      try { localStorage.setItem('csjmu_github_server_repo', 'stark12300-hue/csjmu_nav'); } catch {}
    }
    const effectiveBranch = parsed.branch || envBranch || serverBranch || DEFAULT_GITHUB_CONFIG.branch;
    const effectiveFilePath = parsed.filePath || envFilePath || serverFilePath || DEFAULT_GITHUB_CONFIG.filePath;

    const hasAnyToken = serverHasToken;

    return {
      token: effectiveToken,
      repo: effectiveRepo,
      branch: effectiveBranch,
      filePath: effectiveFilePath,
      autoSync: parsed.autoSync !== undefined ? parsed.autoSync : (hasAnyToken || true),
      lastSyncedAt: parsed.lastSyncedAt,
      lastCommitSha: parsed.lastCommitSha,
      lastCommitUrl: parsed.lastCommitUrl,
    };
  } catch (e) {
    console.error('Error reading github config:', e);
  }
  return DEFAULT_GITHUB_CONFIG;
}

export function saveGitHubConfig(config: Partial<GitHubConfig>): GitHubConfig {
  try {
    const current = getGitHubConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving github config:', e);
    return getGitHubConfig();
  }
}

/**
 * Generates the complete, cleanly formatted TypeScript source code for csjmuCampusData.ts
 * containing all current locations, faculty members, courses, events, pathfinding nodes and edges.
 */
export function generateCampusDataTsFile(
  locations: CampusLocation[],
  facultyList: FacultyMember[],
  coursesList: CourseDepartmentMapping[],
  adminPasswordHash = '',
  eventsList: CampusEvent[] = []
): string {
  const cleanLocations = locations.map((loc) => ({
    id: loc.id,
    title: loc.title,
    hindiTitle: loc.hindiTitle || loc.title,
    category: loc.category,
    coordinates: loc.coordinates,
    block: loc.block || 'Campus Block',
    floor: loc.floor || 'Ground Floor',
    roomNumber: loc.roomNumber || undefined,
    image: loc.image || undefined,
    description: loc.description || `${loc.title} at CSJM University campus.`,
    hindiDescription: loc.hindiDescription || `${loc.hindiTitle || loc.title} - छत्रपति शाहू जी महाराज विश्वविद्यालय कानपुर`,
    facilities: loc.facilities || ['Wi-Fi', 'Water Cooler'],
    popularSearchTerms: loc.popularSearchTerms || undefined,
    coursesOffered: loc.coursesOffered || undefined,
    isCustom: loc.isCustom ? true : undefined,
    addedBy: loc.addedBy || undefined,
    createdAt: loc.createdAt || undefined,
  }));

  const cleanFaculty = facultyList.map((f) => ({
    id: f.id,
    name: f.name,
    hindiName: f.hindiName || f.name,
    designation: f.designation,
    department: f.department,
    departmentId: f.departmentId,
    cabinRoom: f.cabinRoom,
    floor: f.floor,
    buildingName: f.buildingName,
    buildingId: f.buildingId,
    email: f.email,
    phone: f.phone,
    officeHours: f.officeHours,
    subjects: f.subjects || [],
    notes: f.notes || undefined,
    isCustom: f.isCustom ? true : undefined,
    addedBy: f.addedBy || undefined,
  }));

  const cleanCourses = coursesList.map((c) => ({
    courseId: c.courseId,
    courseName: c.courseName,
    hindiName: c.hindiName || c.courseName,
    degreeType: c.degreeType,
    departmentName: c.departmentName,
    departmentLocationId: c.departmentLocationId,
    block: c.block,
    floor: c.floor,
    hodName: c.hodName,
    hodCabin: c.hodCabin,
    recommendedGate: c.recommendedGate,
    recommendedGateId: c.recommendedGateId,
    keyRooms: c.keyRooms || [],
    tags: c.tags || [],
    description: c.description || undefined,
    hindiDescription: c.hindiDescription || undefined,
    coursesOffered: c.coursesOffered || undefined,
  }));

  const cleanEvents = (eventsList && eventsList.length > 0 ? eventsList : CAMPUS_EVENTS).map((e) => ({
    id: e.id,
    title: e.title,
    hindiTitle: e.hindiTitle || undefined,
    description: e.description,
    hindiDescription: e.hindiDescription || undefined,
    category: e.category,
    posterImage: e.posterImage || undefined,
    startDate: e.startDate,
    endDate: e.endDate,
    time: e.time,
    venue: e.venue,
    venueLocationId: e.venueLocationId || undefined,
    organizer: e.organizer,
    contactPhone: e.contactPhone || undefined,
    contactEmail: e.contactEmail || undefined,
    registrationUrl: e.registrationUrl || undefined,
    submittedByStudentName: e.submittedByStudentName || undefined,
    studentRollNo: e.studentRollNo || undefined,
    studentCourseBranch: e.studentCourseBranch || undefined,
    studentMobile: e.studentMobile || undefined,
    status: e.status,
    isLive: e.isLive !== false,
    rejectionReason: e.rejectionReason || undefined,
    approvedAt: e.approvedAt || undefined,
    createdAt: e.createdAt || Date.now(),
    likesCount: e.likesCount || 0,
    isCustom: e.isCustom ? true : undefined,
  }));

  return `import { CampusLocation, FacultyMember, RouteNode, RouteEdge, CourseDepartmentMapping, CampusEvent } from '../types';

/**
 * CSJM UNIVERSITY KANPUR - CAMPUS GIS & NAVIGATION DATASET
 * Auto-synced and generated by CSJMU Admin & Campus Navigator Portal
 * Last Updated: ${new Date().toISOString()}
 */

export const CSJMU_CENTER: [number, number] = ${JSON.stringify(CSJMU_CENTER)};

export const CAMPUS_BOUNDS: [[number, number], [number, number]] = ${JSON.stringify(CAMPUS_BOUNDS)};

export const CAMPUS_LOCATIONS: CampusLocation[] = ${JSON.stringify(cleanLocations, null, 2)};

export const INITIAL_FACULTY_MEMBERS: FacultyMember[] = ${JSON.stringify(cleanFaculty, null, 2)};

export const CSJMU_COURSES: CourseDepartmentMapping[] = ${JSON.stringify(cleanCourses, null, 2)};

export const CAMPUS_EVENTS: CampusEvent[] = ${JSON.stringify(cleanEvents, null, 2)};

export const CAMPUS_NODES: RouteNode[] = ${JSON.stringify(CSJMU_NODES, null, 2)};

export const CAMPUS_EDGES: RouteEdge[] = ${JSON.stringify(CSJMU_EDGES, null, 2)};

// Aliases for compatibility
export const CSJMU_LOCATIONS = CAMPUS_LOCATIONS;
export const CSJMU_FACULTY = INITIAL_FACULTY_MEMBERS;
export const CSJMU_EVENTS = CAMPUS_EVENTS;
export const CSJMU_NODES = CAMPUS_NODES;
export const CSJMU_EDGES = CAMPUS_EDGES;
`;
}

/**
 * Generates JSON backup data
 */
export function generateLocationsJson(
  locations: CampusLocation[],
  facultyList: FacultyMember[],
  coursesList: CourseDepartmentMapping[],
  eventsList: CampusEvent[] = []
): string {
  return JSON.stringify(
    {
      university: 'Chhatrapati Shahu Ji Maharaj University, Kanpur (CSJMU)',
      generatedAt: new Date().toISOString(),
      stats: {
        totalLocations: locations.length,
        totalFaculty: facultyList.length,
        totalCourses: coursesList.length,
        totalEvents: eventsList.length,
      },
      locations,
      faculty: facultyList,
      courses: coursesList,
      events: eventsList,
    },
    null,
    2
  );
}

export interface SyncResponse {
  success: boolean;
  message: string;
  commitSha?: string;
  commitUrl?: string;
  error?: string;
}

/**
 * Pushes updated file content to GitHub repo via backend API (Express / Vercel) or direct GitHub API.
 * Uses GITHUB_TOKEN set in Vercel environment variables automatically.
 */
export async function pushToGitHub(
  config: GitHubConfig,
  content: string,
  commitMessage?: string
): Promise<SyncResponse> {
  const repo = config.repo?.trim() || DEFAULT_GITHUB_CONFIG.repo;
  const branch = config.branch?.trim() || 'main';
  const filePath = config.filePath?.trim() || 'src/data/csjmuCampusData.ts';
  const message = commitMessage || `Update CSJMU campus data [${new Date().toISOString()}]`;

  // Token is intentionally NOT sent. /api/github/push reads GITHUB_TOKEN from server/Vercel.
  // We attach the admin authorization token to protect against unauthorized pushes.
  try {
    const adminHeaders = getAdminAuthHeaders();
    const res = await fetch('/api/github/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...adminHeaders,
      },
      body: JSON.stringify({ repo, branch, filePath, content, commitMessage: message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || data.error || `Server push failed (${res.status})`, error: data.error };
    }
    saveGitHubConfig({ lastSyncedAt: new Date().toISOString(), lastCommitSha: data.commitSha, lastCommitUrl: data.commitUrl });
    return { success: true, message: data.message || 'Successfully pushed to GitHub.', commitSha: data.commitSha, commitUrl: data.commitUrl };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Could not reach the GitHub server endpoint.', error: 'NETWORK_ERROR' };
  }
}

/**
 * Tests connection to GitHub with the provided token and repo,
 * testing server/Vercel environment variables first.
 */
export async function testGitHubConnection(config: GitHubConfig): Promise<{ success: boolean; message: string; repoInfo?: any }> {
  try {
    const res = await fetch('/api/github/test', { method: 'GET', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return data;
    return { success: false, message: data.message || data.error || `Server test failed (${res.status})` };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Could not reach the GitHub server endpoint.' };
  }
}

/**
 * Downloads a generated file directly in the user's browser as a file download.
 */
export function downloadCampusDataFile(content: string, filename = 'csjmuCampusData.ts'): void {
  try {
    const blob = new Blob([content], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Download file error:', e);
  }
}

/**
 * Auto-sync trigger that runs if auto-sync is enabled in GitHub settings
 */
export async function triggerAutoSyncIfEnabled(
  locations: CampusLocation[],
  facultyList: FacultyMember[],
  coursesList: CourseDepartmentMapping[],
  eventsList: CampusEvent[] = []
): Promise<void> {
  const config = getGitHubConfig();
  if (config.autoSync && (config.token || isGitHubConfigured()) && config.repo) {
    try {
      const content = generateCampusDataTsFile(locations, facultyList, coursesList, '', eventsList);
      await pushToGitHub(config, content, 'Auto-sync campus GIS data update [CSJMU Admin]');
    } catch (e) {
      console.warn('Background auto-sync to GitHub error:', e);
    }
  }
}


export interface RemoteCampusData {
  locations: CampusLocation[];
  faculty: FacultyMember[];
  courses: CourseDepartmentMapping[];
  events?: CampusEvent[];
  adminPasswordHash?: string;
  updatedAt?: string;
}

/**
 * Fetch the latest generated campus dataset directly from GitHub.
 * This intentionally bypasses the browser/service-worker cache so other phones
 * can see admin changes within a few seconds without reinstalling the app.
 */
export async function fetchLatestCampusData(config: GitHubConfig): Promise<RemoteCampusData | null> {
  try {
    // Private repositories cannot be read from raw.githubusercontent.com without auth.
    // The Vercel endpoint reads the private file using GITHUB_TOKEN server-side.
    const res = await fetch('/api/github/data?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = await res.json();
    if (!payload?.success || typeof payload.source !== 'string') return null;
    const source = payload.source;

    const extractJson = (exportName: string): unknown => {
      const marker = `export const ${exportName}`;
      const markerIndex = source.indexOf(marker);
      if (markerIndex < 0) throw new Error(`Missing ${exportName}`);
      const equalsIndex = source.indexOf('=', markerIndex);
      if (equalsIndex < 0) throw new Error(`Invalid ${exportName}`);
      let start = equalsIndex + 1;
      while (/\s/.test(source[start] || '')) start++;
      const open = source[start];
      const close = open === '[' ? ']' : open === '{' ? '}' : '';
      if (!close) {
        const semi = source.indexOf(';', start);
        return JSON.parse(source.slice(start, semi > start ? semi : source.length).trim());
      }
      let depth = 0, inString = false, escaped = false;
      for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') inString = false;
          continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) return JSON.parse(source.slice(start, i + 1));
        }
      }
      throw new Error(`Could not parse ${exportName}`);
    };

    let events: CampusEvent[] = [];
    try { events = (extractJson('CAMPUS_EVENTS') as CampusEvent[]) || []; } catch { events = []; }
    return {
      locations: extractJson('CAMPUS_LOCATIONS') as CampusLocation[],
      faculty: extractJson('INITIAL_FACULTY_MEMBERS') as FacultyMember[],
      courses: extractJson('CSJMU_COURSES') as CourseDepartmentMapping[],
      events,
      adminPasswordHash: '',
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('Latest GitHub campus data fetch failed:', e);
    return null;
  }
}
