import React, { useState } from 'react';
import {
  Navigation,
  ArrowUpDown,
  Footprints,
  Bike,
  Milestone,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Share2,
  CornerDownLeft,
  CornerDownRight,
  ArrowUp,
  Maximize2,
  Minimize2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { CampusLocation, Language, NavigationRoute, NavigationStep } from '../types';
import { TRANSLATIONS } from '../translations';
import { navigationAudio } from '../utils/navigationAudio';

interface NavigationPanelProps {
  locations: CampusLocation[];
  fromLocation: CampusLocation | null;
  toLocation: CampusLocation | null;
  onSelectFrom: (loc: CampusLocation | null) => void;
  onSelectTo: (loc: CampusLocation | null) => void;
  onSwapLocations: () => void;
  route: NavigationRoute | null;
  onClearRoute: () => void;
  language: Language;
  userCoordinates?: [number, number] | null;
  onUseCurrentLocationAsStart?: () => void;
  onPickStartOnMap?: () => void;
  onStartLiveNavigation?: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  locations,
  fromLocation,
  toLocation,
  onSelectFrom,
  onSelectTo,
  onSwapLocations,
  route,
  onClearRoute,
  language,
  userCoordinates,
  onUseCurrentLocationAsStart,
  onPickStartOnMap,
  onStartLiveNavigation,
  isMinimized,
  onToggleMinimize,
}) => {
  const [travelMode, setTravelMode] = useState<'walking' | 'bicycle'>('walking');
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const t = TRANSLATIONS[language];

  // Guaranteed realistic travel times: Cycle is ALWAYS faster than or equal to walking, never slower
  const walkingMinutes = Math.max(1, route ? route.totalTimeMinutesWalking : 1);
  const cycleMinutes = Math.max(
    1,
    route
      ? Math.min(route.totalTimeMinutesBicycle, Math.max(1, Math.ceil(walkingMinutes / 2.5)))
      : 1
  );

  // Helper for turn icon
  const getStepIcon = (action: NavigationStep['action']) => {
    switch (action) {
      case 'turn-left':
        return <CornerDownLeft className="w-3.5 h-3.5 text-blue-400" />;
      case 'turn-right':
        return <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />;
      case 'slight-left':
        return <CornerDownLeft className="w-3.5 h-3.5 text-sky-400" />;
      case 'slight-right':
        return <CornerDownRight className="w-3.5 h-3.5 text-sky-400" />;
      case 'arrive':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'start':
      case 'straight':
      default:
        return <ArrowUp className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const handleShareRoute = () => {
    if (!toLocation) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  /* =========================================================================
     MINIMIZED COMPACT FLOATING PILL (Google Maps Style)
     ========================================================================= */
  if (isMinimized) {
    return (
      <div
        id="nav-panel-minimized-pill"
        className="bg-white rounded-full shadow-2xl p-1.5 sm:p-2 text-slate-900 flex items-center justify-between gap-2.5 max-w-sm sm:max-w-md w-full border border-slate-200"
      >
        <div
          onClick={onToggleMinimize}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer pl-2 group select-none ios-press"
          title={t.expandPanel}
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs font-black">
            <Navigation className="w-3.5 h-3.5 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900 truncate">
              <span className="truncate max-w-[90px] sm:max-w-[120px] text-slate-700">
                {fromLocation ? (language === 'hi' ? fromLocation.hindiTitle : fromLocation.title) : t.from}
              </span>
              <span className="text-slate-400">→</span>
              <span className="truncate max-w-[90px] sm:max-w-[120px] text-blue-600 font-extrabold">
                {toLocation ? (language === 'hi' ? toLocation.hindiTitle : toLocation.title) : t.to}
              </span>
            </div>
            {route && (
              <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                <span>{route.totalDistanceMeters} {t.meters}</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">
                  ~{travelMode === 'walking' ? walkingMinutes : cycleMinutes} {t.minutes}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {route && onStartLiveNavigation && (
            <button
              onClick={() => {
                navigationAudio.unlockAudio();
                onStartLiveNavigation();
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[10px] font-bold shadow-xs transition flex items-center gap-1 ios-press border border-blue-600"
            >
              <Navigation className="w-2.5 h-2.5 fill-white" />
              <span>{language === 'hi' ? 'नेविगेट' : 'Go'}</span>
            </button>
          )}

          <button
            onClick={onToggleMinimize}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition ios-press border border-slate-200"
            title={t.expandPanel}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {onClearRoute && (
            <button
              id="btn-minimized-close-nav"
              onClick={onClearRoute}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition ios-press border border-slate-200"
              title={language === 'hi' ? 'नेविगेशन बंद करें' : 'Close Navigation'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================================
     EXPANDED FULL NAVIGATION PANEL (Clean Google Maps Light Card)
     ========================================================================= */
  return (
    <div
      id="campus-navigation-panel"
      className="bg-white rounded-3xl shadow-2xl p-4 text-slate-900 max-w-sm sm:max-w-md w-full border border-slate-200"
    >
      {/* Header with Minimize Button */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs font-black">
            <Navigation className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              {language === 'hi' ? 'कैंपस रास्ता नेविगेशन' : 'Campus Route Navigation'}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {language === 'hi' ? 'सटीक रोड मैप व गेट से दूरी' : 'Turn-by-turn walkable pathways'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {route && (
            <button
              id="btn-share-nav-route"
              onClick={handleShareRoute}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition ios-press"
              title={t.shareRoute}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Minimize / Shrink Button */}
          <button
            id="btn-minimize-nav-panel"
            onClick={onToggleMinimize}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition ios-press"
            title={t.minimizePanel}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {route && (
            <button
              id="btn-close-nav-panel"
              onClick={onClearRoute}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition ios-press"
              title="Clear Route"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {copiedMessage && (
        <div className="mb-2 px-3 py-1 bg-blue-50 text-blue-800 font-bold rounded-xl text-[10px] text-center animate-fade-in shadow-2xs border border-blue-200">
          {t.routeCopied}
        </div>
      )}

      {/* From & To Selectors */}
      <div className="space-y-2 relative">
        {/* From selector */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-3.5 flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></div>
            <div className="w-0.5 h-7 bg-slate-200 my-0.5"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                {t.from}
              </label>
              {onUseCurrentLocationAsStart && (
                <button
                  type="button"
                  onClick={onUseCurrentLocationAsStart}
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition flex items-center gap-1 ios-press ${
                    fromLocation?.id === 'user-current-gps'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {language === 'hi' ? 'मेरी GPS लोकेशन' : 'My Live GPS'}
                </button>
              )}
            </div>
            <select
              id="nav-select-from"
              value={fromLocation?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'user-current-gps') {
                  if (onUseCurrentLocationAsStart) {
                    onUseCurrentLocationAsStart();
                  }
                  return;
                }
                const found = locations.find((l) => l.id === val) || null;
                onSelectFrom(found);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 transition truncate shadow-2xs"
            >
              <option value="" className="text-slate-400">{t.selectLocation}...</option>
              {userCoordinates && (
                <option value="user-current-gps" className="font-bold text-blue-700 bg-white">
                  📍 {language === 'hi' ? 'मेरी लाइव GPS लोकेशन (Current Location)' : 'My Current Live Location (GPS)'}
                </option>
              )}
              <optgroup label="Campus Gates" className="text-slate-800 bg-white font-semibold">
                {locations
                  .filter((l) => l.category === 'gate')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                      🚪 {language === 'hi' ? l.hindiTitle : l.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Departments & Blocks" className="text-slate-800 bg-white font-semibold">
                {locations
                  .filter((l) => l.category === 'department')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                      🏛️ {language === 'hi' ? l.hindiTitle : l.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Other Locations" className="text-slate-800 bg-white font-semibold">
                {locations
                  .filter((l) => l.category !== 'gate' && l.category !== 'department')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                      📍 {language === 'hi' ? l.hindiTitle : l.title}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Swap button */}
        <button
          id="btn-swap-navigation"
          onClick={onSwapLocations}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition shadow-xs ios-press"
          title="Swap Start and Destination"
        >
          <ArrowUpDown className="w-3 h-3" />
        </button>

        {/* To selector */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-3.5 flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></div>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
              {t.to}
            </label>
            <select
              id="nav-select-to"
              value={toLocation?.id || ''}
              onChange={(e) => {
                const found = locations.find((l) => l.id === e.target.value) || null;
                onSelectTo(found);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 transition truncate shadow-2xs"
            >
              <option value="" className="text-slate-400">{t.selectLocation}...</option>
              <optgroup label="Departments & UIET Blocks" className="text-slate-800 bg-white font-semibold">
                {locations
                  .filter((l) => l.category === 'department')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                      🏛️ {language === 'hi' ? l.hindiTitle : l.title} {l.floor ? `(${l.floor})` : ''}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Admin, Degree & Library" className="text-slate-800 bg-white font-semibold">
                {locations
                  .filter((l) => l.category === 'admin' || l.category === 'library')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                      📜 {language === 'hi' ? l.hindiTitle : l.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Canteens & Facilities" className="text-slate-800 bg-white font-semibold">
                {locations
                  .filter((l) => l.category === 'canteen' || l.category === 'facility' || l.category === 'sports' || l.category === 'hostel')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                      ☕ {language === 'hi' ? l.hindiTitle : l.title}
                    </option>
                  ))}
              </optgroup>
              {locations.some((l) => l.isCustom) && (
                <optgroup label="Student Marked Places & Cabins" className="text-slate-800 bg-white font-semibold">
                  {locations
                    .filter((l) => l.isCustom)
                    .map((l) => (
                      <option key={l.id} value={l.id} className="text-slate-800 bg-white">
                        ⭐ {language === 'hi' ? l.hindiTitle : l.title}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Travel Mode & Route ETA */}
      {route && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            {/* Google Maps Segmented Control */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-full border border-slate-200">
              <button
                id="btn-mode-walking"
                onClick={() => setTravelMode('walking')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition ios-press ${
                  travelMode === 'walking'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'पैदल' : 'Walk'}</span>
                <span className={`text-[10px] font-semibold ${travelMode === 'walking' ? 'text-blue-100' : 'text-slate-400'}`}>
                  ~{walkingMinutes}m
                </span>
              </button>
              <button
                id="btn-mode-bicycle"
                onClick={() => setTravelMode('bicycle')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition ios-press ${
                  travelMode === 'bicycle'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'साइकिल' : 'Cycle'}</span>
                <span className={`text-[10px] font-semibold ${travelMode === 'bicycle' ? 'text-blue-100' : 'text-slate-400'}`}>
                  ~{cycleMinutes}m
                </span>
              </button>
            </div>

            {/* Distance & ETA Summary */}
            <div className="text-right">
              <span className="text-xs sm:text-sm font-black text-slate-900 block">
                {travelMode === 'walking'
                  ? `${walkingMinutes} ${t.minutes}`
                  : `${cycleMinutes} ${t.minutes}`}
              </span>
              <span className="text-[10px] text-slate-500 block font-semibold">
                {route.totalDistanceMeters} {t.meters}
              </span>
            </div>
          </div>

          {/* Start Google Maps Live Navigation */}
          <div className="mt-3 flex flex-col gap-2">
            {onStartLiveNavigation && (
              <button
                id="btn-start-google-maps-live-nav"
                type="button"
                onClick={() => {
                  navigationAudio.unlockAudio();
                  onStartLiveNavigation();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/25 transition ios-press flex items-center justify-center gap-2 border border-blue-600 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 fill-white" />
                <span>{language === 'hi' ? 'लाइव नेविगेशन शुरू करें' : 'Start Turn-by-Turn Guide'}</span>
              </button>
            )}

            <button
              id="btn-open-route-in-gmaps"
              type="button"
              onClick={() => {
                if (!toLocation) return;
                const originStr = fromLocation
                  ? `${fromLocation.coordinates[0]},${fromLocation.coordinates[1]}`
                  : userCoordinates
                  ? `${userCoordinates[0]},${userCoordinates[1]}`
                  : '';
                const destStr = `${toLocation.coordinates[0]},${toLocation.coordinates[1]}`;
                const gmapsUrl = originStr
                  ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=walking`
                  : `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=walking`;
                window.open(gmapsUrl, '_blank');
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition ios-press flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{language === 'hi' ? 'Google Maps में खोलें' : 'Open Route in Google Maps'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Turn-by-Turn Steps Accordion */}
      {route && (
        <div className="mt-2.5">
          <button
            id="btn-toggle-steps-accordion"
            onClick={() => setIsStepsExpanded(!isStepsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 text-[11px] font-bold text-slate-700 transition ios-press cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Milestone className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.stepByStep} ({route.steps.length} {language === 'hi' ? 'मोड़' : 'steps'})</span>
            </div>
            {isStepsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {isStepsExpanded && (
            <div
              id="navigation-steps-list"
              className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100"
            >
              {route.steps.map((step, idx) => {
                const isActive = activeStepIndex === idx;
                return (
                  <div
                    key={idx}
                    id={`nav-step-${idx}`}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`pt-1.5 first:pt-0 flex items-start gap-2 p-2 rounded-2xl cursor-pointer transition ios-press ${
                      isActive
                        ? 'bg-blue-50 shadow-2xs border border-blue-200 text-blue-950 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      {getStepIcon(step.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold leading-snug">
                        {language === 'hi' ? step.instructionHi : step.instructionEn}
                      </p>
                      {step.distanceMeters > 0 && (
                        <p className="text-[9px] text-slate-500 mt-0.5 font-medium">
                          {step.distanceMeters} {t.meters}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
