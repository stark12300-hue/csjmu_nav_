import React, { useState } from 'react';
import {
  MapPin,
  PlusCircle,
  Users,
  Building,
  Sparkles,
  X,
  Crosshair,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import {
  CampusLocation,
  FacultyMember,
  Language,
  LocationCategory,
  TeacherAccount,
} from '../types';
import { TRANSLATIONS } from '../translations';
import { CSJMU_CENTER } from '../data/csjmuCampusData';
import {
  canTeacherAddLocations,
  canTeacherAddFaculty,
  getTeacherAccessPolicy,
} from '../utils/storage';
import { Lock, Shield } from 'lucide-react';

interface AddMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickedCoordinates: [number, number] | null;
  onStartPicking: () => void;
  onSaveCustomLocation: (location: CampusLocation, faculty?: FacultyMember) => void;
  locations: CampusLocation[];
  language: Language;
  isAdminUnlocked?: boolean;
  loggedInTeacher?: TeacherAccount | null;
}

export const AddMarkerModal: React.FC<AddMarkerModalProps> = ({
  isOpen,
  onClose,
  pickedCoordinates,
  onStartPicking,
  onSaveCustomLocation,
  locations,
  language,
  isAdminUnlocked = false,
  loggedInTeacher = null,
}) => {
  const t = TRANSLATIONS[language];
  const [title, setTitle] = useState('');
  const [hindiTitle, setHindiTitle] = useState('');
  const [category, setCategory] = useState<LocationCategory>('faculty');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('loc-uiet-2');
  const [floor, setFloor] = useState('2nd Floor');
  const [cabinRoom, setCabinRoom] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [officeHours, setOfficeHours] = useState('Mon - Fri: 2:00 PM - 4:00 PM');
  const [email, setEmail] = useState('');
  const [subjects, setSubjects] = useState('');
  const [notes, setNotes] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [customLat, setCustomLat] = useState(
    pickedCoordinates ? pickedCoordinates[0].toFixed(6) : '26.498400'
  );
  const [customLng, setCustomLng] = useState(
    pickedCoordinates ? pickedCoordinates[1].toFixed(6) : '80.266200'
  );

  // Sync coords when pickedCoordinates changes
  React.useEffect(() => {
    if (pickedCoordinates) {
      setCustomLat(pickedCoordinates[0].toFixed(6));
      setCustomLng(pickedCoordinates[1].toFixed(6));
    }
  }, [pickedCoordinates]);

  if (!isOpen) return null;

  const globalPolicy = getTeacherAccessPolicy();
  const isLocationAllowed =
    isAdminUnlocked ||
    (loggedInTeacher ? canTeacherAddLocations(loggedInTeacher) : globalPolicy.allowAddLocations);
  const isFacultyAllowed =
    isAdminUnlocked ||
    (loggedInTeacher ? canTeacherAddFaculty(loggedInTeacher) : globalPolicy.allowAddFaculty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isLocationAllowed) return;

    const building = locations.find((l) => l.id === selectedBuildingId);
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    const coords: [number, number] =
      !isNaN(lat) && !isNaN(lng)
        ? [lat, lng]
        : (pickedCoordinates || building?.coordinates || CSJMU_CENTER);

    const newLocationId = `custom-loc-${Date.now()}`;

    const newLocation: CampusLocation = {
      id: newLocationId,
      title: title.trim(),
      hindiTitle: hindiTitle.trim() || title.trim(),
      category: category,
      coordinates: coords,
      block: building?.block || building?.title || 'Campus Wing',
      floor: floor,
      roomNumber: cabinRoom,
      description: notes || `${title} located at ${building?.title || 'CSJMU Campus'}.`,
      hindiDescription: notes || `${title} - ${building?.hindiTitle || 'सीएसजेएमयू कैंपस'}.`,
      isCustom: true,
      addedBy: addedBy.trim() || 'CSJMU Student',
      createdAt: Date.now(),
      facilities: ['Student Added Marker'],
    };

    let facultyObj: FacultyMember | undefined = undefined;
    if (category === 'faculty' || teacherName.trim()) {
      facultyObj = {
        id: `fac-custom-${Date.now()}`,
        name: teacherName.trim() || title.trim(),
        designation: designation.trim() || 'Faculty Member',
        department: building?.title || 'Department',
        departmentId: building?.id || newLocationId,
        cabinRoom: cabinRoom.trim() || 'Faculty Cabin',
        floor: floor,
        buildingName: building?.title || 'Campus Block',
        buildingId: building?.id || newLocationId,
        officeHours: officeHours.trim(),
        email: email.trim(),
        subjects: subjects ? subjects.split(',').map((s) => s.trim()) : [],
        notes: notes.trim(),
        isCustom: true,
        addedBy: addedBy.trim() || 'CSJMU Student',
      };
    }

    onSaveCustomLocation(newLocation, facultyObj);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div
      id="add-marker-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        id="add-marker-modal-card"
        className="ios-liquid-modal border border-white/95 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-zinc-900"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/60 flex items-center justify-between ios-liquid-header">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs font-bold">
              <PlusCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900">
                {t.markNewPlace}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {language === 'hi'
                  ? 'नया विभाग, क्लासरूम, लैब या शिक्षक केबिन मैप पर जोड़ें'
                  : 'Pin a new department, classroom, lab, or teacher cabin on campus'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-add-marker-modal"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Message */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-2.5">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-zinc-900">{t.locationAddedSuccess}</h3>
            <p className="text-xs text-zinc-500">
              {language === 'hi'
                ? 'यह मार्कर अब लाइव मैप व सर्च में दिखेगा।'
                : 'This marker is now visible on the live campus map and search directory.'}
            </p>
          </div>
        ) : !isLocationAllowed ? (
          <div className="p-8 text-center space-y-4 max-w-md mx-auto my-auto">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {language === 'hi'
                  ? 'स्थान व मार्कर जोड़ना प्रतिबंधित है'
                  : 'Adding Locations is Restricted'}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {language === 'hi'
                  ? 'कैंपस एडमिनिस्ट्रेटर ने शिक्षकों के लिए नए स्थान या मैप मार्कर जोड़ने का अधिकार बंद कर रखा है।'
                  : 'The campus administrator has currently restricted location and marker creation for faculty accounts.'}
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-zinc-900 mb-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Policy Control:</span>
              </p>
              <p className="text-[11px]">
                • Admin Global Master Switch:{' '}
                <span className={globalPolicy.allowAddLocations ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {globalPolicy.allowAddLocations ? 'Allowed' : 'Disabled by Admin'}
                </span>
              </p>
              {loggedInTeacher && (
                <p className="text-[11px]">
                  • Teacher Account Permission:{' '}
                  <span className={canTeacherAddLocations(loggedInTeacher) ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {canTeacherAddLocations(loggedInTeacher) ? 'Granted' : 'Not Granted'}
                  </span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition"
            >
              {language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {/* Coordinate Selection Banner & Controls */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-zinc-900 font-bold block">
                      {language === 'hi' ? '🎯 GPS निर्देशांक (Coordinates)' : '🎯 Exact GPS Coordinates'}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {language === 'hi'
                        ? 'मैप पर क्लिक करके चुनें या नीचे Lat/Lng टाइप करें'
                        : 'Click on map to place pin or type Lat/Lng below'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-pick-coords-on-map"
                  onClick={() => {
                    onStartPicking();
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 shrink-0"
                >
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'hi' ? 'मैप पर चुनें' : 'Pick on Map'}</span>
                </button>
              </div>

              {/* Exact Lat/Lng Fields */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-bold text-zinc-700">Latitude (अक्षांश)</label>
                    <span className="text-[9px] text-zinc-400 font-mono">° N</span>
                  </div>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="26.498400"
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-bold text-zinc-700">Longitude (देशांतर)</label>
                    <span className="text-[9px] text-zinc-400 font-mono">° E</span>
                  </div>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="80.266200"
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Helper button to reset to current building's coords */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                <span>
                  {pickedCoordinates ? (
                    <span className="text-emerald-700 font-semibold">✓ Map pin picked</span>
                  ) : (
                    <span>Using building default coordinates</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const b = locations.find((l) => l.id === selectedBuildingId);
                    if (b) {
                      setCustomLat(b.coordinates[0].toFixed(6));
                      setCustomLng(b.coordinates[1].toFixed(6));
                    }
                  }}
                  className="text-zinc-700 hover:text-zinc-900 font-semibold underline"
                >
                  {language === 'hi' ? 'भवन के अनुसार रीसेट करें' : 'Reset to Building Coords'}
                </button>
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                {t.categoryLabel} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCategory('faculty')}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                    category === 'faculty'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'शिक्षक केबिन' : 'Teacher Cabin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('department')}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                    category === 'department'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'विभाग' : 'Department'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('lab')}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                    category === 'lab'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'लैब / क्लास' : 'Lab / Class'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('canteen')}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                    category === 'canteen'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'सुविधा' : 'Food/Amenity'}</span>
                </button>
              </div>
            </div>

            {/* Title Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                  {t.titleLabel} *
                </label>
                <input
                  id="input-marker-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    category === 'faculty'
                      ? 'e.g. Dr. Verma Cabin / IoT Lab'
                      : 'e.g. MCA Class 204 / Nescafe 2'
                  }
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                  {language === 'hi' ? 'नाम (हिंदी - वैकल्पिक)' : 'Title (Hindi - Optional)'}
                </label>
                <input
                  type="text"
                  value={hindiTitle}
                  onChange={(e) => setHindiTitle(e.target.value)}
                  placeholder="उदा. डॉ. वर्मा केबिन"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>

            {/* Building & Floor Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                  {language === 'hi' ? 'कैंपस भवन' : 'Campus Building'}
                </label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <optgroup label="UIET Engineering Blocks">
                    <option value="loc-uiet-1">UIET Block 1 (Mechanical & Dean)</option>
                    <option value="loc-uiet-2">UIET Block 2 (CSE & IT Wing)</option>
                    <option value="loc-uiet-3">UIET Block 3 (ECE & Electrical)</option>
                    <option value="loc-uiet-4">UIET Block 4 (Biotech & 1st Year)</option>
                  </optgroup>
                  <optgroup label="Central Academic Buildings">
                    <option value="loc-admin">Admin Block (Chhatrapati Shahu Ji Bhavan)</option>
                    <option value="loc-library">Central Library (Swami Vivekananda)</option>
                    <option value="loc-mgmt">School of Business Management (MBA/BBA)</option>
                    <option value="loc-mca">Department of Computer Applications (MCA)</option>
                    <option value="loc-pharmacy">Institute of Pharmacy</option>
                    <option value="loc-law">School of Law (Vidhi Bhavan)</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                  {t.floorLabel} *
                </label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="Ground Floor">{t.groundFloor}</option>
                  <option value="1st Floor">{t.firstFloor}</option>
                  <option value="2nd Floor">{t.secondFloor}</option>
                  <option value="3rd Floor">{t.thirdFloor}</option>
                  <option value="4th Floor">{t.fourthFloor}</option>
                </select>
              </div>
            </div>

            {/* Cabin / Room Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                  {t.cabinNumberLabel} *
                </label>
                <input
                  id="input-cabin-room"
                  type="text"
                  required
                  value={cabinRoom}
                  onChange={(e) => setCabinRoom(e.target.value)}
                  placeholder={t.cabinNumberPlaceholder}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              {category === 'faculty' && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                    {t.teacherNameLabel}
                  </label>
                  <input
                    id="input-teacher-name"
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder={t.teacherNamePlaceholder}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              )}
            </div>

            {/* Notes / Tips for other students */}
            <div>
              <label className="text-[11px] font-bold text-zinc-700 block mb-0.5">
                {t.notesLabel}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                id="btn-submit-marker"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] border border-blue-600 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>{t.saveLocation}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
