import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit,
  Building2,
  MapPin,
  Clock,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
} from 'lucide-react';
import { FacultyMember, CampusLocation, Language } from '../../types';

interface AdminFacultyManagerProps {
  facultyList: FacultyMember[];
  locations: CampusLocation[];
  onAddFaculty: (faculty: FacultyMember) => void;
  onUpdateFaculty: (faculty: FacultyMember) => void;
  onDeleteFaculty: (facultyId: string) => void;
  language: Language;
}

export const AdminFacultyManager: React.FC<AdminFacultyManagerProps> = ({
  facultyList,
  locations,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formHindiName, setFormHindiName] = useState('');
  const [formDesignation, setFormDesignation] = useState('Assistant Professor');
  const [formSelectedDeptId, setFormSelectedDeptId] = useState('');
  const [formCustomDeptName, setFormCustomDeptName] = useState('');
  const [formCabin, setFormCabin] = useState('');
  const [formFloor, setFormFloor] = useState('Ground Floor');
  const [formBuildingName, setFormBuildingName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formHours, setFormHours] = useState('10:00 AM - 02:00 PM');
  const [formSubjects, setFormSubjects] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Department options based on campus locations + common departments
  const departmentOptions = useMemo(() => {
    const deptLocations = locations.filter(
      (l) => l.category === 'department' || l.category === 'admin' || l.category === 'library' || l.category === 'facility'
    );
    return deptLocations.map((l) => ({
      id: l.id,
      name: l.title,
      hindiName: l.hindiTitle || l.title,
      block: l.block || 'Main Campus',
      floor: l.floor || 'Ground Floor',
    }));
  }, [locations]);

  // Unique existing departments in the faculty list
  const existingDepartments = useMemo(() => {
    const set = new Set<string>();
    facultyList.forEach((f) => {
      if (f.department) set.add(f.department);
    });
    return Array.from(set);
  }, [facultyList]);

  // Filtered list
  const filteredFaculty = useMemo(() => {
    let list = facultyList;
    if (selectedDeptFilter !== 'all') {
      list = list.filter((f) => f.department === selectedDeptFilter || f.departmentId === selectedDeptFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.hindiName && f.hindiName.toLowerCase().includes(q)) ||
        f.department.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        f.cabinRoom.toLowerCase().includes(q) ||
        f.buildingName.toLowerCase().includes(q) ||
        f.subjects?.some((s) => s.toLowerCase().includes(q))
    );
  }, [facultyList, selectedDeptFilter, searchQuery]);

  const resetForm = () => {
    setFormName('');
    setFormHindiName('');
    setFormDesignation('Assistant Professor');
    setFormSelectedDeptId(departmentOptions[0]?.id || 'custom');
    setFormCustomDeptName('');
    setFormCabin('');
    setFormFloor('Ground Floor');
    setFormBuildingName(departmentOptions[0]?.name || 'UIET Block');
    setFormEmail('');
    setFormPhone('');
    setFormHours('10:00 AM - 02:00 PM');
    setFormSubjects('');
    setFormNotes('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    if (departmentOptions.length > 0) {
      const first = departmentOptions[0];
      setFormSelectedDeptId(first.id);
      setFormBuildingName(first.name);
      setFormFloor(first.floor);
    }
    setEditingFaculty(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (faculty: FacultyMember) => {
    setEditingFaculty(faculty);
    setFormName(faculty.name);
    setFormHindiName(faculty.hindiName || '');
    setFormDesignation(faculty.designation || 'Assistant Professor');

    // Check if faculty departmentId matches any option
    const matchedDept = departmentOptions.find((d) => d.id === faculty.departmentId || d.name === faculty.department);
    if (matchedDept) {
      setFormSelectedDeptId(matchedDept.id);
      setFormCustomDeptName('');
    } else {
      setFormSelectedDeptId('custom');
      setFormCustomDeptName(faculty.department);
    }

    setFormCabin(faculty.cabinRoom || '');
    setFormFloor(faculty.floor || 'Ground Floor');
    setFormBuildingName(faculty.buildingName || '');
    setFormEmail(faculty.email || '');
    setFormPhone(faculty.phone || '');
    setFormHours(faculty.officeHours || '10:00 AM - 02:00 PM');
    setFormSubjects(faculty.subjects ? faculty.subjects.join(', ') : '');
    setFormNotes(faculty.notes || '');
    setIsAddModalOpen(true);
  };

  const handleDepartmentSelectChange = (deptId: string) => {
    setFormSelectedDeptId(deptId);
    if (deptId !== 'custom') {
      const selected = departmentOptions.find((d) => d.id === deptId);
      if (selected) {
        setFormBuildingName(selected.name);
        setFormFloor(selected.floor);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert(language === 'hi' ? 'कृपया शिक्षक का नाम दर्ज करें' : 'Please enter faculty name');
      return;
    }

    let finalDeptName = '';
    let finalDeptId = '';
    let finalBuildingId = '';

    if (formSelectedDeptId === 'custom') {
      if (!formCustomDeptName.trim()) {
        alert(language === 'hi' ? 'कृपया विभाग का नाम लिखें' : 'Please specify custom department name');
        return;
      }
      finalDeptName = formCustomDeptName.trim();
      finalDeptId = `dept-${Date.now()}`;
      finalBuildingId = `loc-${Date.now()}`;
    } else {
      const selectedDept = departmentOptions.find((d) => d.id === formSelectedDeptId);
      finalDeptName = selectedDept ? selectedDept.name : formSelectedDeptId;
      finalDeptId = formSelectedDeptId;
      finalBuildingId = formSelectedDeptId;
    }

    const subjectsArray = formSubjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingFaculty) {
      // Update existing faculty
      const updated: FacultyMember = {
        ...editingFaculty,
        name: formName.trim(),
        hindiName: formHindiName.trim() || formName.trim(),
        designation: formDesignation,
        department: finalDeptName,
        departmentId: finalDeptId,
        cabinRoom: formCabin.trim() || 'Faculty Cabin',
        floor: formFloor.trim() || 'Ground Floor',
        buildingName: formBuildingName.trim() || finalDeptName,
        buildingId: finalBuildingId,
        email: formEmail.trim(),
        phone: formPhone.trim(),
        officeHours: formHours.trim(),
        subjects: subjectsArray,
        notes: formNotes.trim() || undefined,
        isCustom: true,
      };
      onUpdateFaculty(updated);
    } else {
      // Create new faculty
      const newFaculty: FacultyMember = {
        id: `faculty-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: formName.trim(),
        hindiName: formHindiName.trim() || formName.trim(),
        designation: formDesignation,
        department: finalDeptName,
        departmentId: finalDeptId,
        cabinRoom: formCabin.trim() || 'Faculty Cabin',
        floor: formFloor.trim() || 'Ground Floor',
        buildingName: formBuildingName.trim() || finalDeptName,
        buildingId: finalBuildingId,
        email: formEmail.trim(),
        phone: formPhone.trim(),
        officeHours: formHours.trim(),
        subjects: subjectsArray,
        notes: formNotes.trim() || undefined,
        isCustom: true,
        addedBy: 'Admin Console',
      };
      onAddFaculty(newFaculty);
    }

    setIsAddModalOpen(false);
    setEditingFaculty(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    onDeleteFaculty(id);
    setDeleteConfirmId(null);
  };

  return (
    <div id="admin-faculty-manager" className="space-y-4 text-zinc-900 w-full min-w-0">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-zinc-900 truncate">
              {language === 'hi' ? 'शिक्षक व फैकल्टी प्रबंधन' : 'Faculty & Professors Directory'}
            </h3>
            <p className="text-xs text-zinc-600">
              {language === 'hi'
                ? `कुल ${facultyList.length} शिक्षक उपलब्ध • नया शिक्षक जोड़ें या हटाएं`
                : `${facultyList.length} teachers registered • Add to any department or delete`}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-admin-add-faculty-open"
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'hi' ? '+ नया शिक्षक जोड़ें' : '+ Add New Faculty'}</span>
        </button>
      </div>

      {/* Search & Department Filters */}
      <div className="p-2.5 sm:p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="admin-faculty-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'शिक्षक का नाम, केबिन, विषय या विभाग खोजें...'
                : 'Search professor by name, cabin, subject, or department...'
            }
            className="w-full bg-white/80 border border-white/90 rounded-xl pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 backdrop-blur-md shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain py-1 text-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            {language === 'hi' ? 'विभाग फ़िल्टर:' : 'Dept:'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedDeptFilter('all')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
              selectedDeptFilter === 'all'
                ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
            }`}
          >
            {language === 'hi' ? 'सभी विभाग' : 'All Departments'}
          </button>
          {existingDepartments.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDeptFilter(dept)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 ${
                selectedDeptFilter === dept
                  ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                  : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
        {filteredFaculty.length > 0 ? (
          filteredFaculty.map((faculty) => (
            <div
              key={faculty.id}
              id={`admin-faculty-card-${faculty.id}`}
              className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs transition flex flex-col justify-between gap-3 min-w-0 hover:border-zinc-300"
            >
              <div className="min-w-0 space-y-2">
                {/* Header: Name + Designation + Custom Badge */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-extrabold text-zinc-900 truncate">
                        {language === 'hi' ? faculty.hindiName || faculty.name : faculty.name}
                      </h4>
                      {faculty.isCustom && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[9px] font-bold">
                          Admin Added
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-zinc-600 mt-0.5">{faculty.designation}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                {/* Department & Building Info */}
                <div className="text-xs text-zinc-700 space-y-1 bg-white/70 backdrop-blur-md p-2.5 rounded-xl border border-white/90 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-zinc-800 font-medium truncate">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">
                      <strong>{language === 'hi' ? 'विभाग:' : 'Dept:'}</strong> {faculty.department}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600 truncate">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">
                      {faculty.buildingName} • {faculty.floor} • <strong>{faculty.cabinRoom}</strong>
                    </span>
                  </div>
                  {faculty.officeHours && (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] truncate">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{faculty.officeHours}</span>
                    </div>
                  )}
                  {faculty.subjects && faculty.subjects.length > 0 && (
                    <div className="flex items-start gap-1.5 text-zinc-500 text-[11px] pt-1">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{faculty.subjects.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit and Delete */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/70">
                <div className="text-[11px] text-zinc-400 truncate">
                  ID: <span className="font-mono">{faculty.id.substring(0, 14)}...</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    id={`btn-edit-faculty-${faculty.id}`}
                    onClick={() => handleOpenEditModal(faculty)}
                    className="px-2.5 py-1.5 bg-white/80 hover:bg-white text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-white/90 shadow-2xs active:scale-95"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{language === 'hi' ? 'एडिट' : 'Edit'}</span>
                  </button>

                  {deleteConfirmId === faculty.id ? (
                    <div className="flex items-center gap-1 animate-fade-in">
                      <button
                        type="button"
                        id={`btn-confirm-delete-fac-${faculty.id}`}
                        onClick={() => handleDelete(faculty.id)}
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
                      id={`btn-delete-faculty-${faculty.id}`}
                      onClick={() => setDeleteConfirmId(faculty.id)}
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
            <Users className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-zinc-700">
              {language === 'hi' ? 'कोई शिक्षक नहीं मिला' : 'No faculty members found matching your search'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-zinc-900 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'पहला शिक्षक जोड़ें' : 'Add First Faculty'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Faculty Modal Form */}
      {isAddModalOpen && (
        <div
          id="faculty-form-modal-backdrop"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
        >
          <div
            id="faculty-form-modal-card"
            className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900"
          >
            {/* Modal Header */}
            <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                    {editingFaculty
                      ? language === 'hi'
                        ? 'शिक्षक विवरण अपडेट करें'
                        : 'Edit Faculty Member'
                      : language === 'hi'
                      ? 'नया शिक्षक / प्रोफेसर जोड़ें'
                      : 'Add New Faculty Member'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'hi'
                      ? 'विभाग चुनें या नया विभाग नाम दर्ज करें'
                      : 'Select any department or enter custom department'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-faculty-form-modal"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingFaculty(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Row 1: Name & Hindi Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'शिक्षक का नाम (English) *' : 'Faculty Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Alok Kumar"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'हिंदी में नाम' : 'Name in Hindi'}
                  </label>
                  <input
                    type="text"
                    value={formHindiName}
                    onChange={(e) => setFormHindiName(e.target.value)}
                    placeholder="उदा. डॉ. आलोक कुमार"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 2: Designation */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi' ? 'पद / Designation *' : 'Designation *'}
                </label>
                <select
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                >
                  <option value="Professor">Professor (प्रोफेसर)</option>
                  <option value="Associate Professor">Associate Professor (एसोसिएट प्रोफेसर)</option>
                  <option value="Assistant Professor">Assistant Professor (असिस्टेंट प्रोफेसर)</option>
                  <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                  <option value="Dean / Director">Dean / Director</option>
                  <option value="Lab In-charge & Instructor">Lab In-charge & Instructor</option>
                  <option value="Guest / Visiting Faculty">Guest / Visiting Faculty</option>
                </select>
              </div>

              {/* Row 3: DEPARTMENT SELECTOR (CRITICAL REQUIREMENT: Allow picking ANY department) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                <label className="block text-xs font-extrabold text-blue-900">
                  {language === 'hi'
                    ? 'किस विभाग में जोड़ना चाहते हैं? (Select Department) *'
                    : 'Which Department do you want to add to? *'}
                </label>
                <select
                  value={formSelectedDeptId}
                  onChange={(e) => handleDepartmentSelectChange(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <optgroup label={language === 'hi' ? 'कैंपस विभाग व भवन' : 'Campus Departments & Buildings'}>
                    {departmentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.block})
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">
                    {language === 'hi' ? '✨ [+ अन्य / नया विभाग नाम लिखें]' : '✨ [+ Custom / Type Other Department]'}
                  </option>
                </select>

                {formSelectedDeptId === 'custom' && (
                  <div className="pt-1 animate-fade-in">
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">
                      {language === 'hi' ? 'कस्टम विभाग का नाम लिखें *' : 'Enter Custom Department Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formCustomDeptName}
                      onChange={(e) => setFormCustomDeptName(e.target.value)}
                      placeholder="e.g. Department of Artificial Intelligence"
                      className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                )}
              </div>

              {/* Row 4: Cabin & Floor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'केबिन / कमरा नंबर *' : 'Cabin / Room Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formCabin}
                    onChange={(e) => setFormCabin(e.target.value)}
                    placeholder="e.g. Cabin 204 / Room 102"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'मंजिल (Floor) *' : 'Floor *'}
                  </label>
                  <input
                    type="text"
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    placeholder="e.g. 1st Floor / 2nd Floor"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 5: Building Name & Meeting Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'भवन का नाम' : 'Building / Wing Name'}
                  </label>
                  <input
                    type="text"
                    value={formBuildingName}
                    onChange={(e) => setFormBuildingName(e.target.value)}
                    placeholder="e.g. UIET Block 2"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'मिलने का समय' : 'Office Hours'}
                  </label>
                  <input
                    type="text"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    placeholder="e.g. 11:00 AM - 01:00 PM"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 6: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'ईमेल आईडी' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="professor@csjmu.ac.in"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'संपर्क नंबर (Phone)' : 'Contact Number'}
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Row 7: Subjects */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi' ? 'पढ़ाए जाने वाले विषय (अल्पविराम से अलग करें)' : 'Subjects Taught (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={formSubjects}
                  onChange={(e) => setFormSubjects(e.target.value)}
                  placeholder="Data Structures, Algorithms, Machine Learning"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs sm:text-sm font-semibold transition"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="btn-submit-faculty-form"
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {editingFaculty
                      ? language === 'hi'
                        ? 'परिवर्तन सुरक्षित करें'
                        : 'Update Faculty'
                      : language === 'hi'
                      ? 'शिक्षक को जोड़ें'
                      : 'Save Faculty'}
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
