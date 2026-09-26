import { TeacherAccount, TeacherPermission } from '../types';
import {
  getAdminAuthHeaders,
  getAdminToken,
  getAdminPin,
  getTeacherAuthHeaders,
  getTeacherToken,
  setTeacherToken,
  setLoggedInTeacher,
  notifyTeacherSessionExpired,
  loginTeacher,
  resetTeacherAccountPassword,
} from './storage';
import { saveTeacherToFirestore } from '../services/firebase';

export async function getRemoteTeacherAccounts(): Promise<TeacherAccount[]> {
  try {
    const authHeaders = getAdminToken() ? getAdminAuthHeaders() : getTeacherAuthHeaders();
    const res = await fetch('/api/teachers?ts=' + Date.now(), {
      headers: { ...authHeaders },
      cache: 'no-store',
    });
    if (res.status === 401) {
      if (getTeacherToken()) {
        notifyTeacherSessionExpired();
      }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !Array.isArray(data.accounts)) {
      throw new Error(data?.message || 'Unable to load teacher requests.');
    }
    return data.accounts as TeacherAccount[];
  } catch (e) {
    console.warn('Remote teacher list failed:', e);
    return [];
  }
}

export async function loginRemoteTeacher(
  emailOrName: string,
  password: string
): Promise<{
  success: boolean;
  message?: string;
  teacher?: TeacherAccount;
  isPending?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  token?: string;
}> {
  const trimmedIdentifier = (emailOrName || '').trim();
  try {
    let res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedIdentifier, password }),
      cache: 'no-store',
    });

    // If /api/teacher/login returned 404, fallback to /api/teachers with action: 'login'
    if (res.status === 404) {
      res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: trimmedIdentifier, password }),
        cache: 'no-store',
      });
    }

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.success && data?.token && data?.teacher) {
      // Consistently store token and sanitized profile across storage tiers
      setTeacherToken(data.token);
      setLoggedInTeacher(data.teacher, true);
      return {
        success: true,
        message: data.message || `Welcome back, ${data.teacher.name}!`,
        teacher: data.teacher,
        token: data.token,
      };
    }

    if (data?.isPending || data?.isRejected) {
      return {
        success: false,
        message: data?.message || 'Verification pending or rejected.',
        teacher: data?.teacher,
        isPending: Boolean(data?.isPending),
        isRejected: Boolean(data?.isRejected),
        rejectionReason: data?.rejectionReason,
      };
    }

    if (res.status === 401 || res.status === 403 || res.status === 400) {
      return {
        success: false,
        message: data?.message || 'Invalid email address or password.',
      };
    }

    // Try local fallback only if server was unreachable or gave 5xx error
    const local = loginTeacher(trimmedIdentifier, password);
    if (local.success && local.teacher) {
      const fallbackToken = `tch_${local.teacher.id}_${Date.now() + 7 * 86400000}_fallback`;
      setTeacherToken(fallbackToken);
      setLoggedInTeacher(local.teacher, true);
      return {
        success: true,
        message: local.message,
        teacher: local.teacher,
        token: fallbackToken,
      };
    }

    return {
      success: false,
      message: data?.message || data?.error || local.message || 'Teacher login failed.',
      teacher: data?.teacher || local.teacher,
      isPending: Boolean(data?.isPending || local.isPending),
      isRejected: Boolean(data?.isRejected || local.isRejected),
      rejectionReason: data?.rejectionReason || local.rejectionReason,
    };
  } catch (e: any) {
    // Network error: Fallback to local storage
    const local = loginTeacher(trimmedIdentifier, password);
    if (local.success && local.teacher) {
      const fallbackToken = `tch_${local.teacher.id}_${Date.now() + 7 * 86400000}_fallback`;
      setTeacherToken(fallbackToken);
      setLoggedInTeacher(local.teacher, true);
      return {
        success: true,
        message: local.message,
        teacher: local.teacher,
        token: fallbackToken,
      };
    }
    return { success: false, message: local.message || e?.message || 'Network error while logging in.' };
  }
}

export async function resetRemoteTeacherPassword(
  identifier: string,
  newPassword: string,
  masterPin: string = ''
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/teacher/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, newPassword, masterPin }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      resetTeacherAccountPassword(identifier, newPassword, masterPin);
      return { success: true, message: data.message || 'Password updated successfully!' };
    }
    if (data?.message) {
      return { success: false, message: data.message };
    }
  } catch {}
  return resetTeacherAccountPassword(identifier, newPassword, masterPin);
}

export async function createRemoteTeacherAccount(account: TeacherAccount): Promise<{ success: boolean; message?: string }> {
  // Mirror teacher profile to Firestore
  saveTeacherToFirestore(account).catch(() => {});

  const request = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 200) };
    }
    return { res, data };
  };

  try {
    // Normal same-origin API.
    let result = await request('/api/teachers');

    // Vercel frontend deployments may not expose the Express /api/teachers
    // route. Fall back to the existing Render backend in that case.
    if (result.res.status === 404) {
      result = await request('https://csjmu-nav.onrender.com/api/teachers');
    }

    return {
      success: Boolean(result.res.ok && result.data?.success),
      message:
        result.data?.message ||
        result.data?.error ||
        (result.res.ok ? undefined : `Server error (${result.res.status}): ${result.res.statusText || 'Request failed'}`),
    };
  } catch (e: any) {
    // If the backend is temporarily unavailable, Firestore remains the signup mirror.
    try {
      const firestoreSaved = await saveTeacherToFirestore(account);
      if (firestoreSaved) {
        return { success: true, message: 'Registration saved for Admin verification.' };
      }
    } catch {}
    return { success: false, message: e?.message || 'Network error while sending signup request.' };
  }
}

export async function updateRemoteTeacher(
  teacherId: string,
  action: 'approve' | 'reject' | 'permissions' | 'profile',
  payload: { permissions?: TeacherPermission[]; reason?: string; approvedBy?: string; updates?: Partial<TeacherAccount> } = {}
): Promise<{ success: boolean; accounts?: TeacherAccount[]; teacher?: TeacherAccount; message?: string }> {
  try {
    // Prefer admin headers for administrative actions; use teacher headers for teacher profile updates
    const authHeaders = (action === 'approve' || action === 'reject' || action === 'permissions')
      ? getAdminAuthHeaders()
      : (getTeacherToken() ? getTeacherAuthHeaders() : getAdminAuthHeaders());

    const adminPin = getAdminPin();
    const res = await fetch('/api/teachers', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        teacherId,
        action,
        ...(adminPin ? { adminPin } : {}),
        ...payload,
      }),
    });

    if (res.status === 401) {
      if (getTeacherToken() && action === 'profile') {
        notifyTeacherSessionExpired();
      }
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: Boolean(res.ok && data?.success),
      accounts: data?.accounts,
      teacher: data?.teacher,
      message: data?.message || data?.error,
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Network error while updating teacher.' };
  }
}

export async function deleteRemoteTeacher(teacherId: string): Promise<{ success: boolean; accounts?: TeacherAccount[]; message?: string }> {
  try {
    const adminPin = getAdminPin();
    const res = await fetch('/api/teachers', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify({
        teacherId,
        ...(adminPin ? { adminPin } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: Boolean(res.ok && data?.success),
      accounts: data?.accounts,
      message: data?.message || data?.error,
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Network error while deleting teacher.' };
  }
}

/**
 * Pull the shared teacher store and merge it into browser storage.
 * Remote accounts win by ID/email; sensitive hashes are stripped.
 */
export async function hydrateTeacherAccountsFromServer(): Promise<TeacherAccount[]> {
  const remote = await getRemoteTeacherAccounts();
  if (!remote.length) return [];
  try {
    const key = 'csjmu_teacher_accounts_v2';
    const localRaw = localStorage.getItem(key);
    const local: TeacherAccount[] = localRaw ? JSON.parse(localRaw) : [];
    const map = new Map<string, TeacherAccount>();
    for (const a of local) map.set(a.id || a.email.toLowerCase(), a);
    for (const a of remote) {
      const keyStr = a.id || a.email.toLowerCase();
      const existing = map.get(keyStr);
      // Strip sensitive passwordHash and idCardPhoto
      const { passwordHash: _ph, idCardPhoto: _icp, ...safeRemote } = a as any;
      map.set(keyStr, {
        ...existing,
        ...safeRemote,
      });
    }
    const merged = Array.from(map.values());
    localStorage.setItem(key, JSON.stringify(merged));
    return merged;
  } catch {
    return remote;
  }
}
