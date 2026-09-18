import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  MapPin,
  PlusCircle,
  GraduationCap,
  Users,
  Layers,
  Crosshair,
  Bug,
  X,
  ChevronRight,
  Lock,
  Unlock,
  ShieldCheck,
  Download,
  Compass,
  Menu,
  Navigation,
  Sparkles,
  BookOpen,
  Coffee,
  Building,
  Bed,
  Trophy,
  Activity,
  DoorOpen,
  CornerDownRight
} from 'lucide-react';
import { CampusLocation, CourseDepartmentMapping, FacultyMember, Language, MapStyle, NavigationRoute, TeacherAccount } from '../types';
import { TRANSLATIONS } from '../translations';
import { performSmartSearch, SearchResultItem } from '../utils/searchEngine';

interface NavbarProps {
  language: Language;
  onToggleLanguage: (lang?: Language) => void;
  mapStyle: MapStyle;
  onChangeMapStyle: (style: MapStyle) => void;
  onOpenDeptFinder: () => void;
  onOpenFacultyLocator: () => void;
  onOpenAddMarker: () => void;
  onOpenReportBug: () => void;
  onOpenDownloadApp: () => void;
  onOpenEventsModal?: () => void;
  eventsCount?: number;
  onRecenterMap: () => void;
  onGetGpsLocation: () => void;
  locations: CampusLocation[];
  courses?: CourseDepartmentMapping[];
  facultyList?: FacultyMember[];
  onSelectLocation: (loc: CampusLocation) => void;
  onStartNavigationTo?: (location: CampusLocation) => void;
  onOpenFloorPlan: () => void;
  onOpenAdminManager: () => void;
  isAdminUnlocked: boolean;
  canInstallPwa?: boolean;
  loggedInTeacher?: TeacherAccount | null;
  onOpenTeacherPortal?: () => void;
  activeRoute?: NavigationRoute | null;
  destinationLocation?: CampusLocation | null;
}

const POPULAR_QUICK_SEARCHES = [
  { label: 'UIET 1 (CSE/IT)', query: 'uiet 1', icon: '💻' },
  { label: 'Central Library', query: 'library', icon: '📚' },
  { label: 'Nescafe & Canteen', query: 'canteen', icon: '☕' },
  { label: 'Admin Block / VC', query: 'admin', icon: '🏛️' },
  { label: 'Evaluation (Mulyankan)', query: 'evaluation', icon: '📝' },
  { label: 'Lecture Hall (LHC)', query: 'lhc', icon: '🎓' },
  { label: 'Girls Hostel', query: 'girls hostel', icon: '🏠' },
  { label: 'Sports Stadium', query: 'stadium', icon: '🏃' },
  { label: 'Gate 1 (Main Gate)', query: 'gate 1', icon: '🚪' },
];

function loggedTeacherShortName(fullName: string): string {
  if (!fullName) return 'Faculty';
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onToggleLanguage,
  mapStyle,
  onChangeMapStyle,
  onOpenDeptFinder,
  onOpenFacultyLocator,
  onOpenAddMarker,
  onOpenReportBug,
  onOpenDownloadApp,
  onOpenEventsModal,
  eventsCount = 0,
  onRecenterMap,
  onGetGpsLocation,
  locations,
  courses = [],
  facultyList = [],
  onSelectLocation,
  onStartNavigationTo,
  onOpenFloorPlan,
  onOpenAdminManager,
  isAdminUnlocked,
  canInstallPwa = false,
  loggedInTeacher = null,
  onOpenTeacherPortal,
  activeRoute = null,
  destinationLocation = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];

  // Perform Instant Smart Search with typo assumption & keyword fuzzy matching
  const searchResponse = useMemo(() => {
    return performSmartSearch(searchQuery, locations, courses, facultyList);
  }, [searchQuery, locations, courses, facultyList]);

  const searchResults = searchResponse.results;

  // Handle outside click to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        mobileSearchInputRef.current &&
        !mobileSearchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation inside search dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectItem(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        handleSelectItem(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
      mobileSearchInputRef.current?.blur();
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    onSelectLocation(item.targetLocation);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  const handleStartNav = (e: React.MouseEvent, item: SearchResultItem) => {
    e.stopPropagation();
    if (onStartNavigationTo) {
      onStartNavigationTo(item.targetLocation);
    } else {
      onSelectLocation(item.targetLocation);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'canteen':
        return <Coffee className="w-3.5 h-3.5 text-rose-500" />;
      case 'library':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-500" />;
      case 'hostel':
        return <Bed className="w-3.5 h-3.5 text-blue-500" />;
      case 'sports':
        return <Trophy className="w-3.5 h-3.5 text-emerald-400" />;
      case 'gate':
        return <DoorOpen className="w-3.5 h-3.5 text-zinc-300" />;
      case 'faculty':
        return <Users className="w-3.5 h-3.5 text-purple-400" />;
      case 'course':
        return <GraduationCap className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Building className="w-3.5 h-3.5 text-zinc-300" />;
    }
  };

  return (
    <header
      id="main-app-header"
      className="relative z-30 pt-2 sm:pt-3 px-2 sm:px-3 pointer-events-none flex justify-center w-full"
    >
      {/* Google Maps Clean White Floating Navbar Capsule */}
      <div
        id="main-app-navbar"
        className="pointer-events-auto w-full max-w-6xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 px-3 sm:px-4 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.08)] relative text-slate-800"
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          
          {/* Brand Logo */}
          <div
            id="nav-brand-logo"
            onClick={onRecenterMap}
            className="flex items-center gap-2 cursor-pointer group shrink-0 min-w-0 ios-press"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 border border-slate-200 p-0.5 shadow-xs flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
              <img
                src="/csjmu-logo.png"
                alt="CSJMU Logo"
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 truncate">
                CSJMU
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold tracking-wide hidden xs:inline-block">
                Navigator
              </span>
            </div>
          </div>

          {/* Active Navigation Live Activity Pill (if route active) */}
          {activeRoute && destinationLocation && (
            <div
              onClick={() => onSelectLocation(destinationLocation)}
              className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-blue-700 text-xs font-bold cursor-pointer shrink-0 ios-press"
              title="Current Active Route"
            >
              <Navigation className="w-3 h-3 text-blue-600 shrink-0 fill-blue-600" />
              <span className="truncate max-w-[120px]">
                {language === 'hi' && destinationLocation.hindiTitle ? destinationLocation.hindiTitle : destinationLocation.title}
              </span>
              <span className="text-[10px] text-blue-800 bg-blue-200/60 px-1.5 py-0.2 rounded-full font-mono">
                {activeRoute.totalDistanceMeters}m
              </span>
            </div>
          )}

          {/* Google Maps Clean Search Capsule (Desktop / Tablet) */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md relative hidden md:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="main-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === 'hi'
                    ? 'खोजें (uiet, canteen, library, gate 1)...'
                    : 'Search building, dept, canteen, library...'
                }
                className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedIndex(-1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full ios-press"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Autocomplete Dropdown (Crisp Clean White) */}
            {isSearchOpen && (
              <div
                ref={searchDropdownRef}
                id="search-autocomplete-dropdown"
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs text-slate-800"
              >
                {/* Typo Correction Banner */}
                {searchResponse.hasTypoCorrection && searchResponse.correctedQuery && (
                  <div className="px-3.5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        {language === 'hi' ? 'स्वतः सुधारा गया:' : 'Auto-corrected:'}{' '}
                        <strong className="text-blue-700 font-extrabold underline">
                          "{searchResponse.correctedQuery}"
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-900 font-bold px-2 py-0.5 bg-blue-100 rounded-full shrink-0">
                      Typo Tolerant
                    </span>
                  </div>
                )}

                {/* Results List */}
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map((item, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          id={`search-item-${item.id}`}
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5 cursor-pointer transition ${
                            isSelected ? 'bg-blue-50 text-blue-950' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {language === 'hi' && item.hindiTitle ? item.hindiTitle : item.title}
                                </p>
                                {item.badgeText && (
                                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 border border-blue-200 rounded text-[9px] font-bold shrink-0">
                                    {item.badgeText}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 font-medium">
                                {item.floor && <span className="font-bold text-blue-600">{item.floor} •</span>}
                                <span>{item.subtitle}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleStartNav(e, item)}
                              title={language === 'hi' ? 'यहाँ के लिए रास्ता शुरू करें' : 'Start Navigation'}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-[10px] flex items-center gap-1 shadow-sm transition active:scale-95 ios-press cursor-pointer"
                            >
                              <Navigation className="w-2.5 h-2.5 shrink-0 fill-white" />
                              <span className="hidden sm:inline">{language === 'hi' ? 'दिशा' : 'Route'}</span>
                            </button>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="p-4 text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-900">
                      {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No exact match found'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {language === 'hi'
                        ? 'कृपया "uiet", "canteen", "library", "admin", "gate 1" टाइप करें'
                        : 'Try searching "UIET", "CSE", "Library", "Canteen", "Gate 1"'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 space-y-2.5 bg-slate-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{language === 'hi' ? 'लोकप्रिय कैंपस शॉर्टकट' : 'Popular Campus Shortcuts'}</span>
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {language === 'hi' ? 'तुरंत खोजें' : 'Quick Jump'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_QUICK_SEARCHES.map((qs) => (
                        <button
                          key={qs.query}
                          type="button"
                          onClick={() => {
                            setSearchQuery(qs.query);
                            searchInputRef.current?.focus();
                          }}
                          className="group px-3 py-1.5 bg-white hover:bg-blue-600 active:bg-blue-700 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all ios-press cursor-pointer"
                        >
                          <span className="text-sm shrink-0">{qs.icon}</span>
                          <span className="font-semibold tracking-tight">{qs.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Tools & Controls */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">

            {/* App Download Pill */}
            <button
              id="btn-nav-download-app"
              onClick={onOpenDownloadApp}
              className="h-8 px-2.5 sm:px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold transition ios-press flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
              title="Download CSJMU App on Phone"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="hidden md:inline text-[11px] font-bold">
                {language === 'hi' ? 'ऐप' : 'App'}
              </span>
            </button>

            {/* Report Bugs Pill */}
            <button
              id="btn-nav-report-bug"
              onClick={onOpenReportBug}
              className="h-8 w-8 sm:w-auto sm:px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition ios-press flex items-center justify-center gap-1 shrink-0"
              title="Report Bug / Location Feedback"
            >
              <Bug className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="hidden md:inline text-[11px]">{language === 'hi' ? 'शिकायत' : 'Report'}</span>
            </button>

            {/* Language Switcher Pill */}
            <button
              id="btn-nav-toggle-lang"
              onClick={() => onToggleLanguage()}
              className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-full text-[11px] font-bold transition ios-press shrink-0 flex items-center justify-center min-w-[34px]"
              title={language === 'en' ? 'Switch to Hindi' : 'अंग्रेज़ी में बदलें'}
            >
              {language === 'en' ? 'हिन्दी' : 'EN'}
            </button>

            {/* Map Style Selector Dropdown */}
            <div className="relative shrink-0">
              <button
                id="btn-nav-map-styles"
                onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full text-xs transition ios-press flex items-center justify-center shrink-0"
                title={t.layers}
              >
                <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              </button>
              {isStyleMenuOpen && (
                <div
                  id="map-style-menu"
                  className="absolute right-0 top-full mt-2 w-36 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 p-1 divide-y divide-slate-100 text-xs text-slate-800"
                >
                  <button
                    onClick={() => {
                      onChangeMapStyle('streets');
                      setIsStyleMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left rounded-xl transition ${
                      mapStyle === 'streets' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    🗺️ {t.streets}
                  </button>
                  <button
                    onClick={() => {
                      onChangeMapStyle('satellite');
                      setIsStyleMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left rounded-xl transition ${
                      mapStyle === 'satellite' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    🛰️ {t.satellite}
                  </button>
                </div>
              )}
            </div>

            {/* Admin / Portal Login Pill */}
            <button
              id="btn-nav-admin-mode"
              onClick={onOpenAdminManager}
              className={`h-8 px-2.5 rounded-full text-[11px] font-bold transition border flex items-center justify-center gap-1.5 shrink-0 ios-press ${
                isAdminUnlocked
                  ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs'
                  : loggedInTeacher
                  ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={
                isAdminUnlocked
                  ? 'Admin Portal (Unlocked)'
                  : loggedInTeacher
                  ? `Faculty Portal: ${loggedInTeacher.name}`
                  : 'Admin & Faculty Login Portal'
              }
            >
              {isAdminUnlocked ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="hidden sm:inline">Admin</span>
                </>
              ) : loggedInTeacher ? (
                <>
                  <GraduationCap className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="hidden sm:inline">{loggedTeacherShortName(loggedInTeacher.name)}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="hidden sm:inline">{language === 'hi' ? 'एडमिन' : 'Portal'}</span>
                </>
              )}
            </button>

            {/* GPS My Location Button (Google Maps Blue) */}
            <button
              id="btn-gps-my-location"
              onClick={onGetGpsLocation}
              className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition ios-press shadow-md shadow-blue-600/20 border border-blue-500 flex items-center justify-center shrink-0"
              title={t.myLocation}
            >
              <Crosshair className="w-4 h-4 text-white shrink-0" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mt-2 md:hidden relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <input
            ref={mobileSearchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === 'hi'
                ? 'कैंपस में खोजें (uiet, canteen, lib)...'
                : 'Search campus (uiet, canteen, library)...'
            }
            className="w-full h-8 bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-full pl-8.5 pr-8 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedIndex(-1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full ios-press"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}

          {/* Mobile Autocomplete Dropdown */}
          {isSearchOpen && (
            <div
              ref={searchDropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs text-slate-800"
            >
              {/* Typo Correction notice */}
              {searchResponse.hasTypoCorrection && searchResponse.correctedQuery && (
                <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-bold">
                  <span className="flex items-center gap-1 truncate">
                    <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>
                      {language === 'hi' ? 'स्वतः सुधारा:' : 'Auto-corrected:'}{' '}
                      <strong className="text-blue-700 font-extrabold">"{searchResponse.correctedQuery}"</strong>
                    </span>
                  </span>
                  <span className="text-[9px] bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded font-bold">
                    Typo Fixed
                  </span>
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={`mob-${item.type}-${item.id}`}
                      onClick={() => handleSelectItem(item)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 text-xs flex items-center justify-between gap-2 transition cursor-pointer text-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {language === 'hi' && item.hindiTitle ? item.hindiTitle : item.title}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate font-medium">
                            {item.floor ? `${item.floor} • ` : ''}
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartNav(e, item)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-[10px] flex items-center gap-0.5 shadow-xs ios-press cursor-pointer"
                        >
                          <Navigation className="w-2.5 h-2.5 fill-white" />
                          <span>{language === 'hi' ? 'दिशा' : 'Go'}</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-3 text-center text-xs text-slate-500 font-semibold">
                  {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No results found'}
                </div>
              ) : (
                <div className="p-3.5 space-y-2 bg-slate-50/70">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>{language === 'hi' ? 'लोकप्रिय कैंपस शॉर्टकट' : 'Popular Shortcuts'}</span>
                    </span>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full">
                      {language === 'hi' ? 'तुरंत खोजें' : 'Quick Jump'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_QUICK_SEARCHES.slice(0, 7).map((qs) => (
                      <button
                        key={`mob-qs-${qs.query}`}
                        type="button"
                        onClick={() => {
                          setSearchQuery(qs.query);
                          mobileSearchInputRef.current?.focus();
                        }}
                        className="group px-2.5 py-1 bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-all ios-press cursor-pointer"
                      >
                        <span className="text-xs shrink-0">{qs.icon}</span>
                        <span>{qs.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

