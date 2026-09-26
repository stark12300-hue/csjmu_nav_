import React, { useState, useEffect } from 'react';
import {
  Bug,
  Mail,
  Send,
  CheckCircle2,
  X,
  Copy,
  AlertTriangle,
  MapPin,
  Building,
  User,
  Phone,
  FileText,
  ExternalLink,
  MessageSquareWarning,
  Sparkles
} from 'lucide-react';
import { CampusLocation, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { saveBugReportToFirestore } from '../services/firebase';

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  selectedLocation?: CampusLocation | null;
}

export type IssueCategory =
  | 'wrong_location'
  | 'faculty_cabin_error'
  | 'building_info_error'
  | 'route_navigation_error'
  | 'missing_location'
  | 'app_bug'
  | 'other';

export const ReportBugModal: React.FC<ReportBugModalProps> = ({
  isOpen,
  onClose,
  language,
  selectedLocation,
}) => {
  const TARGET_EMAIL = 'stark12300@gmail.com';
  const t = TRANSLATIONS[language];

  const [category, setCategory] = useState<IssueCategory>('wrong_location');
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [departmentOrCourse, setDepartmentOrCourse] = useState('');
  const [locationName, setLocationName] = useState(
    selectedLocation ? (language === 'hi' ? selectedLocation.hindiTitle : selectedLocation.title) : ''
  );
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update location name if selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setLocationName(language === 'hi' ? selectedLocation.hindiTitle : selectedLocation.title);
    }
  }, [selectedLocation, language]);

  if (!isOpen) return null;

  const categoryLabels: Record<IssueCategory, { en: string; hi: string; icon: string }> = {
    wrong_location: {
      en: 'Wrong Map Location / Pin Coordinates',
      hi: 'गलत मैप लोकेशन या पिन निर्देशांक',
      icon: '📍'
    },
    faculty_cabin_error: {
      en: 'Incorrect Teacher Cabin / Room Info',
      hi: 'शिक्षक केबिन या कमरा नंबर में त्रुटि',
      icon: '👨‍🏫'
    },
    building_info_error: {
      en: 'Incorrect Building / Department Details',
      hi: 'भवन या विभाग के विवरण में त्रुटि',
      icon: '🏢'
    },
    route_navigation_error: {
      en: 'Wrong Route / Walking Directions',
      hi: 'रास्ता या नेविगेशन दिशा-निर्देश गलत',
      icon: '🚶'
    },
    missing_location: {
      en: 'Missing Location / Request to Add Place',
      hi: 'नया विभाग या स्थान जोड़ने का अनुरोध',
      icon: '➕'
    },
    app_bug: {
      en: 'App Bug / UI Glitch / Not Working',
      hi: 'ऐप में तकनीकी खराबी या समस्या',
      icon: '🐛'
    },
    other: {
      en: 'General Feedback or Complaint',
      hi: 'सामान्य फीडबैक या अन्य शिकायत',
      icon: '📝'
    },
  };

  const constructReportBody = () => {
    const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const coordsStr = selectedLocation
      ? `\nCoordinates: [${selectedLocation.coordinates[0]}, ${selectedLocation.coordinates[1]}]`
      : '';

    return `=== CSJMU CAMPUS NAVIGATOR - BUG & ISSUE REPORT ===
Issue Category: ${categoryLabels[category].en} (${categoryLabels[category].hi})
Location / Department: ${locationName || 'Not Specified'}${coordsStr}

Reporter Name: ${name || 'Anonymous Student'}
Contact Email/Phone: ${emailOrPhone || 'Not Provided'}
Department/Course: ${departmentOrCourse || 'Not Provided'}

Description / Details:
${description}

--- System Info ---
Timestamp: ${timeStr}
User Agent: ${navigator.userAgent}
Screen Resolution: ${window.innerWidth}x${window.innerHeight}
Target Support Email: ${TARGET_EMAIL}
===================================================`;
  };

  const handleCopyDetails = () => {
    const body = constructReportBody();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(body);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया समस्या का विवरण दर्ज करें।'
          : 'Please enter a description of the issue.'
      );
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    const reportData = {
      category,
      categoryName: categoryLabels[category].en,
      name,
      emailOrPhone,
      departmentOrCourse,
      locationName,
      coordinates: selectedLocation?.coordinates || null,
      description,
      targetEmail: TARGET_EMAIL,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    try {
      // 1. Immediately mirror to Google Firebase Firestore database
      saveBugReportToFirestore({
        category,
        categoryName: categoryLabels[category].en,
        reporterName: name || 'Anonymous',
        userContact: emailOrPhone,
        departmentOrCourse,
        location: locationName,
        coordinates: selectedLocation?.coordinates || null,
        description,
        targetEmail: TARGET_EMAIL,
        status: 'open',
      }).catch((e) => console.warn('Firestore bug report notice:', e));

      // 2. Try sending to backend API
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      }).catch((err) => console.warn('API log warning:', err));

      // 2. Open Native Mail Client with pre-formatted subject and body directed to stark12300@gmail.com
      const subject = encodeURIComponent(
        `[CSJMU Map Report] ${categoryLabels[category].en} - ${locationName || 'General'}`
      );
      const body = encodeURIComponent(constructReportBody());
      const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${subject}&body=${body}`;

      // Open mail client
      window.location.href = mailtoUrl;

      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setIsSubmitting(false);
      setIsSuccess(true);
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setDescription('');
    setName('');
    setEmailOrPhone('');
    setDepartmentOrCourse('');
    onClose();
  };

  return (
    <div
      id="report-bug-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/45 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="report-bug-modal-card"
        className="ios-liquid-modal rounded-3xl max-w-lg w-full overflow-hidden text-zinc-900 flex flex-col max-h-[90vh] my-auto shadow-2xl border border-white/95 animate-slide-up"
      >
        {/* Modal Header */}
        <div className="ios-liquid-header p-4 sm:p-5 flex items-center justify-between gap-2 border-b border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shadow-xs shrink-0">
              <Bug className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-950">
                  {language === 'hi' ? 'समस्या रिपोर्ट करें' : 'Report Map Issue & Bugs'}
                </h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                  Direct Email
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1 font-medium">
                <span>{language === 'hi' ? 'शिकायत सीधे भेजी जाएगी:' : 'Complaints will be sent to:'}</span>
                <span className="font-bold text-zinc-900 underline">{TARGET_EMAIL}</span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-report-modal"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-transparent">
          {isSuccess ? (
            /* Success State */
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 mx-auto flex items-center justify-center shadow-sm animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-zinc-950">
                  {language === 'hi' ? 'रिपोर्ट तैयार कर दी गई है!' : 'Bug Report Prepared!'}
                </h4>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  {language === 'hi'
                    ? `आपकी शिकायत stark12300@gmail.com पर भेजने हेतु आपके ईमेल ऐप में खुल गई है। यदि मेल ऐप नहीं खुला, तो आप नीचे बटन दबाकर शिकायत कॉपी भी कर सकते हैं।`
                    : `Your complaint is addressed to stark12300@gmail.com. If your email app did not open automatically, you can copy the full report below.`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={handleCopyDetails}
                  className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedNotification ? (language === 'hi' ? 'कॉपी हो गया!' : 'Copied!') : (language === 'hi' ? 'शिकायत कॉपी करें' : 'Copy Report Text')}</span>
                </button>
                <button
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white border border-blue-600 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {language === 'hi' ? 'बंद करें' : 'Done & Close'}
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  {language === 'hi' ? 'समस्या का प्रकार (Category) *' : 'Issue Category *'}
                </label>
                <select
                  id="select-bug-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IssueCategory)}
                  className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  {Object.entries(categoryLabels).map(([key, val]) => (
                    <option key={key} value={key} className="bg-white text-zinc-900">
                      {val.icon} {language === 'hi' ? val.hi : val.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location or Department Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1">
                  {language === 'hi' ? 'स्थान / विभाग का नाम' : 'Location or Department Name'}
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-bug-location"
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder={
                      language === 'hi'
                        ? 'जैसे: UIET ब्लॉक 2, प्रशासनिक भवन, गेट 1, लाइब्रेरी...'
                        : 'e.g. UIET Block 2, Admin Block, Gate 1, Central Library...'
                    }
                    className="w-full rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1">
                  {language === 'hi' ? 'समस्या का विवरण (विस्तार से लिखें) *' : 'Issue Description (What is incorrect?) *'}
                </label>
                <textarea
                  id="textarea-bug-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'कृपया बताएं कि मैप पर क्या गलत है (जैसे: सही लोकेशन Google Maps पर यहाँ है, शिक्षक का केबिन रूम 204 है, या रास्ता गलत दिखा रहा है)...'
                      : 'Please describe the error (e.g. exact Google Maps coordinates or location is further north, teacher cabin is Room 204, wrong gate entrance)...'
                  }
                  className="w-full rounded-xl p-3 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
                />
              </div>

              {/* Reporter Contact Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                    {language === 'hi' ? 'आपका नाम (वैकल्पिक)' : 'Your Name (Optional)'}
                  </label>
                  <div className="relative">
                    <User className="w-3 h-3 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={language === 'hi' ? 'जैसे: राहुल' : 'e.g. Rahul'}
                      className="w-full rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                    {language === 'hi' ? 'ईमेल या मोबाइल नंबर' : 'Email or Phone'}
                  </label>
                  <div className="relative">
                    <Mail className="w-3 h-3 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder={language === 'hi' ? 'जैसे: student@gmail.com' : 'e.g. student@gmail.com'}
                      className="w-full rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Course or Department */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                  {language === 'hi' ? 'आपका कोर्स / रोल नंबर' : 'Course / Roll No / Department'}
                </label>
                <input
                  type="text"
                  value={departmentOrCourse}
                  onChange={(e) => setDepartmentOrCourse(e.target.value)}
                  placeholder={language === 'hi' ? 'जैसे: B.Tech CSE 3rd Year / MCA' : 'e.g. B.Tech CSE 3rd Year / MCA'}
                  className="w-full rounded-xl px-3 py-2 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                />
              </div>

              {/* Error Notice if any */}
              {errorMsg && (
                <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{errorMsg}</span>
                </div>
              )}

              {/* Destination Email Info Box */}
              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl text-xs text-zinc-800 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-zinc-900 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">Recipient Email</span>
                    <span className="font-extrabold text-zinc-950 text-xs">{TARGET_EMAIL}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyDetails}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[11px] font-bold text-zinc-900 transition shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Copy complaint text"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedNotification ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  id="btn-submit-bug-report"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold border border-blue-600 rounded-xl text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? language === 'hi'
                        ? 'भेजा जा रहा है...'
                        : 'Sending...'
                      : language === 'hi'
                      ? 'ईमेल पर रिपोर्ट भेजें'
                      : 'Send Report to Email'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
