import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer,
  getDocsFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CampusEvent, CampusLocation, FacultyMember, CourseDepartmentMapping, TeacherAccount } from '../types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

let lastFirestoreErrorMessage = '';

export function getLastFirestoreErrorMessage(): string {
  return lastFirestoreErrorMessage;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path,
  };
  lastFirestoreErrorMessage = `${errInfo.error} (operation: ${operationType}, path: ${path || 'unknown'})`;
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Validate live connection to Firestore
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'campus_locations', '_ping_health_check_'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline:', error.message);
      return false;
    }
    return true; // Connection handshake succeeded even if document not found
  }
}

// ----------------------------------------------------
// Campus Events Firestore Operations
// ----------------------------------------------------
export async function getEventsFromFirestore(): Promise<CampusEvent[]> {
  const colPath = 'campus_events';
  try {
    const snap = await getDocsFromServer(collection(db, colPath));
    const events: CampusEvent[] = [];
    snap.forEach((d) => {
      events.push(d.data() as CampusEvent);
    });
    return events;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}

export async function saveEventToFirestore(event: CampusEvent): Promise<boolean> {
  const path = `campus_events/${event.id}`;
  try {
    await setDoc(doc(db, 'campus_events', event.id), event);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteEventFromFirestore(eventId: string): Promise<boolean> {
  const path = `campus_events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'campus_events', eventId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export function subscribeEventsFromFirestore(onUpdate: (events: CampusEvent[]) => void): () => void {
  const colPath = 'campus_events';
  return onSnapshot(
    collection(db, colPath),
    (snap) => {
      const events: CampusEvent[] = [];
      snap.forEach((d) => {
        events.push(d.data() as CampusEvent);
      });
      if (events.length > 0) {
        onUpdate(events);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

// ----------------------------------------------------
// Campus Locations Firestore Operations
// ----------------------------------------------------
export async function getLocationsFromFirestore(): Promise<CampusLocation[]> {
  const colPath = 'campus_locations';
  try {
    const snap = await getDocs(collection(db, colPath));
    const locations: CampusLocation[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && data.id && data.coordinates) {
        locations.push(data as CampusLocation);
      }
    });
    return locations;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}

export async function saveLocationToFirestore(location: CampusLocation): Promise<boolean> {
  const path = `campus_locations/${location.id}`;
  try {
    await setDoc(doc(db, 'campus_locations', location.id), location);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function batchSaveLocationsToFirestore(locations: CampusLocation[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    // Firestore batches allow up to 500 operations per batch
    const slice = locations.slice(0, 450);
    slice.forEach((loc) => {
      const ref = doc(db, 'campus_locations', loc.id);
      batch.set(ref, loc);
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'campus_locations/batch');
    return false;
  }
}

export function subscribeLocationsFromFirestore(onUpdate: (locations: CampusLocation[]) => void): () => void {
  const colPath = 'campus_locations';
  return onSnapshot(
    collection(db, colPath),
    (snap) => {
      const locations: CampusLocation[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.id && data.coordinates) {
          locations.push(data as CampusLocation);
        }
      });
      if (locations.length > 0) {
        onUpdate(locations);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

// ----------------------------------------------------
// Faculty Directory Firestore Operations
// ----------------------------------------------------
export async function getFacultyFromFirestore(): Promise<FacultyMember[]> {
  const colPath = 'faculty_members';
  try {
    const snap = await getDocs(collection(db, colPath));
    const faculty: FacultyMember[] = [];
    snap.forEach((d) => faculty.push(d.data() as FacultyMember));
    return faculty;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}

export async function saveFacultyToFirestore(faculty: FacultyMember): Promise<boolean> {
  const path = `faculty_members/${faculty.id}`;
  try {
    await setDoc(doc(db, 'faculty_members', faculty.id), stripUndefinedValues(faculty));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function batchSaveFacultyToFirestore(faculty: FacultyMember[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    faculty.slice(0, 450).forEach((member) => {
      batch.set(doc(db, 'faculty_members', member.id), stripUndefinedValues(member));
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'faculty_members/batch');
    return false;
  }
}

export function subscribeFacultyFromFirestore(onUpdate: (faculty: FacultyMember[]) => void): () => void {
  const colPath = 'faculty_members';
  return onSnapshot(
    collection(db, colPath),
    (snap) => onUpdate(snap.docs.map((d) => d.data() as FacultyMember)),
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

// ----------------------------------------------------
// Department / Course Firestore Operations
// ----------------------------------------------------
export async function getCoursesFromFirestore(): Promise<CourseDepartmentMapping[]> {
  const colPath = 'course_departments';
  try {
    const snap = await getDocs(collection(db, colPath));
    const courses: CourseDepartmentMapping[] = [];
    snap.forEach((d) => courses.push(d.data() as CourseDepartmentMapping));
    return courses;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}

export async function saveCourseToFirestore(course: CourseDepartmentMapping): Promise<boolean> {
  const path = `course_departments/${course.courseId}`;
  try {
    await setDoc(doc(db, 'course_departments', course.courseId), stripUndefinedValues(course));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function batchSaveCoursesToFirestore(courses: CourseDepartmentMapping[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    courses.slice(0, 450).forEach((course) => {
      batch.set(doc(db, 'course_departments', course.courseId), stripUndefinedValues(course));
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'course_departments/batch');
    return false;
  }
}

export function subscribeCoursesFromFirestore(onUpdate: (courses: CourseDepartmentMapping[]) => void): () => void {
  const colPath = 'course_departments';
  return onSnapshot(
    collection(db, colPath),
    (snap) => onUpdate(snap.docs.map((d) => d.data() as CourseDepartmentMapping)),
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

// ----------------------------------------------------
// Teacher Accounts Firestore Operations
// ----------------------------------------------------
export async function getTeachersFromFirestore(): Promise<TeacherAccount[]> {
  const colPath = 'teacher_accounts';
  try {
    const snap = await getDocs(collection(db, colPath));
    const teachers: TeacherAccount[] = [];
    snap.forEach((d) => {
      teachers.push(d.data() as TeacherAccount);
    });
    return teachers;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}

export function subscribeTeachersFromFirestore(onUpdate: (teachers: TeacherAccount[]) => void): () => void {
  const colPath = 'teacher_accounts';
  return onSnapshot(
    collection(db, colPath),
    { includeMetadataChanges: true },
    (snap) => {
      // Do not let a device's IndexedDB/local Firestore cache become the
      // apparent source of truth. Wait for a server-backed snapshot.
      if (snap.metadata.fromCache) return;
      const teachers: TeacherAccount[] = [];
      snap.forEach((d) => {
        teachers.push(d.data() as TeacherAccount);
      });
      // Also notify for an empty server collection so every Admin device
      // reflects the actual Firestore state.
      onUpdate(teachers);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

function stripUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedValues(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, item]) => {
      if (item !== undefined) {
        result[key] = stripUndefinedValues(item);
      }
    });
    return result as T;
  }
  return value;
}

export async function saveTeacherToFirestore(teacher: TeacherAccount): Promise<boolean> {
  const path = `teacher_accounts/${teacher.id}`;
  try {
    // Firestore rejects undefined field values unless ignoreUndefinedProperties
    // is enabled. TeacherAccount has several optional fields, so sanitize them
    // before every write.
    const teacherRef = doc(db, 'teacher_accounts', teacher.id);
    await setDoc(
      teacherRef,
      stripUndefinedValues(teacher)
    );

    // Confirm the write reached the Firestore server, not just the local
    // Firestore client cache. This is important for cross-device approvals.
    const confirmed = await getDocFromServer(teacherRef);
    if (!confirmed.exists()) {
      throw new Error('Teacher request was not found on the Firestore server after saving.');
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteTeacherFromFirestore(teacherId: string): Promise<boolean> {
  const path = `teacher_accounts/${teacherId}`;
  try {
    await deleteDoc(doc(db, 'teacher_accounts', teacherId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function deleteLocationFromFirestore(locationId: string): Promise<boolean> {
  const path = `campus_locations/${locationId}`;
  try {
    await deleteDoc(doc(db, 'campus_locations', locationId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function deleteFacultyFromFirestore(facultyId: string): Promise<boolean> {
  const path = `faculty_members/${facultyId}`;
  try {
    await deleteDoc(doc(db, 'faculty_members', facultyId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function deleteCourseFromFirestore(courseId: string): Promise<boolean> {
  const path = `course_departments/${courseId}`;
  try {
    await deleteDoc(doc(db, 'course_departments', courseId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

// ----------------------------------------------------
// Bug Reports Firestore Operations
// ----------------------------------------------------
export async function saveBugReportToFirestore(report: any): Promise<boolean> {
  const id = report.id || `bug-${Date.now()}`;
  const path = `bug_reports/${id}`;
  try {
    await setDoc(doc(db, 'bug_reports', id), {
      ...report,
      id,
      createdAt: report.createdAt || Date.now(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return false;
  }
}
