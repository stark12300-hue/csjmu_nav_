import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  MapPin,
  Users,
  GraduationCap,
  KeyRound,
  Trash2,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Move,
  RotateCcw,
  Sparkles,
  Layers,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  Building,
  Upload,
  Calendar,
  ExternalLink,
  LogOut,
  Smartphone,
  DownloadCloud
} from 'lucide-react';
import {
  CampusLocation,
  FacultyMember,
  CourseDepartmentMapping,
  CampusEvent,
  Language,
  TeacherAccount,
} from '../types';
import { TRANSLATIONS } from '../translations';
import {
  getAdminLockoutInfo,
  LockoutInfo,
  getDeletedLocationIds,
  getDeletedFacultyIds,
  getDeletedCourseIds,
  getStoredTeacherAccounts,
  getStoredReportEmail,
  DEFAULT_REPORT_EMAIL,
  fetchRemoteReportEmail,
  updateRemoteReportEmail,
  getAdminAuthHeaders,
} from '../utils/storage';
import { loginRemoteTeacher } from '../utils/teacherRemote';
import { AdminFacultyManager } from './admin/AdminFacultyManager';
import { AdminDepartmentManager } from './admin/AdminDepartmentManager';
import { AdminLocationsManager } from './admin/AdminLocationsManager';
import { AdminEventManager } from './admin/AdminEventManager';
import { AdminTeacherManager } from './admin/AdminTeacherManager';

interface AdminLocationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminUnlocked: boolean;
  onUnlockAdmin: (pin: string) => boolean | Promise<any>;
  onLockAdmin: () => void;
  onChangePin: (newPin: string) => boolean;
  locations: CampusLocation[];
  facultyList: FacultyMember[];
  coursesList: CourseDepartmentMapping[];
  events?: CampusEvent[];
  onApproveEvent?: (eventId: string) => void;
  onRejectEvent?: (eventId: string, reason?: string) => void;
  onToggleLiveEvent?: (eventId: string) => void;
  onBatchToggleLiveEvents?: (eventIds: string[], isLive: boolean) => void;
  onUpdateEvent?: (event: CampusEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onAddEvent?: (event: CampusEvent) => void;
  onAddLocation: (loc: CampusLocation) => void;
  onUpdateLocation?: (loc: CampusLocation) => void;
  onDeleteLocation: (id: string) => void;
  onRestoreLocation: (id: string) => void;
  onResetToDefaults: () => void;
  onAddDepartmentCourse: (course: CourseDepartmentMapping) => void;
  onUpdateDepartmentCourse?: (course: CourseDepartmentMapping) => void;
  onDeleteDepartmentCourse?: (courseId: string) => void;
  onRestoreDepartmentCourse?: (courseId: string) => void;
  onAddFaculty: (faculty: FacultyMember) => void;
  onUpdateFaculty?: (faculty: FacultyMember) => void;
  onDeleteFaculty?: (facultyId: string) => void;
  onRestoreFaculty?: (facultyId: string) => void;
  onUpdateLocationPhoto?: (id: string, photoUrl: string) => void;
  onUpdateLocationCoordinates?: (id: string, coords: [number, number]) => void;
  onStartDragMode?: (locId?: string) => void;
  isAdminDragMode?: boolean;
  onToggleDragMode?: () => void;
  language: Language;
  onSyncCollegeEvents?: (events: CampusEvent[]) => void;
  loggedInTeacher?: TeacherAccount | null;
  onOpenTeacherPortal?: () => void;
  onOpenTeacherAuth?: () => void;
  onTeacherLogout?: () => void;
  onTeacherLoginSuccess?: (teacher: TeacherAccount) => void;
}

export const AdminLocationManagerModal: React.FC<AdminLocationManagerModalProps> = ({
  isOpen,
  onClose,
  isAdminUnlocked,
  onUnlockAdmin,
  onLockAdmin,
  onChangePin,
  locations,
  facultyList,
  coursesList,
  events = [],
  onApproveEvent = (_id: string) => {},
  onRejectEvent = (_id: string, _reason?: string) => {},
  onToggleLiveEvent = (_id: string) => {},
  onBatchToggleLiveEvents = (_ids: string[], _live: boolean) => {},
  onUpdateEvent = (_evt: CampusEvent) => {},
  onDeleteEvent = (_id: string) => {},
  onAddEvent = (_evt: CampusEvent) => {},
  onAddLocation,
  onUpdateLocation = (_loc: CampusLocation) => {},
  onDeleteLocation,
  onRestoreLocation,
  onResetToDefaults,
  onAddDepartmentCourse,
  onUpdateDepartmentCourse = (_course: CourseDepartmentMapping) => {},
  onDeleteDepartmentCourse = (_courseId: string) => {},
  onRestoreDepartmentCourse = (_courseId: string) => {},
  onAddFaculty,
  onUpdateFaculty = (_faculty: FacultyMember) => {},
  onDeleteFaculty = (_facultyId: string) => {},
  onRestoreFaculty = (_facultyId: string) => {},
  onUpdateLocationPhoto = (_id: string, _photoUrl: string) => {},
  onUpdateLocationCoordinates = (_id: string, _coords: [number, number]) => {},
  onStartDragMode,
  isAdminDragMode = false,
  onToggleDragMode,
  language,
  onSyncCollegeEvents,
  loggedInTeacher,
  onOpenTeacherPortal,
  onOpenTeacherAuth,
  onTeacherLogout,
  onTeacherLoginSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState<string | null>(null);
  const [loginPortalMode, setLoginPortalMode] = useState<'admin' | 'faculty'>('admin');
  
  // Faculty Login states inside the modal
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [showFacultyPassword, setShowFacultyPassword] = useState(false);
  const [facultyLoginError, setFacultyLoginError] = useState<string | null>(null);
  const [facultyPendingMsg, setFacultyPendingMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'departments' | 'faculty' | 'teachers' | 'locations' | 'events' | 'change-pin' | 'deleted'
  >('profile');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Lockout State
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo>(getAdminLockoutInfo());
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // PIN Change State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeErr, setPinChangeErr] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);

  // APK Management State
  const [apkCustomUrl, setApkCustomUrl] = useState('');
  const [apkInfo, setApkInfo] = useState<{
    version: string;
    sizeFormatted: string;
    available: boolean;
    downloadUrl: string;
  } | null>(null);
  const [isSavingApk, setIsSavingApk] = useState(false);
  const [apkSaveSuccess, setApkSaveSuccess] = useState<string | null>(null);

  // Bug & Issue Report Target Email Management State
  const [reportEmailInput, setReportEmailInput] = useState<string>(() => getStoredReportEmail());
  const [currentConfiguredEmail, setCurrentConfiguredEmail] = useState<string>(() => getStoredReportEmail());
  const [isSavingReportEmail, setIsSavingReportEmail] = useState(false);
  const [reportEmailSaveSuccess, setReportEmailSaveSuccess] = useState<string | null>(null);
  const [reportEmailError, setReportEmailError] = useState<string | null>(null);
  const [receivedReportsCount, setReceivedReportsCount] = useState<number | null>(null);

  const t = TRANSLATIONS[language];

  // Refresh lockout info on open
  useEffect(() => {
    const info = getAdminLockoutInfo();
    setLockoutInfo(info);
    if (info.isLocked) {
      setCountdownSeconds(info.remainingSeconds);
    }
  }, [isOpen]);

  // Fetch APK configuration and report email config on admin unlock
  useEffect(() => {
    if (isOpen && isAdminUnlocked) {
      fetch('/api/app/apk-info')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setApkInfo({
              version: data.version,
              sizeFormatted: data.sizeFormatted,
              available: data.available,
              downloadUrl: data.downloadUrl,
            });
            setApkCustomUrl(data.customDownloadUrl || '');
          }
        })
        .catch(() => {});

      // Fetch active report email
      fetchRemoteReportEmail()
        .then((email) => {
          if (email && email.includes('@')) {
            setCurrentConfiguredEmail(email);
            setReportEmailInput(email);
          }
        })
        .catch(() => {});

      // Fetch bug reports stats
      fetch('/api/bug-reports', {
        headers: getAdminAuthHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.total === 'number') {
            setReceivedReportsCount(data.total);
          }
          if (data?.targetEmail && typeof data.targetEmail === 'string' && data.targetEmail.includes('@')) {
            setCurrentConfiguredEmail(data.targetEmail);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isAdminUnlocked]);

  const handleSaveApkConfig = async () => {
    setIsSavingApk(true);
    setApkSaveSuccess(null);
    try {
      const res = await fetch('/api/admin/apk-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDownloadUrl: apkCustomUrl }),
      });
      if (res.ok) {
        setApkSaveSuccess(
          language === 'hi' ? 'APK डाउनलोड सेटिंग्स सहेजी गईं!' : 'APK settings saved successfully!'
        );
        setTimeout(() => setApkSaveSuccess(null), 4000);
      }
    } catch (e) {
      console.warn('Failed to save apk config:', e);
    } finally {
      setIsSavingApk(false);
    }
  };

  const handleSaveReportEmail = async () => {
    setReportEmailError(null);
    setReportEmailSaveSuccess(null);

    const emailToSave = reportEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSave)) {
      setReportEmailError(
        language === 'hi'
          ? 'कृपया एक मान्य ईमेल पता दर्ज करें (उदा: admin@csjmu.ac.in)'
          : 'Please enter a valid email address (e.g. admin@csjmu.ac.in)'
      );
      return;
    }

    setIsSavingReportEmail(true);
    try {
      const res = await updateRemoteReportEmail(emailToSave);
      setCurrentConfiguredEmail(emailToSave);
      setReportEmailSaveSuccess(
        language === 'hi'
          ? `बग रिपोर्ट ईमेल सफलतापूर्वक बदलकर "${emailToSave}" कर दिया गया!`
          : `Report recipient email updated to "${emailToSave}" successfully!`
      );
      setTimeout(() => setReportEmailSaveSuccess(null), 5000);
    } catch (err: any) {
      setReportEmailError(err?.message || 'Failed to update email');
    } finally {
      setIsSavingReportEmail(false);
    }
  };

  const handleResetReportEmail = async () => {
    setReportEmailError(null);
    setReportEmailSaveSuccess(null);
    setIsSavingReportEmail(true);
    try {
      await updateRemoteReportEmail(DEFAULT_REPORT_EMAIL);
      setReportEmailInput(DEFAULT_REPORT_EMAIL);
      setCurrentConfiguredEmail(DEFAULT_REPORT_EMAIL);
      setReportEmailSaveSuccess(
        language === 'hi'
          ? `ईमेल पुनः डिफ़ॉल्ट (${DEFAULT_REPORT_EMAIL}) पर सेट कर दिया गया!`
          : `Email reset to default (${DEFAULT_REPORT_EMAIL}) successfully!`
      );
      setTimeout(() => setReportEmailSaveSuccess(null), 5000);
    } catch (err: any) {
      setReportEmailError(err?.message || 'Failed to reset email');
    } finally {
      setIsSavingReportEmail(false);
    }
  };

  // Lockout Countdown Timer
  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          setLockoutInfo(getAdminLockoutInfo());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  const deletedLocIds = useMemo(() => getDeletedLocationIds(), [locations]);
  const deletedFacIds = useMemo(() => getDeletedFacultyIds(), [facultyList]);
  const deletedCrsIds = useMemo(() => getDeletedCourseIds(), [coursesList]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const info = getAdminLockoutInfo();
    if (info.isLocked) {
      setLockoutInfo(info);
      setCountdownSeconds(info.remainingSeconds);
      return;
    }

    setPinErrorMessage(null);
    const result: any = await onUnlockAdmin(pinInput);
    const isSuccess = typeof result === 'boolean' ? result : Boolean(result?.success);
    if (!isSuccess) {
      setPinError(true);
      if (result && typeof result === 'object' && result.message) {
        setPinErrorMessage(result.message);
      }
      const updatedInfo = getAdminLockoutInfo();
      setLockoutInfo(updatedInfo);
      if (updatedInfo.isLocked || (result && typeof result === 'object' && result.isLocked)) {
        setCountdownSeconds(updatedInfo.remainingSeconds || (result?.remainingSeconds || 30));
      }
    } else {
      setPinError(false);
      setPinErrorMessage(null);
      setPinInput('');
      showToast(language === 'hi' ? 'एडमिन पोर्टल में आपका स्वागत है!' : 'Admin authenticated successfully!');
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeErr(null);
    setPinChangeSuccess(null);

    if (newPinInput.length < 4) {
      setPinChangeErr(language === 'hi' ? 'नया पिन कम से कम 4 अंकों का होना चाहिए' : 'New PIN must be at least 4 digits');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeErr(language === 'hi' ? 'दोनों पिन मेल नहीं खाते' : 'PIN confirmation does not match');
      return;
    }

    const success = onChangePin(newPinInput);
    if (success) {
      setPinChangeSuccess(language === 'hi' ? 'एडमिन पिन सफलतापूर्वक बदल दिया गया!' : 'Admin PIN changed successfully!');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } else {
      setPinChangeErr(language === 'hi' ? 'पिन बदलने में त्रुटि हुई' : 'Failed to update PIN');
    }
  };

  return (
    <div
      id="admin-manager-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-fade-in"
    >
      <div
        id="admin-manager-modal-card"
        className="ios-liquid-modal rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[calc(100dvh-20px)] sm:max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 min-w-0"
      >
        {/* Modal Top Header */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 ios-liquid-header border-b border-slate-200 text-zinc-900 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-base font-black tracking-tight truncate text-zinc-900">
                  {language === 'hi' ? 'CSJMU एडमिन पोर्टल' : 'CSJMU Admin Portal'}
                </h2>
                {isAdminUnlocked && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/15 text-emerald-800 border border-emerald-400/40 rounded-full text-[9px] font-bold shadow-2xs">
                    UNLOCKED
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate hidden xs:block font-medium">
                {language === 'hi'
                  ? 'कैंपस मैप, विभाग, कोर्स व शिक्षक डेटा प्रबंधन'
                  : 'Manage campus markers, departments, faculty & events'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isAdminUnlocked && (
              <button
                type="button"
                onClick={onLockAdmin}
                className="px-2 sm:px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Lock admin session"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden xs:inline">{language === 'hi' ? 'लॉक' : 'Lock'}</span>
              </button>
            )}
            <button
              type="button"
              id="btn-close-admin-modal"
              onClick={onClose}
              className="p-1 sm:p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition shrink-0 cursor-pointer"
              aria-label="Close admin modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* If Admin is LOCKED -> Show Dual Login Selector (Admin Security PIN or Faculty Portal) */}
        {!isAdminUnlocked ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start min-w-0 bg-zinc-50/40">
            {/* Top Switcher: Admin Security PIN vs Faculty / Teacher Login */}
            <div className="w-full max-w-md mb-6">
              <div className="p-1 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginPortalMode('admin');
                    setPinError(false);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginPortalMode === 'admin'
                      ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{language === 'hi' ? 'एडमिन पिन लॉगिन' : 'Admin Security PIN'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginPortalMode('faculty');
                    setFacultyLoginError(null);
                    setFacultyPendingMsg(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginPortalMode === 'faculty'
                      ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 font-bold'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'hi' ? 'शिक्षक / फैकल्टी लॉगिन' : 'Faculty / Teacher Portal'}
                  </span>
                  {loggedInTeacher && (
                    <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {loginPortalMode === 'admin' ? (
              /* Option A: Admin PIN Login */
              <div className="w-full max-w-md bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shadow-xs">
                  <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                </div>

                <div className="space-y-1.5 px-2">
                  <h3 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">
                    {language === 'hi' ? 'एडमिन सुरक्षा कोड दर्ज करें' : 'Enter Admin Security PIN'}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-700 font-semibold leading-relaxed">
                    {language === 'hi'
                      ? 'कैंपस मैप मार्कर, विभाग और शिक्षकों के विवरण को संपादित करने के लिए अधिकृत एडमिन पिन दर्ज करें'
                      : 'Enter your authorized administrator security PIN to manage campus map, departments, and teachers'}
                  </p>
                </div>

                {lockoutInfo.isLocked ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 font-bold max-w-sm flex items-center gap-2 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {language === 'hi'
                        ? `गलत पिन के कारण खाता लॉक है। कृपया ${countdownSeconds} सेकंड प्रतीक्षा करें।`
                        : `Too many failed attempts. Locked out for ${countdownSeconds} seconds.`}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-3 px-2">
                    <div className="relative">
                      <input
                        type="password"
                        autoFocus
                        maxLength={10}
                        value={pinInput}
                        onChange={(e) => {
                          setPinInput(e.target.value);
                          setPinError(false);
                        }}
                        placeholder="••••"
                        className={`w-full text-center text-2xl tracking-[0.4em] font-mono py-3.5 px-4 rounded-2xl bg-white border-2 transition-all ${
                          pinError
                            ? 'border-rose-500 focus:ring-rose-400 bg-rose-50 text-rose-950 font-black'
                            : 'border-zinc-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-zinc-950 font-black placeholder:text-zinc-400'
                        }`}
                      />
                    </div>

                    {pinError && (
                      <p className="text-xs sm:text-sm text-rose-700 font-black">
                        {pinErrorMessage || (language === 'hi' ? 'गलत एडमिन पिन! पुनः प्रयास करें।' : 'Incorrect PIN! Please retry.')}
                      </p>
                    )}

                    <button
                      type="submit"
                      id="btn-admin-unlock-submit"
                      className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-600"
                    >
                      <Unlock className="w-4 h-4 text-white" />
                      <span>{language === 'hi' ? 'अनब्लॉक करें (Unlock)' : 'Unlock Admin Portal'}</span>
                    </button>
                  </form>
                )}

                {/* Switcher Helper */}
                <div className="pt-3 border-t border-zinc-100 w-full max-w-xs text-center">
                  <button
                    type="button"
                    onClick={() => setLoginPortalMode('faculty')}
                    className="text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-800 flex items-center justify-center gap-1 mx-auto hover:underline cursor-pointer"
                  >
                    <span>{language === 'hi' ? 'क्या आप शिक्षक / फैकल्टी हैं? यहाँ लॉगिन करें →' : 'Are you Faculty / Teacher? Login here →'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Option B: Faculty / Teacher Login & Portal Screen */
              <div className="w-full max-w-md flex flex-col items-center space-y-4 animate-fade-in text-left">
                {loggedInTeacher ? (
                  /* If Teacher is already logged in -> Show Teacher Profile Summary & Direct Portal Link */
                  <div className="w-full bg-blue-50/60 border border-blue-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                        {loggedInTeacher.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm sm:text-base text-zinc-950 truncate">
                            {loggedInTeacher.name}
                          </h4>
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[9px] font-bold">
                            VERIFIED FACULTY
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 font-semibold truncate">
                          {loggedInTeacher.designation} • {loggedInTeacher.department}
                        </p>
                        <p className="text-[11px] text-zinc-600 font-medium truncate">
                          📍 {loggedInTeacher.cabinRoom}, {loggedInTeacher.floor} ({loggedInTeacher.buildingName})
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-200/80 flex flex-col sm:flex-row gap-2">
                      {onOpenTeacherPortal && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenTeacherPortal();
                          }}
                          className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4" />
                          <span>{language === 'hi' ? 'शिक्षक पोर्टल खोलें' : 'Open Faculty Dashboard'}</span>
                        </button>
                      )}

                      {onTeacherLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            onTeacherLogout();
                            showToast(language === 'hi' ? 'सफलतापूर्वक लॉगआउट किया गया' : 'Logged out of faculty account');
                          }}
                          className="py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-zinc-200 hover:border-rose-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{language === 'hi' ? 'लॉगआउट' : 'Logout'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* If Teacher is NOT logged in -> Show Faculty Email/Password form & Signup link */
                  <div className="w-full max-w-md bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4 animate-fade-in">
                    <div className="text-center space-y-1.5">
                      <div className="w-14 h-14 rounded-2xl sm:rounded-3xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto mb-2 shadow-xs">
                        <GraduationCap className="w-7 h-7 text-blue-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">
                        {language === 'hi' ? 'शिक्षक / फैकल्टी लॉगिन' : 'Faculty / Teacher Login'}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-700 font-semibold leading-relaxed">
                        {language === 'hi'
                          ? 'अपने केबिन विवरण, इवेंट अप्रूवल व अनुमतियों के लिए संस्थागत लॉगिन करें'
                          : 'Sign in to manage cabin, approve college events & access faculty tools'}
                      </p>
                    </div>

                    {facultyPendingMsg && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900 font-bold flex items-center gap-2 shadow-2xs">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{facultyPendingMsg}</span>
                      </div>
                    )}

                    {facultyLoginError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 font-bold flex items-center gap-2 shadow-2xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{facultyLoginError}</span>
                      </div>
                    )}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setFacultyLoginError(null);
                        setFacultyPendingMsg(null);
                        const res = await loginRemoteTeacher(facultyEmail, facultyPassword);
                        if (res.success && res.teacher) {
                          onTeacherLoginSuccess?.(res.teacher);
                          showToast(
                            language === 'hi'
                              ? `स्वागत है ${res.teacher.name}!`
                              : `Welcome back, ${res.teacher.name}!`
                          );
                          if (onOpenTeacherPortal) {
                            onClose();
                            onOpenTeacherPortal();
                          }
                        } else if (res.isPending) {
                          setFacultyPendingMsg(res.message);
                        } else {
                          setFacultyLoginError(res.message);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-black text-zinc-900 mb-1.5">
                          {language === 'hi' ? 'आधिकारिक ईमेल (Email ID)' : 'Official Faculty Email'}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                          <input
                            type="email"
                            required
                            placeholder="e.g. dr.sharma@csjmu.ac.in"
                            value={facultyEmail}
                            onChange={(e) => setFacultyEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white border-2 border-zinc-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-zinc-950 placeholder:text-zinc-400 shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-zinc-900 mb-1.5">
                          {language === 'hi' ? 'पासवर्ड (Password)' : 'Password'}
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                          <input
                            type={showFacultyPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••"
                            value={facultyPassword}
                            onChange={(e) => setFacultyPassword(e.target.value)}
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white border-2 border-zinc-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-zinc-950 placeholder:text-zinc-400 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFacultyPassword(!showFacultyPassword)}
                            className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-800 cursor-pointer"
                          >
                            {showFacultyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 border border-blue-700 cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>{language === 'hi' ? 'शिक्षक लॉगिन करें' : 'Login to Faculty Portal'}</span>
                      </button>
                    </form>

                    {/* New Faculty Sign Up Button with ID card verification */}
                    {onOpenTeacherAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenTeacherAuth();
                        }}
                        className="w-full py-2.5 px-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>
                          {language === 'hi'
                            ? '+ नया शिक्षक पंजीकरण (ID कार्ड फोटो सत्यापन)'
                            : '+ New Faculty Sign Up (ID Card Verification)'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Switch back to Admin PIN */}
                <div className="pt-2 border-t border-zinc-100 w-full text-center">
                  <button
                    type="button"
                    onClick={() => setLoginPortalMode('admin')}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1 mx-auto hover:underline cursor-pointer"
                  >
                    <span>{language === 'hi' ? '← एडमिन सुरक्षा पिन लॉगिन पर वापस जाएं' : '← Switch back to Admin PIN Login'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* When UNLOCKED -> Full Tab Navigation Interface */
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Scrollable Navigation Tab Bar with Smooth Touch Scrolling for 100% Mobile Friendliness */}
            <div className="px-2 sm:px-3 py-1.5 sm:py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain shrink-0 text-xs">
              <button
                type="button"
                id="tab-btn-profile"
                onClick={() => setActiveTab('profile')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'profile' ? 'text-white' : 'text-blue-600'}`} />
                <span>{language === 'hi' ? 'अवलोकन' : 'Overview'}</span>
              </button>

              {/* TASK 3: Dedicated Departments Tab */}
              <button
                type="button"
                id="tab-btn-departments"
                onClick={() => setActiveTab('departments')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'departments'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <GraduationCap className={`w-3.5 h-3.5 ${activeTab === 'departments' ? 'text-white' : 'text-blue-600'}`} />
                <span>
                  {language === 'hi' ? 'विभाग' : 'Departments'}{' '}
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'departments' ? 'bg-blue-700 text-white' : 'bg-zinc-200/80 text-zinc-800'}`}>
                    {coursesList.length}
                  </span>
                </span>
              </button>

              {/* TASK 2: Dedicated Faculty Tab */}
              <button
                type="button"
                id="tab-btn-faculty"
                onClick={() => setActiveTab('faculty')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'faculty'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${activeTab === 'faculty' ? 'text-white' : 'text-blue-600'}`} />
                <span>
                  {language === 'hi' ? 'शिक्षक डायरेक्टरी' : 'Faculty'}{' '}
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'faculty' ? 'bg-blue-700 text-white' : 'bg-zinc-200/80 text-zinc-800'}`}>
                    {facultyList.length}
                  </span>
                </span>
              </button>

              {/* NEW: Teacher Signups, ID Verification & Permissions Tab */}
              <button
                type="button"
                id="tab-btn-teachers"
                onClick={() => setActiveTab('teachers')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'teachers'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'teachers' ? 'text-white' : 'text-blue-600'}`} />
                <span>
                  {language === 'hi' ? 'शिक्षक सत्यापन व अनुमतियां' : 'Teacher ID & Access'}{' '}
                  {getStoredTeacherAccounts().filter((t) => t.status === 'pending').length > 0 ? (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black rounded-full text-[10px] animate-pulse">
                      {getStoredTeacherAccounts().filter((t) => t.status === 'pending').length}
                    </span>
                  ) : (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'teachers' ? 'bg-blue-700 text-white' : 'bg-zinc-200/80 text-zinc-800'}`}>
                      {getStoredTeacherAccounts().length}
                    </span>
                  )}
                </span>
              </button>

              {/* Map Locations & Markers Tab */}
              <button
                type="button"
                id="tab-btn-locations"
                onClick={() => setActiveTab('locations')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'locations'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${activeTab === 'locations' ? 'text-white' : 'text-blue-600'}`} />
                <span>
                  {language === 'hi' ? 'मैप मार्कर' : 'Locations'}{' '}
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'locations' ? 'bg-blue-700 text-white' : 'bg-zinc-200/80 text-zinc-800'}`}>
                    {locations.length}
                  </span>
                </span>
              </button>

              {/* Events & Fest Tab */}
              <button
                type="button"
                id="tab-btn-events"
                onClick={() => setActiveTab('events')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'events'
                    ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-700'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'events' ? 'text-white' : 'text-blue-600'}`} />
                <span>
                  {language === 'hi' ? 'इवेंट्स' : 'Events'}{' '}
                  {events.filter((e) => e.status === 'pending').length > 0 ? (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black rounded-full text-[10px] animate-pulse">
                      {events.filter((e) => e.status === 'pending').length}
                    </span>
                  ) : (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'events' ? 'bg-blue-700 text-white' : 'bg-zinc-200/80 text-zinc-800'}`}>
                      {events.length}
                    </span>
                  )}
                </span>
              </button>

              {/* Change Security PIN Tab */}
              <button
                type="button"
                id="tab-btn-pin"
                onClick={() => setActiveTab('change-pin')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'change-pin'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-700 font-bold'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 border border-zinc-200/60 shadow-2xs'
                }`}
              >
                <KeyRound className={`w-3.5 h-3.5 ${activeTab === 'change-pin' ? 'text-white' : 'text-blue-600'}`} />
                <span>{language === 'hi' ? 'पिन' : 'PIN'}</span>
              </button>

              {/* Deleted Items / Trash Tab */}
              {(deletedLocIds.length > 0 || deletedFacIds.length > 0 || deletedCrsIds.length > 0) && (
                <button
                  type="button"
                  id="tab-btn-trash"
                  onClick={() => setActiveTab('deleted')}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-xs ${
                    activeTab === 'deleted'
                      ? 'bg-rose-600 text-white shadow-xs border border-rose-600 font-black'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs hover:bg-rose-100'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    Trash ({deletedLocIds.length + deletedFacIds.length + deletedCrsIds.length})
                  </span>
                </button>
              )}
            </div>

            {/* Tab Body Content Area - Strictly Constrained for Mobile & Desktop */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-5 bg-zinc-50/40 min-w-0 w-full">
              {/* 1. Profile / Overview Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {/* Quick Metric Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-white border border-zinc-200 shadow-2xs rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>{language === 'hi' ? 'विभाग / कोर्स' : 'Departments'}</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">{coursesList.length}</p>
                    </div>

                    <div className="p-3 bg-white border border-zinc-200 shadow-2xs rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span>{language === 'hi' ? 'शिक्षक / फैकल्टी' : 'Faculty'}</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">{facultyList.length}</p>
                    </div>

                    <div className="p-3 bg-white border border-zinc-200 shadow-2xs rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span>{language === 'hi' ? 'मैप मार्कर' : 'Map Markers'}</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">{locations.length}</p>
                    </div>

                    <div className="p-3 bg-white border border-zinc-200 shadow-2xs rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
                        <ShieldCheck className="w-4 h-4 text-purple-500" />
                        <span>{language === 'hi' ? 'स्टेटस' : 'Status'}</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </p>
                    </div>
                  </div>

                  {/* Fast Action Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Go to Departments */}
                    <div
                      onClick={() => setActiveTab('departments')}
                      className="p-4 bg-white border border-zinc-200 shadow-2xs hover:border-blue-400 hover:shadow-xs rounded-2xl cursor-pointer transition flex flex-col justify-between space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition">
                          Manage →
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">
                          {language === 'hi' ? 'विभाग व कोर्स प्रबंधन' : 'Departments & Courses'}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {language === 'hi'
                            ? 'गलत HOD, कमरा, मंजिल जानकारी सुधारें या नया विभाग जोड़ें'
                            : 'Update incorrect HOD info, room, floor, or add new course'}
                        </p>
                      </div>
                    </div>

                    {/* Go to Faculty */}
                    <div
                      onClick={() => setActiveTab('faculty')}
                      className="p-4 bg-white border border-zinc-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs rounded-2xl cursor-pointer transition flex flex-col justify-between space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition">
                          Manage →
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">
                          {language === 'hi' ? 'शिक्षक व फैकल्टी डायरेक्टरी' : 'Faculty & Teachers'}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {language === 'hi'
                            ? 'शिक्षक हटाएं, नया जोड़ें और विभाग चुनें'
                            : 'Delete faculty, add teacher to specific department'}
                        </p>
                      </div>
                    </div>

                    {/* Drag Mode on Map */}
                    <div className="p-4 bg-white border border-zinc-200 shadow-2xs rounded-2xl flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                          <Move className="w-5 h-5" />
                        </div>
                        {onToggleDragMode && (
                          <button
                            type="button"
                            onClick={onToggleDragMode}
                            className={`px-2.5 py-1 text-xs rounded-lg font-bold transition cursor-pointer ${
                              isAdminDragMode ? 'bg-blue-600 text-white font-bold' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            }`}
                          >
                            {isAdminDragMode ? 'Active' : 'Off'}
                          </button>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">
                          {language === 'hi' ? 'मैप मार्कर ड्रैग मोड' : 'Map Drag Reposition'}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {language === 'hi'
                            ? 'मैप पर किसी भी पिन को पकड़कर नई स्थिति में ले जाएं'
                            : 'Reposition any campus pin directly by dragging on map'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bug & Issue Report Target Email Management Card */}
                  <div className="p-4 bg-white border border-zinc-200 shadow-2xs rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-700 border border-blue-300 flex items-center justify-center font-bold shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            <span>{language === 'hi' ? 'बग रिपोर्ट व समस्या ईमेल प्रबंधन' : 'Bug Report & Issue Recipient Email'}</span>
                          </h4>
                          <p className="text-[11px] text-zinc-500">
                            {language === 'hi'
                              ? 'छात्रों द्वारा "समस्या रिपोर्ट करें" (Report Bug) से भेजी जाने वाली सभी शिकायतें इस ईमेल पर प्राप्त होंगी'
                              : 'All bug reports, map corrections, and student complaints will be forwarded to this address'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full flex items-center gap-1 border shrink-0 ${
                          currentConfiguredEmail === DEFAULT_REPORT_EMAIL
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {currentConfiguredEmail === DEFAULT_REPORT_EMAIL ? 'Default Mail' : 'Custom Mail'}
                      </span>
                    </div>

                    {/* Active Email Info Bar */}
                    <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider shrink-0">
                          {language === 'hi' ? 'वर्तमान सक्रिय ईमेल:' : 'Current Active Email:'}
                        </span>
                        <span className="font-mono font-bold text-zinc-900 truncate">
                          {currentConfiguredEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {receivedReportsCount !== null && (
                          <span className="px-2 py-0.5 bg-zinc-200/70 text-zinc-700 font-bold text-[11px] rounded-lg">
                            {language === 'hi' ? `प्राप्त रिपोर्ट्स: ${receivedReportsCount}` : `Reports logged: ${receivedReportsCount}`}
                          </span>
                        )}
                        <a
                          href={`mailto:${currentConfiguredEmail}?subject=CSJMU%20Map%20Report%20Test&body=This%20is%20a%20test%20email%20verification`}
                          className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold rounded-lg flex items-center gap-1 transition border border-zinc-200"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{language === 'hi' ? 'टेस्ट ड्राफ्ट' : 'Test Mail'}</span>
                        </a>
                      </div>
                    </div>

                    {/* Input Field to Change Email */}
                    <div className="space-y-1.5 pt-0.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        {language === 'hi'
                          ? 'शिकायत प्राप्त करने हेतु ईमेल पता बदलें (Change Recipient Email):'
                          : 'Change Bug & Feedback Recipient Email:'}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="email"
                            value={reportEmailInput}
                            onChange={(e) => {
                              setReportEmailInput(e.target.value);
                              if (reportEmailError) setReportEmailError(null);
                            }}
                            placeholder="admin@csjmu.ac.in or your-email@gmail.com"
                            className="w-full pl-8.5 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleSaveReportEmail}
                            disabled={isSavingReportEmail || reportEmailInput.trim().toLowerCase() === currentConfiguredEmail}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            {isSavingReportEmail ? (
                              <span>...</span>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{language === 'hi' ? 'ईमेल सहेजें' : 'Save Email'}</span>
                              </>
                            )}
                          </button>
                          {currentConfiguredEmail !== DEFAULT_REPORT_EMAIL && (
                            <button
                              type="button"
                              onClick={handleResetReportEmail}
                              disabled={isSavingReportEmail}
                              className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition border border-zinc-200 shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Reset back to stark12300@gmail.com"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="hidden sm:inline">{language === 'hi' ? 'डिफ़ॉल्ट रीसेट' : 'Reset'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Error & Success Feedback */}
                      {reportEmailError && (
                        <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 animate-fade-in pt-0.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{reportEmailError}</span>
                        </p>
                      )}
                      {reportEmailSaveSuccess && (
                        <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-fade-in pt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{reportEmailSaveSuccess}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Android APK & App Distribution Card */}
                  <div className="p-4 bg-white border border-zinc-200 shadow-2xs rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300 flex items-center justify-center font-bold">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">
                            {language === 'hi' ? 'एंड्रॉइड APK व ऐप वितरण प्रबंधन' : 'Android APK & App Distribution'}
                          </h4>
                          <p className="text-[11px] text-zinc-500">
                            {language === 'hi'
                              ? 'कैंपस नेविगेटर मोबाइल APK स्थिति व डाउनलोड लिंक'
                              : 'Campus Navigator mobile APK status and download URL'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        {apkInfo?.available ? 'APK Ready' : 'Configured'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">
                          {language === 'hi' ? 'पैकेज वर्शन' : 'Package Version'}
                        </span>
                        <span className="font-mono font-bold text-zinc-800">
                          v{apkInfo?.version || '1.2.0'} ({apkInfo?.sizeFormatted || '1.90 MB'})
                        </span>
                      </div>
                      <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">
                            {language === 'hi' ? 'लोकल फ़ाइल' : 'Local APK'}
                          </span>
                          <span className="font-mono text-zinc-700">/csjmu_nav.apk</span>
                        </div>
                        <a
                          href="/csjmu_nav.apk"
                          download="CSJMU-Navigation.apk"
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition shadow-2xs"
                        >
                          <DownloadCloud className="w-3 h-3" />
                          Test
                        </a>
                      </div>
                    </div>

                    {/* Custom External Download URL (Google Drive, GitHub, etc.) */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-zinc-700">
                        {language === 'hi'
                          ? 'कस्टम APK URL (वैकल्पिक - Google Drive / GitHub / पोर्टल लिंक)'
                          : 'Custom APK URL (Optional - Google Drive / GitHub / Server link)'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={apkCustomUrl}
                          onChange={(e) => setApkCustomUrl(e.target.value)}
                          placeholder="https://drive.google.com/... or https://csjmu.ac.in/app.apk"
                          className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={handleSaveApkConfig}
                          disabled={isSavingApk}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-2xs cursor-pointer"
                        >
                          {isSavingApk
                            ? '...'
                            : language === 'hi'
                            ? 'सेव करें'
                            : 'Save'}
                        </button>
                      </div>
                      {apkSaveSuccess && (
                        <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {apkSaveSuccess}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reset to Factory Defaults Option */}
                  <div className="p-4 bg-white border border-zinc-200 shadow-2xs rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-zinc-600" />
                        <span>{language === 'hi' ? 'मूल कैंपस डेटा पुनर्स्थापित करें' : 'Restore Campus Defaults'}</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        {language === 'hi'
                          ? 'सभी कस्टम परिवर्तन हटाकर प्रारंभिक यूनिवर्सिटी डेटा पर वापस जाएं'
                          : 'Clear custom modifications and revert to default campus map database'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onResetToDefaults}
                      className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold transition shrink-0 border border-zinc-200 shadow-2xs cursor-pointer"
                    >
                      {language === 'hi' ? 'डिफ़ॉल्ट रीसेट करें' : 'Reset Defaults'}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Departments & Courses Tab (TASK 3) */}
              {activeTab === 'departments' && (
                <AdminDepartmentManager
                  coursesList={coursesList}
                  locations={locations}
                  onAddCourse={onAddDepartmentCourse}
                  onUpdateCourse={onUpdateDepartmentCourse}
                  onDeleteCourse={onDeleteDepartmentCourse}
                  language={language}
                />
              )}

              {/* 3. Faculty & Teachers Directory Tab */}
              {activeTab === 'faculty' && (
                <AdminFacultyManager
                  facultyList={facultyList}
                  locations={locations}
                  onAddFaculty={onAddFaculty}
                  onUpdateFaculty={onUpdateFaculty}
                  onDeleteFaculty={onDeleteFaculty}
                  language={language}
                />
              )}

              {/* NEW: Teacher Signups, ID Verification & Permission Manager */}
              {activeTab === 'teachers' && (
                <AdminTeacherManager
                  language={language}
                  locations={locations}
                />
              )}

              {/* 4. Map Locations Tab */}
              {activeTab === 'locations' && (
                <AdminLocationsManager
                  locations={locations}
                  onAddLocation={onAddLocation}
                  onUpdateLocation={onUpdateLocation}
                  onDeleteLocation={onDeleteLocation}
                  onUpdateLocationPhoto={onUpdateLocationPhoto}
                  onUpdateLocationCoordinates={onUpdateLocationCoordinates}
                  onStartDragMode={onStartDragMode}
                  language={language}
                />
              )}

              {/* 5. Campus Events Management Tab */}
              {activeTab === 'events' && (
                <AdminEventManager
                  events={events}
                  onApproveEvent={onApproveEvent}
                  onRejectEvent={onRejectEvent}
                  onToggleLiveEvent={onToggleLiveEvent}
                  onBatchToggleLiveEvents={onBatchToggleLiveEvents}
                  onUpdateEvent={onUpdateEvent}
                  onDeleteEvent={onDeleteEvent}
                  onAddEvent={onAddEvent}
                  campusLocations={locations}
                  currentLang={language}
                  onSyncCollegeEvents={onSyncCollegeEvents}
                />
              )}

              {/* 6. Change Security PIN Tab */}
              {activeTab === 'change-pin' && (
                <div className="max-w-md mx-auto bg-white border border-zinc-200 shadow-2xs rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                      <KeyRound className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">
                        {language === 'hi' ? 'एडमिन सुरक्षा पिन बदलें' : 'Change Admin Security PIN'}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {language === 'hi' ? 'नया 4 से 10 अंकों का पिन सेट करें' : 'Set a new 4 to 10 digit PIN code'}
                      </p>
                    </div>
                  </div>

                  {pinChangeSuccess && (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{pinChangeSuccess}</span>
                    </div>
                  )}

                  {pinChangeErr && (
                    <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{pinChangeErr}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePinSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'नया पिन दर्ज करें' : 'New Security PIN'}
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={10}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'नया पिन पुनः दर्ज करें' : 'Confirm New PIN'}
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={10}
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      {language === 'hi' ? 'पिन अपडेट करें' : 'Update Admin PIN'}
                    </button>
                  </form>
                </div>
              )}

              {/* 7. Deleted Items / Trash Tab */}
              {activeTab === 'deleted' && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900">
                    {language === 'hi' ? 'हटाए गए आइटम व रीस्टोर' : 'Trash & Restore Deleted Items'}
                  </h4>

                  {/* Deleted Locations */}
                  {deletedLocIds.length > 0 && (
                    <div className="bg-white border border-zinc-200 shadow-2xs rounded-2xl p-4 space-y-2">
                      <h5 className="text-xs font-bold text-zinc-700">
                        {language === 'hi' ? 'हटाए गए मैप स्थान:' : 'Deleted Locations:'}
                      </h5>
                      <div className="space-y-2">
                        {deletedLocIds.map((id) => (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl text-xs border border-zinc-200 shadow-2xs"
                          >
                            <span className="font-mono text-zinc-700 truncate">{id}</span>
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreLocation(id);
                                showToast('Location restored');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-2xs transition"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deleted Faculty */}
                  {deletedFacIds.length > 0 && (
                    <div className="bg-white border border-zinc-200 shadow-2xs rounded-2xl p-4 space-y-2">
                      <h5 className="text-xs font-bold text-zinc-700">
                        {language === 'hi' ? 'हटाए गए शिक्षक:' : 'Deleted Faculty:'}
                      </h5>
                      <div className="space-y-2">
                        {deletedFacIds.map((id) => (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl text-xs border border-zinc-200 shadow-2xs"
                          >
                            <span className="font-mono text-zinc-700 truncate">{id}</span>
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreFaculty(id);
                                showToast('Faculty restored');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-2xs transition"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deleted Courses */}
                  {deletedCrsIds.length > 0 && (
                    <div className="bg-white border border-zinc-200 shadow-2xs rounded-2xl p-4 space-y-2">
                      <h5 className="text-xs font-bold text-zinc-700">
                        {language === 'hi' ? 'हटाए गए विभाग व कोर्स:' : 'Deleted Departments & Courses:'}
                      </h5>
                      <div className="space-y-2">
                        {deletedCrsIds.map((id) => (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl text-xs border border-zinc-200 shadow-2xs"
                          >
                            <span className="font-mono text-zinc-700 truncate">{id}</span>
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreDepartmentCourse(id);
                                showToast('Department restored');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-2xs transition"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local Toast message */}
        {toastMsg && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
            <div className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
