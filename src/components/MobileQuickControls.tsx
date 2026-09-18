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
    <div
      id="mobile-quick-controls-container"
      className="fixed z-30 flex flex-col items-end gap-2.5 pointer-events-auto"
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
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow-2xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-extrabold text-xs sm:text-sm tracking-tight border border-emerald-300/60 ring-4 ring-emerald-500/25 animate-pulse select-none cursor-pointer ios-spring ios-press"
          title={language === 'hi' ? 'ड्रैग मोड बंद करें (लोकेशन लॉक करें)' : 'Turn Drag Off (Lock Pins)'}
        >
          <Lock className="w-4 h-4 text-black" />
          <span className="font-black">
            {language === 'hi' ? '🔒 ड्रैग बंद करें' : '🔒 Drag Off'}
          </span>
        </button>
      )}

      {/* Campus Events Pill (Clean Google Maps Capsule) */}
      <button
        id="btn-quick-events"
        type="button"
        onClick={onOpenEventsModal}
        className="group relative flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 shadow-xl select-none ios-spring ios-press transition-all active:scale-95 cursor-pointer"
        title={language === 'hi' ? 'कैंपस इवेंट्स व फेस्ट' : 'Campus Events & Fests'}
      >
        {/* Blue Jewel Icon */}
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:rotate-12 transition-transform duration-300">
          <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
        </div>

        {/* Text Label */}
        <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900">
          {language === 'hi' ? 'Events' : 'Events'}
        </span>

        {/* Badge or Live Pulse */}
        {eventsCount > 0 ? (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            <span>{eventsCount}</span>
          </span>
        ) : (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
        )}
      </button>

      {/* Zen Mode / Full Map Pill */}
      <button
        id="btn-toggle-zen-mode"
        type="button"
        onClick={onToggleZenMode}
        className={`flex items-center gap-2 pl-2.5 pr-3.5 py-1.5 rounded-full shadow-xl border text-xs sm:text-sm font-bold select-none ios-spring ios-press transition-all active:scale-95 cursor-pointer ${
          isZenMode
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
        }`}
        title={isZenMode ? t.showOverlays : t.hideOverlays}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isZenMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {isZenMode ? (
            <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
          )}
        </div>
        <span className="font-bold">
          {isZenMode
            ? language === 'hi'
              ? 'कंट्रोल्स'
              : 'Show UI'
            : language === 'hi'
            ? 'Full Map'
            : 'Full Map'}
        </span>
      </button>

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

      {/* Main Floating Trigger Button */}
      {!isZenMode && (
        <button
          id="btn-main-floating-menu"
          type="button"
          onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
          className={`w-12 h-12 rounded-full shadow-2xl border border-slate-200 hover:bg-slate-50 bg-white flex items-center justify-center select-none ios-spring ios-press cursor-pointer ${
            isSpeedDialOpen
              ? 'text-blue-600 rotate-90'
              : 'text-slate-800'
          }`}
          title="Campus Tools Menu"
        >
          {isSpeedDialOpen ? (
            <X className="w-5 h-5 text-blue-600 stroke-[2.5]" />
          ) : (
            <Menu className="w-5 h-5 text-slate-800 stroke-[2.5]" />
          )}
        </button>
      )}
    </div>
  );
};
