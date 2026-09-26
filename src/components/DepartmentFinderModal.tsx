import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Building,
  Layers,
  UserCheck,
  DoorOpen,
  BookOpen,
  Navigation,
  X,
  ChevronRight,
  ChevronLeft,
  Edit,
  PlusCircle,
  Plus,
} from 'lucide-react';
import { CSJMU_COURSES } from '../data/csjmuCampusData';
import { CourseDepartmentMapping, CampusLocation, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { getStoredCourses } from '../utils/storage';

interface DepartmentFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: CampusLocation[];
  onNavigateToDepartment: (deptLocation: CampusLocation) => void;
  onOpenAdminManager?: () => void;
  language: Language;
  courses?: CourseDepartmentMapping[];
}

export const DepartmentFinderModal: React.FC<DepartmentFinderModalProps> = ({
  isOpen,
  onClose,
  locations,
  onNavigateToDepartment,
  onOpenAdminManager,
  language,
  courses,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDegree, setSelectedDegree] = useState<string>('all');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const allCourses = courses && courses.length > 0 ? courses : getStoredCourses();
  const [selectedCourse, setSelectedCourse] = useState<CourseDepartmentMapping | null>(
    allCourses[0] || CSJMU_COURSES[0]
  );
  const t = TRANSLATIONS[language];

  // Reset to course list whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setMobileView('list');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const searchMatches = (course: CourseDepartmentMapping) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      course.courseName.toLowerCase().includes(query) ||
      (course.hindiName && course.hindiName.toLowerCase().includes(query)) ||
      course.departmentName.toLowerCase().includes(query) ||
      course.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  };

  const matchingCourses = allCourses.filter(searchMatches);
  const countAll = matchingCourses.length;
  const countUG = matchingCourses.filter(
    (c) => c.degreeType.toLowerCase() === 'undergraduate'
  ).length;
  const countPG = matchingCourses.filter(
    (c) => c.degreeType.toLowerCase() === 'postgraduate'
  ).length;

  const filteredCourses = matchingCourses.filter((course) => {
    const matchesDegree =
      selectedDegree === 'all' || course.degreeType.toLowerCase() === selectedDegree.toLowerCase();
    return matchesDegree;
  });

  const handleStartNavigation = (course: CourseDepartmentMapping) => {
    const deptLocation = locations.find((l) => l.id === course.departmentLocationId);
    if (deptLocation) {
      onNavigateToDepartment(deptLocation);
      onClose();
    }
  };

  return (
    <div
      id="dept-finder-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in bg-slate-950/45 backdrop-blur-md"
    >
      <div
        id="dept-finder-modal-card"
        className="ios-liquid-modal rounded-2xl sm:rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] text-zinc-900 min-w-0 border border-white/95"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 ios-liquid-header flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 ring-2 ring-white/80 shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-black text-zinc-900 tracking-tight truncate">
                  {t.findMyDept}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                  {filteredCourses.length} {language === 'hi' ? 'कोर्स उपलब्ध' : 'Available'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-600 font-medium truncate">
                {language === 'hi'
                  ? 'अपना कोर्स चुनकर सटीक ब्लॉक, मंजिल व HOD केबिन देखें'
                  : 'Find exact UIET block, floor, HOD room & route for every course'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenAdminManager && (
              <button
                type="button"
                id="btn-edit-dept-admin-open"
                onClick={() => {
                  onClose();
                  onOpenAdminManager();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 border border-white/30 active:scale-95 cursor-pointer"
                title={language === 'hi' ? 'विभाग की गलत जानकारी सुधारें या नया जोड़ें' : 'Update department info or add course'}
              >
                <Edit className="w-3.5 h-3.5 text-white" />
                <span>{language === 'hi' ? '✏️ जानकारी सुधारें' : 'Edit / Update Info'}</span>
              </button>
            )}
            <button
              id="btn-close-dept-modal"
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-white/60 rounded-full transition shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar (hidden on mobile when viewing department details) */}
        <div
          className={`p-2.5 sm:p-3 bg-white/40 backdrop-blur-md border-b border-white/60 flex-col sm:flex-row gap-2 items-center justify-between shrink-0 ${
            mobileView === 'detail' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="relative w-full sm:flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="course-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchCourse}
              className="w-full bg-white border border-zinc-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            />
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-0.5 no-scrollbar text-xs">
            {/* All Filter with Dynamic Count Badge */}
            <button
              onClick={() => setSelectedDegree('all')}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition flex items-center gap-1.5 border cursor-pointer ${
                selectedDegree === 'all'
                  ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 shadow-2xs font-bold'
              }`}
            >
              <span>{t.filterDegree}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold transition ${
                  selectedDegree === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {countAll}
              </span>
            </button>

            {/* UG Filter with Dynamic Count Badge */}
            <button
              onClick={() => setSelectedDegree('undergraduate')}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition flex items-center gap-1.5 border cursor-pointer ${
                selectedDegree === 'undergraduate'
                  ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 shadow-2xs font-bold'
              }`}
            >
              <span>UG (स्नातक)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold transition ${
                  selectedDegree === 'undergraduate'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {countUG}
              </span>
            </button>

            {/* PG Filter with Dynamic Count Badge */}
            <button
              onClick={() => setSelectedDegree('postgraduate')}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition flex items-center gap-1.5 border cursor-pointer ${
                selectedDegree === 'postgraduate'
                  ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 shadow-2xs font-bold'
              }`}
            >
              <span>PG (परास्नातक)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold transition ${
                  selectedDegree === 'postgraduate'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {countPG}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body: Single View on Mobile (List OR Detail), 2-Column Side-by-Side on Desktop */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-zinc-200 min-w-0">
          {/* Left Column: Courses List */}
          <div
            className={`md:col-span-5 overflow-y-auto p-2.5 space-y-2 min-w-0 bg-white ${
              mobileView === 'detail' ? 'hidden md:block' : 'block'
            } max-h-[70vh] sm:max-h-[75vh] md:max-h-[520px]`}
          >
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => {
                const isSelected = selectedCourse?.courseId === course.courseId;
                return (
                  <button
                    key={course.courseId}
                    id={`course-item-${course.courseId}`}
                    onClick={() => {
                      setSelectedCourse(course);
                      setMobileView('detail');
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between gap-2 group min-w-0 active:scale-[0.99] cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white hover:bg-blue-50/50 border-zinc-200 hover:border-blue-300 text-zinc-800 shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${isSelected ? 'text-white font-black' : 'text-zinc-900 font-bold'}`}>
                        {language === 'hi' ? course.hindiName || course.courseName : course.courseName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-medium truncate ${isSelected ? 'text-blue-100' : 'text-zinc-600'}`}>
                          {course.block}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-white/20 text-white border border-white/20' : 'bg-zinc-200/80 text-zinc-700'
                          }`}
                        >
                          {course.floor}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition ${
                        isSelected ? 'text-white font-bold translate-x-0.5' : 'text-zinc-400'
                      }`}
                    />
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-zinc-400">
                {t.searchEmpty} "{searchQuery}"
              </div>
            )}
          </div>

          {/* Right Column: Detailed Department Specs */}
          <div
            className={`md:col-span-7 p-3.5 sm:p-5 overflow-y-auto bg-zinc-50/50 min-w-0 ${
              mobileView === 'list' ? 'hidden md:block' : 'block'
            } max-h-[70vh] sm:max-h-[75vh] md:max-h-[520px]`}
          >
            {/* Mobile-only Back Button to return to Course List */}
            <div className="md:hidden flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-200">
              <button
                type="button"
                id="btn-back-to-dept-list"
                onClick={() => setMobileView('list')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 font-bold text-xs rounded-xl border border-zinc-200 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-blue-600" />
                <span>{language === 'hi' ? '← सभी कोर्स देखें' : '← Back to Courses'}</span>
              </button>
              <span className="text-[11px] font-bold text-zinc-500">
                {language === 'hi' ? 'विभाग विवरण' : 'Department Details'}
              </span>
            </div>

            {selectedCourse ? (
              <div className="space-y-3.5 min-w-0">
                {/* Header of selected course */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      {selectedCourse.degreeType}
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-zinc-950 mt-1.5 truncate">
                      {language === 'hi' ? selectedCourse.hindiName || selectedCourse.courseName : selectedCourse.courseName}
                    </h3>
                    <p className="text-[11px] font-semibold text-zinc-500 truncate">
                      {selectedCourse.departmentName}
                    </p>
                  </div>

                  {/* Direct Update button for Task 3 */}
                  {onOpenAdminManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdminManager();
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shrink-0 shadow-2xs cursor-pointer"
                      title={language === 'hi' ? 'इस विभाग की जानकारी बदलें' : 'Update this department info'}
                    >
                      <Edit className="w-3 h-3 text-blue-600" />
                      <span>{language === 'hi' ? 'सुधारें' : 'Update'}</span>
                    </button>
                  )}
                </div>

                {/* Location Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold">
                      <Building className="w-3.5 h-3.5 text-zinc-700" />
                      <span>{language === 'hi' ? 'भवन व ब्लॉक' : 'Building & Block'}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-1 truncate">
                      {selectedCourse.block}
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold">
                      <Layers className="w-3.5 h-3.5 text-zinc-700" />
                      <span>{language === 'hi' ? 'मंजिल (Floor)' : 'Floor & Rooms'}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-1 truncate">
                      {selectedCourse.floor}
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold">
                      <UserCheck className="w-3.5 h-3.5 text-zinc-700" />
                      <span>{t.hodName}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-1 truncate">
                      {selectedCourse.hodName}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {selectedCourse.hodCabin}
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'hi' ? 'नेविगेशन मोड' : 'Navigation Mode'}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-1 truncate flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                      </span>
                      <span>{language === 'hi' ? 'लाइव GPS लोकेशन' : 'Live GPS Route'}</span>
                    </p>
                  </div>
                </div>

                {/* Key Classrooms & Labs */}
                <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
                  <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1 mb-2">
                    <BookOpen className="w-3 h-3 text-zinc-700" />
                    <span>{t.keyClassrooms}</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCourse.keyRooms.map((room, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs min-w-0 shadow-2xs"
                      >
                        <span className="font-semibold text-zinc-900 block truncate">
                          {room.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono truncate block">
                          {room.room} ({room.floor})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Start Navigation Action Button */}
                <div className="pt-1">
                  <button
                    id="btn-navigate-to-selected-dept"
                    onClick={() => handleStartNavigation(selectedCourse)}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-white" />
                    <span>
                      {language === 'hi'
                        ? `मैप पर ${selectedCourse.block} का रास्ता देखें`
                        : `Navigate Route to ${selectedCourse.block} on Map`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                {t.selectCoursePrompt}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
