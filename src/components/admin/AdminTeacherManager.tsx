import React, { useEffect, useState } from 'react';
import { subscribeTeachersFromFirestore } from '../../services/firebase';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  Check,
  X,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Trash2,
  Filter,
  Layers,
  Calendar,
  Clock,
  ShieldAlert,
  UserCheck,
  FileCheck,
  Plus,
  Sliders,
  Shield,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  TeacherAccount,
  TeacherPermission,
  TeacherAccountStatus,
  Language,
  CampusLocation,
  TeacherAccessPolicy,
} from '../../types';
import {
  getStoredTeacherAccounts,
  approveTeacherAccount,
  rejectTeacherAccount,
  updateTeacherPermissions,
  deleteTeacherAccount,
  registerTeacher,
  generateSampleIdCardSvg,
  getTeacherAccessPolicy,
  saveTeacherAccessPolicy,
  bulkUpdateTeacherPermission,
} from '../../utils/storage';
import {
  getRemoteTeacherAccounts,
  hydrateTeacherAccountsFromServer,
  updateRemoteTeacher,
  deleteRemoteTeacher,
} from '../../utils/teacherRemote';

interface AdminTeacherManagerProps {
  language: Language;
  locations: CampusLocation[];
}

const ALL_PERMISSIONS: { key: TeacherPermission; label: string; hindiLabel: string; desc: string; icon: any; category: string }[] = [
  {
    key: 'manage_locations',
    label: 'Add & Edit Campus Locations / Classrooms',
    hindiLabel: 'स्थान / क्लासरूम / लैब जोड़ें व संपादित करें',
    desc: 'Allows teacher to add new map markers, classrooms, and laboratory locations',
    icon: Building,
    category: 'Campus Data Access',
  },
  {
    key: 'edit_department',
    label: 'Add & Edit Departments & Courses',
    hindiLabel: 'विभाग व कोर्स मैपिंग जोड़ें व संपादित करें',
    desc: 'Allows teacher to add new departments, syllabus info, and course details',
    icon: Layers,
    category: 'Campus Data Access',
  },
  {
    key: 'manage_faculty',
    label: 'Add & Edit Faculty Directory Members',
    hindiLabel: 'फैकल्टी डायरेक्टरी में शिक्षक जोड़ें व संपादित करें',
    desc: 'Allows teacher to add new professors and update colleagues in directory',
    icon: Users,
    category: 'Campus Data Access',
  },
  {
    key: 'approve_events',
    label: 'Approve & Moderate Student Events',
    hindiLabel: 'छात्र इवेंट्स मंज़ूर / अस्वीकार करें',
    desc: 'Allows teacher to review pending student event submissions and approve them live',
    icon: CheckCircle2,
    category: 'Events & Notices',
  },
  {
    key: 'post_events',
    label: 'Publish Departmental Events & Notices',
    hindiLabel: 'विभागीय इवेंट्स व नोटिस सीधे प्रकाशित करें',
    desc: 'Allows teacher to create seminars, workshops, and fests with direct publication',
    icon: Calendar,
    category: 'Events & Notices',
  },
  {
    key: 'manage_profile',
    label: 'Cabin Room, Floor & Office Hours',
    hindiLabel: 'अपना केबिन, फ्लोर व मिलने का समय अपडेट करें',
    desc: 'Allows teacher to update their own cabin room number, floor, and consultation schedule',
    icon: MapPin,
    category: 'Personal Cabin',
  },
  {
    key: 'manage_floor_plans',
    label: 'Indoor Floor Plan Navigation',
    hindiLabel: 'इनडोर फ्लोर प्लान व रूम पोजीशन्स',
    desc: 'Allows teacher to adjust indoor room positions on building floor maps',
    icon: Sparkles,
    category: 'Special Access',
  },
  {
    key: 'broadcast_notices',
    label: 'Urgent Campus Broadcast Alerts',
    hindiLabel: 'आपातकालीन छात्र सूचना प्रसारण',
    desc: 'Allows teacher to broadcast high-priority popup notices to students',
    icon: ShieldAlert,
    category: 'Special Access',
  },
];

const isDemoTeacher = (t: TeacherAccount) =>
  t.id === 'teacher-vishal-awasthi' ||
  t.id === 'teacher-rachna-verma' ||
  t.email?.toLowerCase() === 'vawasthi@csjmu.ac.in' ||
  t.email?.toLowerCase() === 'rverma@csjmu.ac.in';

export const AdminTeacherManager: React.FC<AdminTeacherManagerProps> = ({
  language,
  locations,
}) => {
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() =>
    getStoredTeacherAccounts().filter((t) => !isDemoTeacher(t))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [inspectingTeacher, setInspectingTeacher] = useState<TeacherAccount | null>(null);
  const [inspectingPhoto, setInspectingPhoto] = useState<string | null>(null);
  
  // Safe In-App Deletion Modal (replaces blocked window.confirm)
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // Rejection modal
  const [rejectingTeacherId, setRejectingTeacherId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Institutional ID Card photo is unreadable or not verified.');

  // Approval with custom permissions modal
  const [approvingTeacher, setApprovingTeacher] = useState<TeacherAccount | null>(null);
  const [approvalPermissions, setApprovalPermissions] = useState<TeacherPermission[]>([
    'manage_profile',
    'post_events',
    'manage_locations',
  ]);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Global Admin Access Policy for Teacher Feature Permissions
  const [accessPolicy, setAccessPolicy] = useState<TeacherAccessPolicy>(() => getTeacherAccessPolicy());
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTeachers = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const remote = await getRemoteTeacherAccounts();
      if (remote.length > 0) {
        await hydrateTeacherAccountsFromServer();
      }

      const local = getStoredTeacherAccounts();
      const map = new Map<string, TeacherAccount>();
      local.filter((t) => !isDemoTeacher(t)).forEach((t) => map.set(t.id, t));
      remote.filter((t) => !isDemoTeacher(t)).forEach((t) => map.set(t.id, t));
      setTeachers(Array.from(map.values()));
    } catch (e) {
      console.warn('Error syncing teachers in Admin:', e);
    } finally {
      if (!silent) setIsRefreshing(false);
      setRemoteLoading(false);
    }
  };

  useEffect(() => {
    // Purge demo teachers from storage immediately
    deleteTeacherAccount('teacher-vishal-awasthi');
    deleteTeacherAccount('teacher-rachna-verma');

    fetchTeachers();

    // Real-time Firestore listener: new teacher signups appear in Admin
    // immediately, without waiting for the polling interval.
    const unsubscribe = subscribeTeachersFromFirestore((remoteTeachers) => {
      const filtered = remoteTeachers.filter((t) => !isDemoTeacher(t));
      if (filtered.length > 0) {
        setTeachers(filtered);
      }
    });

    const timer = window.setInterval(() => {
      fetchTeachers(true);
    }, 4000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleGlobalPolicy = (key: keyof TeacherAccessPolicy) => {
    const nextVal = !accessPolicy[key];
    const updated = saveTeacherAccessPolicy({ [key]: nextVal });
    setAccessPolicy(updated);
    const titles: Record<keyof TeacherAccessPolicy, string> = {
      allowAddLocations: language === 'hi' ? 'स्थान/मार्कर जोड़ना' : 'Location addition',
      allowAddDepartments: language === 'hi' ? 'विभाग/कोर्स जोड़ना' : 'Department addition',
      allowAddFaculty: language === 'hi' ? 'फैकल्टी डायरेक्टरी जोड़ना' : 'Faculty directory addition',
    };
    showToast(
      nextVal
        ? `${titles[key]}: सभी शिक्षकों के लिए चालू (Allowed) किया गया`
        : `${titles[key]}: शिक्षकों के लिए बंद (Restricted) किया गया`
    );
  };

  const handleBulkPermToggle = (permKey: TeacherPermission, grant: boolean) => {
    const updated = bulkUpdateTeacherPermission(permKey, grant);
    setTeachers(updated);
    const names: Record<string, string> = {
      manage_locations: language === 'hi' ? 'स्थान प्रबंधन' : 'Locations & Classrooms',
      edit_department: language === 'hi' ? 'विभाग प्रबंधन' : 'Departments & Courses',
      manage_faculty: language === 'hi' ? 'फैकल्टी प्रबंधन' : 'Faculty Directory',
    };
    showToast(
      grant
        ? `${names[permKey] || permKey}: सभी शिक्षकों को अधिकार दिया गया`
        : `${names[permKey] || permKey}: सभी शिक्षकों से अधिकार हटाया गया`
    );
  };

  const pendingCount = teachers.filter((t) => t.status === 'pending').length;

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.cabinRoom && t.cabinRoom.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && t.status === statusFilter;
  });

  const handleTogglePermission = async (teacherId: string, permKey: TeacherPermission) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const currentPerms = teacher.permissions || [];
    let updatedPerms: TeacherPermission[];

    if (currentPerms.includes(permKey)) {
      updatedPerms = currentPerms.filter((p) => p !== permKey);
    } else {
      updatedPerms = [...currentPerms, permKey];
    }

    // 1. Immediately apply locally so UI updates smoothly and reliably
    const updatedList = updateTeacherPermissions(teacherId, updatedPerms);
    setTeachers(updatedList);
    showToast(
      language === 'hi'
        ? `${teacher.name} के अधिकार अपडेट कर दिए गए`
        : `Updated permissions for ${teacher.name}`
    );

    // 2. Persist to server in the background
    try {
      const remote = await updateRemoteTeacher(teacherId, 'permissions', { permissions: updatedPerms });
      if (!remote.success) {
        console.warn('Remote permission sync notice:', remote.message);
      }
    } catch (e) {
      console.warn('Background permission sync notice:', e);
    }
  };

  const handleApproveConfirm = async () => {
    if (!approvingTeacher) return;
    const targetTeacher = approvingTeacher;
    const perms = [...approvalPermissions];
    setApprovingTeacher(null);

    // 1. Immediately apply locally
    const updated = approveTeacherAccount(targetTeacher.id, perms, 'Admin');
    setTeachers(updated);
    showToast(
      language === 'hi'
        ? `${targetTeacher.name} को सत्यापित किया गया और विकल्प दिए गए`
        : `Approved ${targetTeacher.name} with ${perms.length} options granted!`
    );

    // 2. Sync to server in background
    try {
      const remote = await updateRemoteTeacher(targetTeacher.id, 'approve', {
        permissions: perms,
        approvedBy: 'Admin',
      });
      if (!remote.success) {
        console.warn('Remote approval sync notice:', remote.message);
      }
    } catch (e) {
      console.warn('Background approval sync notice:', e);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingTeacherId) return;
    const targetId = rejectingTeacherId;
    const reason = rejectReason;
    setRejectingTeacherId(null);

    // 1. Immediately apply locally
    const updated = rejectTeacherAccount(targetId, reason);
    setTeachers(updated);
    showToast(
      language === 'hi'
        ? 'शिक्षक खाता अस्वीकृत चिह्नित किया गया'
        : 'Teacher account marked as rejected.'
    );

    // 2. Sync to server in background
    try {
      const remote = await updateRemoteTeacher(targetId, 'reject', { reason });
      if (!remote.success) {
        console.warn('Remote rejection sync notice:', remote.message);
      }
    } catch (e) {
      console.warn('Background rejection sync notice:', e);
    }
  };

  const handleDeleteTeacher = (teacherId: string, teacherName: string) => {
    setTeacherToDelete({ id: teacherId, name: teacherName });
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    const { id: teacherId, name: teacherName } = teacherToDelete;
    setIsDeletingTeacher(true);
    try {
      await deleteRemoteTeacher(teacherId);
      const updated = deleteTeacherAccount(teacherId);
      setTeachers(updated.filter((t) => !isDemoTeacher(t)));
      showToast(
        language === 'hi'
          ? `शिक्षक खाता "${teacherName}" सफलतापूर्वक हटा दिया गया`
          : `Teacher account "${teacherName}" removed successfully`
      );
    } catch (err: any) {
      const updated = deleteTeacherAccount(teacherId);
      setTeachers(updated.filter((t) => !isDemoTeacher(t)));
      showToast(
        language === 'hi'
          ? `खाता स्थानीय रूप से हटा दिया गया`
          : `Account removed locally`
      );
    } finally {
      setIsDeletingTeacher(false);
      setTeacherToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Pending Counter */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-zinc-900">
                {language === 'hi' ? 'शिक्षक खाता व आईडी सत्यापन प्रबंधन' : 'Faculty Account & ID Card Verification Control'}
              </h3>
              {remoteLoading ? (
                <span className="px-2 py-0.5 bg-zinc-200 text-zinc-700 rounded-full text-[10px] font-black">
                  Syncing requests…
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 rounded-full text-[10px] font-black">
                  Cloud synced
                </span>
              )}
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-[10px] font-black">
                  {pendingCount} Pending Verification
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {language === 'hi'
                ? 'शिक्षकों के आईडी कार्ड की जांच करें, अनुमोदन दें और चुने हुए फीचर्स का एक्सेस कंट्रोल करें'
                : 'Inspect faculty ID card proofs, approve signups, and grant granular feature access'}
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-white/70 backdrop-blur-md border border-white/90 rounded-xl text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500/50 backdrop-blur-md'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
            }`}
          >
            All ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500/50 backdrop-blur-md'
                : 'text-blue-800 hover:bg-blue-50/70'
            }`}
          >
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500/50 backdrop-blur-md'
                : 'text-emerald-800 hover:bg-emerald-50/70'
            }`}
          >
            Approved ({teachers.filter((t) => t.status === 'approved').length})
          </button>
        </div>
      </div>

      {/* ================= ADMIN TEACHER FEATURE ACCESS POLICY OPTIONS ================= */}
      <div className="p-4 sm:p-5 bg-white border border-zinc-200 text-zinc-900 rounded-2xl sm:rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-zinc-900">
                  {language === 'hi'
                    ? 'शिक्षक फीचर एक्सेस सेटिंग्स (एडमिन विकल्प)'
                    : 'Teacher Feature Access Controls (Admin Master Options)'}
                </h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                {language === 'hi'
                  ? 'तय करें कि शिक्षकों के पास कैंपस स्थान (Locations), विभाग (Departments) और फैकल्टी (Faculty) जोड़ने का एक्सेस होना चाहिए या नहीं।'
                  : 'Control whether teachers have permission to add locations, departments, and faculty directory entries.'}
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const updated = saveTeacherAccessPolicy({
                  allowAddLocations: true,
                  allowAddDepartments: true,
                  allowAddFaculty: true,
                });
                setAccessPolicy(updated);
                showToast(
                  language === 'hi'
                    ? 'सभी 3 फीचर्स शिक्षकों के लिए सक्षम किए गए!'
                    : 'Enabled all 3 add features for teachers!'
                );
              }}
              className="px-3 py-1.5 bg-white/80 hover:bg-white text-zinc-800 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/90 shadow-2xs active:scale-95 backdrop-blur-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Allow All 3</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const updated = saveTeacherAccessPolicy({
                  allowAddLocations: false,
                  allowAddDepartments: false,
                  allowAddFaculty: false,
                });
                setAccessPolicy(updated);
                showToast(
                  language === 'hi'
                    ? 'शिक्षकों के लिए सभी 3 फीचर्स प्रतिबंधित किए गए!'
                    : 'Restricted all 3 add features for teachers!'
                );
              }}
              className="px-3 py-1.5 bg-white/80 hover:bg-white text-zinc-800 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/90 shadow-2xs active:scale-95 backdrop-blur-sm"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>Restrict All</span>
            </button>
          </div>
        </div>

        {/* 3 Master Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Add Locations Option */}
          <div
            className={`p-3.5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
              accessPolicy.allowAddLocations
                ? 'bg-white/80 border-emerald-400/60 shadow-xs backdrop-blur-md'
                : 'bg-white/60 border-rose-300/60 backdrop-blur-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      accessPolicy.allowAddLocations
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-rose-500/20 text-rose-600'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900">
                      {language === 'hi' ? 'स्थान व रूम जोड़ना' : 'Add Campus Locations'}
                    </h4>
                    <span className="text-[10px] text-zinc-500 block font-medium">
                      Classrooms, Labs & Markers
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    accessPolicy.allowAddLocations
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {accessPolicy.allowAddLocations
                    ? language === 'hi'
                      ? 'सक्षम (ON)'
                      : 'Allowed'
                    : language === 'hi'
                    ? 'प्रतिबंधित (OFF)'
                    : 'Restricted'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {language === 'hi'
                  ? 'तय करें कि शिक्षक कैंपस मैप पर नए रूम, लैब, क्लासरूम और मार्कर जोड़ सकते हैं या नहीं।'
                  : 'Controls whether teachers are allowed to create new campus map markers, classrooms, and labs.'}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleGlobalPolicy('allowAddLocations')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                  accessPolicy.allowAddLocations
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
              >
                {accessPolicy.allowAddLocations ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Option: Allowed</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Option: Restricted</span>
                  </>
                )}
              </button>

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  title="Grant to all teachers"
                  onClick={() => handleBulkPermToggle('manage_locations', true)}
                  className="px-2 py-1 bg-white/90 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-700 rounded-lg text-[10px] font-bold border border-zinc-200 transition shadow-2xs"
                >
                  +All
                </button>
                <button
                  type="button"
                  title="Revoke from all teachers"
                  onClick={() => handleBulkPermToggle('manage_locations', false)}
                  className="px-2 py-1 bg-white/90 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 rounded-lg text-[10px] font-bold border border-zinc-200 transition shadow-2xs"
                >
                  -All
                </button>
              </div>
            </div>
          </div>

          {/* 2. Add Departments Option */}
          <div
            className={`p-3.5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
              accessPolicy.allowAddDepartments
                ? 'bg-white/80 border-emerald-400/60 shadow-xs backdrop-blur-md'
                : 'bg-white/60 border-rose-300/60 backdrop-blur-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      accessPolicy.allowAddDepartments
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-rose-500/20 text-rose-600'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900">
                      {language === 'hi' ? 'विभाग व कोर्स जोड़ना' : 'Add Departments & Courses'}
                    </h4>
                    <span className="text-[10px] text-zinc-500 block font-medium">
                      Academic Blocks & Syllabi
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    accessPolicy.allowAddDepartments
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {accessPolicy.allowAddDepartments
                    ? language === 'hi'
                      ? 'सक्षम (ON)'
                      : 'Allowed'
                    : language === 'hi'
                    ? 'प्रतिबंधित (OFF)'
                    : 'Restricted'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {language === 'hi'
                  ? 'तय करें कि शिक्षक नए शैक्षणिक विभाग, डिग्री कोर्स और उनके ब्लॉक/गेट मैपिंग जोड़ सकते हैं या नहीं।'
                  : 'Controls whether teachers are allowed to add academic departments, degree programs, and course maps.'}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleGlobalPolicy('allowAddDepartments')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                  accessPolicy.allowAddDepartments
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
              >
                {accessPolicy.allowAddDepartments ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Option: Allowed</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Option: Restricted</span>
                  </>
                )}
              </button>

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  title="Grant to all teachers"
                  onClick={() => handleBulkPermToggle('edit_department', true)}
                  className="px-2 py-1 bg-white/90 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-700 rounded-lg text-[10px] font-bold border border-zinc-200 transition shadow-2xs"
                >
                  +All
                </button>
                <button
                  type="button"
                  title="Revoke from all teachers"
                  onClick={() => handleBulkPermToggle('edit_department', false)}
                  className="px-2 py-1 bg-white/90 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 rounded-lg text-[10px] font-bold border border-zinc-200 transition shadow-2xs"
                >
                  -All
                </button>
              </div>
            </div>
          </div>

          {/* 3. Add Faculty Option */}
          <div
            className={`p-3.5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
              accessPolicy.allowAddFaculty
                ? 'bg-white/80 border-emerald-400/60 shadow-xs backdrop-blur-md'
                : 'bg-white/60 border-rose-300/60 backdrop-blur-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      accessPolicy.allowAddFaculty
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-rose-500/20 text-rose-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900">
                      {language === 'hi' ? 'फैकल्टी जोड़ना' : 'Add Faculty Directory'}
                    </h4>
                    <span className="text-[10px] text-zinc-500 block font-medium">
                      Colleagues & Directory Profiles
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    accessPolicy.allowAddFaculty
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {accessPolicy.allowAddFaculty
                    ? language === 'hi'
                      ? 'सक्षम (ON)'
                      : 'Allowed'
                    : language === 'hi'
                    ? 'प्रतिबंधित (OFF)'
                    : 'Restricted'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {language === 'hi'
                  ? 'तय करें कि शिक्षक अन्य प्रोफेसर्स व सहकर्मियों को डायरेक्टरी में जोड़ व प्रबंधित कर सकते हैं या नहीं।'
                  : 'Controls whether teachers are allowed to add colleague faculty members and create directory entries.'}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleGlobalPolicy('allowAddFaculty')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                  accessPolicy.allowAddFaculty
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
              >
                {accessPolicy.allowAddFaculty ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Option: Allowed</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Option: Restricted</span>
                  </>
                )}
              </button>

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  title="Grant to all teachers"
                  onClick={() => handleBulkPermToggle('manage_faculty', true)}
                  className="px-2 py-1 bg-white/90 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-700 rounded-lg text-[10px] font-bold border border-zinc-200 transition shadow-2xs"
                >
                  +All
                </button>
                <button
                  type="button"
                  title="Revoke from all teachers"
                  onClick={() => handleBulkPermToggle('manage_faculty', false)}
                  className="px-2 py-1 bg-white/90 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 rounded-lg text-[10px] font-bold border border-zinc-200 transition shadow-2xs"
                >
                  -All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Refresh Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'शिक्षक का नाम, ईमेल, विभाग या केबिन से खोजें...'
                : 'Search faculty by name, email, department, or cabin...'
            }
            className="w-full text-xs py-2.5 pl-10 pr-4 bg-white/80 border border-white/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 backdrop-blur-md shadow-2xs"
          />
        </div>
        <button
          type="button"
          onClick={() => fetchTeachers(false)}
          disabled={isRefreshing}
          title={language === 'hi' ? 'अनुरोध सूची रीफ़्रेश करें' : 'Refresh teacher signup requests'}
          className="px-3 py-2.5 bg-white/80 hover:bg-white border border-white/90 rounded-xl text-xs font-bold text-zinc-700 flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer backdrop-blur-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">{language === 'hi' ? 'रीफ़्रेश' : 'Refresh'}</span>
        </button>
      </div>

      {/* Teachers Cards List */}
      <div className="space-y-3">
        {filteredTeachers.length === 0 ? (
          <div className="p-8 bg-white border border-zinc-200 rounded-2xl shadow-xs text-center space-y-2">
            <Users className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs font-bold text-zinc-600">
              {language === 'hi' ? 'कोई शिक्षक खाता नहीं मिला' : 'No teacher accounts match this filter'}
            </p>
          </div>
        ) : (
          filteredTeachers.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border transition bg-white shadow-xs ${
                t.status === 'pending'
                  ? 'border-blue-300 ring-2 ring-blue-100/60'
                  : t.status === 'approved'
                  ? 'border-zinc-200 hover:border-zinc-300'
                  : 'border-rose-200 bg-rose-50/40'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                {/* Left: Faculty Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-black text-sm shrink-0 border border-zinc-200">
                    {t.name
                      .split(' ')
                      .filter((_, i) => i < 2)
                      .map((p) => p[0])
                      .join('')}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-zinc-900 truncate">
                        {t.name}
                      </h4>
                      {t.status === 'pending' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-300 rounded-full text-[10px] font-black flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>ID PENDING APPROVAL</span>
                        </span>
                      )}
                      {t.status === 'approved' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>APPROVED & ACTIVE</span>
                        </span>
                      )}
                      {t.status === 'rejected' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>REJECTED</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600">
                      <span className="font-bold text-zinc-800">{t.designation}</span> • {t.department}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <span className="font-mono text-zinc-700">{t.email}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{t.cabinRoom || 'Room N/A'} ({t.floor})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        <span>{t.phone}</span>
                      </span>
                    </div>

                    {t.rejectionReason && t.status === 'rejected' && (
                      <p className="text-xs text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        Reason: {t.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: ID Card Thumbnail & Action Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                  {/* ID Card Inspection Preview */}
                  {t.idCardPhoto && (
                    <button
                      type="button"
                      onClick={() => setInspectingPhoto(t.idCardPhoto!)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      title="Inspect Uploaded Faculty ID Card"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-700" />
                      <span>{language === 'hi' ? 'आईडी कार्ड देखें' : 'View ID Card Photo'}</span>
                    </button>
                  )}

                  {/* Pending Approval / Reject Triggers */}
                  {t.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setApprovingTeacher(t);
                          setApprovalPermissions(
                            t.permissions && t.permissions.length > 0
                              ? t.permissions
                              : ['manage_profile', 'post_events', 'manage_locations']
                          );
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{language === 'hi' ? 'सत्यापित करें व विकल्प दें' : 'Verify & Grant Options'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectingTeacherId(t.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{language === 'hi' ? 'अस्वीकार' : 'Reject'}</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTeacher(t.id, t.name)}
                    className="px-2.5 py-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    title={language === 'hi' ? 'शिक्षक खाता हटाएं' : 'Delete Teacher Account'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              {/* Granular Permission Toggle Grid for Approved Teachers */}
              {t.status === 'approved' && (
                <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-zinc-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'hi' ? 'अनुमत विकल्प (Access Permissions):' : 'Permitted Teacher Options:'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Click any checkbox to grant or revoke live
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isGranted = (t.permissions || []).includes(perm.key);
                      const isMasterRestricted =
                        (perm.key === 'manage_locations' && !accessPolicy.allowAddLocations) ||
                        (perm.key === 'edit_department' && !accessPolicy.allowAddDepartments) ||
                        (perm.key === 'manage_faculty' && !accessPolicy.allowAddFaculty);

                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => handleTogglePermission(t.id, perm.key)}
                          className={`p-2 rounded-xl text-left border transition flex items-center justify-between gap-2 cursor-pointer ${
                            isMasterRestricted && isGranted
                              ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                              : isGranted
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] truncate leading-tight">{perm.label}</p>
                            <span className="text-[9px] block font-normal truncate">
                              {isMasterRestricted && isGranted ? (
                                <span className="text-blue-700 font-bold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" />
                                  Master Restricted by Admin
                                </span>
                              ) : isGranted ? (
                                <span className="text-emerald-700">Active</span>
                              ) : (
                                <span className="text-zinc-500">Disabled</span>
                              )}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                              isMasterRestricted && isGranted
                                ? 'bg-blue-600 text-white'
                                : isGranted
                                ? 'bg-emerald-600 text-white'
                                : 'border border-zinc-300 bg-white'
                            }`}
                          >
                            {isGranted && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ================= MODAL: APPROVE WITH PERMISSIONS ================= */}
      {approvingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">
                    {language === 'hi' ? 'आईडी सत्यापन व एक्सेस अनुमति' : 'Verify ID Card & Select Permissions'}
                  </h3>
                  <p className="text-xs text-zinc-500">{approvingTeacher.name} ({approvingTeacher.department})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingTeacher(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              {language === 'hi'
                ? 'कृपया चुनें कि इस शिक्षक को पोर्टल में कौन-कौन से फीचर्स का अधिकार देना है:'
                : 'Select which specific management options this verified faculty member should have access to:'}
            </p>

            {/* Permission Checkboxes */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = approvalPermissions.includes(perm.key);
                return (
                  <div
                    key={perm.key}
                    onClick={() => {
                      if (checked) {
                        setApprovalPermissions(approvalPermissions.filter((p) => p !== perm.key));
                      } else {
                        setApprovalPermissions([...approvalPermissions, perm.key]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        checked ? 'bg-emerald-600 text-white' : 'border border-zinc-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight">{perm.label}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{perm.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setApprovingTeacher(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Grant Selected Access</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT CONFIRMATION ================= */}
      {rejectingTeacherId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full border border-zinc-200 shadow-2xl space-y-3">
            <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <span>Reject Teacher ID Verification</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Reason for Rejection (Shown to faculty on login)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectingTeacherId(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FULLSCREEN ID CARD PHOTO INSPECTOR ================= */}
      {inspectingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-2xl w-full border border-zinc-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-zinc-900">
                  Uploaded Teacher Institutional ID Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPhoto(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-zinc-300 bg-zinc-100 p-2 flex items-center justify-center">
              <img
                src={inspectingPhoto}
                alt="Enlarged ID Card"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingPhoto(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: IN-APP CONFIRM DELETE TEACHER ================= */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-zinc-900">
                  {language === 'hi' ? 'शिक्षक खाता हटाएं?' : 'Delete Teacher Account?'}
                </h3>
                <p className="text-xs text-zinc-500 truncate">
                  {teacherToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              {language === 'hi'
                ? `क्या आप वाकई "${teacherToDelete.name}" का शिक्षक खाता और सभी एक्सेस अनुमतियां स्थायी रूप से हटाना चाहते हैं?`
                : `Are you sure you want to permanently delete the teacher account and all portal access for "${teacherToDelete.name}"?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingTeacher}
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingTeacher}
                onClick={handleConfirmDeleteTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeletingTeacher
                    ? language === 'hi' ? 'हटाया जा रहा है...' : 'Deleting...'
                    : language === 'hi' ? 'हाँ, हटाएं' : 'Confirm Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
