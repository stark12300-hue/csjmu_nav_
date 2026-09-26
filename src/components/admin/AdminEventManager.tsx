import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Power,
  Search,
  PlusCircle,
  Eye,
  User,
  Phone,
  BookOpen,
  MapPin,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Image as ImageIcon,
  RefreshCw,
  Globe
} from 'lucide-react';
import { CampusEvent, EventCategory, CampusLocation } from '../../types';
import { syncOfficialCollegeEvents, getCollegeLastSyncTime } from '../../utils/storage';
import { fetchRemoteEvents } from '../../utils/eventRemote';

interface AdminEventManagerProps {
  events: CampusEvent[];
  onApproveEvent: (eventId: string) => void;
  onRejectEvent: (eventId: string, reason?: string) => void;
  onToggleLiveEvent: (eventId: string) => void;
  onBatchToggleLiveEvents?: (eventIds: string[], isLive: boolean) => void;
  onUpdateEvent: (event: CampusEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddEvent: (event: CampusEvent) => void;
  campusLocations: CampusLocation[];
  currentLang: 'en' | 'hi';
  onSyncCollegeEvents?: (events: CampusEvent[]) => void;
}

export const AdminEventManager: React.FC<AdminEventManagerProps> = ({
  events,
  onApproveEvent,
  onRejectEvent,
  onToggleLiveEvent,
  onBatchToggleLiveEvents,
  onUpdateEvent,
  onDeleteEvent,
  onAddEvent,
  campusLocations,
  currentLang,
  onSyncCollegeEvents,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Multi-event selection & batch toggle states
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [togglingEventIds, setTogglingEventIds] = useState<Set<string>>(new Set());

  // Handle single toggle safely with loading indicator
  const handleSingleToggle = async (eventId: string) => {
    setTogglingEventIds((prev) => new Set(prev).add(eventId));
    try {
      await onToggleLiveEvent(eventId);
    } finally {
      setTimeout(() => {
        setTogglingEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }, 400);
    }
  };

  // Toggle selection for an event
  const toggleSelectEvent = (id: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all
  const toggleSelectAll = (filteredList: CampusEvent[]) => {
    if (selectedEventIds.size >= filteredList.length && filteredList.length > 0) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(filteredList.map((e) => e.id)));
    }
  };

  // Execute multi-event popup / live status toggle
  const handleBatchToggleLive = async (targetLive: boolean) => {
    const ids = Array.from(selectedEventIds);
    if (ids.length === 0) return;
    setIsBatchProcessing(true);
    try {
      if (onBatchToggleLiveEvents) {
        await onBatchToggleLiveEvents(ids, targetLive);
      } else {
        for (const id of ids) {
          await onToggleLiveEvent(id);
        }
      }
      setSelectedEventIds(new Set());
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Sync latest cloud events on mount
  useEffect(() => {
    fetchRemoteEvents().then((remoteEvents) => {
      if (remoteEvents && remoteEvents.length > 0 && onSyncCollegeEvents) {
        onSyncCollegeEvents(remoteEvents);
      }
    });
  }, [onSyncCollegeEvents]);

  // New/Edit Event Form State
  const [formTitle, setFormTitle] = useState('');
  const [formHindiTitle, setFormHindiTitle] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('Fest');
  const [formDescription, setFormDescription] = useState('');
  const [formHindiDescription, setFormHindiDescription] = useState('');
  const [formPosterImage, setFormPosterImage] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formVenueLocationId, setFormVenueLocationId] = useState('');
  const [formOrganizer, setFormOrganizer] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formRegistrationUrl, setFormRegistrationUrl] = useState('');

  const pendingEvents = events.filter((e) => e.status === 'pending');
  const approvedEvents = events.filter((e) => e.status === 'approved');
  const rejectedEvents = events.filter((e) => e.status === 'rejected');

  const filteredEvents = events.filter((e) => {
    if (activeTab === 'pending' && e.status !== 'pending') return false;
    if (activeTab === 'approved' && e.status !== 'approved') return false;
    if (activeTab === 'rejected' && e.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q) || (e.hindiTitle && e.hindiTitle.toLowerCase().includes(q));
      const matchStudent = e.submittedByStudentName?.toLowerCase().includes(q) || e.studentRollNo?.toLowerCase().includes(q);
      const matchOrg = e.organizer.toLowerCase().includes(q);
      const matchVenue = e.venue.toLowerCase().includes(q);
      return matchTitle || matchStudent || matchOrg || matchVenue;
    }
    return true;
  });

  const startEditEvent = (evt: CampusEvent) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormHindiTitle(evt.hindiTitle || '');
    setFormCategory(evt.category);
    setFormDescription(evt.description);
    setFormHindiDescription(evt.hindiDescription || '');
    setFormPosterImage(evt.posterImage || '');
    setFormStartDate(evt.startDate);
    setFormEndDate(evt.endDate);
    setFormTime(evt.time || '');
    setFormVenue(evt.venue);
    setFormVenueLocationId(evt.venueLocationId || '');
    setFormOrganizer(evt.organizer);
    setFormContactPhone(evt.contactPhone || '');
    setFormContactEmail(evt.contactEmail || '');
    setFormRegistrationUrl(evt.registrationUrl || '');
    setIsAddingNew(false);
  };

  const startAddNewEvent = () => {
    setIsAddingNew(true);
    setEditingEvent(null);
    setFormTitle('');
    setFormHindiTitle('');
    setFormCategory('Fest');
    setFormDescription('');
    setFormHindiDescription('');
    setFormPosterImage('https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(new Date().toISOString().split('T')[0]);
    setFormTime('10:00 AM - 04:00 PM');
    setFormVenue('Main University Auditorium');
    setFormVenueLocationId('loc-auditorium');
    setFormOrganizer('CSJM University Administration');
    setFormContactPhone('');
    setFormContactEmail('');
    setFormRegistrationUrl('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate || !formEndDate || !formVenue.trim()) return;

    if (isAddingNew) {
      const newEvt: CampusEvent = {
        id: `evt-admin-${Date.now()}`,
        title: formTitle.trim(),
        hindiTitle: formHindiTitle.trim() || undefined,
        category: formCategory,
        description: formDescription.trim(),
        hindiDescription: formHindiDescription.trim() || undefined,
        posterImage: formPosterImage.trim() || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
        startDate: formStartDate,
        endDate: formEndDate,
        time: formTime.trim() || 'All Day',
        venue: formVenue.trim(),
        venueLocationId: formVenueLocationId || undefined,
        organizer: formOrganizer.trim() || 'CSJMU Admin',
        contactPhone: formContactPhone.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        registrationUrl: formRegistrationUrl.trim() || undefined,
        status: 'approved',
        isLive: true,
        approvedAt: new Date().toISOString(),
        createdAt: Date.now(),
        likesCount: 5,
        isCustom: true,
      };
      onAddEvent(newEvt);
      setIsAddingNew(false);
    } else if (editingEvent) {
      const updated: CampusEvent = {
        ...editingEvent,
        title: formTitle.trim(),
        hindiTitle: formHindiTitle.trim() || undefined,
        category: formCategory,
        description: formDescription.trim(),
        hindiDescription: formHindiDescription.trim() || undefined,
        posterImage: formPosterImage.trim() || editingEvent.posterImage,
        startDate: formStartDate,
        endDate: formEndDate,
        time: formTime.trim() || editingEvent.time,
        venue: formVenue.trim(),
        venueLocationId: formVenueLocationId || undefined,
        organizer: formOrganizer.trim(),
        contactPhone: formContactPhone.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        registrationUrl: formRegistrationUrl.trim() || undefined,
      };
      onUpdateEvent(updated);
      setEditingEvent(null);
    }
  };

  const handleConfirmReject = () => {
    if (rejectingEventId) {
      onRejectEvent(rejectingEventId, rejectReason.trim() || 'Does not meet university verification criteria');
      setRejectingEventId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            {currentLang === 'hi' ? 'कैंपस इवेंट्स मैनेजमेंट' : 'Campus Events & Fest Approvals'}
          </h3>
          <p className="text-xs text-slate-500">
            {currentLang === 'hi'
              ? 'छात्रों द्वारा सबमिट किए गए इवेंट्स की समीक्षा करें, अप्रूव या एडिट करें'
              : 'Review student submissions, approve with 1-click, or publish official university circulars'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="admin-sync-college-feed-btn"
            onClick={async () => {
              setIsSyncing(true);
              setSyncNotice(currentLang === 'hi' ? 'क्लाउड व csjmu.ac.in से सिंक हो रहा है...' : 'Syncing cloud & csjmu.ac.in...');
              try {
                const res = await syncOfficialCollegeEvents(true);
                const remoteEvents = await fetchRemoteEvents();
                if (remoteEvents && remoteEvents.length > 0 && onSyncCollegeEvents) {
                  onSyncCollegeEvents(remoteEvents);
                } else if (res.success && res.events && onSyncCollegeEvents) {
                  onSyncCollegeEvents(res.events);
                }
                setSyncNotice(
                  currentLang === 'hi'
                    ? `✅ इवेंट्स क्लाउड व विश्वविद्यालय साइट से सिंक हुए`
                    : `✅ Events synced from cloud & CSJMU site`
                );
              } catch (e) {
                setSyncNotice(currentLang === 'hi' ? 'सिंक पूरा हुआ' : 'Sync completed');
              } finally {
                setIsSyncing(false);
                setTimeout(() => setSyncNotice(null), 4000);
              }
            }}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Fetch live circulars and event calendar directly from csjmu.ac.in"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isSyncing ? (currentLang === 'hi' ? 'सिंक...' : 'Syncing...') : (currentLang === 'hi' ? 'CSJMU साइट से सिंक' : 'Sync College Site')}</span>
          </button>

          <button
            id="admin-add-event-btn"
            onClick={startAddNewEvent}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{currentLang === 'hi' ? 'ऑफिशियल इवेंट जोड़ें' : 'Add Official Event'}</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2 animate-fade-in">
          <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white border border-zinc-200 p-2 sm:p-2.5 rounded-2xl shadow-xs min-w-0">
        <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain pb-1 sm:pb-0 shrink-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-zinc-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{currentLang === 'hi' ? 'पेंडिंग समीक्षा' : 'Pending Review'}</span>
            {pendingEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-blue-700 text-[10px] font-black">
                {pendingEvents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-zinc-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{currentLang === 'hi' ? 'स्वीकृत / लाइव' : 'Approved & Live'}</span>
            <span className="text-[10px] opacity-80">({approvedEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-zinc-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{currentLang === 'hi' ? 'अस्वीकृत' : 'Rejected'}</span>
            <span className="text-[10px] opacity-80">({rejectedEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-zinc-100'
            }`}
          >
            <span>{currentLang === 'hi' ? 'सभी' : 'All'}</span>
            <span className="text-[10px] opacity-80">({events.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={currentLang === 'hi' ? 'इवेंट / छात्र खोजें...' : 'Search events or students...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs"
          />
        </div>
      </div>

      {/* Multi-Select & Batch Action Bar */}
      {filteredEvents.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-zinc-50 border border-zinc-200 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSelectAll(filteredEvents)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-slate-800 border border-zinc-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              <input
                type="checkbox"
                checked={selectedEventIds.size > 0 && selectedEventIds.size === filteredEvents.length}
                onChange={() => {}}
                className="w-3.5 h-3.5 accent-blue-600 rounded pointer-events-none"
              />
              <span>
                {selectedEventIds.size === filteredEvents.length && filteredEvents.length > 0
                  ? currentLang === 'hi' ? 'सभी अनचेक करें' : 'Deselect All'
                  : currentLang === 'hi' ? 'सभी चुनें' : 'Select All'}
              </span>
            </button>

            {selectedEventIds.size > 0 && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
                {selectedEventIds.size} {currentLang === 'hi' ? 'चुने गए' : 'selected'}
              </span>
            )}
          </div>

          {selectedEventIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={() => handleBatchToggleLive(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
                title="Turn off popups & live status for all selected events"
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {isBatchProcessing
                    ? currentLang === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'
                    : currentLang === 'hi' ? 'चुने हुए इवेंट्स बंद करें (Multi-Off)' : 'Turn Off Selected (Multi-Off)'}
                </span>
              </button>

              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={() => handleBatchToggleLive(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isBatchProcessing
                    ? currentLang === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'
                    : currentLang === 'hi' ? 'चुने हुए लाइव करें' : 'Make Live'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3.5">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-2">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              {currentLang === 'hi' ? 'कोई इवेंट नहीं मिला' : 'No Events in this category'}
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isPending = evt.status === 'pending';
            const isApproved = evt.status === 'approved';
            const isRejected = evt.status === 'rejected';

            return (
              <div
                key={evt.id}
                id={`admin-event-row-${evt.id}`}
                className={`bg-white border border-zinc-200 rounded-2xl p-4 transition-all shadow-xs flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-zinc-300 ${
                  isPending
                    ? 'border-blue-300 bg-blue-50/40'
                    : isRejected
                    ? 'border-rose-300/80 opacity-80'
                    : ''
                }`}
              >
                {/* Left: Checkbox + Poster + Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="pt-2 shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.has(evt.id)}
                      onChange={() => toggleSelectEvent(evt.id)}
                      className="w-4 h-4 rounded text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      aria-label={`Select event ${evt.title}`}
                    />
                  </div>

                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    <img
                      src={evt.posterImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80'}
                      alt={evt.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 right-1 text-center bg-black/70 text-white text-[9px] font-bold py-0.5 rounded backdrop-blur-xs uppercase">
                      {evt.category}
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {evt.title}
                      </h4>

                      {/* Status Badges */}
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                          <X className="w-3 h-3" />
                          Rejected
                        </span>
                      )}

                      {/* Live / Paused Badge */}
                      {isApproved && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            evt.isLive !== false
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {evt.isLive !== false ? 'Live on Portal' : 'Paused / Hidden'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>{evt.startDate} to {evt.endDate} ({evt.time || 'N/A'})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>

                    {/* Student Verification Details Block */}
                    {evt.submittedByStudentName && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-950 dark:text-blue-200 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-600" />
                          {evt.submittedByStudentName}
                        </span>
                        <span>• Roll: <strong>{evt.studentRollNo || 'N/A'}</strong></span>
                        <span>• Branch: {evt.studentCourseBranch || 'N/A'}</span>
                        {evt.studentMobile && (
                          <span className="flex items-center gap-0.5">
                            • <Phone className="w-2.5 h-2.5 text-blue-600" />
                            <a href={`tel:${evt.studentMobile}`} className="hover:underline font-mono">
                              {evt.studentMobile}
                            </a>
                          </span>
                        )}
                      </div>
                    )}

                    {evt.rejectionReason && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        Rejection reason: {evt.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700 w-full md:w-auto justify-end">
                  {/* Approve Action */}
                  {isPending && (
                    <button
                      id={`approve-btn-${evt.id}`}
                      onClick={() => onApproveEvent(evt.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{currentLang === 'hi' ? 'स्वीकृत करें' : 'Approve'}</span>
                    </button>
                  )}

                  {/* Reject Action */}
                  {isPending && (
                    <button
                      id={`reject-btn-${evt.id}`}
                      onClick={() => setRejectingEventId(evt.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl font-bold text-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{currentLang === 'hi' ? 'अस्वीकार' : 'Reject'}</span>
                    </button>
                  )}

                  {/* Toggle Live / Pause for approved events */}
                  {isApproved && (
                    <button
                      type="button"
                      disabled={togglingEventIds.has(evt.id)}
                      onClick={() => handleSingleToggle(evt.id)}
                      className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        togglingEventIds.has(evt.id)
                          ? 'opacity-60 scale-95'
                          : 'active:scale-95'
                      } ${
                        evt.isLive !== false
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                      title={evt.isLive !== false ? 'Pause Live Listing / Turn Off' : 'Make Live'}
                    >
                      <Power className={`w-4 h-4 ${togglingEventIds.has(evt.id) ? 'animate-spin text-amber-500' : ''}`} />
                    </button>
                  )}

                  {/* Re-Approve / Restore if Rejected */}
                  {isRejected && (
                    <button
                      onClick={() => onApproveEvent(evt.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore / Re-Approve</span>
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => startEditEvent(evt)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    title="Edit Event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteEvent(evt.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Reason Dialog */}
      {rejectingEventId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scale-in text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-base">
                {currentLang === 'hi' ? 'इवेंट अस्वीकृत करने का कारण' : 'Reject Event Submission'}
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {currentLang === 'hi'
                ? 'कृपया अस्वीकृति का संक्षिप्त कारण दर्ज करें (वैकल्पिक):'
                : 'Provide reason for rejection (e.g. invalid roll number, duplicate, incomplete details):'}
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Incorrect university roll number / Duplicate event entry"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectingEventId(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Event Modal */}
      {(editingEvent || isAddingNew) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {isAddingNew
                  ? (currentLang === 'hi' ? 'नया ऑफिशियल इवेंट जोड़ें' : 'Add Official University Event')
                  : (currentLang === 'hi' ? 'इवेंट विवरण संपादित करें' : 'Edit Event Details')}
              </h4>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setIsAddingNew(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  {currentLang === 'hi' ? 'इवेंट शीर्षक (अंग्रेजी) *' : 'Event Title (English) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech & Innovation Fest 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  {currentLang === 'hi' ? 'हिंदी शीर्षक (वैकल्पिक)' : 'Hindi Title (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. वार्षिक तकनीकी एवं नवाचार महोत्सव"
                  value={formHindiTitle}
                  onChange={(e) => setFormHindiTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    {currentLang === 'hi' ? 'श्रेणी (Category) *' : 'Category *'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <option value="Fest" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Fest</option>
                    <option value="Cultural" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Cultural</option>
                    <option value="Workshop" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Workshop</option>
                    <option value="Seminar" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Seminar</option>
                    <option value="Placement Drive" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Placement Drive</option>
                    <option value="Sports" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Sports</option>
                    <option value="Notice" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Notice</option>
                    <option value="Other" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    {currentLang === 'hi' ? 'आयोजक का नाम *' : 'Organizer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSJM University Administration"
                    value={formOrganizer}
                    onChange={(e) => setFormOrganizer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    {currentLang === 'hi' ? 'शुरुआती तारीख *' : 'Start Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    {currentLang === 'hi' ? 'अंतिम / स्वतः-छिपाने की तारीख *' : 'End / Auto-hide Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    {currentLang === 'hi' ? 'समय सीमा' : 'Time Range'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM - 04:00 PM"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    {currentLang === 'hi' ? 'स्थान (Venue) *' : 'Venue *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main University Auditorium"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  {currentLang === 'hi' ? 'कैंपस लोकेशन से लिंक करें' : 'Link to Map Location'}
                </label>
                <select
                  value={formVenueLocationId}
                  onChange={(e) => setFormVenueLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">-- Select Campus Location --</option>
                  {campusLocations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                      {loc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  {currentLang === 'hi' ? 'पोस्टर इमेज URL' : 'Poster Image URL'}
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formPosterImage}
                  onChange={(e) => setFormPosterImage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                  {currentLang === 'hi' ? 'विवरण (Description) *' : 'Description *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide event details, schedule, chief guest, eligibility..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEvent(null);
                    setIsAddingNew(false);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
