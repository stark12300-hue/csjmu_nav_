import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  MapPin,
  Clock,
  Mail,
  Navigation,
  X,
  Building2,
  Plus,
} from 'lucide-react';
import { FacultyMember, CampusLocation, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface FacultyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyList: FacultyMember[];
  locations: CampusLocation[];
  onNavigateToFaculty: (faculty: FacultyMember, buildingLocation: CampusLocation) => void;
  onOpenAdminManager?: () => void;
  onDeleteFaculty?: (facultyId: string) => void;
  isAdminUnlocked?: boolean;
  language: Language;
}

export const FacultyDirectoryModal: React.FC<FacultyDirectoryModalProps> = ({
  isOpen,
  onClose,
  facultyList,
  locations,
  onNavigateToFaculty,
  onOpenAdminManager,
  isAdminUnlocked = false,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const t = TRANSLATIONS[language];

  const departments = useMemo(() => {
    return ['all', ...Array.from(new Set(facultyList.map((f) => f.department)))];
  }, [facultyList]);

  // Pre-calculate faculty counts per department for quick reference badges
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { all: facultyList.length };
    facultyList.forEach((f) => {
      counts[f.department] = (counts[f.department] || 0) + 1;
    });
    return counts;
  }, [facultyList]);

  if (!isOpen) return null;

  const filteredFaculty = facultyList.filter((faculty) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      faculty.name.toLowerCase().includes(query) ||
      (faculty.hindiName && faculty.hindiName.toLowerCase().includes(query)) ||
      faculty.department.toLowerCase().includes(query) ||
      faculty.cabinRoom.toLowerCase().includes(query) ||
      faculty.buildingName.toLowerCase().includes(query) ||
      faculty.subjects?.some((s) => s.toLowerCase().includes(query));
    const matchesDept = selectedDept === 'all' || faculty.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleNavigate = (faculty: FacultyMember) => {
    const buildingLoc = locations.find((l) => l.id === faculty.buildingId || l.id === faculty.departmentId);
    if (buildingLoc) {
      onNavigateToFaculty(faculty, buildingLoc);
      onClose();
    }
  };

  return (
    <div
      id="faculty-directory-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        id="faculty-directory-modal-card"
        className="ios-liquid-modal rounded-2xl sm:rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] text-zinc-900 min-w-0 border border-white/95"
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/60 flex items-center justify-between ios-liquid-header shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-zinc-900 truncate">
                {t.facultyLocator}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-600 truncate font-medium">
                {language === 'hi'
                  ? 'प्रोफेसर्स व HOD केबिन नंबर, मंजिल व मिलने का समय'
                  : 'Find where professors & HODs sit with exact cabin number & floor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdminUnlocked && onOpenAdminManager && (
              <button
                id="btn-add-teacher-from-modal"
                onClick={() => {
                  onClose();
                  onOpenAdminManager();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
                title={language === 'hi' ? 'नया शिक्षक जोड़ें / हटाएं' : 'Add or Delete Teacher'}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? '+ शिक्षक जोड़ें / हटाएं' : '+ Manage Faculty'}</span>
              </button>
            )}
            <button
              id="btn-close-faculty-modal"
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-white/60 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 sm:p-3.5 bg-white/40 backdrop-blur-md border-b border-white/60 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="faculty-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchFacultyPlaceholder}
              className="w-full bg-white border border-zinc-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-900 font-semibold placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            />
          </div>

          {/* Department Filter Chips (Crisp, High Contrast, Accessible) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain py-1 text-xs">
            <span className="text-[11px] font-black text-zinc-700 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>{language === 'hi' ? 'विभाग:' : 'Dept:'}</span>
            </span>
            {departments.map((dept) => {
              const isSelected = selectedDept === dept;
              const count = deptCounts[dept] || 0;
              const displayName = dept === 'all' ? t.allDepartments : dept;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-white text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 border-zinc-200'
                  }`}
                >
                  <span>{displayName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Faculty Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-zinc-50/50 min-w-0">
          {filteredFaculty.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
              {filteredFaculty.map((faculty) => (
                <div
                  key={faculty.id}
                  id={`faculty-card-${faculty.id}`}
                  className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-2xs hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between group min-w-0"
                >
                  <div className="min-w-0">
                    {/* Top Row: Name + Designation */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 group-hover:text-zinc-700 transition truncate">
                            {language === 'hi' ? faculty.hindiName || faculty.name : faculty.name}
                          </h3>
                          {faculty.isCustom && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[8px] font-bold">
                              Added
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 font-bold mt-0.5 truncate">
                          {faculty.designation}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Department & Building */}
                    <div className="mt-2 text-xs text-zinc-700 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-zinc-600 font-semibold">
                        <Building2 className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{faculty.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-900 font-bold">
                        <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
                        <span className="truncate">{faculty.buildingName}</span>
                      </div>
                    </div>

                    {/* Cabin & Floor Highlight Box */}
                    <div className="mt-2.5 p-2 bg-zinc-50 rounded-xl border border-zinc-200 grid grid-cols-2 gap-2 text-xs shadow-2xs">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">
                          {t.cabin}
                        </span>
                        <span className="font-extrabold text-zinc-900 text-xs truncate block">
                          {faculty.cabinRoom}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">
                          {t.floor}
                        </span>
                        <span className="font-extrabold text-zinc-900 text-xs truncate block">
                          {faculty.floor}
                        </span>
                      </div>
                    </div>

                    {/* Office Hours & Email if available */}
                    {(faculty.officeHours || faculty.email) && (
                      <div className="mt-2 space-y-0.5 text-[10px] text-zinc-600 font-medium">
                        {faculty.officeHours && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{faculty.officeHours}</span>
                          </div>
                        )}
                        {faculty.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{faculty.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Navigate */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-200 flex items-center">
                    <button
                      id={`btn-nav-to-faculty-${faculty.id}`}
                      onClick={() => handleNavigate(faculty)}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 text-white" />
                      <span>
                        {language === 'hi'
                          ? `केबिन तक रास्ता (${faculty.cabinRoom})`
                          : `Route to Cabin (${faculty.cabinRoom})`}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500">
              <Users className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
              <p className="text-xs font-semibold">
                {t.noFacultyMatch} "{searchQuery}"
              </p>
              {isAdminUnlocked && onOpenAdminManager && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminManager();
                  }}
                  className="mt-2.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition shadow-sm inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'नया शिक्षक जोड़ें' : 'Add New Faculty'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
