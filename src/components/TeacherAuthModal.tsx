import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Lock,
  Mail,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  GraduationCap,
  Building,
  Phone,
  Clock,
  BookOpen,
  Eye,
  EyeOff,
  ArrowRight,
  FileCheck,
  UserCheck,
  Loader2,
} from 'lucide-react';
import {
  CampusLocation,
  Language,
  TeacherAccount,
} from '../types';
import {
  registerTeacher,
  deleteTeacherAccount,
} from '../utils/storage';
import {
  hydrateTeacherAccountsFromServer,
  loginRemoteTeacher,
  createRemoteTeacherAccount,
  resetRemoteTeacherPassword,
} from '../utils/teacherRemote';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: CampusLocation[];
  onLoginSuccess: (teacher: TeacherAccount) => void;
  language: Language;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onClose,
  locations,
  onLoginSuccess,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<{ teacher: TeacherAccount; message: string } | null>(null);
  const [rejectedNotice, setRejectedNotice] = useState<{ teacher: TeacherAccount; reason: string } | null>(null);

  // Forgot Password / Password Reset States
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetMasterPin, setResetMasterPin] = useState('');
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Signup Form States
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [buildingId, setBuildingId] = useState('uiet-1');
  const [buildingName, setBuildingName] = useState('UIET Building 1');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [cabinRoom, setCabinRoom] = useState('');
  const [floor, setFloor] = useState('1st Floor');
  const [phone, setPhone] = useState('');
  const [officeHours, setOfficeHours] = useState('10:00 AM - 04:00 PM');
  const [subjectsInput, setSubjectsInput] = useState('');
  
  // ID Card Photo State
  const [idCardPhoto, setIdCardPhoto] = useState<string>('');
  const [idCardFileName, setIdCardFileName] = useState<string>('');
  const [idCardFileSize, setIdCardFileSize] = useState<string>('');
  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [signupSuccessAccount, setSignupSuccessAccount] = useState<TeacherAccount | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      hydrateTeacherAccountsFromServer().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract department locations for dropdown
  const departmentLocations = locations.filter(
    (l) => l.category === 'department' || l.category === 'faculty' || l.id.startsWith('uiet')
  );

  const handleBuildingChange = (locId: string) => {
    setBuildingId(locId);
    const found = locations.find((l) => l.id === locId);
    if (found) {
      setBuildingName(found.title);
      if (!department || department === 'Computer Science & Engineering') {
        setDepartment(found.title);
      }
    }
  };

  // Image Upload & Compression (Limit: 200 KB)
  const MAX_ID_CARD_FILE_SIZE = 200 * 1024; // 200 KB

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setIdCardError(language === 'hi' ? 'कृपया केवल वैध फोटो (JPG, PNG, WebP) अपलोड करें' : 'Please upload a valid image file (JPG, PNG, WebP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_ID_CARD_FILE_SIZE) {
      const currentKb = (file.size / 1024).toFixed(1);
      setIdCardError(
        language === 'hi'
          ? `आईडी कार्ड फोटो का साइज़ अधिकतम 200 KB तक होना चाहिए (आपकी फ़ाइल: ${currentKb} KB)`
          : `ID card photo size must be up to 200 KB (selected file: ${currentKb} KB)`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileSizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;
    setIdCardFileName(file.name);
    setIdCardFileSize(fileSizeFormatted);
    setIdCardError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas for lightning performance
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setIdCardPhoto(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setPendingNotice(null);
    setRejectedNotice(null);

    const trimmedIdent = loginEmail.trim();
    if (!trimmedIdent) {
      setLoginError(language === 'hi' ? 'कृपया अपना ईमेल या शिक्षक नाम दर्ज करें' : 'Please enter your email or faculty name');
      return;
    }
    if (!loginPassword) {
      setLoginError(language === 'hi' ? 'कृपया अपना पासवर्ड दर्ज करें' : 'Please enter your password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginRemoteTeacher(trimmedIdent, loginPassword);

      if (res.success && res.teacher) {
        onLoginSuccess(res.teacher);
        onClose();
      } else if (res.isPending && res.teacher) {
        setPendingNotice({ teacher: res.teacher, message: res.message || '' });
      } else if (res.isRejected && res.teacher) {
        setRejectedNotice({ teacher: res.teacher, reason: res.rejectionReason || 'Invalid ID' });
      } else {
        setLoginError(res.message || (language === 'hi' ? 'लॉगिन असफल रहा। कृपया पासवर्ड जांचें।' : 'Login failed. Please check credentials.'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    const targetIdent = resetIdentifier.trim() || loginEmail.trim();
    if (!targetIdent) {
      setResetStatus({
        type: 'error',
        msg: language === 'hi' ? 'कृपया अपना ईमेल या नाम दर्ज करें' : 'Please enter your email or faculty name',
      });
      return;
    }
    if (resetNewPw.trim().length < 4) {
      setResetStatus({
        type: 'error',
        msg: language === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए' : 'Password must be at least 4 characters',
      });
      return;
    }
    setIsResetting(true);
    const res = await resetRemoteTeacherPassword(targetIdent, resetNewPw.trim(), resetMasterPin.trim());
    setIsResetting(false);
    if (res.success) {
      setResetStatus({ type: 'success', msg: res.message });
      setLoginEmail(targetIdent);
      setLoginPassword(resetNewPw.trim());
      setTimeout(() => setShowForgotPw(false), 2500);
    } else {
      setResetStatus({ type: 'error', msg: res.message });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!name.trim()) {
      setSignupError(language === 'hi' ? 'कृपया अपना पूरा नाम भरें' : 'Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setSignupError(language === 'hi' ? 'कृपया वैध आधिकारिक ईमेल दर्ज करें' : 'Please enter a valid official email');
      return;
    }
    if (!password || password.length < 4) {
      setSignupError(language === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए' : 'Password must be at least 4 characters long');
      return;
    }
    if (!cabinRoom.trim()) {
      setSignupError(language === 'hi' ? 'कृपया अपना केबिन या कमरा नंबर भरें' : 'Please enter your Cabin / Room number');
      return;
    }
    if (!idCardPhoto) {
      setIdCardError(language === 'hi' ? 'शिक्षक आईडी कार्ड की फोटो अपलोड करना अनिवार्य है' : 'ID Card photo is required for institutional verification');
      return;
    }

    const subjectsList = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsSubmitting(true);
    const res = registerTeacher({
      name,
      hindiName: hindiName.trim() || undefined,
      email,
      password,
      department,
      designation,
      cabinRoom,
      floor,
      buildingName,
      buildingId,
      phone: phone.trim() || '+91 00000 00000',
      officeHours,
      subjects: subjectsList,
      idCardPhoto,
    });

    if (res.success && res.account) {
      try {
        const remote = await createRemoteTeacherAccount(res.account);
        setIsSubmitting(false);
        if (!remote.success) {
          if (remote.message?.toLowerCase().includes('already registered and approved')) {
            deleteTeacherAccount(res.account.id);
          }
          setSignupError(
            language === 'hi'
              ? `पंजीकरण सर्वर त्रुटि: ${remote.message || 'कृपया दोबारा प्रयास करें।'}`
              : `Server signup error: ${remote.message || 'Please check your connection and try again.'}`
          );
          return;
        }
        setSignupSuccessAccount(res.account);
      } catch (err: any) {
        setIsSubmitting(false);
        setSignupError(
          language === 'hi'
            ? `नेटवर्क त्रुटि: ${err.message || 'सर्वर से संपर्क नहीं हो सका'}`
            : `Network error: ${err.message || 'Unable to communicate with server.'}`
        );
      }
    } else {
      setIsSubmitting(false);
      setSignupError(res.message);
    }
  };

  return (
    <div
      id="teacher-auth-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        id="teacher-auth-modal-card"
        className="ios-liquid-modal rounded-3xl shadow-2xl border border-white/95 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900"
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 ios-liquid-header border-b border-white/60 text-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate text-zinc-900">
                {language === 'hi' ? 'CSJMU शिक्षक पोर्टल' : 'CSJMU Faculty & Teacher Portal'}
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate font-medium">
                {language === 'hi'
                  ? 'शिक्षकों के लिए लॉगिन, आईडी सत्यापन और केबिन प्रबंधन'
                  : 'Teacher Login, ID Card Verification & Cabin Locator Management'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 sm:p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 pt-3 pb-2.5 bg-white/40 backdrop-blur-md border-b border-white/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-200/80 border border-zinc-300/80 rounded-xl text-xs font-extrabold w-full sm:w-auto shadow-2xs">
            <button
              type="button"
              id="tab-teacher-login"
              onClick={() => {
                setActiveTab('login');
                setSignupSuccessAccount(null);
              }}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-zinc-950 shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'hi' ? 'लॉगिन करें' : 'Faculty Login'}</span>
            </button>
            <button
              type="button"
              id="tab-teacher-signup"
              onClick={() => {
                setActiveTab('signup');
                setPendingNotice(null);
                setRejectedNotice(null);
              }}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white text-zinc-950 shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'hi' ? 'नया पंजीकरण (ID Card सहित)' : 'Sign Up (with ID Card)'}</span>
            </button>
          </div>

          <span className="hidden sm:flex items-center gap-1 text-[11px] text-blue-900 font-bold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin Verified</span>
          </span>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/50">
          
          {/* ======================= 1. LOGIN TAB ======================= */}
          {activeTab === 'login' && (
            <div className="space-y-4 max-w-md mx-auto">
              {/* Pending Approval Notice */}
              {pendingNotice && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2.5 animate-scale-in">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-blue-900">
                        {language === 'hi' ? 'आईडी कार्ड सत्यापन प्रक्रियाधीन है' : 'ID Verification Pending Admin Review'}
                      </h4>
                      <p className="text-xs text-blue-800 mt-0.5">
                        {language === 'hi'
                          ? `नमस्ते ${pendingNotice.teacher.name}! आपका पंजीकरण प्राप्त हो चुका है। एडमिन द्वारा आपके आईडी कार्ड की पुष्टि होने के बाद आपको आवंटित फीचर्स का एक्सेस मिल जाएगा।`
                          : `Hello ${pendingNotice.teacher.name}! Your account and ID Card are under review by the Campus Admin. Once approved, you will have access to all assigned features.`}
                      </p>
                    </div>
                  </div>

                  {pendingNotice.teacher.idCardPhoto && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p className="text-[10px] font-bold text-blue-900 mb-1">
                        {language === 'hi' ? 'जमा किया गया आईडी कार्ड:' : 'Submitted ID Card Photo:'}
                      </p>
                      <div className="rounded-xl overflow-hidden border border-blue-200 bg-white p-1">
                        <img
                          src={pendingNotice.teacher.idCardPhoto}
                          alt="ID Preview"
                          className="w-full max-h-36 object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rejected Notice */}
              {rejectedNotice && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-1.5">
                  <div className="flex items-start gap-2 text-rose-900">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold">
                        {language === 'hi' ? 'आईडी सत्यापन अस्वीकृत' : 'ID Verification Rejected'}
                      </h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        {rejectedNotice.reason}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 pt-1">
                    {language === 'hi'
                      ? 'कृपया नए पंजीकरण टैब पर जाकर अपना वैध CSJMU आईडी कार्ड पुनः अपलोड करें।'
                      : 'Please navigate to the Sign Up tab to re-register with your valid faculty ID card.'}
                  </p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'ईमेल या संकाय का नाम (Email or Faculty Name)' : 'Official Email or Faculty Name'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={language === 'hi' ? 'उदा. stark12300@gmail.com या abhay' : 'e.g. stark12300@gmail.com or abhay'}
                      className="w-full text-xs py-2.5 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-700">
                      {language === 'hi' ? 'पासवर्ड (Password)' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPw(!showForgotPw);
                        if (!resetIdentifier) setResetIdentifier(loginEmail);
                      }}
                      className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs py-2.5 pl-9 pr-9 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setResetIdentifier(loginEmail);
                        setShowForgotPw(true);
                      }}
                      className="text-[11px] font-medium text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {language === 'hi' ? 'पासवर्ड भूल गए? (Forgot Password)' : 'Forgot Password?'}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="btn-teacher-login-submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-blue-400" />
                  )}
                  <span>
                    {isLoggingIn
                      ? (language === 'hi' ? 'सत्यापित किया जा रहा है...' : 'Authenticating...')
                      : (language === 'hi' ? 'शिक्षक पोर्टल में प्रवेश करें' : 'Login to Faculty Portal')}
                  </span>
                </button>
              </form>

              {/* Forgot / Reset Password Drawer */}
              {showForgotPw && (
                <form onSubmit={handleResetPassword} className="space-y-3 bg-blue-50/70 border border-blue-200 p-4 rounded-2xl animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-700" />
                      <span>{language === 'hi' ? 'पासवर्ड रीसेट करें (Reset Password)' : 'Reset Teacher Password'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowForgotPw(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 font-bold px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-0.5">
                      {language === 'hi' ? 'ईमेल या नाम' : 'Email or Faculty Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="e.g. your faculty email or name"
                      className="w-full text-xs py-2 px-3 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-0.5">
                        {language === 'hi' ? 'एडमिन सुरक्षा पिन' : 'Admin Security PIN'}
                      </label>
                      <input
                        type="password"
                        required
                        value={resetMasterPin}
                        onChange={(e) => setResetMasterPin(e.target.value)}
                        placeholder="••••••"
                        className="w-full text-xs py-2 px-3 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-0.5">
                        {language === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                      </label>
                      <input
                        type="password"
                        required
                        value={resetNewPw}
                        onChange={(e) => setResetNewPw(e.target.value)}
                        placeholder="Min 4 chars"
                        className="w-full text-xs py-2 px-3 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {resetStatus && (
                    <div
                      className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                        resetStatus.type === 'success'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {resetStatus.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{resetStatus.msg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isResetting ? (language === 'hi' ? 'रीसेट हो रहा है...' : 'Resetting...') : (language === 'hi' ? 'पासवर्ड अपडेट करें' : 'Update Password')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================= 2. SIGNUP TAB ======================= */}
          {activeTab === 'signup' && (
            <div className="max-w-xl mx-auto space-y-4">
              {signupSuccessAccount ? (
                <div className="bg-white p-6 rounded-2xl border border-emerald-300 shadow-sm text-center space-y-4 animate-scale-in">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900">
                      {language === 'hi' ? 'पंजीकरण व आईडी कार्ड सबमिट हो गया!' : 'Registration & ID Card Submitted!'}
                    </h3>
                    <p className="text-xs text-zinc-600 max-w-md mx-auto mt-1">
                      {language === 'hi'
                        ? `धन्यवाद ${signupSuccessAccount.name}। आपका विवरण और आईडी कार्ड सत्यापन के लिए कॉलेज एडमिन को भेज दिया गया है। एडमिन द्वारा अनुमति मिलने पर आपके खाते के सभी चयनित विकल्प सक्रिय हो जाएंगे।`
                        : `Thank you ${signupSuccessAccount.name}. Your details and ID card have been queued for Campus Admin verification. You will be able to manage your cabin and assigned features once approved.`}
                    </p>
                  </div>

                  {signupSuccessAccount.idCardPhoto && (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl max-w-sm mx-auto">
                      <p className="text-[10px] font-bold text-zinc-500 mb-1">
                        {language === 'hi' ? 'जमा किया गया आईडी कार्ड प्रमाण:' : 'Submitted Verification ID:'}
                      </p>
                      <img
                        src={signupSuccessAccount.idCardPhoto}
                        alt="ID Card"
                        className="w-full max-h-36 object-contain rounded-lg border border-zinc-200 bg-white"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSignupSuccessAccount(null);
                        setActiveTab('login');
                        setLoginEmail(signupSuccessAccount.email);
                      }}
                      className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition"
                    >
                      {language === 'hi' ? 'लॉगिन स्क्रीन पर जाएं' : 'Proceed to Login Screen'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignupSubmit} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900">
                      {language === 'hi' ? 'शिक्षक विवरण (Faculty Information)' : 'Faculty Information'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'पूरा नाम (Full Name) *' : 'Full Name (with Title) *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Ramesh Kumar"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'नाम (हिन्दी में - ऐच्छिक)' : 'Hindi Name (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={hindiName}
                        onChange={(e) => setHindiName(e.target.value)}
                        placeholder="जैसे डॉ. रमेश कुमार"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'आधिकारिक ईमेल (Email) *' : 'Official Email *'}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rkumar@csjmu.ac.in"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'पासवर्ड (Password) *' : 'Password *'}
                      </label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs py-2 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 p-1"
                        >
                          {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'पद / पदनाम (Designation) *' : 'Designation *'}
                      </label>
                      <select
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      >
                        <option value="Professor">Professor</option>
                        <option value="Professor & Head of Department">Professor & Head of Department (HOD)</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Guest Faculty / Lecturer">Guest Faculty / Lecturer</option>
                        <option value="Dean / Director">Dean / Director</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'विभाग (Department) *' : 'Department *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Computer Science & Engineering"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Step 2: Location & Office Details */}
                  <div className="flex items-center gap-2 pt-2 pb-2 border-b border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900">
                      {language === 'hi' ? 'केबिन व कैंपस स्थान (Cabin & Building Location)' : 'Cabin & Building Location'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'कैंपस भवन (Building) *' : 'Building / Block *'}
                      </label>
                      <select
                        value={buildingId}
                        onChange={(e) => handleBuildingChange(e.target.value)}
                        className="w-full text-xs py-2 px-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      >
                        {departmentLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'मंजिल (Floor) *' : 'Floor *'}
                      </label>
                      <select
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        className="w-full text-xs py-2 px-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      >
                        <option value="Ground Floor">Ground Floor</option>
                        <option value="1st Floor">1st Floor</option>
                        <option value="2nd Floor">2nd Floor</option>
                        <option value="3rd Floor">3rd Floor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'केबिन / कमरा नंबर *' : 'Cabin / Room No. *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={cabinRoom}
                        onChange={(e) => setCabinRoom(e.target.value)}
                        placeholder="e.g. Room 204 / Cabin B-12"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'मोबाइल नंबर (Phone)' : 'Mobile Phone'}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        {language === 'hi' ? 'पढ़ाए जाने वाले विषय (Subjects/Courses)' : 'Subjects / Specialization'}
                      </label>
                      <input
                        type="text"
                        value={subjectsInput}
                        onChange={(e) => setSubjectsInput(e.target.value)}
                        placeholder="e.g. Data Structures, Python, DBMS (comma separated)"
                        className="w-full text-xs py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Step 3: MANDATORY ID CARD VERIFICATION PHOTO */}
                  <div className="flex items-center gap-2 pt-2 pb-2 border-b border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                      3
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-900">
                        {language === 'hi' ? 'आईडी कार्ड सत्यापन फोटो (Mandatory ID Photo) *' : 'Mandatory Faculty ID Card Photo *'}
                      </h3>
                      <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.2 rounded-full font-bold">
                        Verification Required
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-blue-900 leading-relaxed">
                        {language === 'hi'
                          ? 'कृपया अपने CSJMU शिक्षक पहचान पत्र (Faculty ID Card) की स्पष्ट फोटो अपलोड करें। एडमिन सत्यापन के बाद ही आपका खाता सक्रिय होगा।'
                          : 'Upload a clear photograph of your CSJMU Faculty Identity Card. Admin will verify this before unlocking your faculty management capabilities.'}
                      </p>
                      <span className="shrink-0 text-[10px] bg-blue-100 text-blue-950 px-2 py-0.5 rounded-full font-extrabold border border-blue-200">
                        {language === 'hi' ? 'अधिकतम 200 KB' : 'Max 200 KB'}
                      </span>
                    </div>

                    {/* Image Preview Box */}
                    {idCardPhoto ? (
                      <div className="relative rounded-2xl overflow-hidden border border-blue-200 bg-white p-2 flex flex-col items-center">
                        <img
                          src={idCardPhoto}
                          alt="Faculty ID Preview"
                          className="w-full max-h-48 object-contain rounded-xl"
                        />
                        <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 text-xs">
                          <span className="text-zinc-600 truncate flex items-center gap-1 min-w-0 pr-2">
                            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate">{idCardFileName || 'ID Card Photo Attached'}</span>
                            {idCardFileSize && (
                              <span className="text-[10px] text-zinc-500 font-mono shrink-0 font-bold bg-zinc-100 px-1.5 py-0.5 rounded-md">
                                {idCardFileSize}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIdCardPhoto('');
                              setIdCardFileName('');
                              setIdCardFileSize('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-rose-600 font-bold hover:underline shrink-0 text-xs cursor-pointer"
                          >
                            {language === 'hi' ? 'हटाएं व पुनः चुनें' : 'Remove & Change'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-5 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl bg-white cursor-pointer transition flex flex-col items-center justify-center text-center space-y-2 group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-105 transition">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">
                            {language === 'hi' ? 'आईडी कार्ड फोटो अपलोड करें (Upload Photo)' : 'Upload ID Card Photo'}
                          </span>
                          <span className="text-[10px] text-zinc-500 block font-medium mt-0.5">
                            {language === 'hi' ? 'JPG, PNG, WebP • साइज़: अधिकतम 200 KB तक' : 'JPG, PNG, WebP • Size: Up to 200 KB'}
                          </span>
                        </div>
                      </div>
                    )}

                    {idCardError && (
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{idCardError}</span>
                      </p>
                    )}
                  </div>

                  {signupError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{signupError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    id="btn-teacher-signup-submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>
                      {isSubmitting
                        ? language === 'hi'
                          ? 'सत्यापन के लिए भेजा जा रहा है...'
                          : 'Submitting to Admin Server...'
                        : language === 'hi'
                        ? 'आईडी कार्ड सहित सबमिट करें (Submit for Verification)'
                        : 'Submit Account & ID Card for Verification'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
