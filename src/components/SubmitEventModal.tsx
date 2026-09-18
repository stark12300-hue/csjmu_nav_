import React, { useState, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Upload,
  User,
  Phone,
  Mail,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  Info,
  Camera,
  Check
} from 'lucide-react';
import { CampusEvent, EventCategory, CampusLocation, Language } from '../types';

interface SubmitEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (eventData: CampusEvent) => void;
  onSubmitEvent?: (eventData: CampusEvent) => void;
  campusLocations?: CampusLocation[];
  locations?: CampusLocation[];
  currentLang?: 'en' | 'hi';
  language?: Language;
}

const CATEGORIES: { value: EventCategory; labelEn: string; labelHi: string; icon: string }[] = [
  { value: 'Fest', labelEn: 'College Fest / Gala', labelHi: 'कॉलेज फेस्ट / उत्सव', icon: '🎉' },
  { value: 'Cultural', labelEn: 'Cultural & Arts', labelHi: 'सांस्कृतिक एवं कला', icon: '🎭' },
  { value: 'Workshop', labelEn: 'Workshop / Hackathon', labelHi: 'कार्यशाला / हैकथॉन', icon: '💻' },
  { value: 'Seminar', labelEn: 'Seminar / Conference', labelHi: 'संगोष्ठी / सेमिनार', icon: '🎓' },
  { value: 'Sports', labelEn: 'Sports & Athletics', labelHi: 'खेलकूद प्रतियोगिता', icon: '🏆' },
  { value: 'Placement Drive', labelEn: 'Placement Drive / Recruitment', labelHi: 'कैंपस प्लेसमेंट ड्राइव', icon: '💼' },
  { value: 'Notice', labelEn: 'Official Notice / Circular', labelHi: 'आधिकारिक सूचना / नोटिस', icon: '📢' },
  { value: 'Other', labelEn: 'Other Event', labelHi: 'अन्य कार्यक्रम', icon: '📌' },
];

const PRESET_POSTERS = [
  {
    name: 'Cultural & Star Night',
    hindiName: 'सांस्कृतिक फेस्ट',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    category: 'Cultural'
  },
  {
    name: 'Hackathon & Tech Expo',
    hindiName: 'हैकथॉन / कोडिंग',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
    category: 'Workshop'
  },
  {
    name: 'Campus Placement & Job Drive',
    hindiName: 'प्लेसमेंट ड्राइव',
    url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=80',
    category: 'Placement Drive'
  },
  {
    name: 'Sports Meet & Championship',
    hindiName: 'खेलकूद प्रतियोगिता',
    url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    category: 'Sports'
  },
  {
    name: 'National Seminar & Conference',
    hindiName: 'राष्ट्रीय संगोष्ठी',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
    category: 'Seminar'
  },
  {
    name: 'Official Campus Notice',
    hindiName: 'आधिकारिक नोटिस',
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
    category: 'Notice'
  }
];

export const SubmitEventModal: React.FC<SubmitEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSubmitEvent,
  campusLocations,
  locations,
  currentLang,
  language,
}) => {
  const activeLang: Language = language || (currentLang as Language) || 'en';
  const allLocations = locations || campusLocations || [];
  const handleFormSubmit = onSubmit || onSubmitEvent || (() => {});

  const [title, setTitle] = useState('');
  const [hindiTitle, setHindiTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Fest');
  const [description, setDescription] = useState('');
  const [hindiDescription, setHindiDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [venueLocationId, setVenueLocationId] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [posterImage, setPosterImage] = useState(PRESET_POSTERS[0].url);

  // Student verification fields
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [studentCourseBranch, setStudentCourseBranch] = useState('');
  const [studentMobile, setStudentMobile] = useState('');

  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Compress image on client-side to ensure smooth performance & storage
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setPosterImage(compressedBase64);
          setIsProcessingImage(false);
        } else {
          setPosterImage(typeof event.target?.result === 'string' ? event.target.result : '');
          setIsProcessingImage(false);
        }
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setErrorMsg(activeLang === 'hi' ? 'छवि लोड करने में विफल।' : 'Failed to load image.');
      };
      img.src = typeof event.target?.result === 'string' ? event.target.result : '';
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setErrorMsg(activeLang === 'hi' ? 'फ़ाइल पढ़ने में त्रुटि।' : 'Error reading file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!title.trim()) {
      setErrorMsg(activeLang === 'hi' ? 'कृपया इवेंट का शीर्षक दर्ज करें।' : 'Please enter event title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg(activeLang === 'hi' ? 'कृपया इवेंट का विवरण दर्ज करें।' : 'Please provide event description.');
      return;
    }
    if (!startDate) {
      setErrorMsg(activeLang === 'hi' ? 'कृपया इवेंट की आरंभ तिथि चुनें।' : 'Please select event start date.');
      return;
    }
    if (!endDate) {
      setErrorMsg(activeLang === 'hi' ? 'कृपया इवेंट समाप्ति/एक्सपायरी तिथि चुनें।' : 'Please select event end date.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg(activeLang === 'hi' ? 'समाप्ति तिथि आरंभ तिथि के बाद होनी चाहिए।' : 'End date cannot be earlier than start date.');
      return;
    }
    if (!venue.trim()) {
      setErrorMsg(activeLang === 'hi' ? 'कृपया स्थान/वेन्यू दर्ज करें।' : 'Please enter venue.');
      return;
    }
    if (!organizer.trim()) {
      setErrorMsg(activeLang === 'hi' ? 'कृपया आयोजक विभाग/क्लब का नाम दर्ज करें।' : 'Please enter organizer name.');
      return;
    }

    // Student verification
    if (!studentName.trim() || !studentRollNo.trim() || !studentCourseBranch.trim() || !studentMobile.trim()) {
      setErrorMsg(
        activeLang === 'hi'
          ? 'कृपया छात्र सत्यापन के सभी विवरण (नाम, रोल नंबर, कोर्स और मोबाइल) भरें।'
          : 'Please complete all student verification fields (Name, Roll No, Course, Mobile).'
      );
      return;
    }

    const newEvent: CampusEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      hindiTitle: hindiTitle.trim() || undefined,
      category,
      description: description.trim(),
      hindiDescription: hindiDescription.trim() || undefined,
      posterImage: posterImage || PRESET_POSTERS[0].url,
      startDate,
      endDate,
      time: time.trim() || '09:00 AM onwards',
      venue: venue.trim(),
      venueLocationId: venueLocationId || undefined,
      organizer: organizer.trim(),
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      registrationUrl: registrationUrl.trim() || undefined,
      submittedByStudentName: studentName.trim(),
      studentRollNo: studentRollNo.trim(),
      studentCourseBranch: studentCourseBranch.trim(),
      studentMobile: studentMobile.trim(),
      status: 'pending',
      isLive: true,
      createdAt: Date.now(),
      likesCount: 1,
      isCustom: true,
    };

    handleFormSubmit(newEvent);
    setSubmittedSuccess(true);
  };

  const handleResetAndClose = () => {
    setSubmittedSuccess(false);
    setTitle('');
    setHindiTitle('');
    setDescription('');
    setHindiDescription('');
    setStartDate('');
    setEndDate('');
    setTime('');
    setVenue('');
    setVenueLocationId('');
    setOrganizer('');
    setContactPhone('');
    setContactEmail('');
    setRegistrationUrl('');
    setPosterImage(PRESET_POSTERS[0].url);
    setStudentName('');
    setStudentRollNo('');
    setStudentCourseBranch('');
    setStudentMobile('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      id="submit-event-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/45 backdrop-blur-md animate-fade-in"
    >
      <div
        id="submit-event-modal-card"
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden my-6 text-zinc-900 ios-liquid-modal border border-white/95 shadow-2xl"
      >
        {/* Header */}
        <div className="ios-liquid-header px-6 py-4.5 flex items-center justify-between border-b border-white/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200 shadow-xs">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-950">
                {activeLang === 'hi' ? 'नया इवेंट / फेस्ट सबमिट करें' : 'Submit Campus Event / Fest'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-700 font-semibold mt-0.5">
                {activeLang === 'hi'
                  ? 'पोस्टर अपलोड करें और पूरे कैंपस को आमंत्रित करें'
                  : 'Upload poster, schedule dates, and publish for all CSJMU students'}
              </p>
            </div>
          </div>
          <button
            id="close-submit-event-modal-btn"
            onClick={handleResetAndClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-50 shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-950">
                {activeLang === 'hi' ? 'इवेंट सफलतापूर्वक सबमिट हुआ!' : 'Event Submitted Successfully!'}
              </h3>
              <p className="text-sm text-slate-700 font-medium max-w-md mx-auto leading-relaxed">
                {activeLang === 'hi'
                  ? 'आपका इवेंट एडमिन वेरिफिकेशन के लिए सबमिट हो गया है। विश्वविद्यालय एडमिन द्वारा अप्रूवल मिलते ही यह सार्वजनिक इवेंट्स बोर्ड पर लाइव दिखाई देगा।'
                  : 'Your event with poster has been submitted for review. Once verified by the campus admin, it will go live on the public events board.'}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-left text-xs sm:text-sm text-blue-950 space-y-1.5 shadow-sm font-medium">
              <div className="flex items-center gap-1.5 font-black text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                {activeLang === 'hi' ? 'सत्यापन प्रक्रिया:' : 'Review Timeline:'}
              </div>
              <p>
                {activeLang === 'hi'
                  ? 'सत्यापन के लिए आपके दिए गए रोल नंबर और मोबाइल नंबर पर आवश्यकता पड़ने पर संपर्क किया जा सकता है।'
                  : 'University coordinators verify poster, dates, and student credentials before publishing.'}
              </p>
            </div>

            <button
              id="event-submit-done-btn"
              onClick={handleResetAndClose}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.99] cursor-pointer"
            >
              {activeLang === 'hi' ? 'ठीक है, धन्यवाद' : 'Got it, Done'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[76vh] overflow-y-auto divide-y divide-slate-200">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                <span className="font-bold">{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Poster Upload Studio */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? '1. इवेंट पोस्टर अपलोड (Poster & Banner)' : '1. Event Poster Upload & Design'}
                </h3>
              </div>

              {/* Upload Box & Preview */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* Dropzone & Upload Button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 w-full border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      {isProcessingImage ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {activeLang === 'hi' ? '📁 पोस्टर फोटो चुनें / अपलोड करें' : '📁 Choose / Upload Poster Image'}
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium mt-0.5 block">
                        JPG, PNG, WebP (Camera / Gallery auto-compressed)
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFile}
                    />
                  </div>

                  {/* Active Poster Preview Card */}
                  {posterImage && (
                    <div className="relative w-full sm:w-36 h-36 rounded-2xl overflow-hidden border-2 border-blue-400/50 shadow-md flex-shrink-0 bg-slate-950 group">
                      <img src={posterImage} alt="Poster preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white font-bold bg-blue-600/90 px-1.5 py-0.5 rounded">
                          {activeLang === 'hi' ? 'चयनित पोस्टर' : 'Active Poster'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPosterImage('')}
                        title="Remove Poster"
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preset CSJMU Poster Gallery */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {activeLang === 'hi'
                      ? 'या इनमें से कोई तैयार पोस्टर थीम चुनें (1-Tap Select):'
                      : 'Or pick from Ready-to-use Campus Poster Templates (1-Tap Select):'}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_POSTERS.map((preset) => {
                      const isSelected = posterImage === preset.url;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setPosterImage(preset.url)}
                          className={`relative h-20 rounded-xl overflow-hidden border-2 text-left transition-all group cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-400 scale-[1.03] shadow-md'
                              : 'border-slate-300 hover:border-blue-400 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-1">
                            <span className="text-[9px] font-bold text-white leading-tight line-clamp-2">
                              {activeLang === 'hi' ? preset.hindiName : preset.name}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="url"
                    placeholder="Or paste direct image URL (https://...)"
                    value={posterImage.startsWith('data:') ? '' : posterImage}
                    onChange={(e) => setPosterImage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Event Details */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? '2. कार्यक्रम की जानकारी (Event Info)' : '2. Event Details'}
                </h3>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1.5">
                  {activeLang === 'hi' ? 'इवेंट का नाम / शीर्षक (English)' : 'Event Title (English)'} *
                </label>
                <input
                  id="event-title-input"
                  type="text"
                  required
                  placeholder="e.g. SPANDAN 2026 / Hack-CSJMU 2026 / Robotics Workshop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1.5">
                  {activeLang === 'hi' ? 'शीर्षक हिंदी में (वैकल्पिक)' : 'Hindi Title (Optional)'}
                </label>
                <input
                  id="event-hindi-title-input"
                  type="text"
                  placeholder="उदा. स्पंदन २०२६ - वार्षिक सांस्कृतिक महोत्सव"
                  value={hindiTitle}
                  onChange={(e) => setHindiTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none transition shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'इवेंट श्रेणी (Category)' : 'Event Category'} *
                  </label>
                  <select
                    id="event-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none transition shadow-2xs"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {activeLang === 'hi' ? cat.labelHi : cat.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'आयोजक विभाग/क्लब/समिति' : 'Organizer / Club / Department'} *
                  </label>
                  <input
                    id="event-organizer-input"
                    type="text"
                    required
                    placeholder="e.g. UIET Coding Club / DSW Council / Placement Cell"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1.5">
                  {activeLang === 'hi' ? 'इवेंट विवरण (Details, Highlights & Rules)' : 'Event Description'} *
                </label>
                <textarea
                  id="event-desc-input"
                  required
                  rows={3}
                  placeholder="Explain event activities, prizes, eligibility, chief guests, certificates or instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-medium focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none resize-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Section 3: Date, Time & Venue */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? '3. दिनांक, समय एवं वेन्यू (Schedule & Venue)' : '3. Schedule & Venue on Map'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'आरंभ तिथि (Start Date)' : 'Start Date'} *
                  </label>
                  <input
                    id="event-start-date-input"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'समाप्ति/एक्सपायरी तिथि (End Date)' : 'End Date (Auto-Expiry)'} *
                  </label>
                  <input
                    id="event-end-date-input"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'समय (Timing)' : 'Event Timing'}
                  </label>
                  <input
                    id="event-time-input"
                    type="text"
                    placeholder="e.g. 10:00 AM - 05:00 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'वेन्यू / स्थान का नाम (Venue)' : 'Venue / Hall Name'} *
                  </label>
                  <input
                    id="event-venue-input"
                    type="text"
                    required
                    placeholder="e.g. Main Auditorium / UIET Block 2"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Link Venue with Map Location for 1-Tap Navigation */}
              {allLocations.length > 0 && (
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi'
                      ? 'मैप पर स्थान लिंक करें (ताकि छात्र 1-क्लिक में रास्ता पा सकें):'
                      : 'Link to Map Location (Enables 1-Tap Navigation for Attendees):'}
                  </label>
                  <select
                    id="event-venue-loc-select"
                    value={venueLocationId}
                    onChange={(e) => {
                      setVenueLocationId(e.target.value);
                      if (e.target.value) {
                        const matched = allLocations.find((l) => l.id === e.target.value);
                        if (matched) {
                          const venueName = matched.title || (matched as any).name || '';
                          if (!venue || venue.trim() === '') {
                            setVenue(venueName);
                          }
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 text-xs sm:text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  >
                    <option value="">-- Choose Campus Landmark on Map --</option>
                    {allLocations.map((loc) => {
                      const locTitle = loc.title || (loc as any).name || loc.id;
                      const locHindi = loc.hindiTitle || (loc as any).hindiName;
                      return (
                        <option key={loc.id} value={loc.id}>
                          📍 {locTitle} {locHindi ? `(${locHindi})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Section 4: Contact & Registration Links */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? '4. संपर्क व रजिस्ट्रेशन लिंक (Links & Contact)' : '4. Contact & Registration Links'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'हेल्पलाइन फोन' : 'Contact Phone'}
                  </label>
                  <input
                    type="tel"
                    placeholder="+91-XXXXXXXXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-xs sm:text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'ईमेल' : 'Email'}
                  </label>
                  <input
                    type="email"
                    placeholder="event@csjmu.ac.in"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-xs sm:text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'रजिस्ट्रेशन लिंक (Google Form / Portal)' : 'Registration Link'}
                  </label>
                  <input
                    type="url"
                    placeholder="https://forms.gle/... or portal"
                    value={registrationUrl}
                    onChange={(e) => setRegistrationUrl(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-xs sm:text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Student Verification (Mandatory) */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? '5. छात्र / आयोजक सत्यापन (Coordinator Info)' : '5. Student Coordinator Verification'}
                </h3>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs sm:text-sm text-blue-950 font-semibold shadow-2xs">
                {activeLang === 'hi'
                  ? '🛡️ सुरक्षा एवं सत्यता सुनिश्चित करने के लिए सभी विवरण अनिवार्य हैं। एडमिन अनुमोदन के बाद ही यह लाइव होगा।'
                  : '🛡️ Mandatory student credentials to prevent spam. Coordinates are verified by university admins before publishing.'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'छात्र / आयोजक का नाम' : 'Your Full Name'} *
                  </label>
                  <input
                    id="student-name-input"
                    type="text"
                    required
                    placeholder="e.g. Aman Verma"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'यूनिवर्सिटी रोल नंबर / एनरोलमेंट नंबर' : 'University Roll No / Enrolment No'} *
                  </label>
                  <input
                    id="student-roll-input"
                    type="text"
                    required
                    placeholder="e.g. CSJM23BTECH042"
                    value={studentRollNo}
                    onChange={(e) => setStudentRollNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'कोर्स एवं ब्रांच / वर्ष' : 'Course & Branch / Year'} *
                  </label>
                  <input
                    id="student-course-input"
                    type="text"
                    required
                    placeholder="e.g. B.Tech CSE 3rd Year / MCA"
                    value={studentCourseBranch}
                    onChange={(e) => setStudentCourseBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1.5">
                    {activeLang === 'hi' ? 'मोबाइल नंबर (सत्यापन हेतु)' : 'Mobile Number (For Verification)'} *
                  </label>
                  <input
                    id="student-mobile-input"
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={studentMobile}
                    onChange={(e) => setStudentMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Footer Submit Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-5 py-2.5 text-sm font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
              >
                {activeLang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                id="btn-submit-event-final"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{activeLang === 'hi' ? 'इवेंट सबमिट करें' : 'Submit Event for Review'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
