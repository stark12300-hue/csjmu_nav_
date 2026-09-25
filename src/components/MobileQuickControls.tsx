import React, { useState } from 'react';
import {
  Bug,
  GraduationCap,
  Users,
  Download,
  Maximize2,
  Menu,
  X,
  Eye,
  Crosshair,
  Sparkles,
  Megaphone,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Language, TeacherAccount } from '../types';
import { TRANSLATIONS } from '../translations';

interface MobileQuickControlsProps {
  language: Language;
  onOpenDeptFinder: () => void;
  onOpenFacultyLocator: () => void;
  onOpenAddMarker?: () => void;
  onOpenReportBug: () => void;
  onOpenDownloadApp: () => void;
  onOpenAdminManager: () => void;
  onOpenEventsModal: () => void;
  eventsCount?: number;
  isAdminUnlocked: boolean;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  loggedInTeacher?: TeacherAccount | null;
  onOpenTeacherPortal?: () => void;
  isDragModeActive?: boolean;
  onTurnDragOff?: () => void;
}

export const MobileQuickControls: React.FC<MobileQuickControlsProps> = ({
  language,
  onOpenDeptFinder,
  onOpenFacultyLocator,
  onOpenReportBug,
  onOpenDownloadApp,
  onOpenAdminManager,
  onOpenEventsModal,
  eventsCount = 0,
  isAdminUnlocked,
  isZenMode,
  onToggleZenMode,
  loggedInTeacher = null,
  onOpenTeacherPortal,
  isDragModeActive = false,
  onTurnDragOff,
}) => {
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const t = TRANSLATIONS[language];

  return (
    <>
      {/* Bottom Left Corner: Zen Mode / Full Map Icon-Only Button */}
      <div
        id="mobile-quick-left-controls"
        className="fixed z-30 pointer-events-auto"
        style={{
          bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          left: 'calc(1rem + env(safe-area-inset-left, 0px))',
        }}
      >
        <button
          id="btn-toggle-zen-mode"
          type="button"
          onClick={onToggleZenMode}
          className={`w-9 h-9 rounded-full shadow-md border flex items-center justify-center select-none ios-spring ios-press transition-all active:scale-90 cursor-pointer ${
            isZenMode
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/40'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
          title={
            isZenMode
              ? language === 'hi'
                ? 'कंट्रोल्स दिखाएं'
                : 'Show Controls'
              : language === 'hi'
              ? 'फुल मैप (कंट्रोल्स छुपाएं)'
              : 'Full Map (Hide Controls)'
          }
          aria-label={isZenMode ? t.showOverlays : t.hideOverlays}
        >
          {isZenMode ? (
            <Eye className="w-4 h-4 text-white stroke-[2.5]" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-700 stroke-[2.5]" />
          )}
        </button>
      </div>

      {/* Bottom Right Corner: Quick Floating Controls */}
      <div
        id="mobile-quick-controls-container"
        className="fixed z-30 flex flex-col items-end gap-1.5 pointer-events-auto"
        style={{
          bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          right: 'calc(1rem + env(safe-area-inset-right, 0px))',
        }}
      >
        {/* Turn Drag Off (Lock Pins) Liquid Pill */}
        {isDragModeActive && onTurnDragOff && (
          <button
            id="btn-quick-drag-off-pill"
            type="button"
            onClick={onTurnDragOff}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-extrabold text-xs tracking-tight border border-emerald-300/60 ring-2 ring-emerald-500/25 animate-pulse select-none cursor-pointer ios-spring ios-press"
            title={language === 'hi' ? 'ड्रैग मोड बंद करें (लोकेशन लॉक करें)' : 'Turn Drag Off (Lock Pins)'}
          >
            <Lock className="w-3.5 h-3.5 text-black" />
            <span className="font-bold">
              {language === 'hi' ? '🔒 ड्रैग बंद करें' : '🔒 Drag Off'}
            </span>
          </button>
        )}

        {/* Campus Events Circular Button with small bottom label */}
        {!isZenMode && (
          <button
            id="btn-quick-events"
            type="button"
            onClick={onOpenEventsModal}
            className="group flex flex-col items-center gap-1 select-none ios-spring ios-press transition-all active:scale-95 cursor-pointer"
            title={language === 'hi' ? 'कैंपस इवेंट्स व फेस्ट' : 'Campus Events & Fests'}
            aria-label={language === 'hi' ? 'कैंपस इवेंट्स' : 'Campus Events'}
          >
            {/* Circular Icon Container */}
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 text-white shadow-lg shadow-pink-500/30 border-2 border-white/90 ring-2 ring-pink-500/25 flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-90 group-hover:shadow-pink-500/50">
              <Sparkles className="w-5 h-5 text-white drop-shadow-sm transition-transform duration-300 group-hover:rotate-12" />

              {/* Notification Count Badge */}
              {eventsCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center bg-gradient-to-r from-amber-400 to-rose-500 text-white text-[11px] font-black rounded-full ring-2 ring-white shadow-md pointer-events-none">
                  {eventsCount}
                </span>
              ) : (
                <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 pointer-events-none">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 ring-2 ring-white"></span>
                </span>
              )}
            </div>

            {/* Small Events Text Label Below */}
            <span className="text-[10px] font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-pink-600 to-rose-600 text-white px-2 py-0.5 rounded-full shadow-sm ring-1 ring-white/60 leading-none">
              Events
            </span>
          </button>
        )}

      {/* Speed Dial Expanded Action Sheet (Clean Light Card) */}
      {!isZenMode && isSpeedDialOpen && (
        <div
          id="speed-dial-expanded-list"
          className="flex flex-col items-end gap-2 mb-1 p-2.5 bg-white rounded-3xl border border-slate-200 shadow-2xl text-slate-900 animate-slide-up"
        >
          <button
            onClick={() => {
              setIsSpeedDialOpen(false);
              onOpenAdminManager();
            }}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-semibold transition ios-press cursor-pointer"
          >
            <span>
              {loggedInTeacher
                ? `👨‍🏫 ${loggedInTeacher.name} (Portal)`
                : language === 'hi'
                ? '🛡️ एडमिन व शिक्षक पोर्टल'
                : '🛡️ Admin & Faculty Portal'}
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          </button>

          <button
            onClick={() => {
              setIsSpeedDialOpen(false);
              onOpenDownloadApp();
            }}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-semibold transition ios-press cursor-pointer"
          >
            <span>{language === 'hi' ? 'ऐप डाउनलोड करें' : 'Download App'}</span>
            <Download className="w-4 h-4 text-slate-600 shrink-0" />
          </button>

          <button
            id="btn-speeddial-report-bug"
            onClick={() => {
              setIsSpeedDialOpen(false);
              onOpenReportBug();
            }}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-semibold transition ios-press cursor-pointer"
          >
            <span>{language === 'hi' ? 'समस्या/बग रिपोर्ट' : 'Report Bug / Issue'}</span>
            <Bug className="w-4 h-4 text-rose-600 shrink-0" />
          </button>

          <button
            onClick={() => {
              setIsSpeedDialOpen(false);
              onOpenDeptFinder();
            }}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-semibold transition ios-press cursor-pointer"
          >
            <span>{t.findMyDept}</span>
            <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
          </button>

          <button
            onClick={() => {
              setIsSpeedDialOpen(false);
              onOpenFacultyLocator();
            }}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-semibold transition ios-press cursor-pointer"
          >
            <span>{t.facultyLocator}</span>
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button with Explore label */}
      {!isZenMode && (
        <button
          id="btn-main-floating-menu"
          type="button"
          onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
          className="group flex flex-col items-center gap-1 select-none ios-spring ios-press transition-all active:scale-95 cursor-pointer"
          title="Campus Tools Menu"
          aria-label="Explore"
        >
          <div
            className={`w-12 h-12 rounded-full shadow-2xl border border-slate-200 hover:bg-slate-50 bg-white flex items-center justify-center transition-all group-active:scale-90 ${
              isSpeedDialOpen
                ? 'text-blue-600 rotate-90'
                : 'text-slate-800'
            }`}
          >
            {isSpeedDialOpen ? (
              <X className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            ) : (
              <Menu className="w-5 h-5 text-slate-800 stroke-[2.5]" />
            )}
          </div>

          {/* Small Explore Text Label Below */}
          <span className="text-[10px] font-bold tracking-tight text-slate-700 bg-white/95 px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs leading-none">
            {isSpeedDialOpen ? (language === 'hi' ? 'बंद करें' : 'Close') : 'Explore'}
          </span>
        </button>
      )}
    </div>
  </>
);
};
