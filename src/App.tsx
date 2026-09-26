import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CampusMap } from './components/CampusMap';
import { Navbar } from './components/Navbar';
import { NavigationPanel } from './components/NavigationPanel';
import { MobileQuickControls } from './components/MobileQuickControls';
import { DepartmentFinderModal } from './components/DepartmentFinderModal';
import { FacultyDirectoryModal } from './components/FacultyDirectoryModal';
import { BuildingDetailDrawer } from './components/BuildingDetailDrawer';
import { ReportBugModal } from './components/ReportBugModal';
import { FloorPlanModal } from './components/FloorPlanModal';
import { AdminLocationManagerModal } from './components/AdminLocationManagerModal';
import { AppDownloadModal } from './components/AppDownloadModal';
import { GoogleMapsLiveNav } from './components/GoogleMapsLiveNav';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { TeacherPortalModal } from './components/TeacherPortalModal';
import { AddMarkerModal } from './components/AddMarkerModal';

import {
  CSJMU_LOCATIONS,
  CSJMU_FACULTY,
  CSJMU_NODES,
  CSJMU_EDGES,
  CSJMU_CENTER,
} from './data/csjmuCampusData';
import {
  CampusLocation,
  FacultyMember,
  CourseDepartmentMapping,
  CampusEvent,
  Language,
  MapStyle,
  NavigationRoute,
  TeacherAccount,
} from './types';
import {
  calculateCampusRoute,
  calculateRoadRoute,
  getDistanceMeters,
  isCoordinateOnCampus,
  getBestCampusEntranceGate,
} from './utils/pathfinding';
import { navigationAudio } from './utils/navigationAudio';
import {
  getCustomLocations,
  saveCustomLocations,
  getCustomFaculty,
  saveCustomFaculty,
  updateFacultyMember,
  deleteFacultyMember,
  restoreFacultyMember,
  getStoredCourses,
  saveCustomCourse,
  deleteCustomCourse,
  updateCourseDepartmentMapping,
  deleteCourseDepartmentMapping,
  restoreCourseDepartmentMapping,
  getAdminStatus,
  saveAdminStatus,
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  getAdminAuthHeaders,
  verifyAdminSessionOnServer,
  isAdminAuthenticated,
  getSavedLocationsList,
  saveLocationsList,
  getPreferredLanguage,
  savePreferredLanguage,
  getPreferredMapStyle,
  savePreferredMapStyle,
  updateLocationCoordinates,
  updateLocationPhoto,
  saveCustomLocation,
  deleteLocationById,
  restoreLocationById,
  updateStoredLocation,
  resetLocationsToDefault,
  checkAdminPasswordAsync,
  saveCustomAdminPin,
  getAdminPinHash,
  getStoredFaculty,
  getStoredEvents,
  saveCustomEvent,
  updateStoredEvent,
  deleteEventById,
  approveStoredEvent,
  rejectStoredEvent,
  toggleEventLiveStatus,
  batchToggleEventsLiveStatus,
  applyRemoteCampusData,
  syncCampusDataWithServerBackup,
  getStoredActiveTeacherSession,
  clearActiveTeacherSession,
  verifyTeacherSessionOnServer,
  logoutTeacher,
  canTeacherAddLocations,
  getTeacherToken,
  getTeacherAuthHeaders,
} from './utils/storage';
import { hydrateTeacherAccountsFromServer } from './utils/teacherRemote';
import {
  postRemoteEvent,
  updateRemoteEvent,
  batchToggleRemoteEvents,
  deleteRemoteEvent,
  fetchRemoteEvents,
} from './utils/eventRemote';
import {
  testFirestoreConnection,
  subscribeEventsFromFirestore,
  subscribeLocationsFromFirestore,
  subscribeTeachersFromFirestore,
  batchSaveLocationsToFirestore,
  saveLocationToFirestore,
  deleteLocationFromFirestore,
  saveEventToFirestore,
  saveTeacherToFirestore,
  batchSaveFacultyToFirestore,
  saveFacultyToFirestore,
  deleteFacultyFromFirestore,
  subscribeFacultyFromFirestore,
  batchSaveCoursesToFirestore,
  saveCourseToFirestore,
  deleteCourseFromFirestore,
  subscribeCoursesFromFirestore,
} from './services/firebase';
import { getStoredTeacherAccounts } from './utils/storage';
import { EventsModal } from './components/EventsModal';
import { SubmitEventModal } from './components/SubmitEventModal';
import { TRANSLATIONS } from './translations';
import {
  Compass,
  MapPin,
  Sparkles,
  Download,
  GraduationCap,
  Users,
  Navigation,
  Layers,
  ChevronDown,
  Eye,
  EyeOff,
  Maximize2,
  CheckCircle2,
  Move,
  Crosshair,
  ShieldCheck,
  Lock,
  X
} from 'lucide-react';
import {
  getGitHubConfig,
  fetchLatestCampusData,
  fetchServerGitHubConfig,
  generateCampusDataTsFile,
  pushToGitHub,
} from './utils/githubSync';

export function App() {
  // Localization & Theme Preferences
  const [language, setLanguage] = useState<Language>(getPreferredLanguage());
  const [mapStyle, setMapStyle] = useState<MapStyle>(getPreferredMapStyle());

  // Master Data State
  const [locations, setLocations] = useState<CampusLocation[]>(() => {
    return getSavedLocationsList();
  });

  const [facultyList, setFacultyList] = useState<FacultyMember[]>(() => getStoredFaculty());

  const [coursesList, setCoursesList] = useState<CourseDepartmentMapping[]>(() => {
    return getStoredCourses();
  });

  const [events, setEvents] = useState<CampusEvent[]>(() => getStoredEvents());

  // Save feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  }, []);

  // Active Map & Navigation Selection
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [fromLocation, setFromLocation] = useState<CampusLocation | null>(null);
  const [toLocation, setToLocation] = useState<CampusLocation | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const lastRoadRouteRequestRef = useRef<{ time: number; coords: [number, number] | null }>({ time: 0, coords: null });
  const [focusCoordinates, setFocusCoordinates] = useState<[number, number] | null>(null);
  const [navTriggerId, setNavTriggerId] = useState<number>(0);
  const [liveNavTriggerId, setLiveNavTriggerId] = useState<number>(0);

  // GPS User Live Location & Compass Heading
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);

  // UI Minimization & Mobile Space-Saving States ("onion minimise bhi jaaye aisa rakho jagah lete h jada")
  const [isNavPanelMinimized, setIsNavPanelMinimized] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false); // 1-tap hide all floating cards for maximum clean map view

  // Live Turn-by-Turn Navigation Screen
  const [isLiveNavActive, setIsLiveNavActive] = useState<boolean>(false);
  const [activeLiveNavStepIdx, setActiveLiveNavStepIdx] = useState<number>(0);

  // Modals & Panels Visibility
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isDeptFinderOpen, setIsDeptFinderOpen] = useState<boolean>(false);
  const [isFacultyDirectoryOpen, setIsFacultyDirectoryOpen] = useState<boolean>(false);
  const [isAddMarkerOpen, setIsAddMarkerOpen] = useState<boolean>(false);
  const [isReportBugOpen, setIsReportBugOpen] = useState<boolean>(false);
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState<boolean>(false);
  const [isAdminManagerOpen, setIsAdminManagerOpen] = useState<boolean>(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState<boolean>(false);
  const [isSubmitEventModalOpen, setIsSubmitEventModalOpen] = useState<boolean>(false);


  // Teacher Authentication & Portal System
  const [loggedInTeacher, setLoggedInTeacher] = useState<TeacherAccount | null>(() =>
    getStoredActiveTeacherSession()
  );
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState<boolean>(false);
  const [isTeacherPortalOpen, setIsTeacherPortalOpen] = useState<boolean>(false);


  // Admin & Pin Relocation Mode
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(getAdminStatus());
  const [isAdminDragMode, setIsAdminDragMode] = useState<boolean>(false);
  const [isTeacherDragMode, setIsTeacherDragMode] = useState<boolean>(false);
  const [justRelocatedLocation, setJustRelocatedLocation] = useState<{
    id: string;
    title: string;
    coordinates: [number, number];
  } | null>(null);

  // Coordinate Picking for Add Marker & Teacher Portal
  const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);
  const [pickedCoordinates, setPickedCoordinates] = useState<[number, number] | null>(null);
  const [pickingOrigin, setPickingOrigin] = useState<'add-marker' | 'teacher-locations' | 'teacher-profile' | 'admin' | null>(null);
  const [teacherPortalTab, setTeacherPortalTab] = useState<'profile' | 'events' | 'locations' | 'departments' | 'faculty' | 'idcard'>('profile');
  const [teacherPickedCoords, setTeacherPickedCoords] = useState<[number, number] | null>(null);

  const handleStartPickingLocation = (origin: 'add-marker' | 'teacher-locations' | 'teacher-profile' | 'admin') => {
    setPickingOrigin(origin);
    if (origin === 'teacher-locations' || origin === 'teacher-profile') {
      setIsTeacherPortalOpen(false);
    } else if (origin === 'add-marker') {
      setIsAddMarkerOpen(false);
    } else if (origin === 'admin') {
      setIsAdminManagerOpen(false);
    }
    setIsPickingLocation(true);
  };

  const handleConfirmPickedCoordinates = (coords: [number, number]) => {
    setIsPickingLocation(false);
    if (pickingOrigin === 'teacher-locations') {
      setTeacherPickedCoords(coords);
      setTeacherPortalTab('locations');
      setIsTeacherPortalOpen(true);
      showToast(language === 'hi' ? '🎯 नए स्थान के निर्देशांक चुन लिए गए हैं!' : '🎯 Location coordinates selected from map!');
    } else if (pickingOrigin === 'teacher-profile') {
      setTeacherPickedCoords(coords);
      setTeacherPortalTab('profile');
      setIsTeacherPortalOpen(true);
      showToast(language === 'hi' ? '🎯 केबिन का भवन मैप पर चुन लिया गया!' : '🎯 Cabin building selected from map!');
    } else if (pickingOrigin === 'admin') {
      setPickedCoordinates(coords);
      setIsAdminManagerOpen(true);
    } else {
      setPickedCoordinates(coords);
      setIsAddMarkerOpen(true);
    }
    setPickingOrigin(null);
  };

  const handleCancelPicking = () => {
    setIsPickingLocation(false);
    if (pickingOrigin === 'teacher-locations' || pickingOrigin === 'teacher-profile') {
      setIsTeacherPortalOpen(true);
    } else if (pickingOrigin === 'add-marker') {
      setIsAddMarkerOpen(true);
    } else if (pickingOrigin === 'admin') {
      setIsAdminManagerOpen(true);
    }
    setPickingOrigin(null);
  };

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Verify admin session token on mount, refresh, and listen for automatic expiration
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      if (isAdminAuthenticated()) {
        const isValid = await verifyAdminSessionOnServer();
        if (!isValid && isMounted) {
          setIsAdminUnlocked(false);
          setIsAdminDragMode(false);
          saveAdminStatus(false);
        }
      } else if (isAdminUnlocked && isMounted) {
        setIsAdminUnlocked(false);
        setIsAdminDragMode(false);
        saveAdminStatus(false);
      }
    };
    checkSession();

    const handleSessionExpired = () => {
      if (isMounted) {
        setIsAdminUnlocked(false);
        setIsAdminDragMode(false);
        saveAdminStatus(false);
        showToast(
          language === 'hi'
            ? 'एडमिन सत्र समाप्त हो गया। कृपया सुरक्षा पिन पुनः दर्ज करें।'
            : 'Admin session expired. Please re-enter Security PIN.',
          4000
        );
      }
    };

    window.addEventListener('csjmu_admin_session_expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('csjmu_admin_session_expired', handleSessionExpired);
    };
  }, [language, showToast]);

  // Real-time synchronization of teacher session when permissions or accounts change
  useEffect(() => {
    let isMounted = true;

    // Sync remote faculty accounts to local storage
    hydrateTeacherAccountsFromServer().catch(() => {});

    // The server backup is only a legacy/bootstrap fallback. Firestore is the
    // live source of truth for campus locations, events, faculty and courses.
    // Do NOT copy the legacy backup back into React state here: doing so can
    // overwrite a fresh Firestore edit (especially dragged coordinates or
    // event live status) with an older snapshot.
    syncCampusDataWithServerBackup().catch(() => {});

    // Validate teacher token with server on initial mount
    verifyTeacherSessionOnServer().then((res) => {
      if (isMounted) {
        if (res.authenticated && res.teacher) {
          setLoggedInTeacher(res.teacher);
        } else {
          setLoggedInTeacher(null);
        }
      }
    });

    const handleTeacherSessionExpired = () => {
      if (isMounted) {
        setLoggedInTeacher(null);
        setIsTeacherPortalOpen(false);
        showToast(
          language === 'hi'
            ? 'शिक्षक सत्र समाप्त हो गया। कृपया पुनः लॉगिन करें।'
            : 'Faculty session has expired. Please log in again.',
          4000
        );
      }
    };

    const handleTeacherSync = () => {
      const activeSession = getStoredActiveTeacherSession();
      setLoggedInTeacher(activeSession);
    };

    window.addEventListener('csjmu_teacher_session_expired', handleTeacherSessionExpired);
    window.addEventListener('teacher-session-updated', handleTeacherSync);
    window.addEventListener('storage', handleTeacherSync);
    return () => {
      isMounted = false;
      window.removeEventListener('csjmu_teacher_session_expired', handleTeacherSessionExpired);
      window.removeEventListener('teacher-session-updated', handleTeacherSync);
      window.removeEventListener('storage', handleTeacherSync);
    };
  }, [language, showToast]);

  // Fetch GitHub environment status on startup
  useEffect(() => {
    fetchServerGitHubConfig().catch((e) => console.warn('Could not check server github config on boot:', e));
  }, []);

  // Firebase Firestore Real-Time Synchronization & Automatic Cloud Backup
  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      if (ok) {
        console.log('Firebase Firestore live connection established.');
        // Do not blindly overwrite Firestore with browser-local data on startup.
        // Firestore listeners below hydrate the UI from cloud state. Existing local
        // data can be pushed deliberately through the Admin "Sync All" action.
      }
    });

    // 1. Live Events Listener from Firestore
    const unsubEvents = subscribeEventsFromFirestore((liveEvents) => {
      if (liveEvents && liveEvents.length > 0) {
        setEvents((prev) => {
          const map = new Map<string, CampusEvent>();
          for (const ev of prev) map.set(ev.id, ev);
          for (const ev of liveEvents) map.set(ev.id, ev);
          return Array.from(map.values());
        });
      }
    });

    // 2. Live Locations Listener from Firestore
    const unsubLocations = subscribeLocationsFromFirestore((liveLocs) => {
      if (liveLocs && liveLocs.length > 0) {
        setLocations((prev) => {
          const map = new Map<string, CampusLocation>();
          for (const l of prev) map.set(l.id, l);
          for (const l of liveLocs) map.set(l.id, l);
          return Array.from(map.values());
        });
      }
    });

    // 3. Live Faculty Directory Listener from Firestore
    const unsubFaculty = subscribeFacultyFromFirestore((liveFaculty) => {
      if (liveFaculty && liveFaculty.length > 0) {
        setFacultyList((prev) => {
          const map = new Map<string, FacultyMember>();
          for (const f of prev) map.set(f.id, f);
          for (const f of liveFaculty) map.set(f.id, f);
          return Array.from(map.values());
        });
      }
    });

    // 4. Live Department/Course Listener from Firestore
    const unsubCourses = subscribeCoursesFromFirestore((liveCourses) => {
      if (liveCourses && liveCourses.length > 0) {
        setCoursesList((prev) => {
          const map = new Map<string, CourseDepartmentMapping>();
          for (const course of prev) map.set(course.courseId, course);
          for (const course of liveCourses) map.set(course.courseId, course);
          return Array.from(map.values());
        });
      }
    });

    // Teacher accounts are synchronized separately by teacherRemote.ts.
    const unsubTeachers = subscribeTeachersFromFirestore(() => {});

    return () => {
      unsubEvents();
      unsubLocations();
      unsubFaculty();
      unsubCourses();
      unsubTeachers();
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsAppInstalled(true);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      setInstallPrompt(null);
    }
  };

  const t = TRANSLATIONS[language];

  // Language Change Handler
  const handleToggleLanguage = (lang?: Language) => {
    const nextLang = lang || (language === 'en' ? 'hi' : 'en');
    setLanguage(nextLang);
    savePreferredLanguage(nextLang);
  };

  // Watch GPS Geolocation & Orientation (with GPS Micro-Jitter Filter: > 1.5m movement threshold)
  useEffect(() => {
    let watchId: number | null = null;
    let lastHeading = -1;
    let lastHeadingTime = 0;

    let lastCoords: [number, number] | null = null;
    let lastCoordTime = 0;

    const handlePositionUpdate = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return;
      }

      // Reject weak GPS / inaccurate cellular tower triangulation (>150m) that teleports user away
      if (typeof accuracy === 'number' && accuracy > 150 && lastCoords !== null) {
        return;
      }

      const newCoords: [number, number] = [lat, lng];
      const now = Date.now();

      // GPS Micro-Jitter & Wild Teleport Filter:
      // Discard unrealistic GPS jumps (>80m teleport at >25 m/s or ~90 km/h) to stop camera flying away into the air
      if (!lastCoords) {
        lastCoords = newCoords;
        lastCoordTime = now;
        setUserCoordinates(newCoords);
      } else {
        const movedMeters = getDistanceMeters(lastCoords, newCoords);
        const elapsedSec = Math.max(0.4, (now - lastCoordTime) / 1000);
        const speedMps = movedMeters / elapsedSec;

        if (movedMeters > 80 && speedMps > 25) {
          // Unrealistic GPS jump - ignore to prevent map from being thrown away
          return;
        }

        if (movedMeters > 1.5) {
          lastCoords = newCoords;
          lastCoordTime = now;
          setUserCoordinates(newCoords);
        }
      }

      if (typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading) && pos.coords.heading >= 0) {
        const diff = Math.abs(pos.coords.heading - lastHeading);
        if (lastHeading < 0 || diff >= 5.0 || (360 - diff) >= 5.0) {
          lastHeading = pos.coords.heading;
          setUserHeading(Math.round(pos.coords.heading));
        }
      }
    };

    if ('geolocation' in navigator) {
      // 1. Fetch immediate live GPS coordinate fix without stale cache
      navigator.geolocation.getCurrentPosition(
        handlePositionUpdate,
        (err) => {
          console.warn('Initial live GPS fix:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      // 2. Continuously stream live GPS coordinates directly from hardware sensors (maximumAge: 0)
      watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        (err) => {
          console.warn('Geolocation live stream error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      const now = Date.now();
      // Throttle heading updates to maximum 8 times per second to prevent UI re-render thrashing
      if (now - lastHeadingTime < 125) return;

      let heading: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined) {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        heading = (360 - e.alpha) % 360;
      }
      if (heading !== null && !isNaN(heading)) {
        // Robust deadband filter: ignore handheld magnetometer noise below 7.5 degrees
        let diff = Math.abs(heading - lastHeading);
        if (diff > 180) diff = 360 - diff;
        if (lastHeading < 0 || diff >= 7.5) {
          lastHeading = heading;
          lastHeadingTime = now;
          setUserHeading(Math.round(heading));
        }
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    };
  }, []);

  // Background daily automatic event sync from csjmu.ac.in
  useEffect(() => {
    const runBackgroundSync = async () => {
      try {
        const res = await syncOfficialCollegeEvents(false);
        if (res.success && res.events) {
          setEvents(res.events);
        }
      } catch (err) {
        console.warn('Background event sync error:', err);
      }
    };
    runBackgroundSync();
  }, []);

  // Handle URL Query Params (For shared links e.g., ?to=loc-uiet-2)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toParam = params.get('to');

    if (toParam) {
      const targetLoc = locations.find((l) => l.id === toParam);
      if (targetLoc) {
        const matchedFaculty = facultyList.filter(
          (fac) => fac.departmentId === targetLoc.id || fac.buildingId === targetLoc.id
        );
        setToLocation(targetLoc);
        setSelectedLocation({ ...targetLoc, facultyList: matchedFaculty });
      }
    }
  }, []);

  // Recalculate Route whenever toLocation or userCoordinates changes - Exclusively from Live GPS Location
  useEffect(() => {
    if (!toLocation) {
      setNavigationRoute(null);
      return;
    }

    // Starting location is strictly the user's Live Location
    const liveStart: CampusLocation = {
      id: 'user-current-gps',
      title: language === 'hi' ? 'मेरी लाइव GPS लोकेशन' : 'My Live GPS Location',
      hindiTitle: 'मेरी लाइव GPS लोकेशन',
      category: 'facility' as const,
      coordinates: userCoordinates || CSJMU_CENTER,
      block: 'Campus',
      description: 'Your current real-time GPS location.',
    };

    setFromLocation(liveStart);

    const isFromOnCampus = isCoordinateOnCampus(liveStart.coordinates);
    const isToOnCampus = isCoordinateOnCampus(toLocation.coordinates);
    const isPurelyCampusRoute = isFromOnCampus && isToOnCampus;

    // Real road router request throttling: update whenever user moves > 12m or every 5s
    const now = Date.now();
    const previousRequest = lastRoadRouteRequestRef.current;
    const lastCoords = previousRequest.coords;
    const movedSinceLastRequest = lastCoords
      ? getDistanceMeters(lastCoords, liveStart.coordinates)
      : Infinity;
    const shouldUseRoadRouter =
      !lastCoords ||
      now - previousRequest.time > 5000 ||
      movedSinceLastRequest > 12;

    let cancelled = false;
    const calculate = async () => {
      // 1. If both locations are inside CSJMU campus, use the local high-precision paved walkway graph immediately (Instant & 100% reliable)
      if (isPurelyCampusRoute) {
        const campusRoute = calculateCampusRoute(liveStart, toLocation);
        if (!cancelled && campusRoute) {
          setNavigationRoute(campusRoute);
          return;
        }
      }

      // 2. If either point is outside campus (e.g. from user house / city road), prioritize real city road routing
      if (!isPurelyCampusRoute && shouldUseRoadRouter) {
        lastRoadRouteRequestRef.current = { time: now, coords: liveStart.coordinates };
        const roadRoute = await calculateRoadRoute(liveStart, toLocation);
        if (cancelled) return;
        if (roadRoute && roadRoute.path.length > 1) {
          setNavigationRoute(roadRoute);
          return;
        }
      }

      // 3. Fallback if user is outside campus and real road router failed (e.g. device is offline):
      // Route from the nearest official university gate, NEVER draw a direct straight line through houses/air!
      if (!isFromOnCampus) {
        const nearestGate = getBestCampusEntranceGate(liveStart.coordinates);
        const gateToDestRoute = calculateCampusRoute(nearestGate, toLocation);
        if (gateToDestRoute && !cancelled) {
          const gateDist = Math.round(getDistanceMeters(liveStart.coordinates, nearestGate.coordinates));
          const enrichedSteps = [
            {
              instructionEn: `Follow city road towards CSJMU ${nearestGate.title} (${gateDist} m) to enter campus`,
              instructionHi: `परिसर में प्रवेश के लिए सड़क मार्ग से सीएसजेएमयू ${nearestGate.hindiTitle} (${gateDist} मी.) की ओर जाएं`,
              distanceMeters: gateDist,
              durationSeconds: Math.round(gateDist / 1.3),
              action: 'straight' as const,
              landmarkName: nearestGate.title,
              coordinates: nearestGate.coordinates,
            },
            ...gateToDestRoute.steps,
          ];
          setNavigationRoute({
            ...gateToDestRoute,
            fromLocation: liveStart,
            steps: enrichedSteps,
          });
          return;
        }
      }
    };
    calculate();
    return () => { cancelled = true; };
  }, [toLocation, language, userCoordinates]);

  // Handle Location Selection
  // Attaches the up-to-date list of faculty posted in this building/department
  // (matched by departmentId or buildingId) so the detail drawer always shows
  // current teacher names instead of whatever was baked in at data-creation time.
  const handleSelectLocation = (loc: CampusLocation) => {
    const matchedFaculty = facultyList.filter(
      (fac) => fac.departmentId === loc.id || fac.buildingId === loc.id
    );
    setSelectedLocation({ ...loc, facultyList: matchedFaculty });
    setFocusCoordinates(loc.coordinates);
  };

  // Start Navigation To Location - Always from Live Location
  const handleStartNavigationTo = (destLoc: CampusLocation) => {
    setToLocation(destLoc);
    setNavTriggerId(Date.now());
    setFocusCoordinates(destLoc.coordinates);

    // Strictly Live Location as starting point
    setFromLocation({
      id: 'user-current-gps',
      title: language === 'hi' ? 'मेरी लाइव GPS लोकेशन' : 'My Live GPS Location',
      hindiTitle: 'मेरी लाइव GPS लोकेशन',
      category: 'facility',
      coordinates: userCoordinates || CSJMU_CENTER,
      block: 'Campus',
      description: 'Your current real-time GPS location.',
    });

    // Reset throttle ref to trigger immediate computation
    lastRoadRouteRequestRef.current = { time: 0, coords: null };
    setSelectedLocation(null);
    setIsNavPanelMinimized(true);
  };

  // Swap Start & Destination - Disabled: Navigation is strictly from Live Location
  const handleSwapLocations = () => {
    // Start is locked to live location
  };

  // Clear Navigation Route
  const handleClearRoute = () => {
    setFromLocation(null);
    setToLocation(null);
    setNavigationRoute(null);
    setIsLiveNavActive(false);
    setFocusCoordinates(null);
    setSelectedLocation(null);
    setNavTriggerId(0);
    setLiveNavTriggerId(0);
    lastRoadRouteRequestRef.current = { time: 0, coords: null };
  };

  // Use Live GPS as Start Point
  const handleUseCurrentGpsAsStart = () => {
    if (!userCoordinates) {
      showToast(
        language === 'hi'
          ? 'कृपया अपने फोन में GPS लोकेशन चालू करें।'
          : 'Please enable GPS location on your device.',
        3500
      );
      return;
    }
    const gpsLocation: CampusLocation = {
      id: 'user-current-gps',
      title: language === 'hi' ? 'मेरी लाइव GPS लोकेशन' : 'My Live GPS Location',
      hindiTitle: 'मेरी लाइव GPS लोकेशन',
      category: 'facility',
      coordinates: userCoordinates,
      block: 'Campus',
      description: 'Your current real-time GPS location.',
    };
    setFromLocation(gpsLocation);
    lastRoadRouteRequestRef.current = { time: 0, coords: null };
    showToast(
      language === 'hi'
        ? '✓ लाइव GPS लोकेशन से रोड नेविगेशन शुरू हो गया'
        : '✓ Live road routing started from your GPS location',
      2500
    );
  };

  // Map Style Change Handler
  const handleChangeMapStyle = (style: MapStyle) => {
    setMapStyle(style);
    savePreferredMapStyle(style);
  };

  // Save New Custom Location & Faculty
  const handleSaveCustomLocation = (newLoc: CampusLocation, newFaculty?: FacultyMember) => {
    const updatedLocs = saveCustomLocation(newLoc);
    setLocations(updatedLocs);

    if (newFaculty) {
      const updatedFaculty = saveCustomFaculty(newFaculty);
      setFacultyList(updatedFaculty);
    }

    setSelectedLocation(newLoc);
    setFocusCoordinates(newLoc.coordinates);
    setPickedCoordinates(null);
    setIsPickingLocation(false);
    showToast(language === 'hi' ? 'नया स्थान सुरक्षित हो गया!' : 'New location saved successfully!');
    triggerAutoGitHubSync(updatedLocs, `Add location: ${newLoc.title}`);
  };

  // Admin Unlock PIN (verified cryptographically on server)
  const handleUnlockAdmin = async (pin: string): Promise<any> => {
    const res = await checkAdminPasswordAsync(pin);
    if (res.success) {
      setIsAdminUnlocked(true);
      saveAdminStatus(true);
      return { success: true, message: res.message };
    }
    return {
      success: false,
      message: res.message,
      isLocked: res.isLocked,
      remainingSeconds: res.remainingSeconds,
    };
  };

  // Admin Change PIN
  const handleChangeAdminPin = async (newPin: string): Promise<boolean> => {
    const success = await saveCustomAdminPin(newPin);
    if (success) {
      showToast(
        language === 'hi'
          ? 'एडमिन सुरक्षा पिन सफलतापूर्वक सुरक्षित हो गया!'
          : 'Admin PIN updated successfully!'
      );

      // Synchronize changed admin PIN with the secure server/backend session
      try {
        const adminHeaders = getAdminAuthHeaders();
        fetch('/api/admin/change-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...adminHeaders,
          },
          body: JSON.stringify({ newPin }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.token) setAdminToken(d.token);
          })
          .catch(() => {});
      } catch (e) {
        console.warn('Server admin PIN sync notice:', e);
      }
    }
    return success;
  };

  // Admin Lock
  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setIsAdminDragMode(false);
    saveAdminStatus(false);
    clearAdminToken();
  };

  // Toggle Marker Drag Lock (Admin Panel Only)
  const handleToggleDragLock = () => {
    setIsAdminDragMode((prev) => !prev);
  };

  // Admin Add Location
  const handleAdminAddLocation = (newLoc: CampusLocation) => {
    const updated = saveCustomLocation(newLoc);
    setLocations(updated);
    setSelectedLocation(newLoc);
    setFocusCoordinates(newLoc.coordinates);
    saveLocationToFirestore(newLoc).catch((e) => console.warn('Firestore location auto-save notice:', e));
    showToast(language === 'hi' ? 'नया स्थान सुरक्षित हो गया!' : 'New location saved successfully!');
    triggerAutoGitHubSync(updated);
  };

  // Admin Update Location Details (Block, Description, Courses, etc.)
  const handleAdminUpdateLocation = (loc: CampusLocation) => {
    const updated = updateStoredLocation(loc);
    setLocations(updated);
    if (selectedLocation?.id === loc.id) {
      setSelectedLocation(loc);
    }
    saveLocationToFirestore(loc).catch((e) => console.warn('Firestore location update notice:', e));
    showToast(
      language === 'hi'
        ? 'स्थान व ब्लॉक का विवरण सुरक्षित हो गया!'
        : 'Location & Block details updated!'
    );
    triggerAutoGitHubSync(updated);
  };

  // Admin Add Department / Course
  const handleAdminAddCourse = (course: CourseDepartmentMapping) => {
    const updated = saveCustomCourse(course);
    setCoursesList(updated);
    saveCourseToFirestore(course).catch((e) => console.warn('Firestore course save notice:', e));
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'नया विभाग व कोर्स डिपार्टमेंट फाइंडर में जुड़ गया!'
        : 'Department & Course registered successfully!'
    );
  };

  // Admin Update Department / Course (TASK 3)
  const handleAdminUpdateCourse = (course: CourseDepartmentMapping) => {
    const updated = updateCourseDepartmentMapping(course);
    setCoursesList(updated);
    saveCourseToFirestore(course).catch((e) => console.warn('Firestore course update notice:', e));
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'विभाग की जानकारी सफलतापूर्वक अपडेट हो गई!'
        : 'Department info updated & saved!'
    );
  };

  // Admin Delete Department / Course
  const handleAdminDeleteCourse = (courseId: string) => {
    const updated = deleteCourseDepartmentMapping(courseId);
    setCoursesList(updated);
    deleteCourseFromFirestore(courseId).catch((e) => console.warn('Firestore course delete notice:', e));
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'विभाग/कोर्स हटा दिया गया!'
        : 'Department/Course removed!'
    );
  };

  // Admin Restore Department / Course
  const handleAdminRestoreCourse = (courseId: string) => {
    const updated = restoreCourseDepartmentMapping(courseId);
    setCoursesList(updated);
    const restored = updated.find((course) => course.courseId === courseId);
    if (restored) {
      saveCourseToFirestore(restored).catch((e) => console.warn('Firestore course restore notice:', e));
    }
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'विभाग/कोर्स पुनर्स्थापित हो गया!'
        : 'Department/Course restored!'
    );
  };

  // Admin Add Faculty
  const handleAdminAddFaculty = (faculty: FacultyMember) => {
    const updated = saveCustomFaculty(faculty);
    setFacultyList(updated);
    saveFacultyToFirestore(faculty).catch((e) => console.warn('Firestore faculty save notice:', e));
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'शिक्षक प्रोफाइल सुरक्षित हो गई!'
        : 'Faculty profile saved!'
    );
  };

  // Admin Update Faculty
  const handleAdminUpdateFaculty = (faculty: FacultyMember) => {
    const updated = updateFacultyMember(faculty);
    setFacultyList(updated);
    saveFacultyToFirestore(faculty).catch((e) => console.warn('Firestore faculty update notice:', e));
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'शिक्षक का विवरण अपडेट हो गया!'
        : 'Faculty details updated!'
    );
  };

  // Admin Delete Faculty (TASK 2)
  const handleAdminDeleteFaculty = (facultyId: string) => {
    const updated = deleteFacultyMember(facultyId);
    setFacultyList(updated);
    deleteFacultyFromFirestore(facultyId).catch((e) => console.warn('Firestore faculty delete notice:', e));
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'शिक्षक को हटा दिया गया!'
        : 'Teacher removed from faculty directory!'
    );
  };

  // Admin Restore Faculty
  const handleAdminRestoreFaculty = (facultyId: string) => {
    const updated = restoreFacultyMember(facultyId);
    setFacultyList(updated);
    const restored = updated.find((faculty) => faculty.id === facultyId);
    if (restored) {
      saveFacultyToFirestore(restored).catch((e) => console.warn('Firestore faculty restore notice:', e));
    }
    triggerAutoGitHubSync();
    showToast(
      language === 'hi'
        ? 'शिक्षक पुनर्स्थापित हो गए!'
        : 'Faculty member restored!'
    );
  };

  // Admin Update Location / Department Photo
  const handleUpdateLocationPhoto = (locationId: string, imageUrl: string) => {
    const updated = updateLocationPhoto(locationId, imageUrl);
    setLocations(updated);
    if (selectedLocation?.id === locationId) {
      setSelectedLocation(updated.find((l) => l.id === locationId) || null);
    }
    const updatedLocation = updated.find((l) => l.id === locationId);
    if (updatedLocation) {
      saveLocationToFirestore(updatedLocation).catch((e) => console.warn('Firestore location photo update notice:', e));
    }
    triggerAutoGitHubSync(updated);
    showToast(
      language === 'hi'
        ? 'विभाग/स्थान की फोटो सफलतापूर्वक अपडेट हो गई!'
        : 'Department photo updated & saved!'
    );
  };

  // Seamless server persistence & background sync helper
  const triggerAutoGitHubSync = useCallback(
    (currentLocs?: CampusLocation[], customMessage?: string) => {
      try {
        const now = Date.now();
        localStorage.setItem('csjmu_last_local_sync_at', String(now));

        const locs = currentLocs || getSavedLocationsList();
        const fac = getStoredFaculty();
        const crs = getStoredCourses();
        const evts = getStoredEvents();

        const tsContent = generateCampusDataTsFile(locs, fac, crs, '', evts);
        const authHeaders = getAdminToken()
          ? getAdminAuthHeaders()
          : getTeacherToken()
          ? getTeacherAuthHeaders()
          : {};

        // 1. Immediately persist to server persistent storage
        fetch('/api/locations/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            data: { locations: locs, faculty: fac, courses: crs, events: evts },
            source: tsContent,
            updatedAt: now,
          }),
        }).catch((e) => console.warn('Server campus backup update failed:', e));

        // 2. If GitHub repo is configured, also push to GitHub cloud repository
        const config = getGitHubConfig();
        if (config.repo && getAdminToken()) {
          pushToGitHub(
            config,
            tsContent,
            customMessage || `Auto-sync CSJMU campus data updates [${new Date().toISOString()}]`
          ).catch((e) => console.warn('Background GitHub auto-push failed:', e));
        }

        // 3. Immediately replicate every persistent campus dataset to Firestore
        batchSaveLocationsToFirestore(locs).catch((e) => console.warn('Firestore locations auto-sync:', e));
        batchSaveFacultyToFirestore(fac).catch((e) => console.warn('Firestore faculty auto-sync:', e));
        batchSaveCoursesToFirestore(crs).catch((e) => console.warn('Firestore courses auto-sync:', e));
        evts.forEach((event) => {
          saveEventToFirestore(event).catch((e) => console.warn('Firestore event auto-sync:', e));
        });
      } catch (err) {
        console.warn('Campus data auto-sync failed:', err);
      }
    },
    []
  );

  // Manual Trigger to Sync All Campus Data, Events & Teachers to Firebase Firestore
  const handleSyncAllToFirestore = useCallback(async (): Promise<boolean> => {
    try {
      const locs = getSavedLocationsList();
      const fac = getStoredFaculty();
      const crs = getStoredCourses();
      const evts = getStoredEvents();
      const teachers = getStoredTeacherAccounts();

      await batchSaveLocationsToFirestore(locs);
      await batchSaveFacultyToFirestore(fac);
      await batchSaveCoursesToFirestore(crs);
      for (const e of evts) {
        await saveEventToFirestore(e);
      }
      for (const t of teachers) {
        await saveTeacherToFirestore(t);
      }

      showToast(
        language === 'hi'
          ? 'सभी CSJMU डेटा Firebase Firestore में सफलतापूर्वक सिंक हो गया!'
          : 'All CSJMU data successfully synced to Firebase Firestore!'
      );
      return true;
    } catch (err) {
      console.error('Firestore full sync error:', err);
      showToast(
        language === 'hi'
          ? 'Firestore सिंक करने में त्रुटि हुई।'
          : 'Failed to sync with Firebase Firestore.'
      );
      return false;
    }
  }, [language, showToast]);

  // Student Event Submission Handler
  const handleStudentSubmitEvent = (eventData: Omit<CampusEvent, 'id' | 'createdAt' | 'status' | 'isLive' | 'likesCount'>) => {
    const newEvent: CampusEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      status: 'pending',
      isLive: false,
      likesCount: 0,
      createdAt: Date.now(),
      isCustom: true,
    };
    const updated = saveCustomEvent(newEvent);
    setEvents(updated);
    triggerAutoGitHubSync();
    postRemoteEvent(newEvent).catch(() => {});
    showToast(
      language === 'hi'
        ? 'इवेंट सबमिट हो गया! एडमिन अप्रूवल के बाद यह लाइव होगा।'
        : 'Event submitted! It will appear live after admin review.'
    );
  };

  // Admin Event Management Handlers
  const handleApproveEvent = async (eventId: string) => {
    const updated = approveStoredEvent(eventId);
    setEvents(updated);
    triggerAutoGitHubSync();
    try {
      const res = await updateRemoteEvent(eventId, {
        status: 'approved',
        isLive: true,
        approvedAt: new Date().toISOString(),
      });
      if (res.success && res.events) {
        setEvents(res.events);
      }
    } catch (e) {
      console.warn('Remote event approve sync error:', e);
    }
    showToast(
      language === 'hi'
        ? 'इवेंट स्वीकृत हो गया और क्लाउड पर लाइव प्रकाशित हो गया!'
        : 'Event approved and live on campus calendar!'
    );
  };

  const handleRejectEvent = async (eventId: string, reason?: string) => {
    const updated = rejectStoredEvent(eventId, reason);
    setEvents(updated);
    triggerAutoGitHubSync();
    try {
      const res = await updateRemoteEvent(eventId, {
        status: 'rejected',
        isLive: false,
        rejectionReason: reason,
      });
      if (res.success && res.events) {
        setEvents(res.events);
      }
    } catch (e) {
      console.warn('Remote event reject sync error:', e);
    }
    showToast(
      language === 'hi'
        ? 'इवेंट अस्वीकृत कर दिया गया।'
        : 'Event submission marked as rejected.'
    );
  };

  const handleToggleLiveEvent = async (eventId: string, explicitIsLive?: boolean) => {
    const updated = toggleEventLiveStatus(eventId, explicitIsLive);
    setEvents(updated);
    triggerAutoGitHubSync();
    const target = updated.find((e) => e.id === eventId);
    if (target) {
      try {
        const res = await updateRemoteEvent(eventId, { isLive: target.isLive });
        if (res.success) {
          setEvents(getStoredEvents());
        }
      } catch (e) {
        console.warn('Remote event toggle error:', e);
      }
    }
  };

  const handleBatchToggleLiveEvents = async (eventIds: string[], targetIsLive: boolean) => {
    if (!eventIds || eventIds.length === 0) return;
    const updated = batchToggleEventsLiveStatus(eventIds, targetIsLive);
    setEvents(updated);
    triggerAutoGitHubSync();
    try {
      const res = await batchToggleRemoteEvents(eventIds, targetIsLive);
      if (res.success) {
        setEvents(getStoredEvents());
      }
    } catch (e) {
      console.warn('Remote batch toggle error:', e);
    }
    showToast(
      language === 'hi'
        ? targetIsLive
          ? `${eventIds.length} इवेंट्स लाइव कर दिए गए!`
          : `${eventIds.length} इवेंट्स बंद/ऑफ कर दिए गए!`
        : targetIsLive
        ? `${eventIds.length} events are now live!`
        : `${eventIds.length} event popups turned off successfully!`
    );
  };

  const handleUpdateEvent = async (updatedEvent: CampusEvent) => {
    // Update the UI immediately, then persist the complete edited event to
    // Firestore/cloud. Do not silently report success when the cloud update
    // fails, otherwise the next sync can restore the old event information.
    const updated = updateStoredEvent(updatedEvent);
    setEvents(updated);
    triggerAutoGitHubSync();

    try {
      const res = await updateRemoteEvent(updatedEvent.id, updatedEvent);

      if (res.success) {
        if (res.events) {
          setEvents(res.events);
        } else {
          // Keep the edited object visible if the remote endpoint did not
          // return the complete event list.
          setEvents(getStoredEvents());
        }

        showToast(
          language === 'hi'
            ? '✅ इवेंट की जानकारी क्लाउड पर अपडेट हो गई!'
            : '✅ Event information updated on the cloud!'
        );
      } else {
        console.warn('Event edit cloud update failed:', res.message);
        showToast(
          language === 'hi'
            ? `⚠️ इवेंट अपडेट नहीं हुआ: ${res.message || 'Firestore permission/server error'}`
            : `⚠️ Event update failed: ${res.message || 'Firestore permission/server error'}`,
          6000
        );
      }
    } catch (e: any) {
      console.warn('Event edit cloud update error:', e);
      showToast(
        language === 'hi'
          ? `⚠️ इवेंट अपडेट नहीं हुआ: ${e?.message || 'Cloud error'}`
          : `⚠️ Event update failed: ${e?.message || 'Cloud error'}`,
        6000
      );
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const updated = deleteEventById(eventId);
    setEvents(updated);
    triggerAutoGitHubSync();
    try {
      const res = await deleteRemoteEvent(eventId);
      if (res.success && res.events) {
        setEvents(res.events);
      }
    } catch (e) {}
    showToast(
      language === 'hi'
        ? 'इवेंट हटा दिया गया!'
        : 'Event deleted!'
    );
  };

  const handleAddOfficialEvent = async (newEvent: CampusEvent) => {
    const updated = saveCustomEvent(newEvent);
    setEvents(updated);
    triggerAutoGitHubSync();
    try {
      const res = await postRemoteEvent(newEvent);
      if (res.success && res.events) {
        setEvents(res.events);
      }
    } catch (e) {}
    showToast(
      language === 'hi'
        ? 'ऑफिशियल इवेंट सफलतापूर्वक लाइव प्रकाशित हो गया!'
        : 'Official event published live!'
    );
  };

  // Real-time Cloud Events Synchronizer
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = () => {
      fetchRemoteEvents().then((evts) => {
        if (isMounted && Array.isArray(evts) && evts.length > 0) {
          setEvents(evts);
        }
      });
    };

    fetchLatest();

    const handleSyncedEvent = () => {
      setEvents(getStoredEvents());
    };
    window.addEventListener('csjmu_events_synced', handleSyncedEvent);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatest();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchLatest);

    // Periodic poll every 12s to keep event updates live across all devices
    const interval = setInterval(fetchLatest, 12000);

    return () => {
      isMounted = false;
      window.removeEventListener('csjmu_events_synced', handleSyncedEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchLatest);
      clearInterval(interval);
    };
  }, []);

  // Live remote sync: all phones periodically read the latest dataset from
  // GitHub with cache disabled. This fixes the "old phone still shows old data"
  // problem without requiring refresh/reinstall.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const syncFromGitHub = async () => {
      try {
        // 1. Sync from server persistent storage (locations, department photos, faculty, courses)
        const updatedFromServer = await syncCampusDataWithServerBackup();
        if (updatedFromServer && !cancelled) {
          // Locations/events may still use the server backup, but faculty and
          // department/course data are now persisted in Firestore. Do not
          // hydrate those two lists from the older backup snapshot, because
          // that could immediately overwrite a fresh Admin edit with stale
          // data from the server/GitHub backup.
          setLocations(getSavedLocationsList());
          setEvents(getStoredEvents());
        }

        // 2. If GitHub repo is configured, also sync with GitHub cloud repo
        const config = getGitHubConfig();
        if (!config.repo) return;

        // Avoid replacing freshly edited local data while edits are being saved
        const lastLocalSync = Number(localStorage.getItem('csjmu_last_local_sync_at') || 0);
        if (lastLocalSync && Date.now() - lastLocalSync < 25000) return;

        const remote = await fetchLatestCampusData(config);
        if (!remote || cancelled) return;

        const signature = JSON.stringify([
          remote.locations.map((x) => [x.id, x.title, x.coordinates, x.image, x.description]),
          remote.faculty.map((x) => [x.id, x.name, x.department, x.designation, x.email, x.phone]),
          remote.courses.map((x) => [x.courseId, x.courseName, x.departmentName, x.hodName]),
          (remote.events || []).map((x) => [x.id, x.title, x.status, x.isLive, x.startDate, x.endDate]),
          remote.adminPasswordHash,
        ]);

        if (signature === localStorage.getItem('csjmu_remote_signature_v1')) return;

        applyRemoteCampusData(remote.locations, remote.faculty, remote.courses, remote.events);
        localStorage.setItem('csjmu_remote_signature_v1', signature);

        setLocations(getSavedLocationsList());
        setFacultyList(getStoredFaculty());
        setCoursesList(getStoredCourses());
        setEvents(getStoredEvents());
      } catch (e) {
        console.warn('Live GitHub sync failed:', e);
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(syncFromGitHub, 20000);
        }
      }
    };

    syncFromGitHub();

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromGitHub();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Turn Off Drag Mode (Locks pins safely)
  const handleTurnDragOff = useCallback(() => {
    setIsAdminDragMode(false);
    setIsTeacherDragMode(false);
    setJustRelocatedLocation(null);
    showToast(
      language === 'hi'
        ? '🔒 ड्रैग मोड बंद हुआ (लोकेशन लॉक हो गई)'
        : '🔒 Drag Mode Turned Off (Location Locked)'
    );
  }, [language, showToast]);

  // Update Location Coordinates (from Drag or Coords Input)
  const handleUpdateLocationCoordinates = useCallback(
    (locationId: string, newCoords: [number, number]) => {
      const updated = updateLocationCoordinates(locationId, newCoords);
      setLocations(updated);
      const loc = updated.find((l) => l.id === locationId);
      if (selectedLocation?.id === locationId) {
        setSelectedLocation((prev) => (prev ? { ...prev, coordinates: newCoords } : null));
      }
      const title = loc ? (language === 'hi' && loc.hindiTitle ? loc.hindiTitle : loc.title) : 'स्थान';
      setJustRelocatedLocation({
        id: locationId,
        title,
        coordinates: newCoords,
      });

      // Persist dragged coordinates to Firestore as well as local/GitHub storage.
      // Without this, the next Firestore/GitHub refresh can restore the old marker
      // position on the map.
      const movedLocation = updated.find((item) => item.id === locationId);
      if (movedLocation) {
        saveLocationToFirestore(movedLocation).catch((e) =>
          console.warn('Firestore location coordinate save notice:', e)
        );
      }

      triggerAutoGitHubSync(updated);
    },
    [selectedLocation, language, triggerAutoGitHubSync]
  );

  // Start Drag Mode on Map
  const handleStartDragMode = useCallback(
    (targetLocId?: string) => {
      setIsAdminDragMode(true);
      setIsAdminManagerOpen(false);
      setIsTeacherPortalOpen(false);
      setJustRelocatedLocation(null);
      if (targetLocId) {
        const loc = locations.find((l) => l.id === targetLocId);
        if (loc) {
          setFocusCoordinates(loc.coordinates);
          setSelectedLocation(loc);
        }
      }
      showToast(
        language === 'hi'
          ? '📍 ड्रैग मोड सक्रिय: मैप पर किसी भी मार्कर को पकड़कर खींचें!'
          : '📍 Drag Mode Active: Grab and drag any marker on map to reposition!'
      );
    },
    [locations, language, showToast]
  );

  // Delete Location (Any wrong or custom location)
  const handleDeleteLocation = (id: string) => {
    // If not admin, verify that loggedInTeacher is the creator of this location
    if (!isAdminUnlocked && loggedInTeacher) {
      const target = locations.find((l) => l.id === id);
      const isOwner =
        target &&
        (target.teacherId === loggedInTeacher.id ||
          (target.isCustom && target.addedBy && target.addedBy.includes(loggedInTeacher.name)));

      if (!isOwner) {
        showToast(
          language === 'hi'
            ? 'अनुमति नहीं: आप केवल अपने द्वारा जोड़े गए स्थान को ही हटा सकते हैं।'
            : 'Permission Denied: You can only delete locations added by yourself.'
        );
        return;
      }
    }

    const updated = deleteLocationById(id);
    setLocations(updated);
    if (selectedLocation?.id === id) {
      setSelectedLocation(null);
    }
    if (fromLocation?.id === id) {
      setFromLocation(null);
    }
    if (toLocation?.id === id) {
      setToLocation(null);
    }
    showToast(
      language === 'hi'
        ? 'स्थान हटा दिया गया और डेटा साइट पर सुरक्षित सेव हो गया!'
        : 'Location deleted and saved to site storage!'
    );
    deleteLocationFromFirestore(id).catch((e) => console.warn('Firestore location delete notice:', e));
    triggerAutoGitHubSync(updated);
  };

  // Restore Deleted Location
  const handleRestoreLocation = (id: string) => {
    const updated = restoreLocationById(id);
    setLocations(updated);
    const restored = updated.find((l) => l.id === id);
    if (restored) {
      saveLocationToFirestore(restored).catch((e) => console.warn('Firestore location restore notice:', e));
    }
    triggerAutoGitHubSync(updated);
    showToast(
      language === 'hi'
        ? 'स्थान पुनर्स्थापित हो गया और साइट पर सेव हो गया!'
        : 'Location restored and saved to site!'
    );
  };

  // Admin Reset to Factory Defaults
  const handleResetToDefaults = () => {
    if (
      window.confirm(
        language === 'hi'
          ? 'क्या आप CSJMU कैंपस का मूल मैप डेटा रीसेट करना चाहते हैं?'
          : 'Are you sure you want to restore original default campus positions?'
      )
    ) {
      const defaults = resetLocationsToDefault();
      setLocations(defaults);
      setFacultyList(CSJMU_FACULTY);
      setCoursesList(getStoredCourses());
      triggerAutoGitHubSync(defaults);
      setIsAdminManagerOpen(false);
      showToast(language === 'hi' ? 'मूल कैंपस मैप डेटा रीसेट हो गया' : 'Restored to default campus positions');
    }
  };

  // Category Quick Filter Selection
  const handleCategorySelect = (category: string) => {
    if (category === 'all') {
      setSelectedLocation(null);
      return;
    }
    const found = locations.find((l) => l.category === category);
    if (found) {
      const matchedFaculty = facultyList.filter(
        (fac) => fac.departmentId === found.id || fac.buildingId === found.id
      );
      setSelectedLocation({ ...found, facultyList: matchedFaculty });
      setFocusCoordinates(found.coordinates);
    }
  };

  // Teacher Portal & Auth Handlers
  const handleOpenTeacherPortal = () => {
    if (loggedInTeacher) {
      setIsTeacherPortalOpen(true);
    } else {
      setIsTeacherAuthOpen(true);
    }
  };

  const handleTeacherLoginSuccess = (teacher: TeacherAccount) => {
    setLoggedInTeacher(teacher);
    setIsTeacherAuthOpen(false);
    setIsTeacherPortalOpen(true);
    setFacultyList(getStoredFaculty());
    showToast(
      language === 'hi'
        ? `स्वागत है, ${teacher.name}! फैकल्टी पोर्टल सक्रिय है।`
        : `Welcome, ${teacher.name}! Faculty portal active.`
    );
  };

  const handleTeacherLogout = () => {
    logoutTeacher();
    setLoggedInTeacher(null);
    setIsTeacherPortalOpen(false);
    showToast(
      language === 'hi'
        ? 'शिक्षक पोर्टल से लॉगआउट हो गया।'
        : 'Logged out of teacher portal successfully.'
    );
  };

  const handleTeacherProfileUpdated = (updatedTeacher: TeacherAccount) => {
    setLoggedInTeacher(updatedTeacher);
    setFacultyList(getStoredFaculty());
    showToast(
      language === 'hi'
        ? 'प्रोफाइल व केबिन विवरण अपडेट हो गया!'
        : 'Cabin & profile details updated successfully!'
    );
  };

  return (
    <div id="csjmu-app-root" className="relative w-screen h-screen overflow-hidden bg-[#F2F2F7] select-none font-sans">
      {/* 1. Top Navbar (Header, Quick Search, Language Switch, Map Style & Modals) */}
      {!isZenMode && !isLiveNavActive && (
        <div id="top-navbar-wrapper" className="absolute top-0 inset-x-0 z-40 pointer-events-auto">
          <Navbar
            locations={locations}
            courses={coursesList}
            facultyList={facultyList}
            onSelectLocation={handleSelectLocation}
            onStartNavigationTo={(loc) => handleStartNavigationTo(loc)}
            language={language}
            onToggleLanguage={handleToggleLanguage}
            mapStyle={mapStyle}
            onChangeMapStyle={handleChangeMapStyle}
            onOpenDeptFinder={() => setIsDeptFinderOpen(true)}
            onOpenFacultyLocator={() => setIsFacultyDirectoryOpen(true)}
            onOpenAddMarker={() => setIsAddMarkerOpen(true)}
            onOpenReportBug={() => setIsReportBugOpen(true)}
            onOpenFloorPlan={() => setIsFloorPlanOpen(true)}
            onOpenAdminManager={() => setIsAdminManagerOpen(true)}
            onOpenDownloadApp={() => setIsDownloadModalOpen(true)}
            onOpenEventsModal={() => setIsEventsModalOpen(true)}
            eventsCount={events.filter((e) => e.status === 'approved' && e.isLive !== false).length}
            onRecenterMap={() => {
              setSelectedLocation(null);
              setFocusCoordinates(CSJMU_CENTER);
            }}
            onGetGpsLocation={() => {
              if (userCoordinates) {
                const distFromCampus = getDistanceMeters(userCoordinates, CSJMU_CENTER);
                if (distFromCampus <= 4500) {
                  setFocusCoordinates(userCoordinates);
                } else {
                  showToast(
                    language === 'hi'
                      ? 'आप वर्तमान में सीएसजेएमयू परिसर से बाहर हैं। मैप परिसर पर केंद्रित रखा गया है।'
                      : 'You are currently off-campus. Map is centered on CSJMU Campus.'
                  );
                  setSelectedLocation(null);
                  setFocusCoordinates(CSJMU_CENTER);
                }
              } else {
                handleUseCurrentGpsAsStart();
              }
            }}
            isAdminUnlocked={isAdminUnlocked}
            canInstallPwa={!!installPrompt}
            loggedInTeacher={loggedInTeacher}
            onOpenTeacherPortal={handleOpenTeacherPortal}
          />
        </div>
      )}

      {/* 2. Main Full-Screen Leaflet Campus Map Canvas */}
      <div className="absolute inset-0 z-0">
        <CampusMap
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          navigationRoute={navigationRoute}
          mapStyle={mapStyle}
          isPickingLocation={isPickingLocation}
          pickedCoordinates={pickedCoordinates}
          onPickCoordinates={handleConfirmPickedCoordinates}
          onCancelPick={handleCancelPicking}
          userCoordinates={userCoordinates}
          language={language}
          onStartNavigationTo={(loc) => handleStartNavigationTo(loc)}
          isAdminMode={isAdminDragMode || isAdminUnlocked}
          isDragUnlocked={isAdminDragMode}
          isTeacherDragUnlocked={isTeacherDragMode && !!loggedInTeacher && canTeacherAddLocations(loggedInTeacher)}
          onDisableDrag={handleTurnDragOff}
          onDeleteLocation={handleDeleteLocation}
          onUpdateLocationCoordinates={handleUpdateLocationCoordinates}
          focusCoordinates={focusCoordinates}
          isLiveNavActive={isLiveNavActive}
          activeLiveNavStepIdx={activeLiveNavStepIdx}
          userHeading={userHeading}
          isNavPanelMinimized={isNavPanelMinimized}
          toLocation={toLocation}
          navTriggerId={navTriggerId}
          liveNavTriggerId={liveNavTriggerId}
        />
      </div>

      {/* Floating Drag Mode HUD (When Admin or Teacher is dragging markers) */}
      {(isAdminDragMode || isTeacherDragMode) && (
        <div
          id="admin-drag-mode-hud"
          className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-[92%] max-w-xl animate-fade-in top-[6.75rem] md:top-[4.5rem]"
        >
          <div className={`p-3.5 sm:p-4 bg-white text-zinc-900 shadow-2xl rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 border ${
            justRelocatedLocation ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-blue-500'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 shadow-md ${
                justRelocatedLocation ? 'bg-emerald-500 text-white animate-bounce' : 'bg-blue-600 text-white animate-pulse'
              }`}>
                {justRelocatedLocation ? <CheckCircle2 className="w-5 h-5" /> : <Move className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs sm:text-sm font-black ${
                    justRelocatedLocation ? 'text-emerald-700' : 'text-blue-700'
                  }`}>
                    {justRelocatedLocation
                      ? (language === 'hi' ? `✓ ${justRelocatedLocation.title} सेट हो गया!` : `✓ ${justRelocatedLocation.title} Position Set!`)
                      : (language === 'hi' ? '📍 ड्रैग लोकेशन मोड सक्रिय' : '📍 Marker Drag Mode Active')}
                  </span>
                  <span className="px-2.5 py-0.5 bg-black/[0.04] text-zinc-700 border border-black/[0.08] rounded-full text-[10px] font-bold">
                    {isAdminDragMode ? 'Admin' : 'Teacher'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5 font-medium">
                  {justRelocatedLocation
                    ? (language === 'hi'
                        ? `नए निर्देशांक: [${justRelocatedLocation.coordinates[0]}, ${justRelocatedLocation.coordinates[1]}] • पूरा होने पर "ड्रैग बंद करें" दबाएं।`
                        : `New coords: [${justRelocatedLocation.coordinates[0]}, ${justRelocatedLocation.coordinates[1]}] • Click "Turn Drag Off" when done.`)
                    : (language === 'hi'
                        ? 'मैप पर किसी भी पिन को दबाकर नई जगह पर छोड़ें (Auto-Saved)'
                        : 'Click & drag any marker to relocate it. Changes auto-save locally.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {isAdminUnlocked && (
                <button
                  type="button"
                  id="btn-open-admin-from-drag-hud"
                  onClick={() => setIsAdminManagerOpen(true)}
                  className="px-3.5 py-2 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border border-black/[0.08] rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ios-press"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Admin Panel</span>
                </button>
              )}
              <button
                type="button"
                id="btn-hud-turn-drag-off"
                onClick={handleTurnDragOff}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer ios-press"
                title={language === 'hi' ? 'मार्कर लॉक करें' : 'Turn off drag and lock pins'}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'ड्रैग बंद करें (Lock)' : 'Turn Drag Off'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Navigation Card (Turn-by-turn routing with Minimize support) */}
      {!isZenMode && !isLiveNavActive && (toLocation || fromLocation) && (
        <div
          id="floating-navigation-wrapper"
          className="fixed left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-30 pointer-events-auto flex justify-center sm:justify-start top-[4.5rem] md:top-[4.25rem] transform-none"
        >
          <NavigationPanel
            locations={locations}
            fromLocation={fromLocation}
            toLocation={toLocation}
            onSelectTo={(loc) => {
              setToLocation(loc);
              if (loc) setNavTriggerId(Date.now());
            }}
            route={navigationRoute}
            onClearRoute={handleClearRoute}
            language={language}
            userCoordinates={userCoordinates}
            onUseCurrentLocationAsStart={handleUseCurrentGpsAsStart}
            onStartLiveNavigation={() => {
              navigationAudio.unlockAudio();
              setActiveLiveNavStepIdx(0);
              setIsLiveNavActive(true);
              setLiveNavTriggerId(Date.now());
            }}
            isMinimized={isNavPanelMinimized}
            onToggleMinimize={() => setIsNavPanelMinimized(!isNavPanelMinimized)}
          />
        </div>
      )}

      {/* 4. Live Turn-by-Turn HUD with Voice Guidance & Google Maps Redirect */}
      {isLiveNavActive && navigationRoute && toLocation && (
        <GoogleMapsLiveNav
          route={navigationRoute}
          fromLocation={fromLocation}
          toLocation={toLocation}
          onExit={() => setIsLiveNavActive(false)}
          language={language}
          userCoordinates={userCoordinates}
          activeStepIdx={activeLiveNavStepIdx}
          onStepChange={(stepIdx) => setActiveLiveNavStepIdx(stepIdx)}
        />
      )}

      {/* 5. Building Detail Bottom Drawer (When a pin is clicked) */}
      {!isZenMode && !isLiveNavActive && selectedLocation && (
        <BuildingDetailDrawer
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onStartNavigation={(loc) => handleStartNavigationTo(loc)}
          onAddFacultyToBuilding={(loc) => {
            setSelectedLocation(loc);
            setIsAdminManagerOpen(true);
          }}
          onSelectFaculty={(fac) => {
            const bLoc = locations.find((l) => l.id === fac.buildingId || l.id === fac.departmentId);
            if (bLoc) {
              handleStartNavigationTo(bLoc);
            }
          }}
          onDeleteLocation={handleDeleteLocation}
          onUpdateCoordinates={handleUpdateLocationCoordinates}
          isAdminUnlocked={isAdminUnlocked}
          language={language}
        />
      )}

      {/* 6. Compact Mobile Quick Floating Controls (Speed Dial, Full Map & Events exactly as requested) */}
      {!isLiveNavActive && (
        <MobileQuickControls
          language={language}
          onOpenDeptFinder={() => setIsDeptFinderOpen(true)}
          onOpenFacultyLocator={() => setIsFacultyDirectoryOpen(true)}
          onOpenAddMarker={() => setIsAddMarkerOpen(true)}
          onOpenReportBug={() => setIsReportBugOpen(true)}
          onOpenDownloadApp={() => setIsDownloadModalOpen(true)}
          onOpenAdminManager={() => setIsAdminManagerOpen(true)}
          onOpenEventsModal={() => setIsEventsModalOpen(true)}
          eventsCount={events.filter((e) => e.status === 'approved' && e.isLive !== false).length}
          isAdminUnlocked={isAdminUnlocked}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(!isZenMode)}
          loggedInTeacher={loggedInTeacher}
          onOpenTeacherPortal={handleOpenTeacherPortal}
          isDragModeActive={isAdminDragMode || isTeacherDragMode}
          onTurnDragOff={handleTurnDragOff}
        />
      )}

      {/* 7. Modals */}
      {/* Campus Events Directory Modal */}
      <EventsModal
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
        events={events}
        locations={locations}
        campusLocations={locations}
        language={language}
        currentLang={language}
        onOpenSubmitModal={() => {
          setIsEventsModalOpen(false);
          setIsSubmitEventModalOpen(true);
        }}
        onNavigateToLocation={(loc) => {
          setIsEventsModalOpen(false);
          handleStartNavigationTo(loc);
        }}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAdminManager={() => {
          setIsEventsModalOpen(false);
          setIsAdminManagerOpen(true);
        }}
        onSyncCollegeEvents={(updated) => setEvents(updated)}
      />

      {/* Student Event Submission Modal */}
      <SubmitEventModal
        isOpen={isSubmitEventModalOpen}
        onClose={() => setIsSubmitEventModalOpen(false)}
        onSubmitEvent={handleStudentSubmitEvent}
        locations={locations}
        language={language}
      />

      {/* PWA App Download Guide Modal */}
      <AppDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        language={language}
        installPrompt={installPrompt}
        onTriggerInstall={handleTriggerInstall}
        isAlreadyInstalled={isAppInstalled}
      />

      {/* Department & Course Finder Modal */}
      <DepartmentFinderModal
        isOpen={isDeptFinderOpen}
        onClose={() => setIsDeptFinderOpen(false)}
        locations={locations}
        courses={coursesList}
        onNavigateToDepartment={(deptLoc) => {
          handleStartNavigationTo(deptLoc);
        }}
        onOpenAdminManager={() => {
          setIsDeptFinderOpen(false);
          setIsAdminManagerOpen(true);
        }}
        language={language}
      />

      {/* Faculty Cabin Locator Modal */}
      <FacultyDirectoryModal
        isOpen={isFacultyDirectoryOpen}
        onClose={() => setIsFacultyDirectoryOpen(false)}
        facultyList={facultyList}
        locations={locations}
        onNavigateToFaculty={(faculty, buildingLoc) => {
          handleStartNavigationTo(buildingLoc);
        }}
        onOpenAdminManager={() => {
          setIsFacultyDirectoryOpen(false);
          setIsAdminManagerOpen(true);
        }}
        onDeleteFaculty={handleAdminDeleteFaculty}
        isAdminUnlocked={isAdminUnlocked}
        language={language}
      />

      {/* Report Bugs & Issue Form Modal (Directs to stark12300@gmail.com) */}
      <ReportBugModal
        isOpen={isReportBugOpen}
        onClose={() => setIsReportBugOpen(false)}
        language={language}
        selectedLocation={selectedLocation}
      />

      {/* Floor Plans & Indoor Blueprint Modal */}
      <FloorPlanModal
        isOpen={isFloorPlanOpen}
        onClose={() => setIsFloorPlanOpen(false)}
        language={language}
      />

      {/* Add Campus Marker & Location Modal */}
      <AddMarkerModal
        isOpen={isAddMarkerOpen}
        onClose={() => setIsAddMarkerOpen(false)}
        pickedCoordinates={pickedCoordinates}
        onStartPicking={() => handleStartPickingLocation('add-marker')}
        onSaveCustomLocation={(newLoc, newFac) => {
          handleAdminAddLocation(newLoc);
          if (newFac) {
            handleAdminAddFaculty(newFac);
          }
        }}
        locations={locations}
        language={language}
        isAdminUnlocked={isAdminUnlocked}
        loggedInTeacher={loggedInTeacher}
      />

      {/* Admin Profile & Campus Manager Modal */}
      <AdminLocationManagerModal
        isOpen={isAdminManagerOpen}
        onClose={() => setIsAdminManagerOpen(false)}
        isAdminUnlocked={isAdminUnlocked}
        onUnlockAdmin={handleUnlockAdmin}
        onLockAdmin={handleLockAdmin}
        onChangePin={handleChangeAdminPin}
        locations={locations}
        facultyList={facultyList}
        coursesList={coursesList}
        events={events}
        onApproveEvent={handleApproveEvent}
        onRejectEvent={handleRejectEvent}
        onToggleLiveEvent={handleToggleLiveEvent}
        onBatchToggleLiveEvents={handleBatchToggleLiveEvents}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
        onAddEvent={handleAddOfficialEvent}
        onAddLocation={handleAdminAddLocation}
        onUpdateLocation={handleAdminUpdateLocation}
        onDeleteLocation={handleDeleteLocation}
        onRestoreLocation={handleRestoreLocation}
        onResetToDefaults={handleResetToDefaults}
        onAddDepartmentCourse={handleAdminAddCourse}
        onUpdateDepartmentCourse={handleAdminUpdateCourse}
        onDeleteDepartmentCourse={handleAdminDeleteCourse}
        onRestoreDepartmentCourse={handleAdminRestoreCourse}
        onAddFaculty={handleAdminAddFaculty}
        onUpdateFaculty={handleAdminUpdateFaculty}
        onDeleteFaculty={handleAdminDeleteFaculty}
        onRestoreFaculty={handleAdminRestoreFaculty}
        onUpdateLocationPhoto={handleUpdateLocationPhoto}
        onUpdateLocationCoordinates={handleUpdateLocationCoordinates}
        onStartDragMode={handleStartDragMode}
        isAdminDragMode={isAdminDragMode}
        onToggleDragMode={handleToggleDragLock}
        language={language}
        onSyncCollegeEvents={(updated) => setEvents(updated)}
        loggedInTeacher={loggedInTeacher}
        onOpenTeacherPortal={() => setIsTeacherPortalOpen(true)}
        onOpenTeacherAuth={() => setIsTeacherAuthOpen(true)}
        onTeacherLogout={handleTeacherLogout}
        onTeacherLoginSuccess={handleTeacherLoginSuccess}
      />

      {/* Teacher Authentication (Signup with ID Photo & Login) Modal */}
      <TeacherAuthModal
        isOpen={isTeacherAuthOpen}
        onClose={() => setIsTeacherAuthOpen(false)}
        locations={locations}
        language={language}
        onLoginSuccess={handleTeacherLoginSuccess}
      />

      {/* Teacher Dashboard & Permission-Restricted Actions Portal */}
      {loggedInTeacher && (
        <TeacherPortalModal
          isOpen={isTeacherPortalOpen}
          onClose={() => setIsTeacherPortalOpen(false)}
          teacher={loggedInTeacher}
          locations={locations}
          language={language}
          initialTab={teacherPortalTab}
          pickedCoordinatesForTeacher={teacherPickedCoords}
          onStartPickingLocation={(target) => {
            if (target === 'profile') {
              handleStartPickingLocation('teacher-profile');
            } else {
              handleStartPickingLocation('teacher-locations');
            }
          }}
          onLogout={handleTeacherLogout}
          onUpdateTeacher={(updated) => {
            setLoggedInTeacher(updated);
            handleTeacherProfileUpdated(updated);
          }}
          onNavigateToCabin={(cabinLoc) => {
            setIsTeacherPortalOpen(false);
            handleStartNavigationTo(cabinLoc);
          }}
          onOpenAddMarker={() => {
            setIsTeacherPortalOpen(false);
            setIsAddMarkerOpen(true);
          }}
          onAddLocation={handleAdminAddLocation}
          onUpdateLocation={handleAdminUpdateLocation}
          onUpdateLocationCoordinates={handleUpdateLocationCoordinates}
          onDeleteLocation={handleDeleteLocation}
          onAddFaculty={handleAdminAddFaculty}
          onUpdateFaculty={handleAdminUpdateFaculty}
          onDeleteFaculty={handleAdminDeleteFaculty}
          onAddCourse={handleAdminAddCourse}
          onUpdateCourse={handleAdminUpdateCourse}
          onDeleteCourse={handleAdminDeleteCourse}
          onAddEvent={handleAddOfficialEvent}
          isDragUnlocked={isTeacherDragMode}
          onToggleDragMode={(val) => setIsTeacherDragMode(val)}
          onOpenAdminMode={() => {
            setIsTeacherPortalOpen(false);
            setIsAdminManagerOpen(true);
          }}
          events={events}
          onApproveEvent={handleApproveEvent}
          onRejectEvent={handleRejectEvent}
          onToggleLiveEvent={handleToggleLiveEvent}
          onBatchToggleLiveEvents={handleBatchToggleLiveEvents}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {/* Floating Save Confirmation Toast (iPhone Dynamic Island Pill) */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="px-5 py-2.5 bg-white text-zinc-900 border border-zinc-200 shadow-2xl rounded-full text-xs font-bold flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
