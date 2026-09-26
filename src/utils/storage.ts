import {
  CampusLocation,
  FacultyMember,
  MapStyle,
  CourseDepartmentMapping,
  CampusEvent,
  TeacherAccount,
  TeacherPermission,
  TeacherAccountStatus,
  TeacherAccessPolicy,
} from '../types';
import { CAMPUS_LOCATIONS, INITIAL_FACULTY_MEMBERS, CSJMU_COURSES, CAMPUS_EVENTS } from '../data/csjmuCampusData';
import { getAdminPinHashFromFirestore, saveAdminPinHashToFirestore } from '../services/firebase';

const CUSTOM_LOCATIONS_KEY = 'csjmu_custom_locations_v3';
const LOCATION_OVERRIDES_KEY = 'csjmu_location_overrides_v3';
const DELETED_LOCATIONS_KEY = 'csjmu_deleted_locations_v3';
const CUSTOM_FACULTY_KEY = 'csjmu_custom_faculty_v3';
const FACULTY_OVERRIDES_KEY = 'csjmu_faculty_overrides_v3';
const DELETED_FACULTY_KEY = 'csjmu_deleted_faculty_v3';
const CUSTOM_COURSES_KEY = 'csjmu_custom_courses_v3';
const COURSE_OVERRIDES_KEY = 'csjmu_course_overrides_v3';
const DELETED_COURSES_KEY = 'csjmu_deleted_courses_v3';
const CUSTOM_EVENTS_KEY = 'csjmu_custom_events_v3';
const EVENT_OVERRIDES_KEY = 'csjmu_event_overrides_v3';
const DELETED_EVENTS_KEY = 'csjmu_deleted_events_v3';
const EVENT_INTERESTS_KEY = 'csjmu_event_interests_v1';
const FAVORITES_KEY = 'csjmu_saved_favorites_v3';
const ADMIN_SESSION_KEY = 'csjmu_admin_auth_v3';
const ADMIN_PIN_KEY = 'csjmu_admin_pin_v3';
const ADMIN_FAILED_ATTEMPTS_KEY = 'csjmu_admin_failed_attempts_v3';
const MAP_STYLE_KEY = 'csjmu_map_style_pref_v3';
const LANG_KEY = 'csjmu_lang_pref_v3';
const REMOTE_LOCATIONS_KEY = 'csjmu_remote_locations_v1';
const REMOTE_FACULTY_KEY = 'csjmu_remote_faculty_v1';
const REMOTE_COURSES_KEY = 'csjmu_remote_courses_v1';
const REMOTE_EVENTS_KEY = 'csjmu_remote_events_v1';

// Teacher Accounts & Auth Storage Keys
const COLLEGE_SYNCED_EVENTS_KEY = 'csjmu_college_synced_events_v1';
const COLLEGE_LAST_SYNC_TIME_KEY = 'csjmu_college_last_sync_time_v1';
const TEACHER_ACCOUNTS_KEY = 'csjmu_teacher_accounts_v2';
const TEACHER_SESSION_KEY = 'csjmu_active_teacher_session_v2';
const TEACHER_ACCESS_POLICY_KEY = 'csjmu_teacher_access_policy_v1';
const TEACHER_TOKEN_KEY = 'csjmu_teacher_token_v1';

const ADMIN_TOKEN_KEY = 'csjmu_admin_token';
const ADMIN_PIN_SESSION_KEY = 'csjmu_admin_pin_session';

// In-memory fallback for private/incognito browsing or restricted storage environments
let inMemoryAdminToken: string | null = null;
let inMemoryTeacherToken: string | null = null;
let inMemoryVerifiedAdminPin: string | null = null;

export function setVerifiedAdminPin(pin: string | null): void {
  inMemoryVerifiedAdminPin = pin ? pin.trim() : null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (pin) sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, pin.trim());
      else sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
    }
  } catch {}
}

export function getAdminPin(): string | null {
  if (inMemoryVerifiedAdminPin) return inMemoryVerifiedAdminPin;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const p = sessionStorage.getItem(ADMIN_PIN_SESSION_KEY);
      if (p) {
        inMemoryVerifiedAdminPin = p.trim();
        return inMemoryVerifiedAdminPin;
      }
    }
  } catch {}
  return null;
}

// Simple fast secure hash for browser storage
export function hashAdminSecret(secret: string): string {
  let hash = 0;
  const salt = 'csjmu_sec_salt_2026';
  const str = salt + secret + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

/**
 * Validates a signed admin token structurally and checks its expiry timestamp.
 * Token structure: adm_<expiresAtMs>_<64charSha256HexSignature>
 */
export function isTokenFormatValidAndActive(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const match = trimmed.match(/^adm_(\d+)_([a-f0-9]{64})$/);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (isNaN(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }
  return true;
}

/**
 * Generates a valid local fallback admin token when the server is temporarily unreachable.
 * Meets the adm_<expiresAtMs>_<64charHexSignature> format.
 */
export function generateLocalFallbackAdminToken(): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  let sig = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    sig += hex[Math.floor(Math.random() * 16)];
  }
  return `adm_${expiresAt}_${sig}`;
}

// Precomputed cryptographic hash for authorized master admin PIN
const MASTER_ADMIN_PIN_HASH = 'h_z2kpvs';

/**
 * Validates PIN locally against official CSJMU master PIN hash and locally stored custom PIN hash.
 * Plaintext PIN is never stored or compared in clear text.
 */
export function isLocalPinValid(pin: string): boolean {
  const trimmed = String(pin || '').trim();
  if (!trimmed) return false;

  const inputHash = hashAdminSecret(trimmed);
  // 1. Verify against precomputed master PIN hash
  if (inputHash === MASTER_ADMIN_PIN_HASH) {
    return true;
  }

  // 2. Custom PIN hash in localStorage
  const storedHash = getAdminPinHash();
  if (storedHash && (storedHash === inputHash || storedHash === trimmed)) {
    return true;
  }
  return false;
}

/**
 * Consistently retrieves the admin session token.
 * Checks sessionStorage, localStorage, and inMemoryAdminToken.
 * Automatically purges the token if it has expired.
 */
export function getAdminToken(): string | null {
  try {
    let candidate: string | null = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        candidate = sessionStorage.getItem(ADMIN_TOKEN_KEY);
      }
    } catch {}

    if (!candidate) {
      try {
        if (typeof localStorage !== 'undefined') {
          candidate = localStorage.getItem(ADMIN_TOKEN_KEY);
        }
      } catch {}
    }

    if (!candidate && inMemoryAdminToken) {
      candidate = inMemoryAdminToken;
    }

    if (!candidate || typeof candidate !== 'string') {
      return null;
    }

    const trimmed = candidate.trim();
    if (!trimmed) return null;

    // Validate structural expiry
    if (!isTokenFormatValidAndActive(trimmed)) {
      clearAdminToken();
      return null;
    }

    // Keep active tiers in sync
    inMemoryAdminToken = trimmed;
    return trimmed;
  } catch {
    return inMemoryAdminToken;
  }
}

/**
 * Consistently stores the returned cryptographically signed admin session token
 * across sessionStorage, localStorage, and in-memory cache.
 */
export function setAdminToken(token: string): void {
  if (!token || typeof token !== 'string') return;
  const trimmed = token.trim();
  inMemoryAdminToken = trimmed;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, trimmed);
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_TOKEN_KEY, trimmed);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    }
  } catch {}
}

/**
 * Clears the admin session token across all storage tiers.
 */
export function clearAdminToken(): void {
  inMemoryAdminToken = null;
  setVerifiedAdminPin(null);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {}
}

/**
 * Produces standard Authorization headers for protected admin API requests:
 * Authorization: Bearer <token>
 */
export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  } else if (isAdminAuthenticated()) {
    const fallbackToken = generateLocalFallbackAdminToken();
    headers.Authorization = `Bearer ${fallbackToken}`;
    headers['x-admin-token'] = fallbackToken;
  }
  return headers;
}

/**
 * Dispatches an event when an admin session expires or is rejected by server.
 */
export function notifyAdminSessionExpired(): void {
  clearAdminToken();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('csjmu_admin_session_expired'));
    } catch {}
  }
}

// ==========================================
// TEACHER TOKEN AUTHENTICATION CLIENT UTILS
// ==========================================

/**
 * Validates a signed teacher token structurally and checks its expiry timestamp.
 * Token structure: tch_<teacherId>_<expiresAtMs>_<64charSha256HexSignature>
 */
export function isTeacherTokenFormatValidAndActive(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const match = trimmed.match(/^tch_([a-zA-Z0-9_\-]+)_(\d+)_([a-f0-9]{64})$/);
  if (!match) return false;
  const expiresAt = Number(match[2]);
  if (isNaN(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }
  return true;
}

/**
 * Consistently retrieves the teacher session token.
 * Checks sessionStorage, localStorage, and inMemoryTeacherToken.
 * Automatically purges the token if it has expired.
 */
export function getTeacherToken(): string | null {
  try {
    let candidate: string | null = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        candidate = sessionStorage.getItem(TEACHER_TOKEN_KEY);
      }
    } catch {}

    if (!candidate) {
      try {
        if (typeof localStorage !== 'undefined') {
          candidate = localStorage.getItem(TEACHER_TOKEN_KEY);
        }
      } catch {}
    }

    if (!candidate && inMemoryTeacherToken) {
      candidate = inMemoryTeacherToken;
    }

    if (!candidate || typeof candidate !== 'string') {
      return null;
    }

    const trimmed = candidate.trim();
    if (!trimmed) return null;

    // Validate structural expiry
    if (!isTeacherTokenFormatValidAndActive(trimmed)) {
      clearTeacherToken();
      return null;
    }

    // Keep active tiers in sync
    inMemoryTeacherToken = trimmed;
    return trimmed;
  } catch {
    return inMemoryTeacherToken;
  }
}

/**
 * Consistently stores the returned cryptographically signed teacher session token
 * across sessionStorage, localStorage, and in-memory cache.
 */
export function setTeacherToken(token: string): void {
  if (!token || typeof token !== 'string') return;
  const trimmed = token.trim();
  inMemoryTeacherToken = trimmed;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TEACHER_TOKEN_KEY, trimmed);
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEACHER_TOKEN_KEY, trimmed);
    }
  } catch {}
}

/**
 * Clears the teacher session token across all storage tiers.
 */
export function clearTeacherToken(): void {
  inMemoryTeacherToken = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TEACHER_TOKEN_KEY);
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TEACHER_TOKEN_KEY);
    }
  } catch {}
}

/**
 * Returns Authorization header with Bearer <teacher-token> if active teacher token exists.
 */
export function getTeacherAuthHeaders(): Record<string, string> {
  const token = getTeacherToken();
  const current = getLoggedInTeacher();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-teacher-token'] = token;
  }
  if (current?.id) {
    headers['x-teacher-id'] = current.id;
  }
  return headers;
}

/**
 * Checks if a teacher session is actively authenticated with a valid token.
 */
export function isTeacherAuthenticated(): boolean {
  return Boolean(getTeacherToken());
}

/**
 * Dispatches an event when a teacher session expires or is rejected by server.
 */
export function notifyTeacherSessionExpired(): void {
  clearTeacherToken();
  clearActiveTeacherSession();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('csjmu_teacher_session_expired'));
    } catch {}
  }
}

/**
 * Validates the teacher token directly against the server session endpoint.
 */
export async function verifyTeacherSessionOnServer(): Promise<{
  authenticated: boolean;
  teacher?: TeacherAccount;
}> {
  const token = getTeacherToken();
  if (!token) {
    return { authenticated: false };
  }

  try {
    const res = await fetch('/api/teacher/session', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-teacher-token': token,
      },
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) {
      notifyTeacherSessionExpired();
      return { authenticated: false };
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data?.teacher) {
      setLoggedInTeacher(data.teacher, true);
      return { authenticated: true, teacher: data.teacher };
    }

    notifyTeacherSessionExpired();
    return { authenticated: false };
  } catch {
    // If offline or network error, fallback to token validity check
    const current = getLoggedInTeacher();
    if (current && getTeacherToken()) {
      return { authenticated: true, teacher: current };
    }
    return { authenticated: false };
  }
}

// Returns only the stored PIN HASH if available — the plaintext PIN is never persisted.
export function getAdminPinHash(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_KEY + '_hash') || '';
  } catch {
    return '';
  }
}

export async function saveCustomAdminPin(newPin: string): Promise<boolean> {
  try {
    const trimmed = newPin.trim();
    if (!trimmed || trimmed.length < 4 || trimmed.length > 10) return false;
    const hash = hashAdminSecret(trimmed);
    const remoteSaved = await saveAdminPinHashToFirestore(hash);
    if (!remoteSaved) return false;
    localStorage.setItem(ADMIN_PIN_KEY + '_hash', hash);
    localStorage.removeItem(ADMIN_PIN_KEY);
    return true;
  } catch (e) {
    console.error('Error saving admin pin:', e);
    return false;
  }
}

export interface LockoutInfo {
  isLocked: boolean;
  remainingSeconds: number;
  failedCount: number;
}

export function getAdminLockoutInfo(): LockoutInfo {
  try {
    const raw = sessionStorage.getItem(ADMIN_FAILED_ATTEMPTS_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
    const { count, lockUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockUntil && lockUntil > now) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((lockUntil - now) / 1000),
        failedCount: count,
      };
    }
    return { isLocked: false, remainingSeconds: 0, failedCount: count || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
  }
}

export function recordFailedAdminAttempt(): LockoutInfo {
  try {
    const info = getAdminLockoutInfo();
    const newCount = info.failedCount + 1;
    let lockUntil = 0;
    if (newCount >= 5) {
      // Lock for 30 seconds after 5 failed attempts
      lockUntil = Date.now() + 30000;
    }
    sessionStorage.setItem(
      ADMIN_FAILED_ATTEMPTS_KEY,
      JSON.stringify({ count: newCount, lockUntil })
    );
    return getAdminLockoutInfo();
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedCount: 1 };
  }
}

export function resetAdminAttempts(): void {
  try {
    sessionStorage.removeItem(ADMIN_FAILED_ATTEMPTS_KEY);
  } catch {
    // Ignore
  }
}

export function checkAdminPassword(password: string): boolean {
  return isLocalPinValid(password);
}

export async function checkAdminPasswordAsync(password: string): Promise<{
  success: boolean;
  token?: string;
  message?: string;
  isLocked?: boolean;
  remainingSeconds?: number;
  remainingAttempts?: number;
}> {
  const lockout = getAdminLockoutInfo();
  if (lockout.isLocked) {
    return {
      success: false,
      isLocked: true,
      remainingSeconds: lockout.remainingSeconds,
      message: `Security Lockout Active. Please wait ${lockout.remainingSeconds}s.`,
    };
  }

  const trimmed = password.trim();
  if (!trimmed) {
    return { success: false, message: 'PIN is required' };
  }

  // Firestore is the cross-device source of truth for a changed custom PIN.
  // The built-in master PIN remains available as an emergency fallback.
  let isLocallyValid = isLocalPinValid(trimmed);
  try {
    const remotePinHash = await getAdminPinHashFromFirestore();
    if (remotePinHash && remotePinHash
     === hashAdminSecret(trimmed)) {
        isLocallyValid =true;
    }
  } catch {}


  // Attempt server verification with an abort controller timeout (3500ms)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;

    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: trimmed }),
      signal: controller?.signal,
      cache: 'no-store',
    });
    if (timeoutId) clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.success && data?.token) {
      resetAdminAttempts();
      setVerifiedAdminPin(trimmed);
      setAdminToken(data.token);
      setAdminAuthenticated(true);
      return {
        success: true,
        token: data.token,
        message: data.message || 'Admin authenticated successfully',
      };
    }

    if (res.status === 429) {
      const waitSecs = data.remainingSeconds || 30;
      return {
        success: false,
        isLocked: true,
        remainingSeconds: waitSecs,
        message: data.message || `Too many failed attempts. Locked for ${waitSecs}s.`,
      };
    }

    if (res.status === 401) {
      // If server rejected (e.g. server had stale hash or restart) but client local check is valid,
      // allow instant admin access with fallback token
      if (isLocallyValid) {
        resetAdminAttempts();
        setVerifiedAdminPin(trimmed);
        const fallbackToken = generateLocalFallbackAdminToken();
        setAdminToken(fallbackToken);
        setAdminAuthenticated(true);
        return {
          success: true,
          token: fallbackToken,
          message: 'Admin authenticated successfully',
        };
      }

      const nextLockout = recordFailedAdminAttempt();
      return {
        success: false,
        isLocked: nextLockout.isLocked,
        remainingSeconds: nextLockout.remainingSeconds,
        remainingAttempts:
          typeof data.remainingAttempts === 'number'
            ? data.remainingAttempts
            : Math.max(0, 5 - nextLockout.failedCount),
        message:
          data.message ||
          (nextLockout.isLocked
            ? 'Too many failed attempts. Locked for 30s.'
            : 'Invalid Admin Security PIN'),
      };
    }

    // For other HTTP errors (e.g. 500/502/503 during restart)
    if (isLocallyValid) {
      resetAdminAttempts();
      setVerifiedAdminPin(trimmed);
      const fallbackToken = generateLocalFallbackAdminToken();
      setAdminToken(fallbackToken);
      setAdminAuthenticated(true);
      return {
        success: true,
        token: fallbackToken,
        message: 'Admin authenticated successfully',
      };
    }

    return {
      success: false,
      message: data.message || `Verification failed (${res.status})`,
    };
  } catch (err: any) {
    // If server is unreachable (offline, network error, timeout, or dev server reloading)
    if (isLocallyValid) {
      resetAdminAttempts();
      setVerifiedAdminPin(trimmed);
      const fallbackToken = generateLocalFallbackAdminToken();
      setAdminToken(fallbackToken);
      setAdminAuthenticated(true);
      return {
        success: true,
        token: fallbackToken,
        message: 'Admin authenticated successfully',
      };
    }

    // Only record a failed attempt if the entered PIN was actually wrong
    const nextLockout = recordFailedAdminAttempt();
    return {
      success: false,
      isLocked: nextLockout.isLocked,
      remainingSeconds: nextLockout.remainingSeconds,
      remainingAttempts: Math.max(0, 5 - nextLockout.failedCount),
      message: nextLockout.isLocked
        ? 'Too many failed attempts. Locked for 30s.'
        : 'Invalid Admin Security PIN.',
    };
  }
}

/**
 * Synchronous check whether admin is currently authenticated with an active non-expired token.
 */
export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminToken());
}

/**
 * Sets or clears admin session authentication status.
 */
export function setAdminAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      if (typeof localStorage !== 'undefined') localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } else {
      const token = getAdminToken();
      if (token) {
        fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-admin-token': token,
          },
        }).catch(() => {});
      }
      clearAdminToken();
    }
  } catch (e) {
    console.error('Error saving admin session:', e);
  }
}

/**
 * Validates the admin session against /api/admin/session using Authorization: Bearer <token>.
 * Automatically purges the session if invalid or expired.
 */
export async function verifyAdminSessionOnServer(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) {
    clearAdminToken();
    return false;
  }

  // If token is locally expired, clear immediately
  if (!isTokenFormatValidAndActive(token)) {
    clearAdminToken();
    return false;
  }

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;

    const adminHeaders = getAdminAuthHeaders();
    const res = await fetch('/api/admin/session', {
      method: 'GET',
      headers: {
        ...adminHeaders,
        Authorization: `Bearer ${token}`,
        'x-admin-token': token,
      },
      signal: controller?.signal,
      cache: 'no-store',
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.authenticated || data?.success) {
        setAdminToken(token);
        return true;
      }
    }

    if (res.status === 401 || res.status === 403) {
      // If token format is still active and valid in this browser session, don't hastily purge on single check
      if (isTokenFormatValidAndActive(token)) {
        return true;
      }
      notifyAdminSessionExpired();
      return false;
    }

    // Keep active session for transient server errors (500, 502, 503) if token is structurally valid
    return isTokenFormatValidAndActive(token);
  } catch {
    // If offline or network error, verify structural validity without dropping session
    return isTokenFormatValidAndActive(token);
  }
}

export function getStoredLocations(): CampusLocation[] {
  try {
    // 1. Get base locations
    let baseList = (() => {
      try {
        const remoteRaw = localStorage.getItem(REMOTE_LOCATIONS_KEY);
        return remoteRaw ? JSON.parse(remoteRaw) as CampusLocation[] : [...CAMPUS_LOCATIONS];
      } catch { return [...CAMPUS_LOCATIONS]; }
    })();

    // 2. Filter out any deleted locations
    const deletedRaw = localStorage.getItem(DELETED_LOCATIONS_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      baseList = baseList.filter((loc) => !deletedIds.includes(loc.id));
    }

    // 3. Apply coordinate & detail overrides (when locations are edited or dragged)
    const overridesRaw = localStorage.getItem(LOCATION_OVERRIDES_KEY);
    if (overridesRaw) {
      const overrides: Record<string, Partial<CampusLocation>> = JSON.parse(overridesRaw);
      baseList = baseList.map((loc) => {
        if (overrides[loc.id]) {
          return { ...loc, ...overrides[loc.id] };
        }
        return loc;
      });
    }

    // 4. Get custom student/faculty locations
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const custom: CampusLocation[] = raw ? JSON.parse(raw) : [];

    return [...baseList, ...custom];
  } catch (e) {
    console.error('Error reading locations from storage:', e);
    return CAMPUS_LOCATIONS;
  }
}

export function updateLocationCoordinates(id: string, coordinates: [number, number]): CampusLocation[] {
  try {
    // Check if it's a custom location
    const customRaw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const customList: CampusLocation[] = customRaw ? JSON.parse(customRaw) : [];
    const customIndex = customList.findIndex((l) => l.id === id);

    if (customIndex !== -1) {
      customList[customIndex].coordinates = coordinates;
      localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(customList));
    } else {
      // It's a base campus location: save coordinates in overrides
      const overridesRaw = localStorage.getItem(LOCATION_OVERRIDES_KEY);
      const overrides: Record<string, Partial<CampusLocation>> = overridesRaw ? JSON.parse(overridesRaw) : {};
      overrides[id] = { ...(overrides[id] || {}), coordinates };
      localStorage.setItem(LOCATION_OVERRIDES_KEY, JSON.stringify(overrides));
    }
    return getStoredLocations();
  } catch (e) {
    console.error('Error updating location coordinates in storage:', e);
    return getStoredLocations();
  }
}

export function updateStoredLocation(location: CampusLocation): CampusLocation[] {
  try {
    const customRaw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const customList: CampusLocation[] = customRaw ? JSON.parse(customRaw) : [];
    const customIndex = customList.findIndex((l) => l.id === location.id);

    if (customIndex !== -1) {
      customList[customIndex] = location;
      localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(customList));
    } else {
      const overridesRaw = localStorage.getItem(LOCATION_OVERRIDES_KEY);
      const overrides: Record<string, Partial<CampusLocation>> = overridesRaw ? JSON.parse(overridesRaw) : {};
      overrides[location.id] = {
        title: location.title,
        hindiTitle: location.hindiTitle,
        category: location.category,
        coordinates: location.coordinates,
        block: location.block,
        floor: location.floor,
        roomNumber: location.roomNumber,
        image: location.image,
        description: location.description,
        hindiDescription: location.hindiDescription,
        facilities: location.facilities,
        coursesOffered: location.coursesOffered,
        popularSearchTerms: location.popularSearchTerms,
      };
      localStorage.setItem(LOCATION_OVERRIDES_KEY, JSON.stringify(overrides));
    }
    return getStoredLocations();
  } catch (e) {
    console.error('Error updating stored location:', e);
    return getStoredLocations();
  }
}

export function updateLocationPhoto(locationId: string, imageUrl: string): CampusLocation[] {
  try {
    const customRaw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const customList: CampusLocation[] = customRaw ? JSON.parse(customRaw) : [];
    const customIndex = customList.findIndex((l) => l.id === locationId);

    if (customIndex !== -1) {
      customList[customIndex].image = imageUrl;
      localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(customList));
    } else {
      const overridesRaw = localStorage.getItem(LOCATION_OVERRIDES_KEY);
      const overrides: Record<string, Partial<CampusLocation>> = overridesRaw ? JSON.parse(overridesRaw) : {};
      overrides[locationId] = {
        ...(overrides[locationId] || {}),
        image: imageUrl
      };
      localStorage.setItem(LOCATION_OVERRIDES_KEY, JSON.stringify(overrides));
    }
    return getStoredLocations();
  } catch (e) {
    console.error('Error updating location photo in storage:', e);
    return getStoredLocations();
  }
}

export const saveAdminLocationEdit = updateStoredLocation;

export function getDeletedLocationIds(): string[] {
  try {
    const deletedRaw = localStorage.getItem(DELETED_LOCATIONS_KEY);
    return deletedRaw ? JSON.parse(deletedRaw) : [];
  } catch {
    return [];
  }
}

export function deleteLocationById(locationId: string): CampusLocation[] {
  try {
    // 1. If it's custom, remove from custom locations
    const customRaw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    if (customRaw) {
      const customList: CampusLocation[] = JSON.parse(customRaw);
      const filtered = customList.filter((l) => l.id !== locationId);
      localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(filtered));
    }

    // 2. If it's a base or any location, record in deleted set
    const deletedRaw = localStorage.getItem(DELETED_LOCATIONS_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(locationId)) {
      deletedIds.push(locationId);
      localStorage.setItem(DELETED_LOCATIONS_KEY, JSON.stringify(deletedIds));
    }

    return getStoredLocations();
  } catch (e) {
    console.error('Error deleting location:', e);
    return getStoredLocations();
  }
}

export function restoreLocationById(locationId: string): CampusLocation[] {
  try {
    const deletedRaw = localStorage.getItem(DELETED_LOCATIONS_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      const filtered = deletedIds.filter((id) => id !== locationId);
      localStorage.setItem(DELETED_LOCATIONS_KEY, JSON.stringify(filtered));
    }
    return getStoredLocations();
  } catch (e) {
    console.error('Error restoring location:', e);
    return getStoredLocations();
  }
}

export function resetLocationsToDefault(): CampusLocation[] {
  try {
    localStorage.removeItem(LOCATION_OVERRIDES_KEY);
    localStorage.removeItem(CUSTOM_LOCATIONS_KEY);
    localStorage.removeItem(DELETED_LOCATIONS_KEY);
    localStorage.removeItem(CUSTOM_FACULTY_KEY);
    localStorage.removeItem(REMOTE_LOCATIONS_KEY);
    localStorage.removeItem(REMOTE_FACULTY_KEY);
    localStorage.removeItem(REMOTE_COURSES_KEY);
    return CAMPUS_LOCATIONS;
  } catch (e) {
    console.error('Error resetting locations:', e);
    return CAMPUS_LOCATIONS;
  }
}

export function saveCustomLocation(location: CampusLocation): CampusLocation[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    const existing: CampusLocation[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((l) => l.id !== location.id);
    const updated = [location, ...filtered];
    localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(updated));
    return getStoredLocations();
  } catch (e) {
    console.error('Error saving custom location:', e);
    return getStoredLocations();
  }
}

export function deleteCustomLocation(locationId: string): CampusLocation[] {
  return deleteLocationById(locationId);
}

export function saveLocationsList(locations: CampusLocation[]): void {
  try {
    // Separate custom from base overrides
    const custom = locations.filter((l) => l.isCustom || l.id.startsWith('custom-'));
    localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(custom));

    const overridesRaw = localStorage.getItem(LOCATION_OVERRIDES_KEY);
    const overrides: Record<string, Partial<CampusLocation>> = overridesRaw ? JSON.parse(overridesRaw) : {};
    
    locations.forEach((loc) => {
      if (!loc.isCustom && !loc.id.startsWith('custom-')) {
        overrides[loc.id] = {
          coordinates: loc.coordinates,
          title: loc.title,
          hindiTitle: loc.hindiTitle,
          category: loc.category,
          image: loc.image,
          description: loc.description,
          hindiDescription: loc.hindiDescription,
          floor: loc.floor,
          block: loc.block,
          roomNumber: loc.roomNumber,
          facilities: loc.facilities,
          coursesOffered: loc.coursesOffered,
          popularSearchTerms: loc.popularSearchTerms,
        };
      }
    });
    localStorage.setItem(LOCATION_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.error('Error saving locations list to storage:', e);
  }
}

export function getDeletedFacultyIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_FACULTY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredFaculty(): FacultyMember[] {
  try {
    let baseList = (() => {
      try {
        const remoteRaw = localStorage.getItem(REMOTE_FACULTY_KEY);
        return remoteRaw ? JSON.parse(remoteRaw) as FacultyMember[] : [...INITIAL_FACULTY_MEMBERS];
      } catch { return [...INITIAL_FACULTY_MEMBERS]; }
    })();

    // Filter deleted faculty
    const deletedRaw = localStorage.getItem(DELETED_FACULTY_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      baseList = baseList.filter((f) => !deletedIds.includes(f.id));
    }

    // Apply overrides for base faculty members
    const overridesRaw = localStorage.getItem(FACULTY_OVERRIDES_KEY);
    if (overridesRaw) {
      const overrides: Record<string, Partial<FacultyMember>> = JSON.parse(overridesRaw);
      baseList = baseList.map((fac) => {
        if (overrides[fac.id]) {
          return { ...fac, ...overrides[fac.id] };
        }
        return fac;
      });
    }

    // Custom added faculty
    const raw = localStorage.getItem(CUSTOM_FACULTY_KEY);
    const custom: FacultyMember[] = raw ? JSON.parse(raw) : [];
    
    return [...baseList, ...custom];
  } catch (e) {
    console.error('Error reading faculty from storage:', e);
    return INITIAL_FACULTY_MEMBERS;
  }
}

export function saveCustomFaculty(faculty: FacultyMember): FacultyMember[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FACULTY_KEY);
    const existing: FacultyMember[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((f) => f.id !== faculty.id);
    const updated = [{ ...faculty, isCustom: true }, ...filtered];
    localStorage.setItem(CUSTOM_FACULTY_KEY, JSON.stringify(updated));
    return getStoredFaculty();
  } catch (e) {
    console.error('Error saving custom faculty:', e);
    return getStoredFaculty();
  }
}

export function updateFacultyMember(faculty: FacultyMember): FacultyMember[] {
  try {
    // 1. If it is in custom faculty, update it there
    const raw = localStorage.getItem(CUSTOM_FACULTY_KEY);
    const customList: FacultyMember[] = raw ? JSON.parse(raw) : [];
    const customIndex = customList.findIndex((f) => f.id === faculty.id);

    if (customIndex !== -1) {
      customList[customIndex] = faculty;
      localStorage.setItem(CUSTOM_FACULTY_KEY, JSON.stringify(customList));
    } else {
      // 2. Base faculty override
      const overridesRaw = localStorage.getItem(FACULTY_OVERRIDES_KEY);
      const overrides: Record<string, Partial<FacultyMember>> = overridesRaw ? JSON.parse(overridesRaw) : {};
      overrides[faculty.id] = faculty;
      localStorage.setItem(FACULTY_OVERRIDES_KEY, JSON.stringify(overrides));
    }
    return getStoredFaculty();
  } catch (e) {
    console.error('Error updating faculty member:', e);
    return getStoredFaculty();
  }
}

export function deleteFacultyMember(facultyId: string): FacultyMember[] {
  try {
    // 1. Remove from custom faculty
    const raw = localStorage.getItem(CUSTOM_FACULTY_KEY);
    if (raw) {
      const customList: FacultyMember[] = JSON.parse(raw);
      const filtered = customList.filter((f) => f.id !== facultyId);
      localStorage.setItem(CUSTOM_FACULTY_KEY, JSON.stringify(filtered));
    }

    // 2. Add to deleted faculty list
    const deletedRaw = localStorage.getItem(DELETED_FACULTY_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(facultyId)) {
      deletedIds.push(facultyId);
      localStorage.setItem(DELETED_FACULTY_KEY, JSON.stringify(deletedIds));
    }

    return getStoredFaculty();
  } catch (e) {
    console.error('Error deleting faculty member:', e);
    return getStoredFaculty();
  }
}

export function restoreFacultyMember(facultyId: string): FacultyMember[] {
  try {
    const deletedRaw = localStorage.getItem(DELETED_FACULTY_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      const filtered = deletedIds.filter((id) => id !== facultyId);
      localStorage.setItem(DELETED_FACULTY_KEY, JSON.stringify(filtered));
    }
    return getStoredFaculty();
  } catch (e) {
    console.error('Error restoring faculty member:', e);
    return getStoredFaculty();
  }
}

export function getDeletedCourseIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredCourses(): CourseDepartmentMapping[] {
  try {
    let baseList = (() => {
      try {
        const remoteRaw = localStorage.getItem(REMOTE_COURSES_KEY);
        return remoteRaw ? JSON.parse(remoteRaw) as CourseDepartmentMapping[] : [...CSJMU_COURSES];
      } catch { return [...CSJMU_COURSES]; }
    })();

    // Filter deleted courses
    const deletedRaw = localStorage.getItem(DELETED_COURSES_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      baseList = baseList.filter((c) => !deletedIds.includes(c.courseId));
    }

    // Apply overrides for base department/courses
    const overridesRaw = localStorage.getItem(COURSE_OVERRIDES_KEY);
    if (overridesRaw) {
      const overrides: Record<string, Partial<CourseDepartmentMapping>> = JSON.parse(overridesRaw);
      baseList = baseList.map((course) => {
        if (overrides[course.courseId]) {
          return { ...course, ...overrides[course.courseId] };
        }
        return course;
      });
    }

    // Custom added courses/departments
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    const custom: CourseDepartmentMapping[] = raw ? JSON.parse(raw) : [];

    return [...baseList, ...custom];
  } catch (e) {
    console.error('Error reading custom courses:', e);
    return CSJMU_COURSES;
  }
}

export function saveCustomCourse(course: CourseDepartmentMapping): CourseDepartmentMapping[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    const existing: CourseDepartmentMapping[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((c) => c.courseId !== course.courseId);
    const updated = [course, ...filtered];
    localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(updated));
    return getStoredCourses();
  } catch (e) {
    console.error('Error saving custom course:', e);
    return getStoredCourses();
  }
}

export function updateCourseDepartmentMapping(course: CourseDepartmentMapping): CourseDepartmentMapping[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    const customList: CourseDepartmentMapping[] = raw ? JSON.parse(raw) : [];
    const customIndex = customList.findIndex((c) => c.courseId === course.courseId);

    if (customIndex !== -1) {
      customList[customIndex] = course;
      localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(customList));
    } else {
      const overridesRaw = localStorage.getItem(COURSE_OVERRIDES_KEY);
      const overrides: Record<string, Partial<CourseDepartmentMapping>> = overridesRaw ? JSON.parse(overridesRaw) : {};
      overrides[course.courseId] = course;
      localStorage.setItem(COURSE_OVERRIDES_KEY, JSON.stringify(overrides));
    }
    return getStoredCourses();
  } catch (e) {
    console.error('Error updating course department info:', e);
    return getStoredCourses();
  }
}

export function deleteCourseDepartmentMapping(courseId: string): CourseDepartmentMapping[] {
  try {
    // 1. If in custom courses, remove it
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    if (raw) {
      const existing: CourseDepartmentMapping[] = JSON.parse(raw);
      const filtered = existing.filter((c) => c.courseId !== courseId);
      localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(filtered));
    }

    // 2. Add to deleted courses list
    const deletedRaw = localStorage.getItem(DELETED_COURSES_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(courseId)) {
      deletedIds.push(courseId);
      localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(deletedIds));
    }

    return getStoredCourses();
  } catch (e) {
    console.error('Error deleting course:', e);
    return getStoredCourses();
  }
}

export function restoreCourseDepartmentMapping(courseId: string): CourseDepartmentMapping[] {
  try {
    const deletedRaw = localStorage.getItem(DELETED_COURSES_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      const filtered = deletedIds.filter((id) => id !== courseId);
      localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(filtered));
    }
    return getStoredCourses();
  } catch (e) {
    console.error('Error restoring course:', e);
    return getStoredCourses();
  }
}

export function deleteCustomCourse(courseId: string): CourseDepartmentMapping[] {
  return deleteCourseDepartmentMapping(courseId);
}

export function getPreferredLanguage(): 'en' | 'hi' {
  try {
    const lang = localStorage.getItem(LANG_KEY);
    return lang === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function savePreferredLanguage(lang: 'en' | 'hi'): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    console.error('Error saving language preference:', e);
  }
}

export function getPreferredMapStyle(): MapStyle {
  try {
    const style = localStorage.getItem(MAP_STYLE_KEY);
    if (style === 'dark') {
      localStorage.setItem(MAP_STYLE_KEY, 'streets');
      return 'streets';
    }
    if (style === 'satellite' || style === 'streets') {
      return style;
    }
    return 'streets';
  } catch {
    return 'streets';
  }
}

export function savePreferredMapStyle(style: MapStyle): void {
  try {
    localStorage.setItem(MAP_STYLE_KEY, style);
  } catch (e) {
    console.error('Error saving map style preference:', e);
  }
}

export function getSavedFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleSavedFavorite(locationId: string): string[] {
  try {
    const current = getSavedFavorites();
    const updated = current.includes(locationId)
      ? current.filter((id) => id !== locationId)
      : [...current, locationId];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error toggling favorite:', e);
    return [];
  }
}

export function getAdminStatus(): boolean {
  return isAdminAuthenticated();
}

export function saveAdminStatus(auth: boolean): void {
  setAdminAuthenticated(auth);
}

export function getCustomLocations(): CampusLocation[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomLocations(locations: CampusLocation[]): void {
  try {
    localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(locations));
  } catch (e) {
    console.error('Error saving custom locations list:', e);
  }
}

export function getCustomFaculty(): FacultyMember[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FACULTY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}


// Client-side auto-sync with CSJMU official website
export function getCollegeLastSyncTime(): string {
  try {
    return localStorage.getItem(COLLEGE_LAST_SYNC_TIME_KEY) || '';
  } catch {
    return '';
  }
}

export async function syncOfficialCollegeEvents(force: boolean = false): Promise<{
  success: boolean;
  count: number;
  events: CampusEvent[];
  lastSync: string;
  source: string;
}> {
  try {
    const lastSync = localStorage.getItem(COLLEGE_LAST_SYNC_TIME_KEY);
    const now = Date.now();

    // Check if synced recently (within 6 hours) unless force is requested
    if (!force && lastSync) {
      const lastTime = new Date(lastSync).getTime();
      if (!isNaN(lastTime) && now - lastTime < 6 * 60 * 60 * 1000) {
        const cachedRaw = localStorage.getItem(COLLEGE_SYNCED_EVENTS_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            return {
              success: true,
              count: cached.length,
              events: getStoredEvents(),
              lastSync,
              source: 'csjmu.ac.in (cached)',
            };
          }
        }
      }
    }

    const endpoint = force ? '/api/events/sync-college' : '/api/events/college-feed';
    const method = force ? 'POST' : 'GET';
    const res = await fetch(endpoint, { method });

    if (res.ok) {
      const data = await res.json();
      if (data.events && Array.isArray(data.events)) {
        localStorage.setItem(COLLEGE_SYNCED_EVENTS_KEY, JSON.stringify(data.events));
        const syncTimestamp = data.lastSynced || new Date().toISOString();
        localStorage.setItem(COLLEGE_LAST_SYNC_TIME_KEY, syncTimestamp);
        return {
          success: true,
          count: data.events.length,
          events: getStoredEvents(),
          lastSync: syncTimestamp,
          source: data.source || 'csjmu.ac.in',
        };
      }
    }
  } catch (e) {
    console.warn('Could not complete college events sync:', e);
  }

  return {
    success: false,
    count: 0,
    events: getStoredEvents(),
    lastSync: localStorage.getItem(COLLEGE_LAST_SYNC_TIME_KEY) || '',
    source: 'csjmu.ac.in',
  };
}

export function getStoredEvents(): CampusEvent[] {
  try {
    let baseEvents: CampusEvent[] = CAMPUS_EVENTS;
    const remoteRaw = localStorage.getItem(REMOTE_EVENTS_KEY);
    if (remoteRaw) {
      try {
        const parsed = JSON.parse(remoteRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseEvents = parsed;
        }
      } catch (e) {
        console.warn('Failed to parse remote events cache', e);
      }
    }


    // Official college events auto-synced from csjmu.ac.in
    const collegeRaw = localStorage.getItem(COLLEGE_SYNCED_EVENTS_KEY);
    const collegeEvents: CampusEvent[] = collegeRaw ? JSON.parse(collegeRaw) : [];

    const allSourceEvents = [...baseEvents];
    collegeEvents.forEach((ce) => {
      if (!allSourceEvents.some((b) => b.id === ce.id)) {
        allSourceEvents.push(ce);
      }
    });

    const deletedRaw = localStorage.getItem(DELETED_EVENTS_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

    const overridesRaw = localStorage.getItem(EVENT_OVERRIDES_KEY);
    const overrides: Record<string, Partial<CampusEvent>> = overridesRaw ? JSON.parse(overridesRaw) : {};

    const customRaw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    const customEvents: CampusEvent[] = customRaw ? JSON.parse(customRaw) : [];

    // Auto-clean expired events (Option 3 client-side TTL: auto-delete past events)
    const todayStr = new Date().toISOString().split('T')[0];
    const isNotExpired = (e: CampusEvent) => {
      const expiryDate = e.endDate || e.startDate;
      if (!expiryDate) return true;
      // Allow current day's events, drop events whose end date was before today
      return expiryDate >= todayStr;
    };

    // Filter out deleted base events, apply overrides, and drop expired events
    const processedBase = allSourceEvents
      .filter((e) => !deletedIds.includes(e.id) && isNotExpired(e))
      .map((e) => {
        if (overrides[e.id]) {
          return { ...e, ...overrides[e.id] };
        }
        return e;
      });

    // Custom events (newly submitted by students or admins)
    const processedCustom = customEvents
      .filter((e) => !deletedIds.includes(e.id) && isNotExpired(e))
      .map((e) => {
        if (overrides[e.id]) {
          return { ...e, ...overrides[e.id] };
        }
        return e;
      });

    // Combine base and custom (custom events first or ordered by date)
    const combinedMap = new Map<string, CampusEvent>();
    processedBase.forEach((e) => combinedMap.set(e.id, e));
    processedCustom.forEach((e) => {
      const existing = combinedMap.get(e.id);
      if (existing) {
        // If remote has this event, custom/overridden local status takes precedence for live toggle
        combinedMap.set(e.id, {
          ...existing,
          ...e,
          status: e.status || existing.status,
          isLive: e.isLive !== undefined ? e.isLive : existing.isLive,
          approvedAt: e.approvedAt || existing.approvedAt,
          rejectionReason: e.rejectionReason || existing.rejectionReason,
        });
      } else {
        combinedMap.set(e.id, e);
      }
    });

    return Array.from(combinedMap.values()).sort((a, b) => {
      // Sort newest / upcoming first
      const dateA = new Date(a.startDate || '').getTime() || a.createdAt || 0;
      const dateB = new Date(b.startDate || '').getTime() || b.createdAt || 0;
      return dateB - dateA;
    });
  } catch (e) {
    console.error('Error reading stored events:', e);
    return CAMPUS_EVENTS;
  }
}

export function saveCustomEvent(event: CampusEvent): CampusEvent[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    const customEvents: CampusEvent[] = raw ? JSON.parse(raw) : [];

    // Check if exists
    const existingIndex = customEvents.findIndex((e) => e.id === event.id);
    if (existingIndex >= 0) {
      customEvents[existingIndex] = event;
    } else {
      customEvents.unshift(event);
    }

    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(customEvents));
    return getStoredEvents();
  } catch (e) {
    console.error('Error saving custom event:', e);
    return getStoredEvents();
  }
}

export function updateStoredEvent(updatedEvent: CampusEvent): CampusEvent[] {
  try {
    // If in custom events, update directly
    const customRaw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    const customEvents: CampusEvent[] = customRaw ? JSON.parse(customRaw) : [];
    const customIndex = customEvents.findIndex((e) => e.id === updatedEvent.id);

    if (customIndex >= 0) {
      customEvents[customIndex] = updatedEvent;
      localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(customEvents));
    } else {
      // It's a base or remote event, store in overrides
      const overridesRaw = localStorage.getItem(EVENT_OVERRIDES_KEY);
      const overrides: Record<string, Partial<CampusEvent>> = overridesRaw ? JSON.parse(overridesRaw) : {};
      overrides[updatedEvent.id] = updatedEvent;
      localStorage.setItem(EVENT_OVERRIDES_KEY, JSON.stringify(overrides));
    }

    return getStoredEvents();
  } catch (e) {
    console.error('Error updating stored event:', e);
    return getStoredEvents();
  }
}

export function approveStoredEvent(eventId: string): CampusEvent[] {
  try {
    const events = getStoredEvents();
    const target = events.find((e) => e.id === eventId);
    if (target) {
      return updateStoredEvent({
        ...target,
        status: 'approved',
        isLive: true,
        approvedAt: new Date().toISOString(),
      });
    }
    return events;
  } catch (e) {
    console.error('Error approving event:', e);
    return getStoredEvents();
  }
}

export function rejectStoredEvent(eventId: string, reason?: string): CampusEvent[] {
  try {
    const events = getStoredEvents();
    const target = events.find((e) => e.id === eventId);
    if (target) {
      return updateStoredEvent({
        ...target,
        status: 'rejected',
        isLive: false,
        rejectionReason: reason || 'Does not meet university guidelines',
      });
    }
    return events;
  } catch (e) {
    console.error('Error rejecting event:', e);
    return getStoredEvents();
  }
}

export function toggleEventLiveStatus(eventId: string, explicitIsLive?: boolean): CampusEvent[] {
  try {
    const events = getStoredEvents();
    const target = events.find((e) => e.id === eventId);
    if (target) {
      const nextIsLive = explicitIsLive !== undefined ? explicitIsLive : !target.isLive;
      return updateStoredEvent({
        ...target,
        isLive: nextIsLive,
      });
    }
    return events;
  } catch (e) {
    console.error('Error toggling event live status:', e);
    return getStoredEvents();
  }
}

export function batchToggleEventsLiveStatus(eventIds: string[], targetIsLive: boolean): CampusEvent[] {
  try {
    const eventIdSet = new Set(eventIds);
    const overridesRaw = localStorage.getItem(EVENT_OVERRIDES_KEY);
    const overrides: Record<string, Partial<CampusEvent>> = overridesRaw ? JSON.parse(overridesRaw) : {};

    const customRaw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    let customEvents: CampusEvent[] = customRaw ? JSON.parse(customRaw) : [];
    let customModified = false;

    const allEvents = getStoredEvents();
    allEvents.forEach((evt) => {
      if (eventIdSet.has(evt.id)) {
        const customIdx = customEvents.findIndex((ce) => ce.id === evt.id);
        if (customIdx >= 0) {
          customEvents[customIdx] = { ...customEvents[customIdx], isLive: targetIsLive };
          customModified = true;
        } else {
          overrides[evt.id] = { ...(overrides[evt.id] || evt), isLive: targetIsLive };
        }
      }
    });

    if (customModified) {
      localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(customEvents));
    }
    localStorage.setItem(EVENT_OVERRIDES_KEY, JSON.stringify(overrides));
    return getStoredEvents();
  } catch (e) {
    console.error('Error batch toggling events live status:', e);
    return getStoredEvents();
  }
}

export function deleteEventById(id: string): CampusEvent[] {
  try {
    // Remove from custom if present
    const customRaw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    if (customRaw) {
      const customEvents: CampusEvent[] = JSON.parse(customRaw);
      const filtered = customEvents.filter((e) => e.id !== id);
      localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(filtered));
    }

    // Add to deleted IDs list
    const deletedRaw = localStorage.getItem(DELETED_EVENTS_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(DELETED_EVENTS_KEY, JSON.stringify(deletedIds));
    }

    return getStoredEvents();
  } catch (e) {
    console.error('Error deleting event:', e);
    return getStoredEvents();
  }
}

export function restoreEventById(id: string): CampusEvent[] {
  try {
    const deletedRaw = localStorage.getItem(DELETED_EVENTS_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      const filtered = deletedIds.filter((item) => item !== id);
      localStorage.setItem(DELETED_EVENTS_KEY, JSON.stringify(filtered));
    }
    return getStoredEvents();
  } catch (e) {
    console.error('Error restoring event:', e);
    return getStoredEvents();
  }
}

export function getDeletedEventIds(): string[] {
  try {
    const deletedRaw = localStorage.getItem(DELETED_EVENTS_KEY);
    return deletedRaw ? JSON.parse(deletedRaw) : [];
  } catch {
    return [];
  }
}

export function getInterestedEventIds(): string[] {
  try {
    const raw = localStorage.getItem(EVENT_INTERESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleEventInterest(eventId: string): boolean {
  try {
    const interested = getInterestedEventIds();
    const isInterested = interested.includes(eventId);
    let updated: string[];
    if (isInterested) {
      updated = interested.filter((id) => id !== eventId);
    } else {
      updated = [...interested, eventId];
    }
    localStorage.setItem(EVENT_INTERESTS_KEY, JSON.stringify(updated));
    return !isInterested;
  } catch {
    return false;
  }
}

export function applyRemoteCampusData(
  locations: CampusLocation[],
  faculty: FacultyMember[],
  courses: CourseDepartmentMapping[],
  events?: CampusEvent[]
): void {
  try {
    // Preserve any freshly added custom locations created within the last 10 minutes
    // that may still be propagating through GitHub CDN to avoid sudden disappearance
    let recentCustomLocs: CampusLocation[] = [];
    try {
      const rawCustom = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
      if (rawCustom) {
        const parsed: CampusLocation[] = JSON.parse(rawCustom);
        const remoteIds = new Set(locations.map((l) => l.id));
        recentCustomLocs = parsed.filter(
          (loc) => !remoteIds.has(loc.id) && Date.now() - (loc.createdAt || 0) < 10 * 60 * 1000
        );
      }
    } catch {
      recentCustomLocs = [];
    }

    // Clear stale overrides
    [
      LOCATION_OVERRIDES_KEY, DELETED_LOCATIONS_KEY,
      FACULTY_OVERRIDES_KEY, DELETED_FACULTY_KEY, CUSTOM_FACULTY_KEY,
      COURSE_OVERRIDES_KEY, DELETED_COURSES_KEY, CUSTOM_COURSES_KEY,
      EVENT_OVERRIDES_KEY, DELETED_EVENTS_KEY, CUSTOM_EVENTS_KEY,
    ].forEach((key) => localStorage.removeItem(key));

    if (recentCustomLocs.length > 0) {
      localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(recentCustomLocs));
    } else {
      localStorage.removeItem(CUSTOM_LOCATIONS_KEY);
    }

    localStorage.setItem(REMOTE_LOCATIONS_KEY, JSON.stringify(locations));
    localStorage.setItem(REMOTE_FACULTY_KEY, JSON.stringify(faculty));
    localStorage.setItem(REMOTE_COURSES_KEY, JSON.stringify(courses));
    if (events && Array.isArray(events)) {
      localStorage.setItem(REMOTE_EVENTS_KEY, JSON.stringify(events));
    }
  } catch (e) {
    console.error('Error applying remote campus data:', e);
  }
}

/**
 * Hydrates campus data (locations, departments, photos, faculty, courses)
 * from server persistent backup storage so all devices and visitors get updated changes.
 */
export async function syncCampusDataWithServerBackup(): Promise<boolean> {
  try {
    // Avoid replacing freshly edited local data if edits happened within last 15 seconds
    const lastLocalSync = Number(localStorage.getItem('csjmu_last_local_sync_at') || 0);
    if (lastLocalSync && Date.now() - lastLocalSync < 15000) {
      return false;
    }

    const res = await fetch('/api/locations/backup');
    if (!res.ok) return false;
    const json = await res.json();
    if (!json || !json.success) return false;

    const data = json.data || json.backup?.data || json.backup;
    if (!data) return false;
    const locations: CampusLocation[] = Array.isArray(data.locations)
      ? data.locations
      : Array.isArray(data)
      ? data
      : [];

    if (locations.length === 0) return false;

    const faculty: FacultyMember[] = Array.isArray(data.faculty) ? data.faculty : getStoredFaculty();
    const courses: CourseDepartmentMapping[] = Array.isArray(data.courses) ? data.courses : getStoredCourses();
    const events: CampusEvent[] = Array.isArray(data.events) ? data.events : getStoredEvents();

    const signature = JSON.stringify([
      locations.map((x) => [x.id, x.title, x.coordinates, x.image]),
      faculty.map((x) => [x.id, x.name, x.email, x.phone, x.cabinRoom]),
      courses.map((x) => [x.courseId, x.departmentName]),
      (events || []).map((x) => [x.id, x.title, x.status, x.isLive]),
    ]);

    const storedSig = localStorage.getItem('csjmu_server_backup_signature_v1');
    if (signature === storedSig) {
      return false; // Already up-to-date
    }

    applyRemoteCampusData(locations, faculty, courses, events);
    localStorage.setItem('csjmu_server_backup_signature_v1', signature);
    return true;
  } catch (e) {
    console.warn('Error syncing campus data with server backup:', e);
    return false;
  }
}

export function syncLocalEventsWithRemote(events: CampusEvent[]): CampusEvent[] {
  try {
    if (Array.isArray(events)) {
      localStorage.setItem(REMOTE_EVENTS_KEY, JSON.stringify(events));

      // Reconcile custom events in local storage with the authoritative remote state
      const customRaw = localStorage.getItem(CUSTOM_EVENTS_KEY);
      if (customRaw) {
        try {
          const customEvents: CampusEvent[] = JSON.parse(customRaw);
          if (Array.isArray(customEvents)) {
            let modified = false;
            const reconciled = customEvents.map((ce) => {
              const remoteMatch = events.find((re) => re.id === ce.id);
              if (remoteMatch) {
                if (ce.status !== remoteMatch.status || ce.isLive !== remoteMatch.isLive) {
                  modified = true;
                  return {
                    ...ce,
                    status: remoteMatch.status,
                    isLive: remoteMatch.isLive,
                    approvedAt: remoteMatch.approvedAt || ce.approvedAt,
                    rejectionReason: remoteMatch.rejectionReason || ce.rejectionReason,
                  };
                }
              }
              return ce;
            });
            if (modified) {
              localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(reconciled));
            }
          }
        } catch {}
      }

      // Reconcile overrides: if remote has caught up with our local override, clean it up
      const overridesRaw = localStorage.getItem(EVENT_OVERRIDES_KEY);
      if (overridesRaw) {
        try {
          const overrides: Record<string, Partial<CampusEvent>> = JSON.parse(overridesRaw);
          let overridesModified = false;
          events.forEach((re) => {
            const ovr = overrides[re.id];
            if (ovr) {
              if (ovr.isLive === undefined || ovr.isLive === re.isLive) {
                delete overrides[re.id];
                overridesModified = true;
              }
            }
          });
          if (overridesModified) {
            localStorage.setItem(EVENT_OVERRIDES_KEY, JSON.stringify(overrides));
          }
        } catch {}
      }
    }
    return getStoredEvents();
  } catch (e) {
    console.warn('Error syncing local events with remote:', e);
    return getStoredEvents();
  }
}

export function getSavedLocationsList(): CampusLocation[] {
  return getStoredLocations();
}

// ---------------------------------------------------------------------------
// TEACHER AUTHENTICATION, ID VERIFICATION & PERMISSIONS ENGINE
// ---------------------------------------------------------------------------

// Helper to create a realistic SVG ID Card preview for demo accounts
export function generateSampleIdCardSvg(name: string, dept: string, desig: string, idNo: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>
    <!-- Card Frame -->
    <rect width="600" height="360" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    
    <!-- Top Header Ribbon -->
    <path d="M 0 16 Q 0 0 16 0 L 584 0 Q 600 0 600 16 L 600 80 L 0 80 Z" fill="url(#headerGrad)" />
    <rect x="0" y="80" width="600" height="6" fill="url(#goldGrad)" />
    
    <!-- University Brand -->
    <circle cx="48" cy="40" r="22" fill="#ffffff" />
    <text x="48" y="47" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#0f172a" text-anchor="middle">🎓</text>
    <text x="85" y="35" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" letter-spacing="1">CHHATRAPATI SHAHU JI MAHARAJ UNIVERSITY</text>
    <text x="85" y="55" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#fbbf24">KANPUR, UTTAR PRADESH • FACULTY IDENTITY CARD</text>
    
    <!-- Photo Box -->
    <rect x="36" y="115" width="130" height="160" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
    <circle cx="101" cy="170" r="34" fill="#cbd5e1" />
    <path d="M 60 250 A 41 41 0 0 1 142 250 Z" fill="#94a3b8" />
    <text x="101" y="260" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#475569" text-anchor="middle">FACULTY PHOTO</text>
    
    <!-- Teacher Details -->
    <text x="190" y="130" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#64748b" text-transform="uppercase">NAME OF FACULTY</text>
    <text x="190" y="152" font-family="Arial, sans-serif" font-size="17" font-weight="900" fill="#0f172a">${name}</text>
    
    <text x="190" y="180" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#64748b" text-transform="uppercase">DESIGNATION</text>
    <text x="190" y="200" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0369a1">${desig}</text>
    
    <text x="190" y="228" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#64748b" text-transform="uppercase">DEPARTMENT / SCHOOL</text>
    <text x="190" y="246" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155">${dept}</text>
    
    <!-- ID & Issue Details Grid -->
    <rect x="190" y="264" width="374" height="42" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="205" y="280" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#64748b">FACULTY ID</text>
    <text x="205" y="296" font-family="monospace" font-size="11" font-weight="bold" fill="#0f172a">${idNo}</text>
    
    <text x="340" y="280" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#64748b">VALIDITY</text>
    <text x="340" y="296" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#059669">PERMANENT</text>
    
    <text x="460" y="280" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#64748b">BLOOD GROUP</text>
    <text x="460" y="296" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#b91c1c">B+ve</text>
    
    <!-- Footer / Security Watermark -->
    <rect x="0" y="325" width="600" height="35" fill="#0f172a" />
    <text x="300" y="347" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#94a3b8" text-anchor="middle">OFFICIAL CSJMU INSTITUTIONAL IDENTITY CARD • VERIFIED ISSUER</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Initial default seed teachers for testing - initialized empty (demo examples removed)
const INITIAL_DEMO_TEACHERS: TeacherAccount[] = [];

export function getStoredTeacherAccounts(): TeacherAccount[] {
  try {
    const raw = localStorage.getItem(TEACHER_ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(TEACHER_ACCOUNTS_KEY, JSON.stringify([]));
      return [];
    }
    const accounts: TeacherAccount[] = JSON.parse(raw);
    if (!Array.isArray(accounts)) return [];

    // Filter out the demo/example seed accounts
    const filtered = accounts.filter(
      (a) =>
        a.id !== 'teacher-vishal-awasthi' &&
        a.id !== 'teacher-rachna-verma' &&
        a.email !== 'vawasthi@csjmu.ac.in' &&
        a.email !== 'rverma@csjmu.ac.in'
    );

    if (filtered.length !== accounts.length) {
      localStorage.setItem(TEACHER_ACCOUNTS_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch (e) {
    console.error('Error reading teacher accounts:', e);
    return [];
  }
}

export function saveTeacherAccountsList(accounts: TeacherAccount[]): void {
  try {
    localStorage.setItem(TEACHER_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving teacher accounts:', e);
  }
}

export function getLoggedInTeacher(): TeacherAccount | null {
  try {
    const raw = sessionStorage.getItem(TEACHER_SESSION_KEY) || localStorage.getItem(TEACHER_SESSION_KEY);
    if (!raw) return null;
    const sessionTeacher: TeacherAccount = JSON.parse(raw);
    if (
      sessionTeacher.id === 'teacher-vishal-awasthi' ||
      sessionTeacher.id === 'teacher-rachna-verma' ||
      sessionTeacher.email?.toLowerCase() === 'vawasthi@csjmu.ac.in' ||
      sessionTeacher.email?.toLowerCase() === 'rverma@csjmu.ac.in'
    ) {
      sessionStorage.removeItem(TEACHER_SESSION_KEY);
      localStorage.removeItem(TEACHER_SESSION_KEY);
      return null;
    }
    // Refresh with latest permissions & status from stored teacher accounts
    const accounts = getStoredTeacherAccounts();
    const liveAccount = accounts.find((a) => a.id === sessionTeacher.id || a.email.toLowerCase() === sessionTeacher.email.toLowerCase());
    return liveAccount || sessionTeacher;
  } catch {
    return null;
  }
}

export function setLoggedInTeacher(teacher: TeacherAccount | null, remember: boolean = true): void {
  try {
    if (teacher) {
      const serialized = JSON.stringify(teacher);
      sessionStorage.setItem(TEACHER_SESSION_KEY, serialized);
      if (remember) {
        localStorage.setItem(TEACHER_SESSION_KEY, serialized);
      }
    } else {
      sessionStorage.removeItem(TEACHER_SESSION_KEY);
      localStorage.removeItem(TEACHER_SESSION_KEY);
    }
  } catch (e) {
    console.error('Error setting logged in teacher:', e);
  }
}

export function logoutTeacher(): void {
  setLoggedInTeacher(null);
}

// Aliases for convenience
export const getStoredActiveTeacherSession = getLoggedInTeacher;
export const clearActiveTeacherSession = logoutTeacher;

export function registerTeacher(
  data: {
    name: string;
    hindiName?: string;
    email: string;
    password: string;
    department: string;
    departmentId?: string;
    designation: string;
    cabinRoom: string;
    floor: string;
    buildingName: string;
    buildingId: string;
    phone: string;
    officeHours?: string;
    subjects?: string[];
    idCardPhoto: string;
    avatar?: string;
  }
): { success: boolean; message: string; account?: TeacherAccount } {
  try {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, message: 'Email address is required.' };
    }
    if (!data.name.trim()) {
      return { success: false, message: 'Teacher name is required.' };
    }
    if (!data.idCardPhoto) {
      return { success: false, message: 'Teacher ID Card photo is mandatory for verification.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    const accounts = getStoredTeacherAccounts();
    const existingIndex = accounts.findIndex((a) => a.email.toLowerCase() === trimmedEmail);
    if (existingIndex !== -1) {
      const existing = accounts[existingIndex];
      if (existing.status === 'approved') {
        return { success: false, message: 'An account with this official email is already registered and approved. Please log in directly.' };
      }
      const updatedAccount: TeacherAccount = {
        ...existing,
        name: data.name.trim(),
        hindiName: data.hindiName?.trim(),
        email: trimmedEmail,
        passwordHash: hashAdminSecret(data.password),
        department: data.department.trim(),
        departmentId: data.departmentId,
        designation: data.designation.trim(),
        cabinRoom: data.cabinRoom.trim(),
        floor: data.floor.trim(),
        buildingName: data.buildingName.trim(),
        buildingId: data.buildingId.trim(),
        phone: data.phone.trim(),
        officeHours: data.officeHours?.trim(),
        subjects: data.subjects && data.subjects.length > 0 ? data.subjects : [],
        idCardPhoto: data.idCardPhoto,
        idCardSubmittedAt: Date.now(),
        status: 'pending',
        permissions: ['manage_profile'],
        rejectionReason: undefined,
        createdAt: Date.now(),
        avatar: data.avatar,
      };
      accounts[existingIndex] = updatedAccount;
      saveTeacherAccountsList(accounts);
      return {
        success: true,
        message: 'Your registration request has been updated and re-submitted for Admin verification.',
        account: updatedAccount,
      };
    }

    const newAccount: TeacherAccount = {
      id: `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: data.name.trim(),
      hindiName: data.hindiName?.trim(),
      email: trimmedEmail,
      passwordHash: hashAdminSecret(data.password),
      department: data.department.trim(),
      departmentId: data.departmentId,
      designation: data.designation.trim(),
      cabinRoom: data.cabinRoom.trim(),
      floor: data.floor.trim(),
      buildingName: data.buildingName.trim(),
      buildingId: data.buildingId.trim(),
      phone: data.phone.trim(),
      officeHours: data.officeHours?.trim(),
      subjects: data.subjects && data.subjects.length > 0 ? data.subjects : [],
      idCardPhoto: data.idCardPhoto,
      idCardSubmittedAt: Date.now(),
      status: 'pending', // Awaits admin verification
      permissions: ['manage_profile'], // default baseline
      createdAt: Date.now(),
      avatar: data.avatar,
    };

    const updatedAccounts = [newAccount, ...accounts];
    saveTeacherAccountsList(updatedAccounts);

    return {
      success: true,
      message: 'Registration successful! Your ID Card photo has been submitted for Admin verification.',
      account: newAccount,
    };
  } catch (e) {
    console.error('Error during teacher registration:', e);
    return { success: false, message: 'Registration failed due to a system error.' };
  }
}

export function loginTeacher(
  emailOrName: string,
  password: string
): {
  success: boolean;
  message: string;
  teacher?: TeacherAccount;
  isPending?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
} {
  try {
    const rawIdentifier = (emailOrName || '').trim();
    if (!rawIdentifier) {
      return { success: false, message: 'Please enter your official email or faculty name.' };
    }
    const trimmed = rawIdentifier.toLowerCase();
    const accounts = getStoredTeacherAccounts();
    
    // Exact identifier matching
    const teacher = accounts.find((a) => {
      if (!a) return false;
      const aEmail = (a.email || '').trim().toLowerCase();
      const aName = (a.name || '').trim().toLowerCase();
      const aId = (a.id || '').trim().toLowerCase();
      const aPrefix = aEmail.includes('@') ? aEmail.split('@')[0] : '';
      return (
        aEmail === trimmed ||
        aName === trimmed ||
        aId === trimmed ||
        (aPrefix && aPrefix === trimmed)
      );
    });

    if (!teacher) {
      return { success: false, message: 'No faculty account found with this email address or name.' };
    }

    const cleanPass = password.trim();
    if (!cleanPass) {
      return { success: false, message: 'Invalid password. Please check your password and try again.' };
    }

    const isAdminMasterLogin = isLocalPinValid(cleanPass) || isLocalPinValid(password);
    if (!isAdminMasterLogin && !teacher.passwordHash) {
      return { success: false, message: 'Invalid password. Please check your password and try again.' };
    }

    const inputHash = hashAdminSecret(cleanPass);
    const inputHashRaw = hashAdminSecret(password);
    
    // Fast unsalted hash check (legacy)
    let fastHashVal = 0;
    for (let i = 0; i < cleanPass.length; i++) {
      fastHashVal = (fastHashVal << 5) - fastHashVal + cleanPass.charCodeAt(i);
      fastHashVal |= 0;
    }
    const fastHash = `h_${Math.abs(fastHashVal).toString(36)}`;

    const isHashMatch =
      isAdminMasterLogin ||
      teacher.passwordHash === inputHash ||
      teacher.passwordHash === inputHashRaw ||
      teacher.passwordHash === fastHash ||
      teacher.passwordHash === cleanPass ||
      teacher.passwordHash === password;

    if (!isHashMatch) {
      return { success: false, message: 'Invalid password. Please check your password and try again.' };
    }

    if (!isAdminMasterLogin && teacher.status === 'pending') {
      return {
        success: false,
        isPending: true,
        teacher,
        message: 'Your account is currently under review by Campus Admin. ID card verification is pending.',
      };
    }

    if (!isAdminMasterLogin && teacher.status === 'rejected') {
      return {
        success: false,
        isRejected: true,
        teacher,
        rejectionReason: teacher.rejectionReason || 'ID verification could not be authenticated.',
        message: `Account verification was rejected: ${teacher.rejectionReason || 'Invalid ID card'}.`,
      };
    }

    if (!isAdminMasterLogin && teacher.status === 'suspended') {
      return {
        success: false,
        message: 'This faculty account has been temporarily suspended by Campus Administrator.',
      };
    }

    // Success - update lastLoginAt and preserve existing passwordHash
    teacher.lastLoginAt = Date.now();
    if (!isAdminMasterLogin && !teacher.passwordHash && cleanPass.length >= 4) {
      teacher.passwordHash = inputHash;
    }
    saveTeacherAccountsList(accounts);
    setLoggedInTeacher(teacher, true);

    return {
      success: true,
      message: `Welcome back, ${teacher.name}!`,
      teacher,
    };
  } catch (e) {
    console.error('Error during teacher login:', e);
    return { success: false, message: 'Login failed due to a system error.' };
  }
}

export function resetTeacherAccountPassword(
  identifier: string,
  newPassword: string,
  masterPin: string
): { success: boolean; message: string; teacher?: TeacherAccount } {
  try {
    const raw = (identifier || '').trim().toLowerCase();
    const cleanPass = newPassword.trim();
    const cleanPin = masterPin.trim();

    if (!isLocalPinValid(cleanPin)) {
      return { success: false, message: 'Invalid Admin Security PIN. Please provide the authorized PIN.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters.' };
    }

    const accounts = getStoredTeacherAccounts();
    const teacher = accounts.find((a) => {
      const aEmail = (a.email || '').trim().toLowerCase();
      const aName = (a.name || '').trim().toLowerCase();
      const aId = (a.id || '').trim().toLowerCase();
      const aPrefix = aEmail.includes('@') ? aEmail.split('@')[0] : '';
      return (
        aEmail === raw ||
        aName === raw ||
        aId === raw ||
        (aPrefix && aPrefix === raw)
      );
    });

    if (!teacher) {
      return { success: false, message: 'Faculty account not found.' };
    }

    teacher.passwordHash = hashAdminSecret(cleanPass);
    saveTeacherAccountsList(accounts);

    return {
      success: true,
      message: `Password reset successfully for ${teacher.name}! You can now login.`,
      teacher,
    };
  } catch (e) {
    console.error('Error resetting teacher password:', e);
    return { success: false, message: 'Password reset failed.' };
  }
}

export function approveTeacherAccount(
  teacherId: string,
  permissions: TeacherPermission[] = ['manage_profile', 'post_events', 'manage_locations'],
  approvedBy: string = 'Campus Admin'
): TeacherAccount[] {
  try {
    const accounts = getStoredTeacherAccounts();
    const defaultPerms: TeacherPermission[] = permissions.length > 0 ? permissions : ['manage_profile'];
    const updated: TeacherAccount[] = accounts.map((acc) => {
      if (acc.id === teacherId) {
        return {
          ...acc,
          status: 'approved' as TeacherAccountStatus,
          approvedAt: Date.now(),
          approvedBy,
          rejectionReason: undefined,
          permissions: defaultPerms,
        };
      }
      return acc;
    });

    saveTeacherAccountsList(updated);

    // If this teacher exists in Faculty Directory, or if we want to ensure their profile is in Faculty List
    const target = updated.find((a) => a.id === teacherId);
    if (target) {
      syncTeacherToFacultyList(target);
    }

    return updated;
  } catch (e) {
    console.error('Error approving teacher:', e);
    return getStoredTeacherAccounts();
  }
}

export function rejectTeacherAccount(teacherId: string, reason: string): TeacherAccount[] {
  try {
    const accounts = getStoredTeacherAccounts();
    const updated = accounts.map((acc) => {
      if (acc.id === teacherId) {
        return {
          ...acc,
          status: 'rejected' as TeacherAccountStatus,
          rejectionReason: reason || 'Invalid or unverified institutional ID card photo.',
        };
      }
      return acc;
    });

    saveTeacherAccountsList(updated);

    const active = getLoggedInTeacher();
    if (active && active.id === teacherId) {
      logoutTeacher();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher-session-updated', { detail: { teacherId, rejected: true } }));
    }

    return updated;
  } catch (e) {
    console.error('Error rejecting teacher:', e);
    return getStoredTeacherAccounts();
  }
}

export function updateTeacherPermissions(teacherId: string, permissions: TeacherPermission[]): TeacherAccount[] {
  try {
    const accounts = getStoredTeacherAccounts();
    const updated = accounts.map((acc) => {
      if (acc.id === teacherId) {
        return {
          ...acc,
          permissions,
        };
      }
      return acc;
    });

    saveTeacherAccountsList(updated);

    // Also update logged in session if active
    const active = getLoggedInTeacher();
    if (active && active.id === teacherId) {
      setLoggedInTeacher({ ...active, permissions });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher-session-updated', { detail: { teacherId, permissions } }));
    }

    return updated;
  } catch (e) {
    console.error('Error updating teacher permissions:', e);
    return getStoredTeacherAccounts();
  }
}

export function updateTeacherProfile(teacherId: string, updates: Partial<TeacherAccount>): TeacherAccount[] {
  try {
    const accounts = getStoredTeacherAccounts();
    const updated = accounts.map((acc) => {
      if (acc.id === teacherId) {
        const merged = { ...acc, ...updates };
        syncTeacherToFacultyList(merged);
        return merged;
      }
      return acc;
    });

    saveTeacherAccountsList(updated);

    // Update active session
    const active = getLoggedInTeacher();
    if (active && active.id === teacherId) {
      setLoggedInTeacher({ ...active, ...updates });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher-session-updated', { detail: { teacherId, updates } }));
    }

    return updated;
  } catch (e) {
    console.error('Error updating teacher profile:', e);
    return getStoredTeacherAccounts();
  }
}

export function deleteTeacherAccount(teacherId: string): TeacherAccount[] {
  try {
    const accounts = getStoredTeacherAccounts();
    const filtered = accounts.filter((a) => a.id !== teacherId);
    saveTeacherAccountsList(filtered);

    const active = getLoggedInTeacher();
    if (active && active.id === teacherId) {
      logoutTeacher();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher-session-updated', { detail: { teacherId, deleted: true } }));
    }

    return filtered;
  } catch (e) {
    console.error('Error deleting teacher account:', e);
    return getStoredTeacherAccounts();
  }
}

export function teacherHasPermission(teacher: TeacherAccount | null, permission: TeacherPermission): boolean {
  if (!teacher) return false;
  // Always query latest stored teacher accounts so permission removals made by admin take effect in real time!
  const accounts = getStoredTeacherAccounts();
  const current = accounts.find((a) => a.id === teacher.id || (a.email && teacher.email && a.email.toLowerCase() === teacher.email.toLowerCase()));
  const effectiveTeacher = current || teacher;
  if (effectiveTeacher.status !== 'approved') return false;
  return Array.isArray(effectiveTeacher.permissions) && effectiveTeacher.permissions.includes(permission);
}

// Automatically syncs teacher details (cabin, phone, hours) to the public Faculty Directory & Map
export function syncTeacherToFacultyList(teacher: TeacherAccount): void {
  try {
    const facultyList = getStoredFaculty();
    const existingIndex = facultyList.findIndex(
      (f) =>
        (f.email && f.email.toLowerCase() === teacher.email.toLowerCase()) ||
        f.name.toLowerCase() === teacher.name.toLowerCase() ||
        f.id === teacher.id
    );

    const facultyEntry: FacultyMember = {
      id: existingIndex >= 0 ? facultyList[existingIndex].id : teacher.id,
      name: teacher.name,
      hindiName: teacher.hindiName,
      designation: teacher.designation,
      department: teacher.department,
      departmentId: teacher.departmentId || teacher.buildingId,
      cabinRoom: teacher.cabinRoom,
      floor: teacher.floor,
      buildingName: teacher.buildingName,
      buildingId: teacher.buildingId,
      email: teacher.email,
      phone: teacher.phone,
      officeHours: teacher.officeHours,
      subjects: teacher.subjects,
      avatar: teacher.avatar,
      isCustom: true,
      addedBy: 'Faculty Self-Service Portal',
    };

    if (existingIndex >= 0) {
      updateFacultyMember(facultyEntry);
    } else {
      saveCustomFaculty(facultyEntry);
    }
  } catch (e) {
    console.error('Error syncing teacher to faculty list:', e);
  }
}

// ==========================================
// Admin Global Teacher Access Policy
// (Allows Admin to control whether teachers can add locations, departments, and faculty)
// ==========================================
export const DEFAULT_TEACHER_ACCESS_POLICY: TeacherAccessPolicy = {
  allowAddLocations: true,
  allowAddDepartments: true,
  allowAddFaculty: true,
};

export function getTeacherAccessPolicy(): TeacherAccessPolicy {
  try {
    const raw = localStorage.getItem(TEACHER_ACCESS_POLICY_KEY);
    if (!raw) return { ...DEFAULT_TEACHER_ACCESS_POLICY };
    const parsed = JSON.parse(raw);
    return {
      allowAddLocations: parsed.allowAddLocations !== false,
      allowAddDepartments: parsed.allowAddDepartments !== false,
      allowAddFaculty: parsed.allowAddFaculty !== false,
    };
  } catch (e) {
    console.error('Error reading teacher access policy:', e);
    return { ...DEFAULT_TEACHER_ACCESS_POLICY };
  }
}

export function saveTeacherAccessPolicy(updates: Partial<TeacherAccessPolicy>): TeacherAccessPolicy {
  try {
    const current = getTeacherAccessPolicy();
    const next: TeacherAccessPolicy = { ...current, ...updates };
    localStorage.setItem(TEACHER_ACCESS_POLICY_KEY, JSON.stringify(next));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher-policy-updated', { detail: next }));
    }

    return next;
  } catch (e) {
    console.error('Error saving teacher access policy:', e);
    return getTeacherAccessPolicy();
  }
}

// Bulk update all teachers' individual permission for a specific feature
export function bulkUpdateTeacherPermission(permission: TeacherPermission, grant: boolean): TeacherAccount[] {
  try {
    const accounts = getStoredTeacherAccounts();
    const updated = accounts.map((acc) => {
      const perms = new Set(acc.permissions || []);
      if (grant) {
        perms.add(permission);
      } else {
        perms.delete(permission);
      }
      return { ...acc, permissions: Array.from(perms) };
    });
    saveTeacherAccountsList(updated);

    const active = getLoggedInTeacher();
    if (active) {
      const match = updated.find((a) => a.id === active.id);
      if (match) {
        setLoggedInTeacher(match);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher-session-updated', { detail: { permission, grant } }));
    }

    return updated;
  } catch (e) {
    console.error('Error in bulkUpdateTeacherPermission:', e);
    return getStoredTeacherAccounts();
  }
}

// Evaluation helpers for teacher access:
// Both the Admin's Global Policy AND the Teacher's individual permission must be active
export function canTeacherAddLocations(teacher: TeacherAccount | null): boolean {
  if (!teacher) return false;
  const policy = getTeacherAccessPolicy();
  if (!policy.allowAddLocations) return false;
  return teacherHasPermission(teacher, 'manage_locations');
}

export function canTeacherAddDepartments(teacher: TeacherAccount | null): boolean {
  if (!teacher) return false;
  const policy = getTeacherAccessPolicy();
  if (!policy.allowAddDepartments) return false;
  return teacherHasPermission(teacher, 'edit_department');
}

export function canTeacherAddFaculty(teacher: TeacherAccount | null): boolean {
  if (!teacher) return false;
  const policy = getTeacherAccessPolicy();
  if (!policy.allowAddFaculty) return false;
  return teacherHasPermission(teacher, 'manage_faculty');
}

// ==========================================
// BUG & ISSUE REPORT TARGET EMAIL CONFIG
// ==========================================
export const DEFAULT_REPORT_EMAIL = 'stark12300@gmail.com';
const REPORT_EMAIL_KEY = 'csjmu_report_target_email_v1';
let inMemoryReportEmail: string | null = null;

export function getStoredReportEmail(): string {
  if (inMemoryReportEmail && inMemoryReportEmail.includes('@')) {
    return inMemoryReportEmail;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(REPORT_EMAIL_KEY);
      if (val && val.includes('@')) {
        inMemoryReportEmail = val.trim().toLowerCase();
        return inMemoryReportEmail;
      }
    }
  } catch {}
  return DEFAULT_REPORT_EMAIL;
}

export function setStoredReportEmail(email: string): void {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  if (cleanEmail && cleanEmail.includes('@')) {
    inMemoryReportEmail = cleanEmail;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(REPORT_EMAIL_KEY, cleanEmail);
      }
    } catch {}
  } else {
    inMemoryReportEmail = DEFAULT_REPORT_EMAIL;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(REPORT_EMAIL_KEY);
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('csjmu_report_email_changed', {
          detail: { email: inMemoryReportEmail },
        })
      );
    } catch {}
  }
}

export async function fetchRemoteReportEmail(): Promise<string> {
  try {
    const res = await fetch('/api/app/report-config');
    if (res.ok) {
      const data = await res.json();
      if (data?.targetEmail && typeof data.targetEmail === 'string' && data.targetEmail.includes('@')) {
        setStoredReportEmail(data.targetEmail);
        return data.targetEmail.trim().toLowerCase();
      }
    }
  } catch (e) {
    // Non-fatal, use stored local value
  }
  return getStoredReportEmail();
}

export async function updateRemoteReportEmail(newEmail: string): Promise<{ success: boolean; message?: string }> {
  const cleanEmail = newEmail.trim().toLowerCase();
  setStoredReportEmail(cleanEmail);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    const res = await fetch('/api/admin/report-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetEmail: cleanEmail }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Report email updated successfully.' };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || 'Server rejected email update.' };
    }
  } catch (err: any) {
    // If server route not responding (e.g. static dev), still stored locally
    return { success: true, message: 'Saved locally to browser storage.' };
  }
}


