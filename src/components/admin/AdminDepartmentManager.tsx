import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Edit,
  Building,
  Layers,
  UserCheck,
  DoorOpen,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
} from 'lucide-react';
import { CourseDepartmentMapping, CampusLocation, Language } from '../../types';

interface AdminDepartmentManagerProps {
  coursesList: CourseDepartmentMapping[];
  locations: CampusLocation[];
  onAddCourse: (course: CourseDepartmentMapping) => void;
  onUpdateCourse: (course: CourseDepartmentMapping) => void;
  onDeleteCourse: (courseId: string) => void;
  language: Language;
}

export const AdminDepartmentManager: React.FC<AdminDepartmentManagerProps> = ({
  coursesList,
  locations,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDepartmentMapping | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State for Adding / Updating Department & Course info
  const [formCourseName, setFormCourseName] = useState('');
  const [formHindiName, setFormHindiName] = useState('');
  const [formDeptName, setFormDeptName] = useState('');
  const [formDegree, setFormDegree] = useState<'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Doctorate'>('Undergraduate');
  const [formLocationId, setFormLocationId] = useState('');
  const [formBlock, setFormBlock] = useState('');
  const [formFloor, setFormFloor] = useState('Ground & 1st Floor');
  const [formHodName, setFormHodName] = useState('');
  const [formHodCabin, setFormHodCabin] = useState('');
  const [formRecommendedGate, setFormRecommendedGate] = useState('Gate 1 (Main Gate)');
  const [formGateId, setFormGateId] = useState('loc-gate-1');
  const [formKeyRoomsRaw, setFormKeyRoomsRaw] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHindiDescription, setFormHindiDescription] = useState('');
  const [formCoursesOffered, setFormCoursesOffered] = useState('');

  // Department campus locations
  const campusLocationOptions = useMemo(() => {
    return locations.filter(
      (l) => l.category === 'department' || l.category === 'admin' || l.category === 'library' || l.category === 'facility'
    );
  }, [locations]);

  // Gate locations
  const gateOptions = useMemo(() => {
    return locations.filter((l) => l.category === 'gate');
  }, [locations]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    let list = coursesList;
    if (degreeFilter !== 'all') {
      list = list.filter((c) => c.degreeType.toLowerCase() === degreeFilter.toLowerCase());
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.courseName.toLowerCase().includes(q) ||
        (c.hindiName && c.hindiName.toLowerCase().includes(q)) ||
        c.departmentName.toLowerCase().includes(q) ||
        c.block.toLowerCase().includes(q) ||
        c.hodName.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [coursesList, degreeFilter, searchQuery]);

  const resetForm = () => {
    setFormCourseName('');
    setFormHindiName('');
    setFormDeptName('');
    setFormDegree('Undergraduate');
    setFormLocationId(campusLocationOptions[0]?.id || 'loc-uiet-1');
    setFormBlock('UIET Block 1');
    setFormFloor('Ground & 1st Floor');
    setFormHodName('');
    setFormHodCabin('Cabin 101');
    setFormRecommendedGate('Gate 1 (Main Gate)');
    setFormGateId('loc-gate-1');
    setFormKeyRoomsRaw('Classroom 101 (Room 101, Ground Floor), Lab 102 (Room 102, Ground Floor)');
    setFormTags('CSJMU, Department, Engineering, Syllabus');
    setFormDescription('');
    setFormHindiDescription('');
    setFormCoursesOffered('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    if (campusLocationOptions.length > 0) {
      const firstLoc = campusLocationOptions[0];
      setFormLocationId(firstLoc.id);
      setFormBlock(firstLoc.block || firstLoc.title);
      setFormFloor(firstLoc.floor || 'Ground Floor');
    }
    setEditingCourse(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (course: CourseDepartmentMapping) => {
    setEditingCourse(course);
    setFormCourseName(course.courseName);
    setFormHindiName(course.hindiName || '');
    setFormDeptName(course.departmentName);
    setFormDegree(course.degreeType);
    setFormLocationId(course.departmentLocationId);
    setFormBlock(course.block);
    setFormFloor(course.floor);
    setFormHodName(course.hodName);
    setFormHodCabin(course.hodCabin);
    setFormRecommendedGate(course.recommendedGate);
    setFormGateId(course.recommendedGateId || 'loc-gate-1');

    // Format key rooms into string: "Name (Room, Floor), ..."
    const roomsStr = course.keyRooms.map((r) => `${r.name} (${r.room}, ${r.floor})`).join(', ');
    setFormKeyRoomsRaw(roomsStr);

    setFormTags(course.tags.join(', '));
    setFormDescription(course.description || '');
    setFormHindiDescription(course.hindiDescription || '');
    setFormCoursesOffered(course.coursesOffered ? course.coursesOffered.join(', ') : '');
    setIsFormModalOpen(true);
  };

  const handleLocationSelectChange = (locId: string) => {
    setFormLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setFormBlock(loc.block || loc.title);
      setFormFloor(loc.floor || 'Ground Floor');
    }
  };

  const parseKeyRooms = (raw: string) => {
    if (!raw.trim()) {
      return [{ name: 'Main Department Room', room: 'Room 101', floor: 'Ground Floor' }];
    }
    // Expected formats: "Classroom (Room 101, 1st Floor)" or "Lab 102"
    return raw.split(',').map((part) => {
      const match = part.match(/^(.*?)\((.*?),(.*?)\)$/);
      if (match) {
        return {
          name: match[1].trim(),
          room: match[2].trim(),
          floor: match[3].trim(),
        };
      }
      const simpleMatch = part.match(/^(.*?)\((.*?)\)$/);
      if (simpleMatch) {
        return {
          name: simpleMatch[1].trim(),
          room: simpleMatch[2].trim(),
          floor: 'Ground Floor',
        };
      }
      return {
        name: part.trim(),
        room: 'Assigned Room',
        floor: 'Ground Floor',
      };
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseName.trim() || !formDeptName.trim()) {
      alert(language === 'hi' ? 'कृपया कोर्स व विभाग का नाम दर्ज करें' : 'Please enter course & department name');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const coursesOfferedArray = formCoursesOffered
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const parsedRooms = parseKeyRooms(formKeyRoomsRaw);

    if (editingCourse) {
      // Update existing course/department
      const updated: CourseDepartmentMapping = {
        ...editingCourse,
        courseName: formCourseName.trim(),
        hindiName: formHindiName.trim() || formCourseName.trim(),
        departmentName: formDeptName.trim(),
        degreeType: formDegree,
        departmentLocationId: formLocationId,
        block: formBlock.trim() || 'Campus Wing',
        floor: formFloor.trim() || 'Ground Floor',
        hodName: formHodName.trim() || 'Department Head',
        hodCabin: formHodCabin.trim() || 'HOD Cabin',
        recommendedGate: formRecommendedGate.trim() || 'Gate 1',
        recommendedGateId: formGateId,
        keyRooms: parsedRooms,
        tags: tagsArray.length > 0 ? tagsArray : [formCourseName, formDeptName, 'CSJMU'],
        description: formDescription.trim() || undefined,
        hindiDescription: formHindiDescription.trim() || undefined,
        coursesOffered: coursesOfferedArray.length > 0 ? coursesOfferedArray : undefined,
      };
      onUpdateCourse(updated);
    } else {
      // Create new course/department
      const newCourse: CourseDepartmentMapping = {
        courseId: `course-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        courseName: formCourseName.trim(),
        hindiName: formHindiName.trim() || formCourseName.trim(),
        departmentName: formDeptName.trim(),
        degreeType: formDegree,
        departmentLocationId: formLocationId,
        block: formBlock.trim() || 'Campus Wing',
        floor: formFloor.trim() || 'Ground Floor',
        hodName: formHodName.trim() || 'Department Head',
        hodCabin: formHodCabin.trim() || 'HOD Cabin',
        recommendedGate: formRecommendedGate.trim() || 'Gate 1',
        recommendedGateId: formGateId,
        keyRooms: parsedRooms,
        tags: tagsArray.length > 0 ? tagsArray : [formCourseName, formDeptName, 'CSJMU'],
        description: formDescription.trim() || undefined,
        hindiDescription: formHindiDescription.trim() || undefined,
        coursesOffered: coursesOfferedArray.length > 0 ? coursesOfferedArray : undefined,
      };
      onAddCourse(newCourse);
    }

    setIsFormModalOpen(false);
    setEditingCourse(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    onDeleteCourse(id);
    setDeleteConfirmId(null);
  };

  return (
    <div id="admin-dept-manager" className="space-y-4 text-zinc-900 w-full min-w-0">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-zinc-900 truncate">
              {language === 'hi' ? 'विभाग व कोर्स प्रबंधन (Departments & Courses)' : 'Departments & Courses Directory'}
            </h3>
            <p className="text-xs text-zinc-600">
              {language === 'hi'
                ? `कुल ${coursesList.length} विभाग/कोर्स उपलब्ध • गलत जानकारी को कभी भी सुधारें या नया जोड़ें`
                : `${coursesList.length} registered • Edit any incorrect info (HOD, Cabin, Floor, Gate) anytime`}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-admin-add-dept-open"
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'hi' ? '+ नया विभाग/कोर्स जोड़ें' : '+ Add Department/Course'}</span>
        </button>
      </div>

      {/* Search & Degree Filters */}
      <div className="p-2.5 sm:p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="admin-dept-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'कोर्स का नाम, विभाग, HOD या ब्लॉक खोजें...'
                : 'Search course by name, department, HOD or block...'
            }
            className="w-full bg-white/80 border border-white/90 rounded-xl pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 backdrop-blur-md shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain py-1 text-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            {language === 'hi' ? 'डिग्री प्रकार:' : 'Degree:'}
          </span>
          <button
            type="button"
            onClick={() => setDegreeFilter('all')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
              degreeFilter === 'all'
                ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
            }`}
          >
            {language === 'hi' ? 'सभी डिग्री' : 'All Degrees'}
          </button>
          <button
            type="button"
            onClick={() => setDegreeFilter('undergraduate')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
              degreeFilter === 'undergraduate'
                ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
            }`}
          >
            UG (स्नातक)
          </button>
          <button
            type="button"
            onClick={() => setDegreeFilter('postgraduate')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
              degreeFilter === 'postgraduate'
                ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
            }`}
          >
            PG (परास्नातक)
          </button>
          <button
            type="button"
            onClick={() => setDegreeFilter('diploma')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
              degreeFilter === 'diploma'
                ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
            }`}
          >
            Diploma
          </button>
          <button
            type="button"
            onClick={() => setDegreeFilter('doctorate')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
              degreeFilter === 'doctorate'
                ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
            }`}
          >
            Ph.D / Doctorate
          </button>
        </div>
      </div>

      {/* Courses / Department Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div
              key={course.courseId}
              id={`admin-dept-card-${course.courseId}`}
              className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs transition flex flex-col justify-between gap-3 min-w-0 hover:border-zinc-300"
            >
              <div className="min-w-0 space-y-2.5">
                {/* Header: Degree Badge + Course Name */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      {course.degreeType}
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 mt-1 truncate">
                      {language === 'hi' ? course.hindiName || course.courseName : course.courseName}
                    </h4>
                    <p className="text-xs font-semibold text-zinc-600 truncate">{course.departmentName}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>

                {/* Grid of specs: Block, Floor, HOD, Gate */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-white/70 backdrop-blur-md p-2.5 rounded-xl border border-white/90 shadow-2xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block">
                      {language === 'hi' ? 'भवन / ब्लॉक:' : 'Building & Block:'}
                    </span>
                    <span className="font-bold text-zinc-900 truncate block">{course.block}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block">
                      {language === 'hi' ? 'मंजिल:' : 'Floor:'}
                    </span>
                    <span className="font-bold text-zinc-900 truncate block">{course.floor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block">HOD:</span>
                    <span className="font-bold text-zinc-900 truncate block">{course.hodName}</span>
                    <span className="text-[10px] text-zinc-500 block truncate">{course.hodCabin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block">
                      {language === 'hi' ? 'सुझावित गेट:' : 'Recommended Gate:'}
                    </span>
                    <span className="font-bold text-zinc-900 truncate block">{course.recommendedGate}</span>
                  </div>
                </div>

                {/* Key Rooms preview */}
                {course.keyRooms && course.keyRooms.length > 0 && (
                  <div className="text-[11px] text-zinc-600 flex items-start gap-1 pt-0.5">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      {course.keyRooms.map((r) => `${r.name} (${r.room})`).join(', ')}
                    </span>
                  </div>
                )}

                {/* Courses Offered List */}
                {course.coursesOffered && course.coursesOffered.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'उपलब्ध कोर्सेस (Courses Offered):' : 'Courses Offered:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {course.coursesOffered.map((crs, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200/80 rounded-md text-[10px] font-semibold"
                        >
                          {crs}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Department Description Preview */}
                {(course.description || course.hindiDescription) && (
                  <p className="text-[11px] text-zinc-600 line-clamp-2 bg-zinc-50/80 p-2 rounded-xl border border-zinc-100 italic">
                    "{language === 'hi' ? course.hindiDescription || course.description : course.description}"
                  </p>
                )}
              </div>

              {/* Action Buttons: Edit Info (TASK 3) and Delete */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                <div className="text-[10px] text-zinc-400 font-mono truncate">
                  ID: {course.courseId.substring(0, 16)}...
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* EDIT DEPARTMENT INFO BUTTON */}
                  <button
                    type="button"
                    id={`btn-edit-dept-${course.courseId}`}
                    onClick={() => handleOpenEditModal(course)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    title={language === 'hi' ? 'विभाग की जानकारी सुधारें / अपडेट करें' : 'Update department info'}
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'hi' ? '✏️ जानकारी सुधारें' : 'Edit Info'}</span>
                  </button>

                  {/* DELETE BUTTON */}
                  {deleteConfirmId === course.courseId ? (
                    <div className="flex items-center gap-1 animate-fade-in">
                      <button
                        type="button"
                        id={`btn-confirm-delete-dept-${course.courseId}`}
                        onClick={() => handleDelete(course.courseId)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        {language === 'hi' ? 'हटाएं?' : 'Confirm?'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id={`btn-delete-dept-${course.courseId}`}
                      onClick={() => setDeleteConfirmId(course.courseId)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl space-y-2">
            <GraduationCap className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-zinc-700">
              {language === 'hi' ? 'कोई विभाग या कोर्स नहीं मिला' : 'No departments or courses found matching your search'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-zinc-900 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'पहला विभाग जोड़ें' : 'Add First Department'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Department Info Modal (CRITICAL TASK 3: FUTURE UPDATE OPTION) */}
      {isFormModalOpen && (
        <div
          id="dept-form-modal-backdrop"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
        >
          <div
            id="dept-form-modal-card"
            className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                    {editingCourse
                      ? language === 'hi'
                        ? 'विभाग की जानकारी अपडेट करें (Edit Info)'
                        : 'Update Department & Course Information'
                      : language === 'hi'
                      ? 'नया विभाग व कोर्स जोड़ें'
                      : 'Add New Department & Course'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'hi'
                      ? 'यदि HOD, कमरा, मंजिल या ब्लॉक में कोई त्रुटि हो तो यहां सुधारें'
                      : 'Correct any HOD name, cabin, floor, block, or entrance gate information'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-dept-form-modal"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingCourse(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Row 1: Course Name & Hindi Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'कोर्स / प्रोग्राम का नाम (English) *' : 'Course / Program Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formCourseName}
                    onChange={(e) => setFormCourseName(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science & Engineering"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'हिंदी में कोर्स का नाम' : 'Course Name in Hindi'}
                  </label>
                  <input
                    type="text"
                    value={formHindiName}
                    onChange={(e) => setFormHindiName(e.target.value)}
                    placeholder="उदा. बी.टेक कंप्यूटर साइंस व इंजीनियरिंग"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 2: Department Full Name & Degree Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'विभाग का पूरा नाम (Department Full Name) *' : 'Department Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formDeptName}
                    onChange={(e) => setFormDeptName(e.target.value)}
                    placeholder="e.g. Department of Computer Science & Engineering (UIET)"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'डिग्री प्रकार *' : 'Degree Type *'}
                  </label>
                  <select
                    value={formDegree}
                    onChange={(e) => setFormDegree(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  >
                    <option value="Undergraduate">Undergraduate (UG)</option>
                    <option value="Postgraduate">Postgraduate (PG)</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Doctorate">Doctorate (Ph.D)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Linked Campus Location on Map */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <label className="block text-xs font-extrabold text-zinc-800">
                  {language === 'hi' ? 'मैप पर जुड़ा हुआ कैंपस भवन / स्थान *' : 'Linked Campus Building Location on Map *'}
                </label>
                <select
                  value={formLocationId}
                  onChange={(e) => handleLocationSelectChange(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                >
                  {campusLocationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.title} ({loc.block || 'Campus Wing'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Block & Floor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'भवन व ब्लॉक का नाम *' : 'Building & Block Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formBlock}
                    onChange={(e) => setFormBlock(e.target.value)}
                    placeholder="e.g. UIET Block 2 (Academic Wing)"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'मंजिल (Floor) *' : 'Floor *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    placeholder="e.g. 1st & 2nd Floor"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 5: HOD Name & HOD Cabin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'विभाग अध्यक्ष (HOD Name) *' : 'Head of Department (HOD Name) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formHodName}
                    onChange={(e) => setFormHodName(e.target.value)}
                    placeholder="e.g. Dr. Sandesh Gupta"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'HOD केबिन नंबर *' : 'HOD Cabin Room Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formHodCabin}
                    onChange={(e) => setFormHodCabin(e.target.value)}
                    placeholder="e.g. Cabin 204 (1st Floor)"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 6: Recommended Entrance Gate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'सुझावित प्रवेश द्वार (Gate Text) *' : 'Recommended Entry Gate *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formRecommendedGate}
                    onChange={(e) => setFormRecommendedGate(e.target.value)}
                    placeholder="e.g. Gate 2 (UIET Entrance Gate)"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'मैप गेट आईडी' : 'Map Gate Marker'}
                  </label>
                  <select
                    value={formGateId}
                    onChange={(e) => setFormGateId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  >
                    {gateOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 7: Courses Offered in this Department */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi'
                    ? 'विभाग में उपलब्ध कोर्सेस (Courses Offered - अल्पविराम से अलग करें)'
                    : 'Courses Offered in this Department (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={formCoursesOffered}
                  onChange={(e) => setFormCoursesOffered(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, BCA, MCA, M.Tech, Ph.D"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              {/* Row 8: Department Description (English & Hindi) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'विभाग का विवरण (English Description)' : 'Department Description (English)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Center of excellence in engineering and computer science..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'विभाग का विवरण (हिंदी)' : 'Department Description (Hindi)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formHindiDescription}
                    onChange={(e) => setFormHindiDescription(e.target.value)}
                    placeholder="उदा. छत्रपति शाहू जी महाराज विश्वविद्यालय में इंजीनियरिंग व तकनीक का प्रमुख केंद्र..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 9: Key Classrooms & Labs */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi'
                    ? 'प्रमुख कक्षाएं व लैब्स (Format: RoomName (RoomNumber, Floor), ...)'
                    : 'Key Classrooms & Labs (Format: RoomName (RoomNumber, Floor), ...)'}
                </label>
                <textarea
                  rows={2}
                  value={formKeyRoomsRaw}
                  onChange={(e) => setFormKeyRoomsRaw(e.target.value)}
                  placeholder="e.g. CSE Classroom 101 (Room 101, 1st Floor), AI Lab (Room 206, 2nd Floor)"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              {/* Row 10: Tags / Keywords */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi' ? 'सर्च कीवर्ड्स / टैग्स (अल्पविराम से अलग करें)' : 'Search Keywords & Tags (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="CSE, BTech, Coding, Computer, UIET"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs sm:text-sm font-semibold transition"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="btn-submit-dept-form"
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {editingCourse
                      ? language === 'hi'
                        ? 'सुधार सुरक्षित करें (Save Update)'
                        : 'Save & Update Department Info'
                      : language === 'hi'
                      ? 'विभाग जोड़ें (Save Department)'
                      : 'Save Department'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
