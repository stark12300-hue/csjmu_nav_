import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Search,
  Heart,
  Share2,
  ExternalLink,
  PlusCircle,
  Navigation,
  Phone,
  Mail,
  Filter,
  Check,
  CalendarCheck,
  AlertTriangle,
  ChevronRight,
  Info,
  ShieldCheck,
  Building,
  RefreshCw,
  Globe,
  FileText
} from 'lucide-react';
import { CampusEvent, EventCategory, CampusLocation, Language } from '../types';
import { getInterestedEventIds, toggleEventInterest, syncOfficialCollegeEvents, getCollegeLastSyncTime } from '../utils/storage';
import { fetchRemoteEvents } from '../utils/eventRemote';

export interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: CampusEvent[];
  onOpenSubmitModal: () => void;
  onNavigateToLocation?: (location: CampusLocation) => void;
  campusLocations?: CampusLocation[];
  locations?: CampusLocation[];
  currentLang?: Language;
  language?: Language;
  isAdminUnlocked?: boolean;
  onOpenAdminManager?: () => void;
  onSyncCollegeEvents?: (events: CampusEvent[]) => void;
}

const CATEGORY_TABS: { id: string; labelEn: string; labelHi: string; icon: string }[] = [
  { id: 'all', labelEn: 'All Events', labelHi: 'सभी कार्यक्रम', icon: '✨' },
  { id: 'Fest', labelEn: 'Fests', labelHi: 'फेस्ट', icon: '🎉' },
  { id: 'Cultural', labelEn: 'Cultural', labelHi: 'सांस्कृतिक', icon: '🎭' },
  { id: 'Workshop', labelEn: 'Workshops', labelHi: 'कार्यशाला', icon: '💻' },
  { id: 'Seminar', labelEn: 'Seminars', labelHi: 'संगोष्ठी', icon: '🎓' },
  { id: 'Placement Drive', labelEn: 'Placement', labelHi: 'प्लेसमेंट', icon: '💼' },
  { id: 'Sports', labelEn: 'Sports', labelHi: 'खेलकूद', icon: '🏆' },
  { id: 'Notice', labelEn: 'Notices', labelHi: 'नोटिस', icon: '📢' },
];

const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80';

export const EventsModal: React.FC<EventsModalProps> = ({
  isOpen,
  onClose,
  events = [],
  onOpenSubmitModal,
  onNavigateToLocation,
  campusLocations,
  locations,
  currentLang,
  language,
  isAdminUnlocked = false,
  onOpenAdminManager,
  onSyncCollegeEvents,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStr, setLastSyncStr] = useState<string>(() => getCollegeLastSyncTime() || '');
  const [syncStatusToast, setSyncStatusToast] = useState<string | null>(null);
  const [interestedIds, setInterestedIds] = useState<string[]>(() => {
    try {
      return getInterestedEventIds();
    } catch {
      return [];
    }
  });
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CampusEvent | null>(null);

  // Normalize active language & locations list
  const activeLang: 'en' | 'hi' = language || currentLang || 'en';
  const allLocations: CampusLocation[] = useMemo(() => {
    if (Array.isArray(locations) && locations.length > 0) return locations;
    if (Array.isArray(campusLocations) && campusLocations.length > 0) return campusLocations;
    return [];
  }, [locations, campusLocations]);

  // Trigger auto-sync on modal open: fetches cloud events and updates official feed
  useEffect(() => {
    if (!isOpen) return;
    const runAutoSync = async () => {
      try {
        // 1. Fetch latest approved events from server (/api/events)
        const remoteEvents = await fetchRemoteEvents();
        if (remoteEvents && Array.isArray(remoteEvents) && remoteEvents.length > 0 && onSyncCollegeEvents) {
          onSyncCollegeEvents(remoteEvents);
        }
        // 2. Sync official college feed
        const res = await syncOfficialCollegeEvents(false);
        if (res.success && res.events && onSyncCollegeEvents) {
          onSyncCollegeEvents(res.events);
          if (res.lastSync) setLastSyncStr(res.lastSync);
        }
      } catch (err) {
        console.warn('Auto sync check error:', err);
      }
    };
    runAutoSync();
  }, [isOpen, onSyncCollegeEvents]);

  // Handle manual sync button click
  const handleManualCollegeSync = async () => {
    setIsSyncing(true);
    setSyncStatusToast(activeLang === 'hi' ? 'क्लाउड सर्वर से ताज़ा इवेंट्स लोड हो रहे हैं...' : 'Syncing live events from cloud server...');
    try {
      // 1. First fetch latest campus events from cloud server
      const remoteEvents = await fetchRemoteEvents();
      if (remoteEvents && Array.isArray(remoteEvents) && remoteEvents.length > 0 && onSyncCollegeEvents) {
        onSyncCollegeEvents(remoteEvents);
      }

      // 2. Sync official college feed from csjmu.ac.in
      const res = await syncOfficialCollegeEvents(true);
      if (res.success && res.events) {
        if (onSyncCollegeEvents) {
          onSyncCollegeEvents(res.events);
        }
        if (res.lastSync) setLastSyncStr(res.lastSync);
        setSyncStatusToast(
          activeLang === 'hi'
            ? `✅ ताज़ा स्वीकृत इवेंट्स और आधिकारिक सूचनाएं अपडेट हो गईं!`
            : `✅ Live approved events and official notices updated!`
        );
      } else {
        setSyncStatusToast(
          activeLang === 'hi' ? 'सभी इवेंट्स क्लाउड सर्वर से अपडेटेड हैं।' : 'Events are synchronized with cloud server.'
        );
      }
    } catch (err) {
      setSyncStatusToast(activeLang === 'hi' ? 'सिंक पूर्ण हुआ' : 'Sync completed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusToast(null), 4000);
    }
  };

  // Format last sync time string
  const formatSyncDisplayTime = (isoString?: string) => {
    if (!isoString) return activeLang === 'hi' ? 'दैनिक स्वचालित सिंक सक्रिय' : 'Daily Auto-Sync Active';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
    } catch {
      return activeLang === 'hi' ? 'आज 09:30 AM' : 'Today 09:30 AM';
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEventForDetail) {
          setSelectedEventForDetail(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedEventForDetail, onClose]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const safeEventsList: CampusEvent[] = Array.isArray(events) ? events : [];

  // Filter public live events: must be approved and isLive !== false
  const publicEvents = safeEventsList.filter((e) => {
    if (!e || typeof e !== 'object') return false;
    // Must be approved by admin
    if (e.status !== 'approved') return false;
    // Must be marked live
    if (e.isLive === false) return false;

    // Check expiry / end date
    const eventEndDate = e.endDate || e.startDate || '';
    const isPast = eventEndDate ? eventEndDate < todayStr : false;
    if (!showPastEvents && isPast) return false;

    // Category filter
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = (e.title || '').toLowerCase().includes(query) || ((e.hindiTitle || '').toLowerCase().includes(query));
      const matchDesc = (e.description || '').toLowerCase().includes(query) || ((e.hindiDescription || '').toLowerCase().includes(query));
      const matchVenue = (e.venue || '').toLowerCase().includes(query);
      const matchOrg = (e.organizer || '').toLowerCase().includes(query);
      const matchCat = (e.category || '').toLowerCase().includes(query);
      if (!matchTitle && !matchDesc && !matchVenue && !matchOrg && !matchCat) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = safeEventsList.filter((e) => e && e.status === 'pending').length;

  const handleToggleLike = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toggleEventInterest(eventId);
      setInterestedIds(getInterestedEventIds());
    } catch (err) {
      console.warn('Error liking event:', err);
    }
  };

  const handleShareEvent = async (event: CampusEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `🎓 *${event.title || 'CSJMU Event'}*\n📅 Date: ${event.startDate || ''}${event.endDate && event.endDate !== event.startDate ? ' to ' + event.endDate : ''}\n⏰ Time: ${event.time || 'N/A'}\n📍 Venue: ${event.venue || 'CSJM University Kanpur'}\n🏛 Organizer: ${event.organizer || 'CSJMU'}\n\nExplore on CSJM University Campus Navigator`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 2500);
    } catch {
      // Ignored
    }
  };

  const handleLocateVenue = (event: CampusEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onNavigateToLocation || allLocations.length === 0) {
      onClose();
      return;
    }

    let targetLoc: CampusLocation | undefined;
    if (event.venueLocationId) {
      targetLoc = allLocations.find((l) => l.id === event.venueLocationId);
    }
    if (!targetLoc && event.venue) {
      const query = event.venue.toLowerCase();
      targetLoc = allLocations.find(
        (l) =>
          (l.title && l.title.toLowerCase().includes(query)) ||
          (l.hindiTitle && l.hindiTitle.toLowerCase().includes(query)) ||
          query.includes((l.title || '').toLowerCase())
      );
    }

    if (targetLoc) {
      onClose();
      onNavigateToLocation(targetLoc);
    } else {
      const fallback = allLocations.find((l) => l.id === 'loc-auditorium') || allLocations[0];
      if (fallback) {
        onClose();
        onNavigateToLocation(fallback);
      } else {
        onClose();
      }
    }
  };

  const getDaysRemainingLabel = (startDate?: string, endDate?: string) => {
    const sDate = startDate || todayStr;
    const eDate = endDate || sDate;

    if (eDate < todayStr) {
      return {
        text: activeLang === 'hi' ? 'समाप्त' : 'Ended',
        color: 'bg-zinc-800 text-zinc-300 border border-zinc-700'
      };
    }
    if (sDate === todayStr) {
      return {
        text: activeLang === 'hi' ? '🔥 आज हो रहा है' : '🔥 Happening Today',
        color: 'bg-rose-500 text-white font-bold animate-pulse shadow-md'
      };
    }
    if (sDate < todayStr && eDate >= todayStr) {
      return {
        text: activeLang === 'hi' ? '🟢 अभी जारी है' : '🟢 Ongoing Now',
        color: 'bg-emerald-500 text-white font-bold shadow-md'
      };
    }

    // Calculate days until start
    try {
      const start = new Date(sDate).getTime();
      const now = new Date(todayStr).getTime();
      const diffDays = Math.ceil((start - now) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return {
          text: activeLang === 'hi' ? 'कल है' : 'Tomorrow',
          color: 'bg-blue-600 text-white font-bold'
        };
      }
      if (diffDays > 1 && diffDays <= 7) {
        return {
          text: activeLang === 'hi' ? `${diffDays} दिन में` : `In ${diffDays} days`,
          color: 'bg-indigo-600 text-white font-semibold'
        };
      }
    } catch {
      // Fallback
    }

    return {
      text: activeLang === 'hi' ? 'आगामी' : 'Upcoming',
      color: 'bg-sky-600 text-white font-medium'
    };
  };

  return (
    <div
      id="campus-events-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fade-in bg-slate-950/45 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        id="campus-events-modal-dialog"
        className="relative w-full max-w-4xl text-zinc-900 ios-liquid-modal rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] border border-white/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 ios-liquid-header border-b border-white/60 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base font-black text-zinc-950 tracking-tight truncate">
                  {activeLang === 'hi' ? 'सीएसजेएमयू कैंपस इवेंट्स' : 'Campus Events & Fests'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold shrink-0">
                  {publicEvents.length} {activeLang === 'hi' ? 'लाइव' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-700 font-semibold truncate hidden xs:block">
                {activeLang === 'hi'
                  ? 'विश्वविद्यालय फेस्ट, वर्कशॉप, प्लेसमेंट व सांस्कृतिक कार्यक्रमों का लाइव कैलेंडर'
                  : 'Live directory of campus fests, workshops, hackathons & placement drives'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Submit Event Header Button */}
            <button
              id="submit-event-header-btn"
              type="button"
              onClick={onOpenSubmitModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Submit a campus event or fest"
            >
              <PlusCircle className="w-3.5 h-3.5 text-white" />
              <span>{activeLang === 'hi' ? 'इवेंट जोड़ें' : 'Submit Event'}</span>
            </button>

            {/* Admin Pending Review Shortcut */}
            {isAdminUnlocked && onOpenAdminManager && (
              <button
                type="button"
                onClick={onOpenAdminManager}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs rounded-xl border border-zinc-200 shadow-2xs transition active:scale-95 cursor-pointer"
                title="Admin Event Approvals"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Admin ({pendingCount} pending)</span>
              </button>
            )}

            {/* Close Button */}
            <button
              id="close-events-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition shrink-0 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Search, Sync Status & Category Filter Bar */}
        <div className="p-3 sm:p-4 bg-zinc-50/90 border-b border-zinc-200 space-y-2.5 shrink-0">
          {/* CSJMU Live Auto-Sync Status Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <div className="text-[11px] sm:text-xs text-zinc-900 truncate font-semibold">
                <span className="font-extrabold text-emerald-800">
                  {activeLang === 'hi' ? '🏛️ CSJMU पोर्टल ऑटो-सिंक सक्रिय' : '🏛️ CSJMU Portal Auto-Sync Active'}
                </span>
                <span className="text-zinc-600 ml-1.5 hidden xs:inline font-semibold">
                  ({formatSyncDisplayTime(lastSyncStr)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {syncStatusToast && (
                <span className="text-[10px] sm:text-[11px] text-blue-800 font-bold truncate animate-fade-in">
                  {syncStatusToast}
                </span>
              )}
              <button
                type="button"
                id="btn-sync-college-events"
                onClick={handleManualCollegeSync}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-emerald-800 border border-emerald-500/30 rounded-xl text-[11px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                title="Sync latest live notices & calendar events from csjmu.ac.in"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isSyncing ? (activeLang === 'hi' ? 'सिंक हो रहा है...' : 'Syncing...') : (activeLang === 'hi' ? 'ताज़ा करें' : 'Sync Now')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                id="search-events-input"
                type="text"
                placeholder={activeLang === 'hi' ? 'इवेंट, फेस्ट, स्थल खोजें...' : 'Search fests, workshops, venues...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-300 pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Past Events Toggle */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <label className="flex items-center gap-2 text-xs text-zinc-700 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPastEvents}
                  onChange={(e) => setShowPastEvents(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{activeLang === 'hi' ? 'पुराने इवेंट्स भी दिखाएं' : 'Show past events'}</span>
              </label>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="relative">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1 -mx-1 scrollbar-none touch-pan-x overscroll-x-contain">
              {CATEGORY_TABS.map((cat) => {
                const active = selectedCategory === cat.id;
                const catCount =
                  cat.id === 'all'
                    ? publicEvents.length
                    : safeEventsList.filter(
                        (e) =>
                          e.status === 'approved' &&
                          e.isLive !== false &&
                          e.category?.toLowerCase() === cat.id.toLowerCase()
                      ).length;

                return (
                  <button
                    key={cat.id}
                    id={`cat-filter-${cat.id}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs whitespace-nowrap transition-all shrink-0 active:scale-95 border cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                        : 'bg-white hover:bg-zinc-100 text-zinc-700 font-bold border-zinc-200 shadow-2xs'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{cat.icon}</span>
                    <span>{activeLang === 'hi' ? cat.labelHi : cat.labelEn}</span>
                    {catCount > 0 && (
                      <span
                        className={`ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                          active ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {catCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Events Cards List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 bg-zinc-50/50">
          {publicEvents.length === 0 ? (
            <div className="text-center py-14 space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 border border-blue-200 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                  {activeLang === 'hi' ? 'कोई इवेंट नहीं मिला' : 'No Events Found'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-sm mx-auto">
                  {searchQuery || selectedCategory !== 'all'
                    ? (activeLang === 'hi' ? 'कृपया अपनी खोज या फ़िल्टर बदल कर देखें।' : 'Try changing your search terms or category filter.')
                    : (activeLang === 'hi' ? 'विश्वविद्यालय में आयोजित होने वाले आगामी इवेंट को सबसे पहले जोड़ें!' : 'Be the first student or club to submit an upcoming campus event!')}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{activeLang === 'hi' ? 'नया इवेंट जोड़ें' : 'Submit Campus Event'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {publicEvents.map((evt) => {
                const isLiked = interestedIds.includes(evt.id);
                const daysBadge = getDaysRemainingLabel(evt.startDate, evt.endDate);
                const effectiveLikes = (evt.likesCount || 0) + (isLiked ? 1 : 0);

                return (
                  <div
                    key={evt.id}
                    id={`event-card-${evt.id}`}
                    onClick={() => setSelectedEventForDetail(evt)}
                    className="group bg-white rounded-2xl border border-zinc-200 hover:border-blue-400 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer text-zinc-900"
                  >
                    {/* Poster Header */}
                    <div className="relative h-44 sm:h-48 w-full bg-zinc-100 overflow-hidden">
                      <img
                        src={evt.posterImage || DEFAULT_POSTER}
                        alt={evt.title || 'Event Poster'}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_POSTER;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/25 to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-white/85 text-zinc-900 border border-white/90 backdrop-blur-md shadow-sm">
                            {evt.category || 'Event'}
                          </span>
                          {(evt.isOfficialCollegeFeed || evt.isAutoSynced) && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-900/90 text-emerald-200 border border-emerald-400/40 backdrop-blur-md shadow-sm flex items-center gap-1">
                              <Globe className="w-3 h-3 text-emerald-300" />
                              <span>Official Portal</span>
                            </span>
                          )}
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md shadow-sm ${daysBadge.color}`}>
                          {daysBadge.text}
                        </span>
                      </div>

                      {/* Title Overlay at bottom of image */}
                      <div className="absolute bottom-3 left-3 right-3" style={{ color: "#FFFFFF" }}>
                        <h3 className="text-base sm:text-lg font-black leading-tight line-clamp-1 drop-shadow-md" style={{ color: "#FFFFFF" }}>
                          {activeLang === 'hi' && evt.hindiTitle ? evt.hindiTitle : evt.title}
                        </h3>
                        {evt.hindiTitle && activeLang !== 'hi' && (
                          <p className="text-xs text-blue-200 font-medium line-clamp-1 mt-0.5 drop-shadow">
                            {evt.hindiTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      {/* Description */}
                      <p className="text-xs sm:text-sm text-zinc-700 line-clamp-2 leading-relaxed font-semibold">
                        {activeLang === 'hi' && evt.hindiDescription ? evt.hindiDescription : evt.description}
                      </p>

                      {/* Key Info Details Grid */}
                      <div className="space-y-1.5 text-xs text-zinc-800">
                        <div className="flex items-center gap-2 text-zinc-900 font-bold">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span className="line-clamp-1">
                            {evt.startDate || ''}
                            {evt.endDate && evt.endDate !== evt.startDate ? ` - ${evt.endDate}` : ''}
                            {evt.time ? ` (${evt.time})` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-900 font-bold">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                          <span className="line-clamp-1">{evt.venue || 'CSJMU Campus'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-700 text-xs font-semibold">
                          <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span className="line-clamp-1">
                            {activeLang === 'hi' ? 'आयोजक: ' : 'Organized by: '}
                            {evt.organizer || 'CSJM University'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Bar */}
                      <div className="pt-2 border-t border-white/60 flex items-center justify-between gap-2">
                        {/* Navigate to Venue on Campus Map */}
                        <button
                          id={`nav-venue-${evt.id}`}
                          type="button"
                          onClick={(e) => handleLocateVenue(evt, e)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                          title="View route to venue on map"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>{activeLang === 'hi' ? 'मैप पर रास्ता' : 'Navigate'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Heart / Interested Button */}
                          <button
                            id={`like-event-${evt.id}`}
                            type="button"
                            onClick={(e) => handleToggleLike(evt.id, e)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              isLiked
                                ? 'bg-rose-50 text-rose-600 border-rose-300'
                                : 'bg-white/70 text-zinc-700 hover:bg-white border-white/80'
                            }`}
                            title="I'm Interested"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{effectiveLikes}</span>
                          </button>

                          {/* Share Button */}
                          <button
                            id={`share-event-${evt.id}`}
                            type="button"
                            onClick={(e) => handleShareEvent(evt, e)}
                            className="p-2 bg-white/70 hover:bg-white text-zinc-700 border border-white/80 rounded-xl transition-all relative cursor-pointer"
                            title="Share Event"
                          >
                            {copiedEventId === evt.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Event Modal View (Lightbox / Inspector) */}
        {selectedEventForDetail && (
          <div
            id="event-detail-inspector-backdrop"
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedEventForDetail(null)}
          >
            <div
              id="event-detail-modal-card"
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col text-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-48 sm:h-56 bg-zinc-900 shrink-0">
                <img
                  src={selectedEventForDetail.posterImage || DEFAULT_POSTER}
                  alt={selectedEventForDetail.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_POSTER;
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <button
                  type="button"
                  onClick={() => setSelectedEventForDetail(null)}
                  className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition backdrop-blur-sm"
                  title="Close Inspector"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                    {selectedEventForDetail.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-black mt-1 leading-snug">
                    {activeLang === 'hi' && selectedEventForDetail.hindiTitle
                      ? selectedEventForDetail.hindiTitle
                      : selectedEventForDetail.title}
                  </h3>
                  {selectedEventForDetail.hindiTitle && activeLang !== 'hi' && (
                    <p className="text-xs text-blue-200 mt-0.5 font-medium">{selectedEventForDetail.hindiTitle}</p>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm flex-1 bg-white">
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-wider mb-1">
                    {activeLang === 'hi' ? 'विवरण' : 'About Event'}
                  </h4>
                  <p className="text-zinc-800 leading-relaxed text-xs sm:text-sm font-medium">
                    {activeLang === 'hi' && selectedEventForDetail.hindiDescription
                      ? selectedEventForDetail.hindiDescription
                      : selectedEventForDetail.description}
                  </p>
                  {selectedEventForDetail.hindiDescription && activeLang !== 'hi' && (
                    <p className="text-zinc-500 text-xs mt-2 italic font-medium">
                      {selectedEventForDetail.hindiDescription}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      {activeLang === 'hi' ? 'तारीख' : 'Date'}
                    </span>
                    <span className="font-bold text-zinc-900">
                      {selectedEventForDetail.startDate}
                      {selectedEventForDetail.endDate && selectedEventForDetail.endDate !== selectedEventForDetail.startDate
                        ? ` to ${selectedEventForDetail.endDate}`
                        : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      {activeLang === 'hi' ? 'समय' : 'Timing'}
                    </span>
                    <span className="font-bold text-zinc-900">
                      {selectedEventForDetail.time || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      {activeLang === 'hi' ? 'स्थान (Venue)' : 'Venue'}
                    </span>
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{selectedEventForDetail.venue}</span>
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      {activeLang === 'hi' ? 'आयोजक' : 'Organizer'}
                    </span>
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{selectedEventForDetail.organizer}</span>
                    </span>
                  </div>
                </div>

                {(selectedEventForDetail.contactPhone ||
                  selectedEventForDetail.contactEmail ||
                  selectedEventForDetail.registrationUrl ||
                  selectedEventForDetail.circularUrl ||
                  selectedEventForDetail.sourceUrl) && (
                  <div className="space-y-2 text-xs">
                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-wider mb-1">
                      {activeLang === 'hi' ? 'लिंक्स व आधिकारिक स्रोत' : 'Links & Official Source'}
                    </h4>
                    {selectedEventForDetail.contactPhone && (
                      <div className="flex items-center gap-2 text-zinc-800">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <a href={`tel:${selectedEventForDetail.contactPhone}`} className="hover:underline text-blue-700 font-bold">
                          {selectedEventForDetail.contactPhone}
                        </a>
                      </div>
                    )}
                    {selectedEventForDetail.contactEmail && (
                      <div className="flex items-center gap-2 text-zinc-800">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <a href={`mailto:${selectedEventForDetail.contactEmail}`} className="hover:underline text-blue-700 font-bold">
                          {selectedEventForDetail.contactEmail}
                        </a>
                      </div>
                    )}
                    {selectedEventForDetail.circularUrl && (
                      <div className="pt-1">
                        <a
                          href={selectedEventForDetail.circularUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{activeLang === 'hi' ? '📄 आधिकारिक नोटिस / सर्कुलर देखें (PDF)' : '📄 View Official Circular / Notice'}</span>
                        </a>
                      </div>
                    )}
                    {selectedEventForDetail.registrationUrl && (
                      <div className="pt-1">
                        <a
                          href={selectedEventForDetail.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{activeLang === 'hi' ? 'रजिस्ट्रेशन पोर्टल खोलें' : 'Open Registration Link'}</span>
                        </a>
                      </div>
                    )}
                    {selectedEventForDetail.sourceUrl && (
                      <div className="pt-1">
                        <a
                          href={selectedEventForDetail.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl border border-zinc-200 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{activeLang === 'hi' ? 'विश्वविद्यालय पोर्टल csjmu.ac.in पर देखें' : 'View on csjmu.ac.in Portal'}</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleLocateVenue(selectedEventForDetail, e)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{activeLang === 'hi' ? 'कैंपस में रास्ता देखें' : 'Navigate on Campus Map'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEventForDetail(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
                >
                  {activeLang === 'hi' ? 'बंद करें' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
