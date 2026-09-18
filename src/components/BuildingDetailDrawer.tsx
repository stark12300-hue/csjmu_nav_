import React, { useState } from 'react';
import {
  X,
  Navigation,
  Building,
  GraduationCap,
  Users,
  CheckCircle2,
  PlusCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Crosshair,
  Check,
  Edit3
} from 'lucide-react';
import { CampusLocation, FacultyMember, Language, TeacherAccount } from '../types';
import { TRANSLATIONS } from '../translations';

interface BuildingDetailDrawerProps {
  location: CampusLocation | null;
  onClose: () => void;
  onStartNavigation: (location: CampusLocation) => void;
  onAddFacultyToBuilding: (location: CampusLocation) => void;
  onSelectFaculty: (faculty: FacultyMember) => void;
  onDeleteLocation?: (id: string) => void;
  onUpdateCoordinates?: (id: string, coords: [number, number]) => void;
  isAdminUnlocked?: boolean;
  loggedInTeacher?: TeacherAccount | null;
  language: Language;
}

export const BuildingDetailDrawer: React.FC<BuildingDetailDrawerProps> = ({
  location,
  onClose,
  onStartNavigation,
  onAddFacultyToBuilding,
  onSelectFaculty,
  onDeleteLocation,
  onUpdateCoordinates,
  isAdminUnlocked = false,
  loggedInTeacher = null,
  language,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingCoords, setIsEditingCoords] = useState(false);
  const [tempLat, setTempLat] = useState(location ? location.coordinates[0].toString() : '');
  const [tempLng, setTempLng] = useState(location ? location.coordinates[1].toString() : '');
  const t = TRANSLATIONS[language];

  const isTeacherOwner = Boolean(
    loggedInTeacher &&
    location &&
    (location.teacherId === loggedInTeacher.id ||
     (location.isCustom && location.addedBy && location.addedBy.includes(loggedInTeacher.name)))
  );

  // Update tempLat/tempLng when location changes
  React.useEffect(() => {
    if (location) {
      setTempLat(location.coordinates[0].toString());
      setTempLng(location.coordinates[1].toString());
      setIsEditingCoords(false);
      setShowDeleteConfirm(false);
    }
  }, [location?.id]);

  if (!location) return null;

  const handleSaveCoords = () => {
    const lat = parseFloat(tempLat);
    const lng = parseFloat(tempLng);
    if (!isNaN(lat) && !isNaN(lng) && onUpdateCoordinates) {
      onUpdateCoordinates(location.id, [lat, lng]);
      setIsEditingCoords(false);
    }
  };

  const handleDelete = () => {
    if (onDeleteLocation) {
      onDeleteLocation(location.id);
      onClose();
    }
  };

  return (
    <div
      id="building-detail-drawer"
      className={`fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4 z-40 sm:max-w-md w-full bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 text-slate-900 ${
        isCollapsed ? 'max-h-24' : 'max-h-[75vh] sm:max-h-[80vh]'
      } animate-slide-up`}
      style={{
        paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0px, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Mobile Swipe / Pull Handle */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full py-2.5 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition"
      >
        <div className="w-10 h-1.5 rounded-full bg-slate-300" />
      </div>

      {/* Photo Header or Banner (hidden when minimized) */}
      {!isCollapsed && (
        <div className="relative h-28 sm:h-36 bg-zinc-100 shrink-0 overflow-hidden">
          {location.image ? (
            <img
              src={location.image}
              alt={location.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
              <Building className="w-10 h-10 text-zinc-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

          {/* Close Button */}
          <button
            id="btn-close-building-drawer"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 flex items-center justify-center text-white transition shadow-sm backdrop-blur-xl ios-press"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Category & Floor Tags on Banner */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="px-3 py-0.5 bg-black/50 backdrop-blur-md text-white border border-white/20 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
              {location.category}
            </span>
            {location.floor && (
              <span className="px-2.5 py-0.5 bg-white/90 backdrop-blur-md text-zinc-900 border border-white/80 rounded-full text-[9px] font-bold shadow-sm">
                {location.floor}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Title & Description */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black text-zinc-950 leading-tight truncate">
              {language === 'hi' ? location.hindiTitle : location.title}
            </h2>
            {!isCollapsed && (
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed font-medium">
                {language === 'hi'
                  ? location.hindiDescription || location.description
                  : location.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-black/5 rounded-full transition ios-press"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isCollapsed && (
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-black/5 rounded-full transition ios-press"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* Block / Room Info Card */}
            {(location.block || location.roomNumber) && (
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 grid grid-cols-2 gap-2 text-xs shadow-2xs">
                {location.block && (
                  <div>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase block">Block</span>
                    <span className="font-bold text-zinc-950 text-xs">{location.block}</span>
                  </div>
                )}
                {location.roomNumber && (
                  <div>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase block">Room No.</span>
                    <span className="font-black text-zinc-950 text-xs">{location.roomNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* Facilities Chips */}
            {location.facilities && location.facilities.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t.facilities}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {location.facilities.map((fac, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-zinc-900 text-[10px] rounded-full flex items-center gap-1 font-semibold shadow-2xs"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{fac}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Courses Offered */}
            {location.coursesOffered && location.coursesOffered.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-zinc-800" />
                  <span>{t.coursesOffered}</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {location.coursesOffered.map((course, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-950 text-[11px] font-bold rounded-full shadow-2xs"
                    >
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Faculty in this Building */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-zinc-800" />
                  <span>{t.facultyInBuilding}</span>
                </h4>
                <button
                  onClick={() => onAddFacultyToBuilding(location)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 ios-press cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>{language === 'hi' ? '+ नया' : '+ Add'}</span>
                </button>
              </div>

              {location.facultyList && location.facultyList.length > 0 ? (
                <div className="space-y-1.5">
                  {location.facultyList.map((fac) => (
                    <div
                      key={fac.id}
                      onClick={() => onSelectFaculty(fac)}
                      className="p-2.5 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 rounded-2xl cursor-pointer transition flex items-center justify-between group shadow-2xs ios-press"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 truncate">
                          {fac.name}
                        </p>
                        <p className="text-[11px] text-zinc-700 truncate font-semibold">
                          {fac.designation} • <span className="text-zinc-950 font-bold">{fac.cabinRoom}</span> ({fac.floor})
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-600 text-center font-medium">
                  <span>{t.noFacultyFound}</span>
                </div>
              )}
            </div>

            {/* Location Coordinate & Relocate Controls — Admin Only */}
            {isAdminUnlocked && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-zinc-800" />
                    <span className="text-[11px] font-bold text-zinc-900">
                      {language === 'hi' ? 'GPS निर्देशांक व स्थान बदलें' : 'GPS Coordinates & Relocate'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-200/80 text-zinc-800 rounded-full text-[10px] font-mono font-bold">
                    {location.coordinates[0].toFixed(5)}, {location.coordinates[1].toFixed(5)}
                  </span>
                </div>

                {!isEditingCoords ? (
                  <button
                    type="button"
                    id="btn-drawer-edit-coords"
                    onClick={() => setIsEditingCoords(true)}
                    className="w-full py-2 px-3 bg-white hover:bg-zinc-50 text-zinc-900 border border-black/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition ios-press"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-700" />
                    <span>{language === 'hi' ? '🎯 Lat/Lng टाइप करें' : '🎯 Edit Coords'}</span>
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-600 block mb-0.5">Latitude</label>
                        <input
                          type="text"
                          value={tempLat}
                          onChange={(e) => setTempLat(e.target.value)}
                          placeholder="26.4984"
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-600 block mb-0.5">Longitude</label>
                        <input
                          type="text"
                          value={tempLng}
                          onChange={(e) => setTempLng(e.target.value)}
                          placeholder="80.2662"
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingCoords(false)}
                        className="px-3 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold ios-press"
                      >
                        {language === 'hi' ? 'रद्द' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCoords}
                        className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm ios-press"
                      >
                        <Check className="w-3 h-3" />
                        <span>{language === 'hi' ? 'सेव करें' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete Location Option — Admin or Owner Teacher */}
            {(isAdminUnlocked || isTeacherOwner) && (
              <div className="pt-2 border-t border-black/5">
                {!showDeleteConfirm ? (
                  <button
                    id="btn-drawer-prompt-delete"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/20 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ios-press"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {isTeacherOwner && !isAdminUnlocked
                        ? (language === 'hi' ? 'आपके द्वारा जोड़ा गया स्थान हटाएं (Delete)' : 'Delete Your Added Location')
                        : (language === 'hi' ? 'गलत लोकेशन है? यह स्थान हटाएं (Delete)' : 'Incorrect Location? Delete Marker')}
                    </span>
                  </button>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-rose-900 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        {isTeacherOwner && !isAdminUnlocked
                          ? (language === 'hi'
                              ? 'क्या आप वाकई अपने द्वारा जोड़े गए इस स्थान को हटाना चाहते हैं? यह मैप से हमेशा के लिए हट जाएगा।'
                              : 'Are you sure you want to remove this location you added? It will be permanently removed from the map.')
                          : (language === 'hi'
                              ? 'क्या आप वाकई इस स्थान को हटाना चाहते हैं? यह साइट पर हमेशा के लिए अपडेट हो जाएगा।'
                              : 'Are you sure you want to remove this marker? This update will be saved to the site.')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        id="btn-drawer-confirm-delete"
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition ios-press"
                      >
                        {language === 'hi' ? 'हाँ, हटाएं (Delete)' : 'Yes, Delete Marker'}
                      </button>
                      <button
                        id="btn-drawer-cancel-delete"
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-semibold text-xs transition ios-press"
                      >
                        {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono text-slate-600">{location.coordinates[0].toFixed(5)}° N, {location.coordinates[1].toFixed(5)}° E</span>
          </span>
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/search/?api=1&query=${location.coordinates[0]},${location.coordinates[1]}`;
              window.open(url, '_blank');
            }}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 ios-press"
          >
            <span>{language === 'hi' ? 'Google Maps' : 'Google Maps'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-drawer-start-nav"
            onClick={() => onStartNavigation(location)}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition active:scale-95 border border-blue-600 cursor-pointer"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>{t.navigateHere}</span>
          </button>
          <button
            id="btn-drawer-add-custom"
            onClick={() => onAddFacultyToBuilding(location)}
            className="p-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full transition shadow-xs ios-press cursor-pointer"
            title="Mark a new teacher or room here"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
