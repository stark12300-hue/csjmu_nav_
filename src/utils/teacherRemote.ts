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
  saveTeacherAccountsList,
} from './storage';
import {
  getTeachersFromFirestore,
  saveTeacherToFirestore,
  deleteTeacherFromFirestore,
  getLastFirestoreErrorMessage,
} from '../services/firebase';

/**
 * Teacher data is stored in Cloud Firestore.
 *
 * The old implementation depended on the Vercel/Express teacher API and,
 * when that endpoint failed, even tried a Render backend. That made teacher
 * registration depend on a serverless API that is not part of the data
 * architecture of this app.
 *
 * Keep this module as the single client-side teacher sync layer and use the
 * existing Firestore collection: teacher_accounts.
 */

function makeTeacherSessionToken(teacherId: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  let hex = '';
  try {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
      hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  if (hex.length !== 64) {
    let seed = `${teacherId}-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 64; i++) {
      seed = ((seed.charCodeAt(i % seed.length) * 9301 + i * 49297) % 233280).toString(16) + seed;
    }
    hex = seed.replace(/[^a-f0-9]/gi, '').slice(0, 64).padEnd(64, '0').toLowerCase();
  }
  return `tch_${teacherId}_${expiresAt}_${hex}`;
}

function isDemoTeacher(account: TeacherAccount): boolean {
  return (
    account.id === 'teacher-vishal-awasthi' ||
    account.id === 'teacher-rachna-verma' ||
    account.email?.toLowerCase() === 'vawasthi@csjmu.ac.in' ||
    account.email?.toLowerCase() === 'rverma@csjmu.ac.in'
  );
}

function syncLocalTeacherAccounts(accounts: TeacherAccount[]): void {
  try {
    saveTeacherAccountsList(accounts.filter((a) => !isDemoTeacher(a)));
  } catch {}
}

async function loadFirestoreTeachers(): Promise<TeacherAccount[]> {
  const accounts = await getTeachersFromFirestore();
  const filtered = accounts.filter((a) => a && !isDemoTeacher(a));
  syncLocalTeacherAccounts(filtered);
  return filtered;
}

export async function getRemoteTeacherAccounts(): Promise<TeacherAccount[]> {
  try {
    return await loadFirestoreTeachers();
  } catch (e) {
    console.warn('Firestore teacher list failed:', e);
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
    const accounts = await loadFirestoreTeachers();

    // Reuse the existing password/status rules, but with Firestore as the
    // source of truth instead of localStorage or an API endpoint.
    const result = loginTeacher(trimmedIdentifier, password);

    if (result.teacher) {
      const liveTeacher = accounts.find(
        (a) => a.id === result.teacher?.id || a.email.toLowerCase() === result.teacher?.email.toLowerCase()
      ) || result.teacher;

      if (result.success) {
        const token = makeTeacherSessionToken(liveTeacher.id);
        setTeacherToken(token);
        setLoggedInTeacher(liveTeacher, true);
        await saveTeacherToFirestore({
          ...liveTeacher,
          lastLoginAt: Date.now(),
        });
        return {
          success: true,
          message: result.message,
          teacher: { ...liveTeacher, lastLoginAt: Date.now() },
          token,
        };
      }

      return {
        success: false,
        message: result.message,
        teacher: liveTeacher,
        isPending: result.isPending,
        isRejected: result.isRejected,
        rejectionReason: result.rejectionReason,
      };
    }

    return {
      success: false,
      message: result.message || 'No faculty account found with this email address or name.',
    };
  } catch (e: any) {
    console.warn('Firestore teacher login failed:', e);
    return {
      success: false,
      message: e?.message || 'Unable to connect to the teacher database. Please try again.',
    };
  }
}

export async function resetRemoteTeacherPassword(
  identifier: string,
  newPassword: string,
  masterPin: string = ''
): Promise<{ success: boolean; message: string }> {
  try {
    const accounts = await loadFirestoreTeachers();
    const target = accounts.find((a) => {
      const id = identifier.trim().toLowerCase();
      const email = (a.email || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      const facultyId = (a.id || '').toLowerCase();
      const prefix = email.includes('@') ? email.split('@')[0] : '';
      return id === email || id === name || id === facultyId || (prefix && id === prefix);
    });

    if (!target) {
      return { success: false, message: 'No faculty account found with this email address or name.' };
    }

    // Keep the existing master-PIN validation logic.
    syncLocalTeacherAccounts(accounts);
    const localResult = resetTeacherAccountPassword(identifier, newPassword, masterPin);
    if (!localResult.success) return localResult;

    const updated = {
      ...target,
      passwordHash: localResult.teacher?.passwordHash || target.passwordHash,
    };
    const saved = await saveTeacherToFirestore(updated);
    if (!saved) {
      return { success: false, message: 'Password could not be synced to Firestore. Please try again.' };
    }

    return { success: true, message: localResult.message || 'Password updated successfully!' };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Unable to update the password.' };
  }
}

export async function createRemoteTeacherAccount(account: TeacherAccount): Promise<{ success: boolean; message?: string }> {
  try {
    // Firestore is the source of truth. Save the submitted request first so
    // an Admin can see it even if a previous teacher-list read is temporarily
    // unavailable. Duplicate/approved accounts are checked when the list is available.
    let accounts: TeacherAccount[] = [];
    try {
      accounts = await loadFirestoreTeachers();
    } catch {
      accounts = [];
    }

    const existing = accounts.find((a) => a.email.toLowerCase() === account.email.toLowerCase());
    if (existing && existing.status === 'approved') {
      return {
        success: false,
        message: 'An account with this official email is already registered and approved. Please log in directly.',
      };
    }

    // Firestore is the source of truth. This also stores the ID-card photo.
    const saved = await saveTeacherToFirestore({
      ...account,
      status: 'pending',
      permissions: account.permissions || ['manage_profile'],
    });
    if (!saved) {
      return {
        success: false,
        message: `Firestore save failed: ${getLastFirestoreErrorMessage() || 'Unknown Firestore error. Please try again.'}`,
      };
    }

    const merged = existing
      ? accounts.map((a) => (a.id === existing.id ? account : a))
      : [account, ...accounts];
    syncLocalTeacherAccounts(merged);

    return {
      success: true,
      message: 'Registration saved for Admin verification.',
    };
  } catch (e: any) {
    console.error('Firestore teacher signup failed:', e);
    return {
      success: false,
      message: e?.message || 'Unable to save registration to Firestore.',
    };
  }
}

export async function updateRemoteTeacher(
  teacherId: string,
  action: 'approve' | 'reject' | 'permissions' | 'profile',
  payload: { permissions?: TeacherPermission[]; reason?: string; approvedBy?: string; updates?: Partial<TeacherAccount> } = {}
): Promise<{ success: boolean; accounts?: TeacherAccount[]; teacher?: TeacherAccount; message?: string }> {
  try {
    const accounts = await loadFirestoreTeachers();
    const target = accounts.find((a) => a.id === teacherId);

    if (!target) {
      return { success: false, message: 'Teacher account not found in Firestore.' };
    }

    let updated: TeacherAccount = { ...target };

    if (action === 'approve') {
      updated = {
        ...updated,
        status: 'approved',
        permissions: payload.permissions || updated.permissions || ['manage_profile'],
        approvedAt: Date.now(),
        approvedBy: payload.approvedBy || 'Admin',
        rejectionReason: undefined,
      };
    } else if (action === 'reject') {
      updated = {
        ...updated,
        status: 'rejected',
        rejectionReason: payload.reason || 'ID verification could not be authenticated.',
        approvedAt: undefined,
        approvedBy: undefined,
      };
    } else if (action === 'permissions') {
      updated = {
        ...updated,
        permissions: payload.permissions || updated.permissions || ['manage_profile'],
      };
    } else if (action === 'profile') {
      updated = {
        ...updated,
        ...(payload.updates || {}),
        id: target.id,
        email: target.email,
      };
    }

    const saved = await saveTeacherToFirestore(updated);
    if (!saved) {
      return { success: false, message: 'Teacher changes could not be saved to Firestore.' };
    }

    const nextAccounts = accounts.map((a) => (a.id === teacherId ? updated : a));
    syncLocalTeacherAccounts(nextAccounts);

    return {
      success: true,
      accounts: nextAccounts,
      teacher: updated,
      message:
        action === 'approve'
          ? 'Teacher approved and synced to Firestore.'
          : action === 'reject'
            ? 'Teacher rejected and synced to Firestore.'
            : 'Teacher changes synced to Firestore.',
    };
  } catch (e: any) {
    console.error('Firestore teacher update failed:', e);
    return { success: false, message: e?.message || 'Unable to sync teacher changes to Firestore.' };
  }
}

export async function deleteRemoteTeacher(teacherId: string): Promise<{ success: boolean; accounts?: TeacherAccount[]; message?: string }> {
  try {
    const deleted = await deleteTeacherFromFirestore(teacherId);
    if (!deleted) {
      return { success: false, message: 'Teacher account could not be deleted from Firestore.' };
    }

    const accounts = await loadFirestoreTeachers();
    return {
      success: true,
      accounts,
      message: 'Teacher account deleted from Firestore.',
    };
  } catch (e: any) {
    console.error('Firestore teacher delete failed:', e);
    return { success: false, message: e?.message || 'Unable to delete teacher from Firestore.' };
  }
}

/**
 * Pull the shared teacher store and merge it into browser storage.
 * Firestore is the source of truth; localStorage is only a UI/session cache.
 */
export async function hydrateTeacherAccountsFromServer(): Promise<TeacherAccount[]> {
  return loadFirestoreTeachers();
}
