export type LocationCategory =
  | 'department'
  | 'faculty'
  | 'admin'
  | 'library'
  | 'canteen'
  | 'hostel'
  | 'sports'
  | 'gate'
  | 'facility'
  | 'lab'
  | 'custom_student';

export interface FacultyMember {
  id: string;
  name: string;
  hindiName?: string;
  designation: string; // e.g. "Head of Department", "Associate Professor"
  department: string;
  departmentId: string;
  cabinRoom: string; // e.g. "Room 204", "Cabin B-12"
  floor: string; // e.g. "2nd Floor"
  buildingName: string;
  buildingId: string;
  email?: string;
  phone?: string;
  officeHours?: string;
  subjects?: string[];
  avatar?: string;
  notes?: string;
  isCustom?: boolean;
  addedBy?: string;
}

export interface CampusFacility {
  name: string;
  icon: string;
}

export interface CampusLocation {
  id: string;
  title: string;
  hindiTitle: string;
  category: LocationCategory;
  coordinates: [number, number]; // [lat, lng]
  block?: string;
  floor?: string;
  roomNumber?: string;
  description: string;
  hindiDescription?: string;
  coursesOffered?: string[]; // e.g. ["B.Tech Computer Science", "B.Tech IT"]
  facultyList?: FacultyMember[];
  facilities?: string[]; // ["Wi-Fi", "Water Cooler", "Washrooms", "Elevator", "Ramp"]
  image?: string;
  iconName?: string;
  color?: string;
  popularSearchTerms?: string[];
  isCustom?: boolean;
  addedBy?: string;
  teacherId?: string;
  createdAt?: number;
  likes?: number;
}

export interface CourseDepartmentMapping {
  courseId: string;
  courseName: string;
  hindiName: string;
  degreeType: 'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Doctorate';
  departmentName: string;
  departmentLocationId: string;
  block: string;
  floor: string;
  hodName: string;
  hodCabin: string;
  recommendedGate: string;
  recommendedGateId: string;
  keyRooms: { name: string; room: string; floor: string }[];
  tags: string[];
  description?: string;
  hindiDescription?: string;
  coursesOffered?: string[];
}

export interface RouteNode {
  id: string;
  name: string;
  coordinates: [number, number];
}

export interface RouteEdge {
  from: string;
  to: string;
  distanceMeters: number;
  pathCoordinates: [number, number][]; // Polyline points along actual campus roads
  surface: 'road' | 'footpath' | 'indoor';
}

export interface NavigationStep {
  instructionEn: string;
  instructionHi: string;
  distanceMeters: number;
  durationSeconds: number;
  action: 'start' | 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'arrive';
  landmarkName?: string;
  coordinates: [number, number];
}

export interface NavigationRoute {
  path: [number, number][];
  steps: NavigationStep[];
  totalDistanceMeters: number;
  totalTimeMinutesWalking: number;
  totalTimeMinutesBicycle: number;
  fromLocation: CampusLocation;
  toLocation: CampusLocation;
}

export type Language = 'en' | 'hi';
export type MapStyle = 'streets' | 'satellite' | 'dark' | 'clean';

export type TeacherPermission =
  | 'manage_profile'
  | 'post_events'
  | 'approve_events'
  | 'manage_locations'
  | 'edit_department'
  | 'manage_faculty'
  | 'manage_floor_plans'
  | 'broadcast_notices';

export interface TeacherAccessPolicy {
  allowAddLocations: boolean;    // Admin option: whether teachers can add/manage campus locations
  allowAddDepartments: boolean;  // Admin option: whether teachers can add/manage departments & courses
  allowAddFaculty: boolean;      // Admin option: whether teachers can add/manage faculty directory members
}

export type TeacherAccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface TeacherAccount {
  id: string;
  name: string;
  hindiName?: string;
  email: string;
  passwordHash: string;
  department: string;
  departmentId?: string;
  designation: string; // e.g. "Professor", "Associate Professor", "Assistant Professor", "HOD"
  cabinRoom: string; // e.g. "Room 204", "Cabin B-12"
  floor: string; // e.g. "2nd Floor"
  buildingName: string;
  buildingId: string;
  phone: string;
  officeHours?: string;
  subjects?: string[];
  avatar?: string;

  // ID Verification
  idCardPhoto: string; // Base64 data URL or photo URL
  idCardSubmittedAt: number;
  status: TeacherAccountStatus;
  rejectionReason?: string;
  approvedAt?: number;
  approvedBy?: string;

  // Granular Access Permissions (controlled by Admin)
  permissions: TeacherPermission[];

  createdAt: number;
  lastLoginAt?: number;
}

export type EventCategory =
  | 'Fest'
  | 'Seminar'
  | 'Workshop'
  | 'Sports'
  | 'Cultural'
  | 'Notice'
  | 'Placement Drive'
  | 'General'
  | 'Other';

export type EventStatus = 'pending' | 'approved' | 'rejected';

export interface CampusEvent {
  id: string;
  title: string;
  hindiTitle?: string;
  description: string;
  hindiDescription?: string;
  category: EventCategory;
  posterImage?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (auto-hides after this date)
  time: string; // e.g. "10:00 AM - 04:00 PM"
  venue: string; // e.g. "Auditorium Hall"
  venueLocationId?: string; // CampusLocation ID for 1-click map navigation
  organizer: string; // e.g. "Department of CSE"
  contactPhone?: string;
  contactEmail?: string;
  registrationUrl?: string;

  // Student verification details (for student submitted events)
  submittedByStudentName?: string;
  studentRollNo?: string;
  studentCourseBranch?: string;
  studentMobile?: string;

  // Teacher / Staff submission tracking
  postedByTeacherId?: string;
  submittedByTeacherName?: string;

  // Workflow & moderation
  status: EventStatus;
  isLive: boolean; // Manual On/Off toggle
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: number;
  likesCount?: number;
  isCustom?: boolean;
  isOfficialCollegeFeed?: boolean;
  sourceUrl?: string;
  circularUrl?: string;
  isAutoSynced?: boolean;
  lastSyncedAt?: string;
}
