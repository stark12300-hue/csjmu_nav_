import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  Phone,
  Mail,
  BookOpen,
  Edit,
  Save,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  X,
  LogOut,
  Navigation,
  FileText,
  AlertCircle,
  Eye,
  Layers,
  Plus,
  Check,
  Trash2,
  Power,
  Search,
  ExternalLink,
  Shield,
  Upload,
  Camera,
  GraduationCap,
  Move,
  Crosshair,
} from 'lucide-react';
import {
  TeacherAccount,
  TeacherPermission,
  CampusLocation,
  Language,
  CampusEvent,
  EventCategory,
  LocationCategory,
  FacultyMember,
  CourseDepartmentMapping,
  TeacherAccessPolicy,
} from '../types';
import {
  updateTeacherProfile,
  teacherHasPermission,
  saveCustomEvent,
  getStoredEvents,
  approveStoredEvent,
  rejectStoredEvent,
  toggleEventLiveStatus,
  deleteEventById,
  saveCustomLocation,
  getStoredFaculty,
  saveCustomFaculty,
  updateFacultyMember,
  deleteFacultyMember,
  getStoredCourses,
  getSavedLocationsList,
  saveCustomCourse,
  updateCourseDepartmentMapping,
  deleteCourseDepartmentMapping,
  canTeacherAddLocations,
  canTeacherAddDepartments,
  canTeacherAddFaculty,
  getTeacherAccessPolicy,
  getStoredTeacherAccounts,
  getTeacherAuthHeaders,
  getStoredLocations,
} from '../utils/storage';
import {
  postRemoteEvent,
  updateRemoteEvent,
  deleteRemoteEvent,
  fetchRemoteEvents,
} from '../utils/eventRemote';
import { AdminFacultyManager } from './admin/AdminFacultyManager';
import { AdminDepartmentManager } from './admin/AdminDepartmentManager';
import { CSJMU_CENTER } from '../data/csjmuCampusData';

import { updateRemoteTeacher } from '../utils/teacherRemote';

interface TeacherPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherAccount;
  onUpdateTeacher: (updated: TeacherAccount) => void;
  onLogout: () => void;
  locations: CampusLocation[];
  onNavigateToCabin: (cabinLocation: CampusLocation) => void;
  onOpenAddMarker?: () => void;
  onAddLocation?: (loc: CampusLocation) => void;
  onUpdateLocation?: (loc: CampusLocation) => void;
  onUpdateLocationCoordinates?: (id: string, coords: [number, number]) => void;
  onDeleteLocation?: (id: string) => void;
  onAddFaculty?: (faculty: FacultyMember) => void;
  onUpdateFaculty?: (faculty: FacultyMember) => void;
  onDeleteFaculty?: (facultyId: string) => void;
  onAddCourse?: (course: CourseDepartmentMapping) => void;
  onUpdateCourse?: (course: CourseDepartmentMapping) => void;
  onDeleteCourse?: (courseId: string) => void;
  onAddEvent?: (event: CampusEvent) => void;
  onOpenAdminMode?: () => void;
  isDragUnlocked?: boolean;
  onToggleDragMode?: (enabled: boolean) => void;
  events?: CampusEvent[];
  onApproveEvent?: (eventId: string) => void;
  onRejectEvent?: (eventId: string, reason?: string) => void;
  onToggleLiveEvent?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  language: Language;
  initialTab?: 'profile' | 'events' | 'locations' | 'departments' | 'faculty' | 'idcard';
  pickedCoordinatesForTeacher?: [number, number] | null;
  onStartPickingLocation?: (target: 'locations' | 'profile') => void;
}

export const TeacherPortalModal: React.FC<TeacherPortalModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onUpdateTeacher,
  onLogout,
  locations,
  onNavigateToCabin,
  onOpenAddMarker,
  onAddLocation,
  onUpdateLocation,
  onUpdateLocationCoordinates,
  onDeleteLocation,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddEvent,
  onOpenAdminMode,
  isDragUnlocked = false,
  onToggleDragMode,
  events: propEvents,
  onApproveEvent,
  onRejectEvent,
  onToggleLiveEvent,
  onDeleteEvent,
  language,
  initialTab,
  pickedCoordinatesForTeacher,
  onStartPickingLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'locations' | 'departments' | 'faculty' | 'idcard'>(initialTab || 'profile');
  const [eventsSubTab, setEventsSubTab] = useState<'pending' | 'active' | 'create'>('pending');

  // React to initialTab changes from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Live Teacher & Policy States (reactive to admin permission changes)
  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount>(teacher);
  const [globalAccessPolicy, setGlobalAccessPolicy] = useState<TeacherAccessPolicy>(() => getTeacherAccessPolicy());

  useEffect(() => {
    setCurrentTeacher(teacher);
  }, [teacher]);

  useEffect(() => {
    const handleSync = () => {
      const stored = getStoredTeacherAccounts();
      const match = stored.find(
        (a) => a.id === teacher.id || (a.email && teacher.email && a.email.toLowerCase() === teacher.email.toLowerCase())
      );
      if (match) {
        setCurrentTeacher(match);
      }
      setGlobalAccessPolicy(getTeacherAccessPolicy());
    };

    window.addEventListener('teacher-session-updated', handleSync);
    window.addEventListener('teacher-policy-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('teacher-session-updated', handleSync);
      window.removeEventListener('teacher-policy-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [teacher.id, teacher.email]);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [cabinRoom, setCabinRoom] = useState(teacher.cabinRoom || '');
  const [floor, setFloor] = useState(teacher.floor || '1st Floor');
  const [buildingId, setBuildingId] = useState(teacher.buildingId || 'uiet-1');
  const [phone, setPhone] = useState(teacher.phone || '');
  const [officeHours, setOfficeHours] = useState(teacher.officeHours || '10:00 AM - 04:00 PM (Mon-Fri)');
  const [subjectsInput, setSubjectsInput] = useState((teacher.subjects || []).join(', '));
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Local Events state for instantaneous updates
  const [localEvents, setLocalEvents] = useState<CampusEvent[]>(() => propEvents || getStoredEvents());
  const currentEvents = propEvents || localEvents;

  // Keep localEvents synced with propEvents from parent
  useEffect(() => {
    if (propEvents) {
      setLocalEvents(propEvents);
    }
  }, [propEvents]);

  // Real-time remote events synchronization for Teacher Portal
  useEffect(() => {
    let isMounted = true;
    fetchRemoteEvents().then((evts) => {
      if (isMounted && Array.isArray(evts) && evts.length > 0) {
        setLocalEvents(evts);
      }
    });

    const handleSync = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.events && Array.isArray(customEvt.detail.events)) {
        setLocalEvents(customEvt.detail.events);
      }
    };
    window.addEventListener('csjmu_events_synced', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('csjmu_events_synced', handleSync);
    };
  }, []);

  // In-App Confirm Dialog State (Replaces window.confirm which fails in iframe sandboxes)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  // Local Faculty & Courses lists for instant updates when teacher has access
  const [facultyList, setFacultyList] = useState<FacultyMember[]>(() => getStoredFaculty());
  const [coursesList, setCoursesList] = useState<CourseDepartmentMapping[]>(() => getStoredCourses());

  // Event Rejection State
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Incomplete event details or unverified schedule.');

  // Quick Event Creation States
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('Seminar');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('11:00 AM - 02:00 PM');

  // Automatic match for campus venue from teacher building or primary campus auditorium
  const defaultCampusLoc =
    locations.find(
      (l) =>
        (teacher.buildingId &&
          (l.id === teacher.buildingId ||
            l.id === `loc-${teacher.buildingId}` ||
            l.id.replace('loc-', '') === teacher.buildingId.replace('loc-', ''))) ||
        (teacher.buildingName &&
          (l.title.toLowerCase().includes(teacher.buildingName.toLowerCase()) ||
            (l.hindiTitle && l.hindiTitle.includes(teacher.buildingName))))
    ) || locations.find((l) => l.id.includes('auditorium') || l.id === 'loc-auditorium');

  const [eventVenueLocationId, setEventVenueLocationId] = useState<string>(defaultCampusLoc ? defaultCampusLoc.id : '');
  const [eventVenue, setEventVenue] = useState(
    defaultCampusLoc ? defaultCampusLoc.title : (teacher.buildingName || 'UIET Auditorium')
  );
  const [eventSuccess, setEventSuccess] = useState(false);

  const handleVenueLocationSelect = (locId: string) => {
    setEventVenueLocationId(locId);
    if (locId) {
      const matched = locations.find((l) => l.id === locId);
      if (matched) {
        setEventVenue(matched.title);
      }
    }
  };

  const handleVenueInputChange = (val: string) => {
    setEventVenue(val);
    const matched = locations.find(
      (l) =>
        l.title.toLowerCase() === val.trim().toLowerCase() ||
        (l.hindiTitle && l.hindiTitle.toLowerCase() === val.trim().toLowerCase())
    );
    if (matched) {
      setEventVenueLocationId(matched.id);
    } else if (!val.trim()) {
      setEventVenueLocationId('');
    }
  };

  // Add Campus Location Form States
  const [locTitle, setLocTitle] = useState('');
  const [locHindiTitle, setLocHindiTitle] = useState('');
  const [locCategory, setLocCategory] = useState<LocationCategory>('department');
  const [locBuildingId, setLocBuildingId] = useState(teacher.buildingId || 'uiet-1');
  const [locFloor, setLocFloor] = useState('Ground Floor');
  const [locRoomNumber, setLocRoomNumber] = useState('');
  const [locDescription, setLocDescription] = useState('');
  const [locFacilities, setLocFacilities] = useState('High-Speed Wi-Fi, Projector, Air Conditioning');
  const [locLat, setLocLat] = useState('26.4984');
  const [locLng, setLocLng] = useState('80.2662');
  const [locPhoto, setLocPhoto] = useState('');
  const [lastAddedLocation, setLastAddedLocation] = useState<CampusLocation | null>(null);

  // Sync default coordinates when building or locations change
  useEffect(() => {
    const b = locations.find(
      (l) =>
        l.id === locBuildingId ||
        l.id === `loc-${locBuildingId}` ||
        l.id.replace('loc-', '') === locBuildingId.replace('loc-', '')
    );
    if (b && Array.isArray(b.coordinates) && !isNaN(b.coordinates[0]) && !isNaN(b.coordinates[1])) {
      setLocLat(b.coordinates[0].toFixed(6));
      setLocLng(b.coordinates[1].toFixed(6));
    }
  }, [locBuildingId, locations]);

  // When coordinates are confirmed from map pin picker
  useEffect(() => {
    if (!pickedCoordinatesForTeacher) return;

    if (activeTab === 'profile') {
      let minDistance = Infinity;
      let nearestBuilding: CampusLocation | null = null;
      for (const loc of locations) {
        if (loc.category === 'department' || loc.category === 'faculty') {
          const dist = Math.hypot(loc.coordinates[0] - pickedCoordinatesForTeacher[0], loc.coordinates[1] - pickedCoordinatesForTeacher[1]);
          if (dist < minDistance) {
            minDistance = dist;
            nearestBuilding = loc;
          }
        }
      }
      if (nearestBuilding) {
        setBuildingId(nearestBuilding.id);
        setIsEditingProfile(true);
        showToast(language === 'hi' ? `भवन चुना गया: ${nearestBuilding.title}` : `Building selected: ${nearestBuilding.title}`);
      }
    } else {
      setLocLat(pickedCoordinatesForTeacher[0].toFixed(6));
      setLocLng(pickedCoordinatesForTeacher[1].toFixed(6));
      let minDistance = Infinity;
      let nearestBuilding: CampusLocation | null = null;
      for (const loc of locations) {
        if (loc.category === 'department' || loc.category === 'faculty') {
          const dist = Math.hypot(loc.coordinates[0] - pickedCoordinatesForTeacher[0], loc.coordinates[1] - pickedCoordinatesForTeacher[1]);
          if (dist < minDistance) {
            minDistance = dist;
            nearestBuilding = loc;
          }
        }
      }
      if (nearestBuilding) {
        setLocBuildingId(nearestBuilding.id);
      }
      showToast(language === 'hi' ? 'स्थान के GPS निर्देशांक अपडेट हो गए!' : 'GPS coordinates updated from map!');
    }
  }, [pickedCoordinatesForTeacher, activeTab]);

  const handleBuildingSelect = (buildingId: string) => {
    setLocBuildingId(buildingId);
    const b = locations.find(
      (l) =>
        l.id === buildingId ||
        l.id === `loc-${buildingId}` ||
        l.id.replace('loc-', '') === buildingId.replace('loc-', '')
    );
    if (b && Array.isArray(b.coordinates) && !isNaN(b.coordinates[0]) && !isNaN(b.coordinates[1])) {
      setLocLat(b.coordinates[0].toFixed(6));
      setLocLng(b.coordinates[1].toFixed(6));
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const hasPerm = (perm: TeacherPermission) => {
    // If admin granted admin_access or the specific permission
    return teacherHasPermission(currentTeacher, perm);
  };

  const canApproveEvents = hasPerm('approve_events') || hasPerm('post_events');
  const canManageLocations = hasPerm('manage_locations');

  // Dual-Layer Admin Policy + Teacher Permission Checkers (Re-evaluates dynamically!)
  const canAddLocations = canTeacherAddLocations(currentTeacher);
  const canAddDepartments = canTeacherAddDepartments(currentTeacher);
  const canAddFaculty = canTeacherAddFaculty(currentTeacher);

  // Faculty & Department Handlers for Teachers
  const syncTeacherCampusData = async (reason: string) => {
    try {
      const headers = getTeacherAuthHeaders();
      const payload = {
        source: 'teacher_portal',
        reason,
        data: {
          locations: getStoredLocations(),
          faculty: getStoredFaculty(),
          courses: getStoredCourses(),
          events: getStoredEvents(),
        },
      };
      await fetch('/api/locations/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('Teacher campus sync error:', e);
    }
  };

  const handleAddFaculty = async (newFaculty: FacultyMember) => {
    saveCustomFaculty(newFaculty);
    const updated = getStoredFaculty();
    setFacultyList(updated);
    onAddFaculty?.(newFaculty);
    await syncTeacherCampusData(`Teacher added faculty: ${newFaculty.name}`);
    showToast(language === 'hi' ? 'नया शिक्षक सफलतापूर्वक जोड़ा गया और क्लाउड पर सिंक हो गया!' : 'New faculty member added and synced to cloud!');
  };

  const handleUpdateFaculty = async (updated: FacultyMember) => {
    updateFacultyMember(updated);
    setFacultyList(getStoredFaculty());
    onUpdateFaculty?.(updated);
    await syncTeacherCampusData(`Teacher updated faculty: ${updated.name}`);
    showToast(language === 'hi' ? 'शिक्षक जानकारी अपडेट और क्लाउड पर सिंक की गई!' : 'Faculty details updated and synced to cloud!');
  };

  const handleDeleteFaculty = async (id: string) => {
    deleteFacultyMember(id);
    setFacultyList(getStoredFaculty());
    onDeleteFaculty?.(id);
    await syncTeacherCampusData(`Teacher deleted faculty: ${id}`);
    showToast(language === 'hi' ? 'शिक्षक रिकॉर्ड हटा दिया गया और क्लाउड पर सिंक हो गया।' : 'Faculty member removed and synced to cloud.');
  };

  const handleAddCourse = async (newCourse: CourseDepartmentMapping) => {
    saveCustomCourse(newCourse);
    const updated = getStoredCourses();
    setCoursesList(updated);
    onAddCourse?.(newCourse);
    await syncTeacherCampusData(`Teacher added department/course: ${newCourse.courseName}`);
    showToast(language === 'hi' ? 'नया विभाग/कोर्स जोड़ा गया और क्लाउड पर सिंक हो गया!' : 'New department/course added and synced to cloud!');
  };

  const handleUpdateCourse = async (updated: CourseDepartmentMapping) => {
    updateCourseDepartmentMapping(updated);
    setCoursesList(getStoredCourses());
    onUpdateCourse?.(updated);
    await syncTeacherCampusData(`Teacher updated department/course: ${updated.courseName}`);
    showToast(language === 'hi' ? 'विभाग विवरण अपडेट और क्लाउड पर सिंक किया गया!' : 'Department details updated and synced to cloud!');
  };

  const handleDeleteCourse = async (id: string) => {
    deleteCourseDepartmentMapping(id);
    setCoursesList(getStoredCourses());
    onDeleteCourse?.(id);
    await syncTeacherCampusData(`Teacher deleted department/course: ${id}`);
    showToast(language === 'hi' ? 'विभाग रिकॉर्ड हटा दिया गया और क्लाउड पर सिंक हो गया।' : 'Department removed and synced to cloud.');
  };

  // Event Handlers with Cloud Synchronization
  const handleApprove = async (eventId: string) => {
    const updated = approveStoredEvent(eventId);
    setLocalEvents(updated);
    if (onApproveEvent) {
      onApproveEvent(eventId);
    }
    await updateRemoteEvent(eventId, {
      status: 'approved',
      isLive: true,
      approvedAt: new Date().toISOString(),
    });
    await syncTeacherCampusData(`Teacher approved event: ${eventId}`);
    showToast(language === 'hi' ? 'इवेंट स्वीकृत और क्लाउड पर लाइव कर दिया गया!' : 'Event approved and published live to cloud!');
  };

  const handleConfirmReject = async () => {
    if (!rejectingEventId) return;
    const targetId = rejectingEventId;
    const updated = rejectStoredEvent(targetId, rejectReason);
    setLocalEvents(updated);
    if (onRejectEvent) {
      onRejectEvent(targetId, rejectReason);
    }
    setRejectingEventId(null);
    await updateRemoteEvent(targetId, {
      status: 'rejected',
      isLive: false,
      rejectionReason: rejectReason,
    });
    await syncTeacherCampusData(`Teacher rejected event: ${targetId}`);
    showToast(language === 'hi' ? 'इवेंट अस्वीकृत और क्लाउड पर सिंक कर दिया गया।' : 'Event rejected and synced to cloud.');
  };

  const handleToggleLive = async (eventId: string) => {
    const target = currentEvents.find((e) => e.id === eventId);
    const newIsLive = target ? !target.isLive : true;
    const updated = toggleEventLiveStatus(eventId);
    setLocalEvents(updated);
    if (onToggleLiveEvent) {
      onToggleLiveEvent(eventId);
    }
    await updateRemoteEvent(eventId, { isLive: newIsLive });
    await syncTeacherCampusData(`Teacher toggled event live status: ${eventId}`);
    showToast(language === 'hi' ? 'इवेंट लाइव स्थिति क्लाउड पर अपडेट हो गई!' : 'Event live status synced to cloud!');
  };

  const executeDeleteEvent = async (eventId: string) => {
    try {
      const updated = deleteEventById(eventId);
      setLocalEvents(updated);
      if (onDeleteEvent) {
        onDeleteEvent(eventId);
      }
      await deleteRemoteEvent(eventId);
      await syncTeacherCampusData(`Teacher deleted event: ${eventId}`);
      showToast(language === 'hi' ? 'इवेंट सफलतापूर्वक हटा दिया गया और क्लाउड पर सिंक हो गया।' : 'Event deleted successfully and synced to cloud.');
    } catch (e) {
      console.error('Error deleting event:', e);
      const updated = deleteEventById(eventId);
      setLocalEvents(updated);
      if (onDeleteEvent) {
        onDeleteEvent(eventId);
      }
      showToast(language === 'hi' ? 'इवेंट हटा दिया गया।' : 'Event removed.');
    }
  };

  const promptDeleteEvent = (eventId: string, eventTitle?: string) => {
    const titleText = eventTitle || (language === 'hi' ? 'इस इवेंट' : 'this event');
    setConfirmDialog({
      title: language === 'hi' ? 'इवेंट हटाएं?' : 'Delete Event?',
      message:
        language === 'hi'
          ? `क्या आप वाकई इवेंट "${titleText}" को हटाना चाहते हैं? यह कैंपस मैप और इवेंट सूची से तुरंत हटा दिया जाएगा।`
          : `Are you sure you want to delete "${titleText}"? It will be removed from the campus map and events list.`,
      confirmLabel: language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Delete',
      onConfirm: () => {
        executeDeleteEvent(eventId);
      },
    });
  };

  const promptDeleteLocation = (locId: string, locTitle: string, isJustAdded?: boolean) => {
    setConfirmDialog({
      title: language === 'hi' ? 'स्थान हटाएं?' : 'Delete Location?',
      message:
        language === 'hi'
          ? `क्या आप वाकई स्थान "${locTitle}" को हटाना चाहते हैं?`
          : `Are you sure you want to delete location "${locTitle}"?`,
      confirmLabel: language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Delete',
      onConfirm: () => {
        if (onDeleteLocation) {
          onDeleteLocation(locId);
          if (isJustAdded || lastAddedLocation?.id === locId) {
            setLastAddedLocation(null);
          }
          showToast(
            language === 'hi'
              ? 'स्थान सफलतापूर्वक हटा दिया गया।'
              : 'Location removed successfully.'
          );
        }
      },
    });
  };

  const handleDelete = (eventId: string) => {
    const evt = currentEvents.find((e) => e.id === eventId);
    promptDeleteEvent(eventId, evt?.title);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjects = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const selectedLoc = locations.find((l) => l.id === buildingId);
    const buildingName = selectedLoc ? selectedLoc.title : teacher.buildingName;

    const updates: Partial<TeacherAccount> = {
      cabinRoom,
      floor,
      buildingId,
      buildingName,
      phone,
      officeHours,
      subjects,
    };

    const remote = await updateRemoteTeacher(teacher.id, 'profile', { updates });
    if (!remote.success) {
      showToast(
        language === 'hi'
          ? `प्रोफाइल सर्वर पर सेव नहीं हुई: ${remote.message || 'पुनः प्रयास करें।'}`
          : `Profile was not synced to the server: ${remote.message || 'Please retry.'}`
      );
      return;
    }
    updateTeacherProfile(teacher.id, updates);
    onUpdateTeacher({ ...teacher, ...updates });
    setIsEditingProfile(false);
    showToast(language === 'hi' ? 'केबिन व प्रोफाइल विवरण सफलतापूर्वक अपडेट हो गया!' : 'Cabin & profile details updated successfully!');
  };

  const handlePostTeacherEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEvt: CampusEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: eventTitle.trim(),
      description: eventDescription.trim() || `Official departmental event organized by ${teacher.name}`,
      category: eventCategory,
      startDate: eventDate,
      endDate: eventDate,
      time: eventTime,
      venue: eventVenue.trim(),
      venueLocationId: eventVenueLocationId || undefined,
      organizer: `${teacher.name} (${teacher.department})`,
      contactEmail: teacher.email,
      contactPhone: teacher.phone,
      status: 'approved', // Teacher created events are auto-approved
      isLive: true,
      createdAt: Date.now(),
      isCustom: true,
      postedByTeacherId: teacher.id,
    };

    // 1. Save locally for instant UI update
    const updated = saveCustomEvent(newEvt);
    setLocalEvents(updated);
    onAddEvent?.(newEvt);
    setEventSuccess(true);
    setEventTitle('');
    setEventDescription('');

    // 2. Persist to cloud & server
    showToast(language === 'hi' ? 'इवेंट क्लाउड पर सिंक हो रहा है...' : 'Syncing event to cloud...');
    try {
      const res = await postRemoteEvent(newEvt);
      if (res.success && res.events) {
        setLocalEvents(res.events);
        showToast(language === 'hi' ? 'विभागीय इवेंट क्लाउड व सर्वर पर लाइव प्रकाशित हो गया!' : 'Department event published live to cloud & server!');
      } else {
        await syncTeacherCampusData(`Teacher posted event: ${newEvt.title}`);
        showToast(language === 'hi' ? 'विभागीय इवेंट लाइव प्रकाशित हो गया!' : 'Department event published live!');
      }
    } catch {
      await syncTeacherCampusData(`Teacher posted event: ${newEvt.title}`);
    }

    setTimeout(() => {
      setEventSuccess(false);
      setEventsSubTab('active');
    }, 1500);
  };

  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locTitle.trim()) {
      showToast(language === 'hi' ? 'कृपया स्थान का नाम दर्ज करें' : 'Please enter location title');
      return;
    }

    const building = locations.find(
      (l) =>
        l.id === locBuildingId ||
        l.id === `loc-${locBuildingId}` ||
        l.id.replace('loc-', '') === locBuildingId.replace('loc-', '')
    );
    const parsedLat = parseFloat(locLat);
    const parsedLng = parseFloat(locLng);
    const lat = !isNaN(parsedLat) && isFinite(parsedLat) && parsedLat > 20 && parsedLat < 35 
      ? parsedLat 
      : (building?.coordinates?.[0] || CSJMU_CENTER[0]);
    const lng = !isNaN(parsedLng) && isFinite(parsedLng) && parsedLng > 75 && parsedLng < 88 
      ? parsedLng 
      : (building?.coordinates?.[1] || CSJMU_CENTER[1]);
    const safeCoords: [number, number] = [Number(lat), Number(lng)];

    const newLocation: CampusLocation = {
      id: `custom-loc-${Date.now()}`,
      title: locTitle.trim(),
      hindiTitle: locHindiTitle.trim() || locTitle.trim(),
      category: locCategory,
      coordinates: safeCoords,
      block: building?.block || building?.title || 'Main Campus',
      floor: locFloor,
      roomNumber: locRoomNumber.trim() || undefined,
      description: locDescription.trim() || `${locTitle.trim()} added by ${currentTeacher.name} (${currentTeacher.department}).`,
      facilities: locFacilities.split(',').map((f) => f.trim()).filter(Boolean),
      image: locPhoto.trim() || undefined,
      isCustom: true,
      addedBy: `${currentTeacher.name} (${currentTeacher.department})`,
      teacherId: currentTeacher.id,
      createdAt: Date.now(),
    };

    if (onAddLocation) {
      onAddLocation(newLocation);
    } else {
      saveCustomLocation(newLocation);
      await syncTeacherCampusData(`Teacher added location: ${newLocation.title}`);
    }

    setLastAddedLocation(newLocation);
    setLocTitle('');
    setLocHindiTitle('');
    setLocRoomNumber('');
    setLocDescription('');
    setLocPhoto('');
    showToast(language === 'hi' ? 'नया कैंपस स्थान सफलतापूर्वक मैप पर जोड़ दिया गया!' : 'New campus location added to map successfully!');
  };

  const handleLocateCabin = () => {
    let loc = locations.find((l) => l.id === teacher.buildingId || l.id === teacher.departmentId);
    if (!loc && teacher.department) {
      const deptLower = teacher.department.toLowerCase();
      loc = locations.find(
        (l) => l.title.toLowerCase().includes(deptLower) || (l.hindiTitle && l.hindiTitle.includes(teacher.department))
      );
    }
    if (loc) {
      onNavigateToCabin(loc);
      onClose();
    } else {
      showToast(
        language === 'hi'
          ? 'केबिन लोकेशन मैप पर नहीं मिली। कृपया "संपादित करें" पर क्लिक करके अपना भवन चुनें।'
          : 'Cabin location not mapped yet. Please click "Edit Details" to select your building.'
      );
    }
  };

  const pendingEventsList = currentEvents.filter((e) => e.status === 'pending');
  const approvedEventsList = currentEvents.filter((e) => e.status === 'approved');
  const rejectedEventsList = currentEvents.filter((e) => e.status === 'rejected');

  const PERMISSION_CONFIG: { key: TeacherPermission; label: string; hindiLabel: string; desc: string }[] = [
    {
      key: 'manage_profile',
      label: 'Cabin & Profile Manager',
      hindiLabel: 'केबिन व संपर्क संपादन',
      desc: 'Update cabin room, floor, office consultation hours & phone',
    },
    {
      key: 'post_events',
      label: 'Publish Events & Notices',
      hindiLabel: 'इवेंट्स व नोटिस प्रकाशन',
      desc: 'Create official departmental seminars, workshops & fests',
    },
    {
      key: 'approve_events',
      label: 'Approve & Moderate Student Events',
      hindiLabel: 'छात्र इवेंट अनुमोदन व समीक्षा',
      desc: 'Approve, reject, or toggle live status of student submitted campus events',
    },
    {
      key: 'manage_locations',
      label: 'Campus Marker / Lab Manager',
      hindiLabel: 'कैंपस लैब/मार्कर प्रबंधन',
      desc: 'Add or update classroom & laboratory coordinates',
    },
    {
      key: 'edit_department',
      label: 'Department Curriculum & Info',
      hindiLabel: 'विभाग व पाठ्यक्रम विवरण',
      desc: 'Edit departmental noticeboards and course outlines',
    },
    {
      key: 'manage_floor_plans',
      label: 'Indoor Floor Navigation',
      hindiLabel: 'फ्लोर प्लान इनडोर गाइड',
      desc: 'Manage indoor floor layout room positions',
    },
    {
      key: 'broadcast_notices',
      label: 'Student Urgent Broadcasts',
      hindiLabel: 'सूचना प्रसारण',
      desc: 'Broadcast high-priority alerts to visiting students',
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      id="teacher-portal-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        id="teacher-portal-modal-card"
        className="ios-liquid-modal rounded-3xl shadow-2xl border border-white/95 w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden text-zinc-900"
      >
        {/* Header */}
        <div className="px-3 py-2.5 sm:px-6 sm:py-4 ios-liquid-header border-b border-white/60 text-zinc-900 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base font-black truncate max-w-[130px] sm:max-w-none tracking-tight text-zinc-900">
                  {teacher.name}
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-500/15 text-emerald-800 border border-emerald-400/40 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 shadow-2xs">
                  <span className="hidden sm:inline">VERIFIED FACULTY </span>✅
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate max-w-[150px] sm:max-w-none font-medium">
                {teacher.designation} • {teacher.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onOpenAdminMode && (
              <button
                type="button"
                onClick={onOpenAdminMode}
                className="px-2 sm:px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                title="Switch to Admin Controls"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Admin Mode</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="px-2 sm:px-2.5 py-1 bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
              title="Logout from Faculty Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'hi' ? 'लॉगआउट' : 'Logout'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 sm:p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Mobile Optimized */}
        <div className="px-2 sm:px-6 py-2.5 bg-white/40 backdrop-blur-md border-b border-white/60 flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none touch-pan-x shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">{language === 'hi' ? 'मेरा केबिन व संपर्क' : 'My Cabin & Profile'}</span>
            <span className="sm:hidden">{language === 'hi' ? 'केबिन' : 'Cabin'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-700'
                : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{language === 'hi' ? 'इवेंट अनुमोदन व नोटिस' : 'Event Approvals & Notices'}</span>
            <span className="sm:hidden">{language === 'hi' ? 'इवेंट्स' : 'Events'}</span>
            {pendingEventsList.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-blue-700 font-bold rounded-full text-[10px]">
                {pendingEventsList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'locations'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">{language === 'hi' ? 'स्थान व रूम जोड़ें' : 'Add Campus Locations'}</span>
            <span className="sm:hidden">{language === 'hi' ? 'स्थान जोड़ें' : 'Locations'}</span>
            {!canAddLocations ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-100/80 text-rose-700 border border-rose-200 rounded-full text-[9px] font-extrabold">
                <Lock className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Restricted</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-full text-[9px] font-extrabold hidden sm:inline">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">{language === 'hi' ? 'विभाग व कोर्स प्रबंधन' : 'Departments & Courses'}</span>
            <span className="sm:hidden">{language === 'hi' ? 'विभाग' : 'Depts'}</span>
            {!canAddDepartments ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-100/80 text-rose-700 border border-rose-200 rounded-full text-[9px] font-extrabold">
                <Lock className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Restricted</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-full text-[9px] font-extrabold hidden sm:inline">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faculty')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'faculty'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">{language === 'hi' ? 'फैकल्टी डायरेक्टरी' : 'Faculty Directory'}</span>
            <span className="sm:hidden">{language === 'hi' ? 'फैकल्टी' : 'Faculty'}</span>
            {!canAddFaculty ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-100/80 text-rose-700 border border-rose-200 rounded-full text-[9px] font-extrabold">
                <Lock className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Restricted</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-full text-[9px] font-extrabold hidden sm:inline">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('idcard')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 ${
              activeTab === 'idcard'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{language === 'hi' ? 'आईडी कार्ड प्रमाण' : 'Verified ID Card'}</span>
            <span className="sm:hidden">{language === 'hi' ? 'आईडी' : 'ID Card'}</span>
          </button>
        </div>

        {/* Modal Toast */}
        {toastMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/40">
          
          {/* ===================== TAB 1: PROFILE & CABIN MANAGER ===================== */}
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-5 bg-white border border-zinc-200 shadow-2xs rounded-2xl sm:rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900">
                      {teacher.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {teacher.designation} • {teacher.department}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLocateCabin}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{language === 'hi' ? 'मैप पर मेरा केबिन देखें' : 'View My Cabin on Map'}</span>
                    </button>

                    {hasPerm('manage_profile') && !isEditingProfile && (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>{language === 'hi' ? 'संपादित करें' : 'Edit Details'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {isEditingProfile && hasPerm('manage_profile') ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'केबिन / कमरा नंबर (Room No.)' : 'Cabin / Room Number'}
                        </label>
                        <input
                          type="text"
                          required
                          value={cabinRoom}
                          onChange={(e) => setCabinRoom(e.target.value)}
                          placeholder="e.g. Room 204"
                          className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'मंजिल (Floor)' : 'Floor'}
                        </label>
                        <select
                          value={floor}
                          onChange={(e) => setFloor(e.target.value)}
                          className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        >
                          <option value="Ground Floor">Ground Floor</option>
                          <option value="1st Floor">1st Floor</option>
                          <option value="2nd Floor">2nd Floor</option>
                          <option value="3rd Floor">3rd Floor</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-zinc-700">
                            {language === 'hi' ? 'भवन / ब्लॉक (Building)' : 'Building Location'}
                          </label>
                          {onStartPickingLocation && (
                            <button
                              type="button"
                              onClick={() => onStartPickingLocation('profile')}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition hover:underline"
                            >
                              <MapPin className="w-3 h-3 text-blue-600" />
                              <span>{language === 'hi' ? '🎯 मैप पर चुनें' : '🎯 Pick on Map'}</span>
                            </button>
                          )}
                        </div>
                        <select
                          value={buildingId}
                          onChange={(e) => setBuildingId(e.target.value)}
                          className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        >
                          {locations
                            .filter((l) => l.category === 'department' || l.category === 'faculty')
                            .map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.title}
                              </option>
                            ))}
                        </select>
                        {(() => {
                          const sel = locations.find((l) => l.id === buildingId);
                          if (!sel) return null;
                          return (
                            <div className="mt-1.5 p-2 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-[11px]">
                              <span className="text-zinc-700 font-medium truncate max-w-[200px]">
                                📍 {sel.title}
                              </span>
                              <span className="font-mono text-[10px] text-blue-700 font-bold shrink-0">
                                {sel.coordinates[0].toFixed(4)}, {sel.coordinates[1].toFixed(4)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'मोबाइल नंबर (Phone)' : 'Contact Phone'}
                        </label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'मिलने का समय (Office Hours)' : 'Office Hours / Consultation'}
                        </label>
                        <input
                          type="text"
                          value={officeHours}
                          onChange={(e) => setOfficeHours(e.target.value)}
                          placeholder="e.g. 10:00 AM - 04:00 PM (Mon-Fri)"
                          className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'पढ़ाए जाने वाले विषय (Subjects)' : 'Subjects / Specializations'}
                        </label>
                        <input
                          type="text"
                          value={subjectsInput}
                          onChange={(e) => setSubjectsInput(e.target.value)}
                          placeholder="Comma separated subjects"
                          className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition"
                      >
                        {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{language === 'hi' ? 'सुरक्षित करें' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        {language === 'hi' ? 'केबिन व मंजिल' : 'Cabin & Floor'}
                      </span>
                      <p className="font-extrabold text-zinc-900 mt-1">
                        {teacher.cabinRoom || 'Not specified'} • {teacher.floor}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        {language === 'hi' ? 'भवन' : 'Building'}
                      </span>
                      <p className="font-extrabold text-zinc-900 mt-1 truncate">
                        {teacher.buildingName}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        {language === 'hi' ? 'मिलने का समय' : 'Office Hours'}
                      </span>
                      <p className="font-extrabold text-zinc-900 mt-1 truncate">
                        {teacher.officeHours || '10:00 AM - 04:00 PM'}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        {language === 'hi' ? 'संपर्क फोन' : 'Contact Mobile'}
                      </span>
                      <p className="font-extrabold text-zinc-900 mt-1">
                        {teacher.phone || 'N/A'}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl sm:col-span-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        {language === 'hi' ? 'विषय / स्पेशलाइजेशन' : 'Specialization & Subjects'}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teacher.subjects && teacher.subjects.length > 0 ? (
                          teacher.subjects.map((sub, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-zinc-200 rounded-md font-semibold text-zinc-800">
                              {sub}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500">General Faculty</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Granular Permissions Status */}
              <div className="p-4 bg-white border border-zinc-200 shadow-2xs rounded-2xl sm:rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'hi' ? 'शिक्षक खाता अनुमतियां' : 'Assigned Faculty Permissions'}</span>
                  </h4>
                  <span className="text-[10px] bg-white/80 text-zinc-600 border border-zinc-200/80 px-2 py-0.5 rounded font-bold shadow-2xs">
                    Admin Controlled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {PERMISSION_CONFIG.map((p) => {
                    const granted = hasPerm(p.key);
                    return (
                      <div
                        key={p.key}
                        className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                          granted
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                        }`}
                      >
                        {granted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold text-[11px] leading-tight">
                            {language === 'hi' ? p.hindiLabel : p.label}
                          </p>
                          <span className="text-[9px] block mt-0.5 opacity-80">
                            {granted ? 'Enabled' : 'Disabled by Admin'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 2: EVENTS & APPROVALS MANAGER ===================== */}
          {activeTab === 'events' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Event Sub-Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEventsSubTab('pending')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                      eventsSubTab === 'pending'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{language === 'hi' ? 'लंबित छात्र अनुरोध' : 'Pending Student Events'}</span>
                    <span className="sm:hidden">{language === 'hi' ? 'लंबित अनुरोध' : 'Pending'}</span>
                    <span className="px-1.5 py-0.2 bg-zinc-900 text-white rounded-full text-[10px] font-black">
                      {pendingEventsList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEventsSubTab('active')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 ${
                      eventsSubTab === 'active'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{language === 'hi' ? 'सक्रिय एवं स्वीकृत इवेंट्स' : 'Active Events'}</span>
                    <span className="sm:hidden">{language === 'hi' ? 'सक्रिय इवेंट्स' : 'Active'}</span>
                    <span className="px-1.5 py-0.2 bg-zinc-200 text-zinc-800 rounded-full text-[10px] font-black">
                      {approvedEventsList.length}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEventsSubTab('create')}
                  className={`w-full sm:w-auto px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 ${
                    eventsSubTab === 'create'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'hi' ? '+ नया विभागीय इवेंट' : '+ Post New Event'}</span>
                </button>
              </div>

              {/* 1. PENDING EVENTS APPROVAL SECTION */}
              {eventsSubTab === 'pending' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        {language === 'hi'
                          ? 'छात्रों द्वारा सबमिट किए गए इवेंट्स की समीक्षा करें और स्वीकृत या अस्वीकृत करें:'
                          : 'Review student-submitted campus events and approve them to go live on the interactive map:'}
                      </span>
                    </div>
                  </div>

                  {pendingEventsList.length === 0 ? (
                    <div className="p-8 bg-white border border-zinc-200 rounded-2xl text-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                      <h4 className="text-sm font-bold text-zinc-800">
                        {language === 'hi' ? 'कोई लंबित इवेंट अनुरोध नहीं है' : 'No Pending Event Approvals'}
                      </h4>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        {language === 'hi'
                          ? 'सभी छात्र इवेंट्स अनुमोदित हैं। जब कोई छात्र नया इवेंट सबमिट करेगा तो वह यहाँ प्रदर्शित होगा।'
                          : 'All student submissions have been reviewed. New event requests will appear here.'}
                      </p>
                    </div>
                  ) : (
                    pendingEventsList.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-4 bg-white border-2 border-blue-200 rounded-2xl shadow-sm space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-extrabold text-[10px] uppercase">
                                {evt.category}
                              </span>
                              <h4 className="text-sm font-bold text-zinc-900">{evt.title}</h4>
                            </div>
                            <p className="text-xs text-zinc-600 mt-1">{evt.description}</p>
                          </div>
                        </div>

                        {/* Event Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                          <div>
                            <span className="text-zinc-400 block font-semibold">Date & Time</span>
                            <span className="font-bold text-zinc-800">{evt.startDate} • {evt.time || 'All Day'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block font-semibold">Venue</span>
                            <span className="font-bold text-zinc-800">{evt.venue}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block font-semibold">Student Organizer</span>
                            <span className="font-bold text-zinc-800">{evt.submittedByStudentName || evt.organizer}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block font-semibold">Roll No / Branch</span>
                            <span className="font-bold text-zinc-800">{evt.studentRollNo || 'CSJMU Student'} ({evt.studentCourseBranch || 'General'})</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => setRejectingEventId(evt.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{language === 'hi' ? 'अस्वीकृत करें' : 'Reject'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(evt.id)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>{language === 'hi' ? 'स्वीकृत करें (Approve)' : 'Approve & Publish Live'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 2. ACTIVE & APPROVED EVENTS LIST */}
              {eventsSubTab === 'active' && (
                <div className="space-y-3">
                  {approvedEventsList.length === 0 ? (
                    <div className="p-8 bg-white border border-zinc-200 rounded-2xl text-center">
                      <p className="text-xs text-zinc-500">No active events found.</p>
                    </div>
                  ) : (
                    approvedEventsList.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3.5 bg-white border border-zinc-200 rounded-xl shadow-xs flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              {evt.category}
                            </span>
                            <h4 className="font-bold text-zinc-900 truncate">{evt.title}</h4>
                          </div>
                          <p className="text-zinc-500 text-[11px] mt-0.5">
                            {evt.startDate} • {evt.venue} • {evt.organizer}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleLive(evt.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                              evt.isLive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{evt.isLive !== false ? 'Live' : 'Offline'}</span>
                          </button>

                          <button
                            type="button"
                            id={`btn-delete-event-${evt.id}`}
                            onClick={() => promptDeleteEvent(evt.id, evt.title)}
                            className="p-1.5 px-2.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                            title={language === 'hi' ? 'इवेंट हटाएं' : 'Delete Event'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 3. POST NEW DEPARTMENT EVENT FORM */}
              {eventsSubTab === 'create' && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>{language === 'hi' ? 'विभागीय इवेंट / नोटिस प्रकाशित करें' : 'Publish Departmental Event / Notice'}</span>
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        {language === 'hi'
                          ? 'शिक्षक द्वारा प्रकाशित इवेंट सीधे छात्रों के मैप और इवेंट्स सूची में लाइव हो जाते हैं'
                          : 'Events published by verified teachers appear directly on the CSJMU live campus feed'}
                      </p>
                    </div>
                  </div>

                  {eventSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{language === 'hi' ? 'इवेंट सफलतापूर्वक प्रकाशित हुआ!' : 'Event published to CSJMU Campus Feed!'}</span>
                    </div>
                  )}

                  <form onSubmit={handlePostTeacherEvent} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'इवेंट / नोटिस का शीर्षक *' : 'Event Title / Topic *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. National Seminar on AI & Quantum Computing 2026"
                        className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'श्रेणी (Category)' : 'Category'}
                        </label>
                        <select
                          value={eventCategory}
                          onChange={(e: any) => setEventCategory(e.target.value)}
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        >
                          <option value="Seminar">Seminar</option>
                          <option value="Workshop">Workshop</option>
                          <option value="Fest">Fest / Exhibition</option>
                          <option value="Cultural">Cultural</option>
                          <option value="Notice">Official Notice / Exam</option>
                          <option value="Sports">Sports</option>
                        </select>
                      </div>

                      {/* Campus Venue Option with Automatic Campus Location Selector & Autocomplete */}
                      <div className="sm:col-span-2 bg-blue-50/60 border border-blue-200 p-3 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block font-bold text-zinc-800 text-xs flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span>{language === 'hi' ? 'स्थान / कैंपस वेन्यू (Venue on Campus) *' : 'Campus Venue / Landmark *'}</span>
                          </label>
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {language === 'hi' ? 'कैंपस लोकेशन स्वतः उपलब्ध' : 'Auto Campus Locations'}
                          </span>
                        </div>

                        {/* 1. Quick Campus Location Dropdown */}
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                            {language === 'hi'
                              ? 'कैंपस का मुख्य भवन या स्थल चुनें (Choose Landmark):'
                              : 'Select Campus Building / Location:'}
                          </label>
                          <div className="relative">
                            <select
                              id="teacher-event-venue-select"
                              value={eventVenueLocationId}
                              onChange={(e) => handleVenueLocationSelect(e.target.value)}
                              className="w-full py-2 px-3 pl-8 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              <option value="">
                                -- {language === 'hi' ? 'कैंपस लोकेशन चुनें (Choose Campus Location)' : 'Choose Campus Landmark on Map'} --
                              </option>
                              {locations.map((loc) => {
                                const locTitle = loc.title || (loc as any).name || loc.id;
                                const locHindi = loc.hindiTitle || (loc as any).hindiName;
                                return (
                                  <option key={loc.id} value={loc.id}>
                                    📍 {locTitle} {locHindi ? `(${locHindi})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                            <MapPin className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {/* 2. Specific Hall / Room No. / Custom Venue Name with Autocomplete Datalist */}
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                            {language === 'hi'
                              ? 'विशिष्ट हॉल, कक्ष या विवरण (Hall, Room No. or Specific Title):'
                              : 'Specific Hall, Room No. or Venue Title:'}
                          </label>
                          <input
                            id="teacher-event-venue-input"
                            type="text"
                            required
                            list="teacher-event-campus-locations-datalist"
                            value={eventVenue}
                            onChange={(e) => handleVenueInputChange(e.target.value)}
                            placeholder={
                              language === 'hi'
                                ? 'e.g. Main Auditorium, Seminar Hall 2, Room 204'
                                : 'e.g. Main Auditorium, Seminar Hall 2, Room 204'
                            }
                            className="w-full py-2 px-3 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                          />
                          <datalist id="teacher-event-campus-locations-datalist">
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.title}>
                                {loc.hindiTitle ? `${loc.hindiTitle} • ` : ''}{loc.block || loc.category}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        {/* Map Navigation Link Indicator */}
                        {eventVenueLocationId && (
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-100/70 border border-emerald-300/80 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {language === 'hi'
                                ? '✓ मैप नेविगेशन लिंक सक्रिय: छात्र व शिक्षक मैप पर 1-क्लिक में इस वेन्यू का लाइव रास्ता देख सकेंगे।'
                                : '✓ Map Navigation Linked: Students & faculty can navigate directly to this campus location with 1 tap.'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'दिनांक (Date)' : 'Event Date'}
                        </label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'समय (Time)' : 'Time'}
                        </label>
                        <input
                          type="text"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          placeholder="e.g. 10:00 AM - 01:00 PM"
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'विवरण (Description)' : 'Event Details & Guidelines'}
                      </label>
                      <textarea
                        rows={3}
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Provide agenda, chief guest, registration instructions..."
                        className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{language === 'hi' ? 'इवेंट प्रकाशित करें' : 'Publish Event Live'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 3: CAMPUS LOCATIONS & MARKERS ===================== */}
          {activeTab === 'locations' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {!canAddLocations ? (
                <div className="p-8 bg-white border-2 border-rose-200 rounded-3xl shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-zinc-900">
                      {language === 'hi'
                        ? 'स्थान जोड़ना एडमिन द्वारा प्रतिबंधित है'
                        : 'Location Addition Restricted by Admin'}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
                      {language === 'hi'
                        ? 'कैंपस एडमिनिस्ट्रेटर ने शिक्षकों के लिए नए स्थान, लैब या क्लासरूम जोड़ने का विकल्प बंद कर रखा है अथवा आपके शिक्षक खाते को यह अनुमति प्राप्त नहीं है।'
                        : 'The campus administrator has restricted location and marker addition for teachers, or your faculty account has not been granted the "manage_locations" permission.'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 max-w-md mx-auto text-left">
                    <p className="font-bold text-zinc-800 flex items-center gap-1.5 mb-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Permission Status:</span>
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <p>
                        • Admin Global Policy:{' '}
                        <span
                          className={`font-bold ${
                            globalAccessPolicy.allowAddLocations ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {globalAccessPolicy.allowAddLocations
                            ? 'Allowed (सक्षम)'
                            : 'Disabled by Admin Master Switch'}
                        </span>
                      </p>
                      <p>
                        • Teacher Account Permission:{' '}
                        <span
                          className={`font-bold ${
                            hasPerm('manage_locations') ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {hasPerm('manage_locations') ? 'Granted' : 'Not Assigned to You'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                  {/* Success Banner when a location was just added */}
                  {lastAddedLocation && (
                    <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2.5 animate-fade-in text-emerald-950">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900 truncate">
                            {language === 'hi' ? 'नया स्थान मैप पर सुरक्षित हो गया! 🎉' : 'Location Added to Map! 🎉'}
                          </h4>
                          <p className="text-[11px] text-emerald-700 truncate">
                            {lastAddedLocation.title} • {lastAddedLocation.block || 'Campus'} ({lastAddedLocation.floor || 'Floor'})
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToCabin(lastAddedLocation);
                            onClose();
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                        >
                          <Navigation className="w-4 h-4 text-white" />
                          <span>{language === 'hi' ? 'मैप पर देखें (View on Map)' : 'View on Map'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLastAddedLocation(null)}
                          className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{language === 'hi' ? '+ और स्थान जोड़ें' : '+ Add Another'}</span>
                        </button>
                        {onDeleteLocation && (
                          <button
                            id="btn-teacher-delete-just-added-loc"
                            type="button"
                            onClick={() => promptDeleteLocation(lastAddedLocation.id, lastAddedLocation.title, true)}
                            className="w-full sm:w-auto px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer sm:ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>{language === 'hi' ? '🗑️ यह स्थान हटाएं (Delete)' : '🗑️ Delete This Location'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-100">
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{language === 'hi' ? 'कैंपस में नया स्थान / लैब / रूम जोड़ें' : 'Add Campus Location / Lab / Classroom'}</span>
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {language === 'hi'
                          ? 'अपने विभाग के नए कमरे, कंप्यूटर लैब, सेमिनार हॉल या फैकल्टी ऑफिस का पिन मैप पर जोड़ें'
                          : 'Create new location coordinates, room details, and facilities on the CSJMU Interactive Map'}
                      </p>
                      {canManageLocations && (
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                          {language === 'hi' ? 'मैप पर मौजूदा मार्कर को drag करके उसकी location भी बदल सकते हैं।' : 'You can also drag existing map markers to update their location.'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {canManageLocations && onToggleDragMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextState = !isDragUnlocked;
                            onToggleDragMode(nextState);
                            if (nextState) {
                              onClose();
                            }
                          }}
                          className={`w-full sm:w-auto px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer ${
                            isDragUnlocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isDragUnlocked ? <Lock className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5" />}
                          <span>
                            {isDragUnlocked
                              ? (language === 'hi' ? 'ड्रैग बंद करें (Lock)' : 'Turn Drag Off (Lock)')
                              : (language === 'hi' ? 'मैप पर ड्रैग मोड चालू करें' : 'Start Drag Mode on Map')}
                          </span>
                        </button>
                      )}
                      {onStartPickingLocation ? (
                        <button
                          type="button"
                          id="btn-teacher-pick-on-map"
                          onClick={() => onStartPickingLocation('locations')}
                          className="w-full sm:w-auto px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                          <span>{language === 'hi' ? '🎯 मैप पर पिन लगाएं' : '🎯 Pick Pin on Map'}</span>
                        </button>
                      ) : onOpenAddMarker ? (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAddMarker();
                            onClose();
                          }}
                          className="w-full sm:w-auto px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shrink-0 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>{language === 'hi' ? 'पिन पिकर खोलें' : 'Pick on Map'}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <form onSubmit={handleAddLocationSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'स्थान / लैब का नाम *' : 'Location / Room Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={locTitle}
                          onChange={(e) => setLocTitle(e.target.value)}
                          placeholder="e.g. AI & Robotics Research Lab"
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'हिंदी नाम (वैकल्पिक)' : 'Hindi Name (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={locHindiTitle}
                          onChange={(e) => setLocHindiTitle(e.target.value)}
                          placeholder="e.g. एआई एवं रोबोटिक्स लैब"
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'श्रेणी (Category)' : 'Category'}
                        </label>
                        <select
                          value={locCategory}
                          onChange={(e: any) => setLocCategory(e.target.value)}
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                        >
                          <option value="department">Department / Block</option>
                          <option value="faculty">Faculty Office / Cabin</option>
                          <option value="facility">Facility / Lab / Center</option>
                          <option value="canteen">Canteen / Cafeteria</option>
                          <option value="sports">Sports / Ground</option>
                          <option value="hostel">Hostel</option>
                          <option value="gate">Entry / Exit Gate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'भवन / ब्लॉक' : 'Building / Block'}
                        </label>
                        <select
                          value={locBuildingId}
                          onChange={(e) => handleBuildingSelect(e.target.value)}
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                        >
                          {locations
                            .filter((l) => l.category === 'department' || l.category === 'faculty')
                            .map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.title}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'मंजिल (Floor)' : 'Floor'}
                        </label>
                        <select
                          value={locFloor}
                          onChange={(e) => setLocFloor(e.target.value)}
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                        >
                          <option value="Ground Floor">Ground Floor</option>
                          <option value="1st Floor">1st Floor</option>
                          <option value="2nd Floor">2nd Floor</option>
                          <option value="3rd Floor">3rd Floor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 mb-1">
                          {language === 'hi' ? 'कमरा / लैब संख्या (Room No.)' : 'Room / Lab Number'}
                        </label>
                        <input
                          type="text"
                          value={locRoomNumber}
                          onChange={(e) => setLocRoomNumber(e.target.value)}
                          placeholder="e.g. Lab 208, Hall B"
                          className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                        />
                      </div>
                    </div>

                    {/* GPS Coordinates Display & Customization */}
                    <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>{language === 'hi' ? 'GPS निर्देशांक (Coordinates)' : 'GPS Coordinates'}</span>
                        </span>
                        {onStartPickingLocation && (
                          <button
                            type="button"
                            onClick={() => onStartPickingLocation('locations')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <Crosshair className="w-3 h-3 text-emerald-300" />
                            <span>{language === 'hi' ? '🎯 मैप पर पिन चुनें' : '🎯 Pick on Map'}</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-0.5">
                            Latitude (अक्षांश)
                          </label>
                          <input
                            type="text"
                            value={locLat}
                            onChange={(e) => setLocLat(e.target.value)}
                            className="w-full py-1.5 px-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-0.5">
                            Longitude (देशांतर)
                          </label>
                          <input
                            type="text"
                            value={locLng}
                            onChange={(e) => setLocLng(e.target.value)}
                            className="w-full py-1.5 px-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'सुविधाएं (Facilities, comma-separated)' : 'Key Facilities'}
                      </label>
                      <input
                        type="text"
                        value={locFacilities}
                        onChange={(e) => setLocFacilities(e.target.value)}
                        placeholder="e.g. Wi-Fi, Smart Board, GPU Workstations"
                        className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'विवरण (Description)' : 'Description'}
                      </label>
                      <textarea
                        rows={2}
                        value={locDescription}
                        onChange={(e) => setLocDescription(e.target.value)}
                        placeholder="Enter details about this lab/room or its purpose..."
                        className="w-full py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 resize-none text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-[0.99]"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>{language === 'hi' ? 'कैंपस में स्थान जोड़ें' : 'Save Location to Campus Map'}</span>
                    </button>
                  </form>

                  {/* Locations Added By This Teacher (Teacher can delete only their own locations) */}
                  {(() => {
                    const myAddedLocations = locations.filter(
                      (l) =>
                        l.teacherId === currentTeacher.id ||
                        (l.isCustom && l.addedBy && l.addedBy.includes(currentTeacher.name))
                    );

                    if (myAddedLocations.length === 0) return null;

                    return (
                      <div className="mt-5 pt-4 border-t border-zinc-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                              {language === 'hi' ? 'मेरे द्वारा जोड़े गए स्थान' : 'Locations Added by You'}
                            </h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                              {myAddedLocations.length}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {language === 'hi' ? 'केवल आपके द्वारा जोड़े गए स्थान' : 'Your added locations only'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {myAddedLocations.map((loc) => (
                            <div
                              key={loc.id}
                              className="p-3 bg-zinc-50 hover:bg-zinc-100/70 border border-zinc-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-zinc-900 truncate">
                                    {language === 'hi' ? loc.hindiTitle || loc.title : loc.title}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-zinc-200 text-zinc-700 rounded text-[9px] font-semibold">
                                    {loc.category}
                                  </span>
                                  {loc.floor && (
                                    <span className="text-[10px] text-zinc-500">
                                      • {loc.floor}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                  {loc.block || 'Campus'} • [{loc.coordinates[0].toFixed(5)}, {loc.coordinates[1].toFixed(5)}]
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onNavigateToCabin(loc);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-white" />
                                  <span>{language === 'hi' ? 'मैप पर देखें' : 'View'}</span>
                                </button>
                                {onDeleteLocation && (
                                  <button
                                    type="button"
                                    onClick={() => promptDeleteLocation(loc.id, loc.hindiTitle || loc.title)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>{language === 'hi' ? 'हटाएं (Delete)' : 'Delete'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 4: DEPARTMENTS & COURSES ===================== */}
          {activeTab === 'departments' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {!canAddDepartments ? (
                <div className="p-8 bg-white border-2 border-rose-200 rounded-3xl shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-zinc-900">
                      {language === 'hi'
                        ? 'विभाग व कोर्स जोड़ना एडमिन द्वारा प्रतिबंधित है'
                        : 'Department Addition Restricted by Admin'}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
                      {language === 'hi'
                        ? 'कैंपस एडमिनिस्ट्रेटर ने शिक्षकों के लिए नए विभाग या डिग्री प्रोग्राम जोड़ने का विकल्प बंद किया है अथवा आपके खाते को यह अधिकार प्राप्त नहीं है।'
                        : 'The campus administrator has restricted department creation for teachers, or your faculty account does not have the "edit_department" permission.'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 max-w-md mx-auto text-left">
                    <p className="font-bold text-zinc-800 flex items-center gap-1.5 mb-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Permission Status:</span>
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <p>
                        • Admin Global Policy:{' '}
                        <span
                          className={`font-bold ${
                            globalAccessPolicy.allowAddDepartments ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {globalAccessPolicy.allowAddDepartments
                            ? 'Allowed (सक्षम)'
                            : 'Disabled by Admin Master Switch'}
                        </span>
                      </p>
                      <p>
                        • Teacher Account Permission:{' '}
                        <span
                          className={`font-bold ${
                            hasPerm('edit_department') ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {hasPerm('edit_department') ? 'Granted' : 'Not Assigned to You'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <AdminDepartmentManager
                  coursesList={coursesList}
                  locations={locations}
                  onAddCourse={handleAddCourse}
                  onUpdateCourse={handleUpdateCourse}
                  onDeleteCourse={handleDeleteCourse}
                  language={language}
                />
              )}
            </div>
          )}

          {/* ===================== TAB 5: FACULTY DIRECTORY ===================== */}
          {activeTab === 'faculty' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {!canAddFaculty ? (
                <div className="p-8 bg-white border-2 border-rose-200 rounded-3xl shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-zinc-900">
                      {language === 'hi'
                        ? 'फैकल्टी डायरेक्टरी जोड़ना एडमिन द्वारा प्रतिबंधित है'
                        : 'Faculty Directory Addition Restricted by Admin'}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
                      {language === 'hi'
                        ? 'कैंपस एडमिनिस्ट्रेटर ने शिक्षकों के लिए नए फैकल्टी सदस्य जोड़ने का विकल्प बंद किया है अथवा आपके खाते को यह अधिकार प्राप्त नहीं है।'
                        : 'The campus administrator has restricted faculty directory additions for teachers, or your faculty account does not have the "manage_faculty" permission.'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 max-w-md mx-auto text-left">
                    <p className="font-bold text-zinc-800 flex items-center gap-1.5 mb-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Permission Status:</span>
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <p>
                        • Admin Global Policy:{' '}
                        <span
                          className={`font-bold ${
                            globalAccessPolicy.allowAddFaculty ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {globalAccessPolicy.allowAddFaculty
                            ? 'Allowed (सक्षम)'
                            : 'Disabled by Admin Master Switch'}
                        </span>
                      </p>
                      <p>
                        • Teacher Account Permission:{' '}
                        <span
                          className={`font-bold ${
                            hasPerm('manage_faculty') ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {hasPerm('manage_faculty') ? 'Granted' : 'Not Assigned to You'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <AdminFacultyManager
                  facultyList={facultyList}
                  locations={locations}
                  onAddFaculty={handleAddFaculty}
                  onUpdateFaculty={handleUpdateFaculty}
                  onDeleteFaculty={handleDeleteFaculty}
                  language={language}
                />
              )}
            </div>
          )}

          {/* ===================== TAB 6: ID CARD VIEW ===================== */}
          {activeTab === 'idcard' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        {language === 'hi' ? 'सत्यापित शिक्षक पहचान पत्र' : 'Verified Faculty Identity Card'}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        {language === 'hi'
                          ? 'यह पहचान पत्र एडमिन द्वारा सत्यापित और स्वीकृत है'
                          : 'Official verification record verified and approved by Campus Admin'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                    APPROVED
                  </span>
                </div>

                {teacher.idCardPhoto ? (
                  <div className="rounded-2xl overflow-hidden border border-zinc-300 p-1 bg-zinc-100 flex justify-center">
                    <img
                      src={teacher.idCardPhoto}
                      alt="Verified Faculty ID"
                      className="w-full max-h-72 object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    No photo record on file
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectingEventId && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl border border-zinc-200">
            <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{language === 'hi' ? 'इवेंट अस्वीकृति का कारण' : 'Event Rejection Reason'}</span>
            </h4>
            <p className="text-xs text-zinc-500">
              {language === 'hi' ? 'कृपया छात्र को बताने के लिए कारण दर्ज करें:' : 'Provide feedback reason for the student organizer:'}
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingEventId(null)}
                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                {language === 'hi' ? 'अस्वीकृत करें' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Dialog (Iframe-Safe: Replaces blocked window.confirm) */}
      {confirmDialog && (
        <div
          id="teacher-confirm-dialog-backdrop"
          className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            id="teacher-confirm-dialog-card"
            className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-zinc-200 text-center space-y-4 animate-scale-up text-zinc-900"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-zinc-900">{confirmDialog.title}</h4>
              <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-confirm-dialog"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                id="btn-execute-confirm-dialog"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDialog.confirmLabel || (language === 'hi' ? 'हटाएं' : 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
