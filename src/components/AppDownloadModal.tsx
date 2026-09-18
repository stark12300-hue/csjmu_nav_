import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Smartphone,
  X,
  ShieldCheck,
  Map,
  Navigation,
  Share2,
  Copy,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  installPrompt?: any;
  onTriggerInstall?: () => void;
  isAlreadyInstalled?: boolean;
}

interface ApkInfo {
  available: boolean;
  version: string;
  releaseDate: string;
  fileName: string;
  sizeBytes: number;
  sizeFormatted: string;
  downloadUrl: string;
  customDownloadUrl: string;
  packageId: string;
  notes: string;
}

const DEFAULT_APK_INFO: ApkInfo = {
  available: true,
  version: '1.2.0',
  releaseDate: '2026-03-15',
  fileName: 'CSJMU-Navigation.apk',
  sizeBytes: 1987670,
  sizeFormatted: '1.90 MB',
  downloadUrl: '/csjmu_nav.apk',
  customDownloadUrl: '',
  packageId: 'in.ac.csjmu.campusnav',
  notes: 'Official Android APK release with offline campus maps, live GPS navigation, and faculty directory.',
};

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  language,
  installPrompt,
  onTriggerInstall,
  isAlreadyInstalled = false,
}) => {
  const t = TRANSLATIONS[language];
  const [apkInfo, setApkInfo] = useState<ApkInfo>(DEFAULT_APK_INFO);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  // Fetch live APK metadata from server
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);

    fetch('/api/app/apk-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setApkInfo({
            available: data.available ?? true,
            version: data.version || '1.2.0',
            releaseDate: data.releaseDate || '2026-03-15',
            fileName: data.fileName || 'CSJMU-Navigation.apk',
            sizeBytes: data.sizeBytes || 1987670,
            sizeFormatted: data.sizeFormatted || '1.90 MB',
            downloadUrl: data.downloadUrl || '/csjmu_nav.apk',
            customDownloadUrl: data.customDownloadUrl || '',
            packageId: data.packageId || 'in.ac.csjmu.campusnav',
            notes: data.notes || '',
          });
        }
      })
      .catch((err) => {
        console.warn('Could not fetch APK info, using defaults:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isHindi = language === 'hi';
  const downloadUrl = apkInfo.downloadUrl || '/csjmu_nav.apk';

  const handleDownloadClick = () => {
    setDownloadStarted(true);
    // After 6 seconds, reset notification banner
    setTimeout(() => {
      setDownloadStarted(false);
    }, 8000);
  };

  const handleShareApp = async () => {
    const fullApkUrl = window.location.origin + downloadUrl;
    const shareData = {
      title: 'CSJMU Campus Navigator App',
      text: isHindi
        ? 'CSJMU Kanpur कैंपस नेविगेशन ऐप डाउनलोड करें! लाइव जीपीएस, फैकल्टी कैबिन और कैंपस मैप्स।'
        : 'Download CSJMU Kanpur Campus Navigation Android App! Live GPS, Faculty Cabins, and Campus Maps.',
      url: fullApkUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        // Fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(fullApkUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div
      id="app-download-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/45 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="app-download-modal-card"
        className="ios-liquid-modal rounded-3xl w-full max-w-lg overflow-hidden text-zinc-900 my-auto shadow-2xl border border-white/95 animate-scale-in"
      >
        {/* Modal Header */}
        <div className="ios-liquid-header px-5 py-4 flex items-center justify-between border-b border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shadow-xs shrink-0">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zinc-950">
                {isHindi ? 'CSJMU कैंपस ऐप डाउनलोड करें' : 'Download CSJMU Campus App'}
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                {isHindi ? 'ऑफिशियल एंड्रॉइड ऐप व इंस्टॉलेशन' : 'Official Android App & Installation'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-download-modal"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto bg-white">
          {/* App Card Banner */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs relative overflow-hidden">
            <div className="w-13 h-13 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
              <img
                src="/csjmu-logo.png"
                alt="CSJMU Logo"
                className="w-10 h-10 object-contain drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-zinc-950 tracking-tight">
                  CSJMU Campus Navigator
                </h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                  v{apkInfo.version}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                {apkInfo.fileName} • {apkInfo.sizeFormatted}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {isHindi ? 'वेरिफाइड पैकेज' : 'Verified Package'}
                </span>
                <span className="text-[10px] text-zinc-300">•</span>
                <span className="text-[10px] text-zinc-500 font-medium">
                  {isHindi ? 'लाइव जीपीएस व ऑफलाइन मैप' : 'Live GPS & Offline Maps'}
                </span>
              </div>
            </div>
          </div>

          {/* Download Started Alert Banner */}
          {downloadStarted && (
            <div
              id="apk-download-notification-banner"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <b className="block font-bold">
                  {isHindi ? 'APK डाउनलोड शुरू हो चुका है!' : 'APK Download Started!'}
                </b>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  {isHindi
                    ? 'कृपया अपने फोन के नोटिफिकेशन बार या Downloads फ़ोल्डर में जाकर "CSJMU-Navigation.apk" पर टैप करके इंस्टॉल करें।'
                    : 'Check your browser downloads or notification bar. Tap the file to install.'}
                </p>
              </div>
            </div>
          )}

          {/* Action 1: Direct APK Download Button */}
          <div className="space-y-2">
            <a
              id="btn-download-android-apk"
              href={downloadUrl}
              download={apkInfo.fileName}
              onClick={handleDownloadClick}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold border border-blue-600 text-sm rounded-2xl flex items-center justify-center gap-2.5 transition shadow-sm group cursor-pointer"
            >
              <ArrowDownToLine className="w-5 h-5 text-white group-hover:translate-y-0.5 transition-transform" />
              <span>
                {isHindi ? 'एंड्रॉइड APK डाउनलोड करें' : 'Download Android APK'}
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-white/20 rounded-full font-bold text-white ml-1">
                {apkInfo.sizeFormatted}
              </span>
            </a>
            <p className="text-[11px] text-center text-zinc-500 font-medium">
              {isHindi
                ? 'डायरेक्ट APK फाइल • किसी भी एंड्रॉइड फोन पर काम करेगा'
                : 'Direct .apk file download • Compatible with all Android phones'}
            </p>
          </div>

          {/* Action 2: 1-Tap Official Android WebAPK / PWA Install */}
          <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-zinc-950">
                  {isHindi ? 'विकल्प 2: 1-टैप डायरेक्ट इंस्टॉलेशन' : 'Option 2: 1-Tap Direct Install'}
                </span>
              </div>
              {isAlreadyInstalled && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                  {isHindi ? '✓ पहले से इंस्टॉल है' : '✓ Installed'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-600 leading-relaxed">
              {isHindi
                ? 'बिना किसी सुरक्षा चेतावनी के सीधे फोन की होम स्क्रीन पर इंस्टॉल करें (गूगल वेरीफाइड WebAPK)।'
                : 'Install directly to your home screen without security warnings (Google-verified WebAPK).'}
            </p>

            {installPrompt && onTriggerInstall ? (
              <button
                id="btn-trigger-pwa-install"
                onClick={() => {
                  onTriggerInstall();
                }}
                className="w-full py-2.5 px-3 bg-white hover:bg-zinc-100 border border-zinc-200 active:scale-[0.98] text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-blue-600" />
                {isHindi ? 'अभी फोन में 1-टैप इंस्टॉल करें' : 'Install Directly to Android Phone'}
              </button>
            ) : (
              <div>
                <button
                  id="btn-toggle-pwa-guide"
                  onClick={() => setShowPwaGuide(!showPwaGuide)}
                  className="w-full py-2 px-3 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl flex items-center justify-between transition shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                    {isHindi ? 'क्रोम ब्राउज़र से कैसे इंस्टॉल करें?' : 'How to install via Chrome Browser?'}
                  </span>
                  {showPwaGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showPwaGuide && (
                  <div className="mt-2 p-3 bg-white border border-zinc-200 rounded-xl space-y-1.5 text-[11px] text-zinc-700 animate-fade-in shadow-2xs">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        1
                      </span>
                      <span>
                        {isHindi
                          ? 'ब्राउज़र के ऊपर दाईं ओर दिए गए तीन डॉट्स (⋮) मेनू पर टैप करें।'
                          : 'Tap the top-right three dots menu (⋮) in Chrome.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        2
                      </span>
                      <span>
                        {isHindi
                          ? 'मेनू में से "Install app" या "Add to Home screen" चुनें।'
                          : 'Select "Install app" or "Add to Home screen" from the menu.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        3
                      </span>
                      <span>
                        {isHindi
                          ? 'ऐप का आइकन आपके फोन की होम स्क्रीन पर आ जाएगा।'
                          : 'The app icon will be added to your Android home screen.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl flex sm:flex-col items-center sm:items-start gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-700 flex items-center justify-center shrink-0">
                <Map className="w-4 h-4" />
              </div>
              <div>
                <b className="block text-zinc-950 font-bold">{isHindi ? 'कैंपस मैप्स' : 'Campus Maps'}</b>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {isHindi ? 'सभी विभाग, भवन व कैबिन' : 'Buildings, departments & cabins'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl flex sm:flex-col items-center sm:items-start gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <b className="block text-zinc-950 font-bold">{isHindi ? 'लाइव जीपीएस' : 'Live GPS'}</b>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {isHindi ? 'रियल-टाइम टर्न-बाय-टर्न दिशा' : 'Real-time turn-by-turn guidance'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl flex sm:flex-col items-center sm:items-start gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <b className="block text-zinc-950 font-bold">{isHindi ? 'ऑफलाइन सपोर्ट' : 'Offline Ready'}</b>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {isHindi ? 'कैंपस में बिना इंटरनेट चलेगा' : 'Works even without strong data'}
                </p>
              </div>
            </div>
          </div>

          {/* Step-by-Step APK Sideloading Guide Accordion */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden">
            <button
              id="btn-toggle-apk-guide"
              onClick={() => setShowManualGuide(!showManualGuide)}
              className="w-full p-3 bg-zinc-50 hover:bg-zinc-100 text-left flex items-center justify-between text-xs font-bold text-zinc-900 transition"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-zinc-600" />
                {isHindi ? 'APK कैसे इंस्टॉल करें? (आसान चरण)' : 'How to install APK? (Easy Steps)'}
              </span>
              {showManualGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showManualGuide && (
              <div className="p-3.5 bg-white border-t border-zinc-200 space-y-2.5 text-xs text-zinc-700 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] shrink-0 font-bold">
                    1
                  </span>
                  <div>
                    <b className="text-zinc-900">{isHindi ? 'डाउनलोड करें' : 'Download the APK'}</b>
                    <p className="text-[11px] text-zinc-600">
                      {isHindi
                        ? 'ऊपर दिए गए "एंड्रॉइड APK डाउनलोड करें" बटन को दबाएं।'
                        : 'Click "Download Android APK" above to download the package.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] shrink-0 font-bold">
                    2
                  </span>
                  <div>
                    <b className="text-zinc-900">{isHindi ? 'फाइल खोलें' : 'Open the Downloaded File'}</b>
                    <p className="text-[11px] text-zinc-600">
                      {isHindi
                        ? 'डाउनलोड पूरा होने पर नोटिफिकेशन पर या "Downloads" फ़ोल्डर में CSJMU-Navigation.apk पर टैप करें।'
                        : 'Tap the file in your notification bar or find CSJMU-Navigation.apk in Downloads.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] shrink-0 font-bold">
                    3
                  </span>
                  <div>
                    <b className="text-zinc-900">
                      {isHindi ? 'Unknown Sources को अनुमति दें' : 'Allow Unknown Sources (If Asked)'}
                    </b>
                    <p className="text-[11px] text-zinc-600">
                      {isHindi
                        ? 'यदि एंड्रॉइड "Install Unknown Apps" पूछे, तो "Allow from this source" / "Install Anyway" पर टैप करें।'
                        : 'If Android prompts you about Unknown Sources, tap "Settings" -> "Allow from this source".'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] shrink-0 font-bold">
                    4
                  </span>
                  <div>
                    <b className="text-zinc-900">{isHindi ? 'इंस्टॉल पूरा करें' : 'Complete Installation'}</b>
                    <p className="text-[11px] text-zinc-600">
                      {isHindi
                        ? '"Install" पर दबाएं। अब ऐप आपके फोन में खुल जाएगी!'
                        : 'Tap "Install". The CSJMU Campus Navigator is ready to use!'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Share App with Classmates */}
          <div className="pt-1 flex items-center gap-2">
            <button
              id="btn-share-apk"
              onClick={handleShareApp}
              className="flex-1 py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 active:scale-[0.98] text-zinc-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-2xs"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">
                    {isHindi ? 'लिंक कॉपी हो गया!' : 'Link Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-zinc-600" />
                  <span>
                    {isHindi ? 'दोस्तों / ग्रुप में शेयर करें' : 'Share App Link with Classmates'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
