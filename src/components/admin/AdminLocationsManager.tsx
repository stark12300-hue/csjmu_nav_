import React, { useState, useMemo, useRef } from 'react';
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  Edit,
  Camera,
  Move,
  CheckCircle2,
  X,
  Building,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import { CampusLocation, Language, LocationCategory } from '../../types';

export const PRESET_PHOTO_OPTIONS = [
  {
    label: 'UIET Engineering Block',
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Central Library',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Admin Senate Bhavan',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Main University Gate',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Auditorium & Events',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Science & Health Complex',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Sports Stadium Complex',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Campus Canteen & Cafe',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
  },
];

interface AdminLocationsManagerProps {
  locations: CampusLocation[];
  onAddLocation: (loc: CampusLocation) => void;
  onUpdateLocation?: (loc: CampusLocation) => void;
  onDeleteLocation: (id: string) => void;
  onUpdateLocationPhoto: (id: string, photoUrl: string) => void;
  onUpdateLocationCoordinates: (id: string, coords: [number, number]) => void;
  onStartDragMode?: (locId?: string) => void;
  language: Language;
}

export const AdminLocationsManager: React.FC<AdminLocationsManagerProps> = ({
  locations,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onUpdateLocationPhoto,
  onUpdateLocationCoordinates,
  onStartDragMode,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit Details Modal State
  const [editingDetailsLoc, setEditingDetailsLoc] = useState<CampusLocation | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editHindiTitle, setEditHindiTitle] = useState('');
  const [editCategory, setEditCategory] = useState<LocationCategory>('department');
  const [editBlock, setEditBlock] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editHindiDesc, setEditHindiDesc] = useState('');
  const [editCoursesOffered, setEditCoursesOffered] = useState('');
  const [editFacilitiesRaw, setEditFacilitiesRaw] = useState('');

  // Edit Coordinates Modal State
  const [editingCoordsLoc, setEditingCoordsLoc] = useState<CampusLocation | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');

  // Edit Photo Modal State
  const [editingPhotoLoc, setEditingPhotoLoc] = useState<CampusLocation | null>(null);
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');
  const [photoInputMode, setPhotoInputMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Location Form State
  const [locTitle, setLocTitle] = useState('');
  const [locHindiTitle, setLocHindiTitle] = useState('');
  const [locCategory, setLocCategory] = useState<LocationCategory>('department');
  const [locBlock, setLocBlock] = useState('');
  const [locFloor, setLocFloor] = useState('Ground Floor');
  const [locRoomNumber, setLocRoomNumber] = useState('');
  const [customLat, setCustomLat] = useState('26.4984');
  const [customLng, setCustomLng] = useState('80.2662');
  const [locDesc, setLocDesc] = useState('');
  const [locHindiDesc, setLocHindiDesc] = useState('');
  const [locCoursesOffered, setLocCoursesOffered] = useState('');
  const [locPhoto, setLocPhoto] = useState(PRESET_PHOTO_OPTIONS[0].url);
  const [locPhotoMode, setLocPhotoMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [locCustomUrl, setLocCustomUrl] = useState('');
  const [locFacilitiesRaw, setLocFacilitiesRaw] = useState('Wi-Fi, Water Cooler, Washrooms');
  const addLocFileInputRef = useRef<HTMLInputElement>(null);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    let list = locations;
    if (categoryFilter !== 'all') {
      list = list.filter((l) => l.category === categoryFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.hindiTitle && l.hindiTitle.toLowerCase().includes(q)) ||
        (l.block && l.block.toLowerCase().includes(q)) ||
        l.category.toLowerCase().includes(q)
    );
  }, [locations, categoryFilter, searchQuery]);

  const handleOpenEditDetails = (loc: CampusLocation) => {
    setEditingDetailsLoc(loc);
    setEditTitle(loc.title);
    setEditHindiTitle(loc.hindiTitle || '');
    setEditCategory(loc.category);
    setEditBlock(loc.block || '');
    setEditFloor(loc.floor || 'Ground Floor');
    setEditRoomNumber(loc.roomNumber || '');
    setEditDesc(loc.description || '');
    setEditHindiDesc(loc.hindiDescription || '');
    setEditCoursesOffered(loc.coursesOffered ? loc.coursesOffered.join(', ') : '');
    setEditFacilitiesRaw(loc.facilities ? loc.facilities.join(', ') : 'Wi-Fi, Water Cooler');
  };

  const handleSaveDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetailsLoc) return;
    if (!editTitle.trim()) {
      alert(language === 'hi' ? 'कृपया स्थान का नाम दर्ज करें' : 'Please enter location title');
      return;
    }

    const coursesArray = editCoursesOffered
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const facilitiesArray = editFacilitiesRaw
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const updatedLoc: CampusLocation = {
      ...editingDetailsLoc,
      title: editTitle.trim(),
      hindiTitle: editHindiTitle.trim() || editTitle.trim(),
      category: editCategory,
      block: editBlock.trim() || editingDetailsLoc.block || 'Main Campus',
      floor: editFloor.trim() || 'Ground Floor',
      roomNumber: editRoomNumber.trim() || undefined,
      description: editDesc.trim() || `${editTitle} at CSJM University`,
      hindiDescription: editHindiDesc.trim() || undefined,
      coursesOffered: coursesArray.length > 0 ? coursesArray : undefined,
      facilities: facilitiesArray.length > 0 ? facilitiesArray : editingDetailsLoc.facilities,
    };

    if (onUpdateLocation) {
      onUpdateLocation(updatedLoc);
    }
    setEditingDetailsLoc(null);
  };

  const handleOpenEditCoords = (loc: CampusLocation) => {
    setEditingCoordsLoc(loc);
    setLatInput(loc.coordinates[0].toString());
    setLngInput(loc.coordinates[1].toString());
  };

  const handleSaveCoords = () => {
    if (!editingCoordsLoc) return;
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng) || lat < 26.0 || lat > 27.0 || lng < 80.0 || lng > 81.0) {
      alert(language === 'hi' ? 'अमान्य निर्देशांक! 26.4xx और 80.2xx के बीच दर्ज करें' : 'Invalid CSJMU coordinates');
      return;
    }
    onUpdateLocationCoordinates(editingCoordsLoc.id, [lat, lng]);
    setEditingCoordsLoc(null);
  };

  const handleOpenEditPhoto = (loc: CampusLocation) => {
    setEditingPhotoLoc(loc);
    setTempPhotoUrl(loc.image || PRESET_PHOTO_OPTIONS[0].url);
    setPhotoInputMode('upload');
  };

  const handleSavePhoto = () => {
    if (!editingPhotoLoc) return;
    const finalUrl = photoInputMode === 'url' && customPhotoUrl ? customPhotoUrl : tempPhotoUrl;
    onUpdateLocationPhoto(editingPhotoLoc.id, finalUrl);
    setEditingPhotoLoc(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isAddLoc = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'hi' ? 'कृपया केवल इमेज (JPG/PNG/WebP) फ़ाइल चुनें।' : 'Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      // Automatically compress large camera photos to high-performance web resolution (~100KB)
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let { width, height } = img;

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
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            if (isAddLoc) {
              setLocPhoto(compressed);
              setLocPhotoMode('upload');
            } else {
              setTempPhotoUrl(compressed);
            }
            return;
          }
        } catch (err) {
          console.warn('Canvas compression fallback:', err);
        }

        if (isAddLoc) {
          setLocPhoto(rawDataUrl);
          setLocPhotoMode('upload');
        } else {
          setTempPhotoUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAddLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locTitle.trim()) {
      alert(language === 'hi' ? 'कृपया स्थान का नाम दर्ज करें' : 'Please enter location title');
      return;
    }
    const lat = parseFloat(customLat) || 26.4984;
    const lng = parseFloat(customLng) || 80.2662;
    const finalPhoto = locPhotoMode === 'url' && locCustomUrl ? locCustomUrl : locPhoto;

    const coursesArray = locCoursesOffered
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const facilitiesArray = locFacilitiesRaw
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const newLoc: CampusLocation = {
      id: `custom-loc-${Date.now()}`,
      title: locTitle.trim(),
      hindiTitle: locHindiTitle.trim() || locTitle.trim(),
      category: locCategory,
      coordinates: [lat, lng],
      block: locBlock.trim() || 'Main Campus',
      floor: locFloor.trim() || 'Ground Floor',
      roomNumber: locRoomNumber.trim() || undefined,
      description: locDesc.trim() || `${locTitle} at CSJM University`,
      hindiDescription: locHindiDesc.trim() || `${locHindiTitle || locTitle} छत्रपति शाहू जी महाराज विश्वविद्यालय कानपुर`,
      coursesOffered: coursesArray.length > 0 ? coursesArray : undefined,
      facilities: facilitiesArray.length > 0 ? facilitiesArray : ['Wi-Fi', 'Water Cooler', 'Washrooms'],
      image: finalPhoto,
      isCustom: true,
    };

    onAddLocation(newLoc);
    setIsAddModalOpen(false);
    setLocTitle('');
    setLocHindiTitle('');
    setLocBlock('');
    setLocFloor('Ground Floor');
    setLocRoomNumber('');
    setLocDesc('');
    setLocHindiDesc('');
    setLocCoursesOffered('');
  };

  return (
    <div id="admin-locations-manager" className="space-y-4 text-zinc-900 w-full min-w-0">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-zinc-900 truncate">
              {language === 'hi' ? 'कैंपस मैप मार्कर व स्थान (Pins & Markers)' : 'Campus Pins & Location Markers'}
            </h3>
            <p className="text-xs text-zinc-600">
              {language === 'hi'
                ? `कुल ${locations.length} स्थान मार्कर • किसी भी मार्कर का विवरण, ब्लॉक, कोर्स, फोटो या स्थिति बदलें`
                : `${locations.length} locations on map • Edit details, block, courses, photo, GPS or drag`}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-admin-add-loc-open"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'hi' ? '+ नया स्थान जोड़ें' : '+ Add Location'}</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="p-2.5 sm:p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="admin-loc-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'स्थान का नाम, ब्लॉक या श्रेणी खोजें...'
                : 'Search location by name, block, or category...'
            }
            className="w-full bg-white/80 border border-white/90 rounded-xl pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 backdrop-blur-md shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain py-1 text-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            {language === 'hi' ? 'श्रेणी:' : 'Category:'}
          </span>
          {['all', 'department', 'admin', 'faculty', 'lab', 'gate', 'facility', 'library', 'hostel', 'canteen'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition border shrink-0 capitalize ${
                categoryFilter === cat
                  ? 'bg-zinc-900/90 text-white border-zinc-900 shadow-xs'
                  : 'bg-white/70 text-zinc-700 border-white/90 hover:bg-white/90 backdrop-blur-md shadow-2xs'
              }`}
            >
              {cat === 'all' ? (language === 'hi' ? 'सभी स्थान' : 'All') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Locations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
        {filteredLocations.map((loc) => (
          <div
            key={loc.id}
            id={`admin-loc-item-${loc.id}`}
            className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs transition flex flex-col justify-between gap-3 min-w-0 hover:border-zinc-300"
          >
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                {/* Photo Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 relative group">
                  <img
                    src={loc.image || PRESET_PHOTO_OPTIONS[0].url}
                    alt={loc.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenEditPhoto(loc)}
                    title="Change photo"
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Title & Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900 truncate">
                      {language === 'hi' ? loc.hindiTitle || loc.title : loc.title}
                    </h4>
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded text-[9px] font-bold capitalize">
                      {loc.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 font-semibold truncate mt-0.5">
                    🏢 {loc.block || 'Campus Wing'} {loc.floor ? `• ${loc.floor}` : ''} {loc.roomNumber ? `• Room ${loc.roomNumber}` : ''}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    [{loc.coordinates[0].toFixed(5)}, {loc.coordinates[1].toFixed(5)}]
                  </p>
                </div>
              </div>

              {/* Courses Offered Preview in Location Card */}
              {loc.coursesOffered && loc.coursesOffered.length > 0 && (
                <div className="pt-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 block mb-0.5">
                    {language === 'hi' ? 'उपलब्ध कोर्सेस:' : 'Courses Offered:'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {loc.coursesOffered.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200/80 rounded-md text-[10px] font-semibold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Preview */}
              {(loc.description || loc.hindiDescription) && (
                <p className="text-[11px] text-zinc-500 line-clamp-2 italic bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                  "{language === 'hi' ? loc.hindiDescription || loc.description : loc.description}"
                </p>
              )}
            </div>

            {/* Actions: Edit Details, Edit Coords, Photo, Drag on Map, Delete */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {/* EDIT DETAILS BUTTON */}
                <button
                  type="button"
                  id={`btn-edit-loc-details-${loc.id}`}
                  onClick={() => handleOpenEditDetails(loc)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
                  title={language === 'hi' ? 'स्थान व ब्लॉक का विवरण सुधारें' : 'Edit details, block, description & courses'}
                >
                  <Edit className="w-3 h-3 text-blue-400" />
                  <span>{language === 'hi' ? '✏️ विवरण' : 'Edit Info'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditCoords(loc)}
                  className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Edit Lat/Lng"
                >
                  <Compass className="w-3 h-3" />
                  <span>GPS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditPhoto(loc)}
                  className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Change Photo"
                >
                  <Camera className="w-3 h-3" />
                  <span>Photo</span>
                </button>

                {onStartDragMode && (
                  <button
                    type="button"
                    onClick={() => onStartDragMode(loc.id)}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Drag on map"
                  >
                    <Move className="w-3 h-3" />
                    <span>Drag</span>
                  </button>
                )}
              </div>

              <div>
                {deleteConfirmId === loc.id ? (
                  <div className="flex items-center gap-1 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteLocation(loc.id);
                        setDeleteConfirmId(null);
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold"
                    >
                      Delete?
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="p-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(loc.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Delete Location Marker"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT LOCATION DETAILS MODAL */}
      {editingDetailsLoc && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-zinc-900">
            <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <Edit className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <h3 className="text-sm sm:text-base font-bold">
                  {language === 'hi' ? 'स्थान व विभाग विवरण सुधारें' : 'Edit Location & Department Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDetailsLoc(null)}
                className="p-1 text-zinc-400 hover:text-zinc-900 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDetailsSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'नाम (English) *' : 'Title (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'नाम (हिंदी)' : 'Title (Hindi)'}
                  </label>
                  <input
                    type="text"
                    value={editHindiTitle}
                    onChange={(e) => setEditHindiTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'श्रेणी (Category) *' : 'Category *'}
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as LocationCategory)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20 capitalize"
                  >
                    <option value="department">Department (विभाग)</option>
                    <option value="admin">Admin Office (प्रशासन)</option>
                    <option value="facility">Facility (सुविधा)</option>
                    <option value="library">Library (पुस्तकालय)</option>
                    <option value="gate">Gate (प्रवेश द्वार)</option>
                    <option value="hostel">Hostel (छात्रावास)</option>
                    <option value="canteen">Canteen / Food</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'भवन / ब्लॉक (Building Block) *' : 'Building Block *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editBlock}
                    onChange={(e) => setEditBlock(e.target.value)}
                    placeholder="e.g. UIET Block 1 / Administrative Wing"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'मंजिल (Floor)' : 'Floor'}
                  </label>
                  <input
                    type="text"
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    placeholder="e.g. Ground & 1st Floor"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'कमरा संख्या (Room Number)' : 'Room Number'}
                  </label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    placeholder="e.g. 101, 102 / Office 2"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Courses Offered */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi'
                    ? 'उपलब्ध कोर्सेस (Courses Offered - अल्पविराम से अलग करें)'
                    : 'Courses Offered (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={editCoursesOffered}
                  onChange={(e) => setEditCoursesOffered(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, BCA, MCA, M.Tech"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'विवरण (English Description)' : 'Description (English)'}
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Brief description of this building or department..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {language === 'hi' ? 'विवरण (हिंदी)' : 'Description (Hindi)'}
                  </label>
                  <textarea
                    rows={3}
                    value={editHindiDesc}
                    onChange={(e) => setEditHindiDesc(e.target.value)}
                    placeholder="भवन या विभाग का संक्षिप्त विवरण..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi'
                    ? 'सुविधाएं (Facilities - अल्पविराम से अलग करें)'
                    : 'Facilities (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={editFacilitiesRaw}
                  onChange={(e) => setEditFacilitiesRaw(e.target.value)}
                  placeholder="Wi-Fi, Water Cooler, Washrooms, Elevator, AC Classrooms"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingDetailsLoc(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs sm:text-sm font-semibold transition"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'hi' ? 'विवरण सुरक्षित करें' : 'Save Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coordinates Modal */}
      {editingCoordsLoc && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-4 sm:p-5 w-full max-w-sm space-y-3">
            <h4 className="text-sm font-bold text-zinc-900">
              {language === 'hi' ? 'स्थान के निर्देशांक बदलें' : 'Edit Coordinates'}
            </h4>
            <p className="text-xs text-zinc-500 font-medium">{editingCoordsLoc.title}</p>
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-0.5">Latitude (26.49xxx)</label>
                <input
                  type="text"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-0.5">Longitude (80.26xxx)</label>
                <input
                  type="text"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCoordsLoc(null)}
                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCoords}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Photo Modal */}
      {editingPhotoLoc && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-4 sm:p-5 w-full max-w-md space-y-3">
            <h4 className="text-sm font-bold text-zinc-900">
              {language === 'hi' ? 'स्थान की फोटो बदलें' : 'Update Location Photo'}
            </h4>
            <p className="text-xs text-zinc-500 font-medium">{editingPhotoLoc.title}</p>

            <div className="w-full h-36 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
              <img
                src={photoInputMode === 'url' && customPhotoUrl ? customPhotoUrl : tempPhotoUrl}
                alt="Preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center gap-1 border-b border-zinc-200 pb-2">
              <button
                type="button"
                onClick={() => setPhotoInputMode('upload')}
                className={`px-3 py-1 text-xs rounded-lg font-bold ${
                  photoInputMode === 'upload' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setPhotoInputMode('preset')}
                className={`px-3 py-1 text-xs rounded-lg font-bold ${
                  photoInputMode === 'preset' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setPhotoInputMode('url')}
                className={`px-3 py-1 text-xs rounded-lg font-bold ${
                  photoInputMode === 'url' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                Image URL
              </button>
            </div>

            {photoInputMode === 'upload' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="w-full text-xs text-zinc-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white"
                />
              </div>
            )}

            {photoInputMode === 'preset' && (
              <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
                {PRESET_PHOTO_OPTIONS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTempPhotoUrl(p.url)}
                    className="h-12 rounded-lg overflow-hidden border border-zinc-200 hover:border-zinc-900 transition"
                  >
                    <img src={p.url} alt={p.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {photoInputMode === 'url' && (
              <div>
                <input
                  type="url"
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditingPhotoLoc(null)}
                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-zinc-900">
            <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm sm:text-base font-bold">
                {language === 'hi' ? 'कैंपस में नया स्थान जोड़ें' : 'Add New Campus Location'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLocationSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Title (English) *</label>
                  <input
                    type="text"
                    required
                    value={locTitle}
                    onChange={(e) => setLocTitle(e.target.value)}
                    placeholder="e.g. Innovation Cell"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Hindi Title</label>
                  <input
                    type="text"
                    value={locHindiTitle}
                    onChange={(e) => setLocHindiTitle(e.target.value)}
                    placeholder="उदा. नवाचार केंद्र"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Category *</label>
                  <select
                    value={locCategory}
                    onChange={(e) => setLocCategory(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs capitalize"
                  >
                    <option value="department">Department (विभाग)</option>
                    <option value="admin">Admin Office (प्रशासन)</option>
                    <option value="facility">Facility (सुविधा)</option>
                    <option value="library">Library (पुस्तकालय)</option>
                    <option value="gate">Gate (प्रवेश द्वार)</option>
                    <option value="hostel">Hostel (छात्रावास)</option>
                    <option value="canteen">Canteen / Food</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Building Block</label>
                  <input
                    type="text"
                    value={locBlock}
                    onChange={(e) => setLocBlock(e.target.value)}
                    placeholder="e.g. UIET Block 1 / Main Wing"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Floor</label>
                <input
                  type="text"
                  value={locFloor}
                  onChange={(e) => setLocFloor(e.target.value)}
                  placeholder="e.g. Ground & 1st Floor"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {language === 'hi'
                    ? 'उपलब्ध कोर्सेस (Courses Offered - अल्पविराम से अलग करें)'
                    : 'Courses Offered (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={locCoursesOffered}
                  onChange={(e) => setLocCoursesOffered(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, BCA, MCA"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Description (English)</label>
                  <textarea
                    rows={2}
                    value={locDesc}
                    onChange={(e) => setLocDesc(e.target.value)}
                    placeholder="Description of the building or facility..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Description (Hindi)</label>
                  <textarea
                    rows={2}
                    value={locHindiDesc}
                    onChange={(e) => setLocHindiDesc(e.target.value)}
                    placeholder="भवन या विभाग का हिंदी विवरण..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
