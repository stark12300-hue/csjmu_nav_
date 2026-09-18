import React, { useEffect, useMemo, useState } from 'react';
import {
  Navigation,
  X,
  Volume2,
  VolumeX,
  CornerDownLeft,
  CornerDownRight,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { CampusLocation, Language, NavigationRoute, NavigationStep } from '../types';
import { TRANSLATIONS } from '../translations';
import { getDistanceMeters } from '../utils/pathfinding';
import { navigationAudio } from '../utils/navigationAudio';

interface GoogleMapsLiveNavProps {
  route: NavigationRoute;
  fromLocation: CampusLocation | null;
  toLocation: CampusLocation;
  onExit: () => void;
  language: Language;
  userCoordinates: [number, number] | null;
  activeStepIdx?: number;
  onStepChange?: (stepIdx: number) => void;
}

export const GoogleMapsLiveNav: React.FC<GoogleMapsLiveNavProps> = ({
  route,
  fromLocation,
  toLocation,
  onExit,
  language,
  userCoordinates,
  activeStepIdx,
  onStepChange,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(activeStepIdx ?? 0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const t = TRANSLATIONS[language];

  // Keep internal step in sync with external activeStepIdx
  useEffect(() => {
    if (typeof activeStepIdx === 'number' && activeStepIdx !== currentStepIdx) {
      setCurrentStepIdx(activeStepIdx);
    }
  }, [activeStepIdx]);

  const updateStep = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(route.steps.length - 1, newIdx));
    setCurrentStepIdx(clamped);
    onStepChange?.(clamped);
  };

  const currentStep: NavigationStep | undefined = route.steps[currentStepIdx];
  const nextStep: NavigationStep | undefined = route.steps[currentStepIdx + 1];

  // Follow the user's real GPS progress instead of leaving the HUD on the
  // first step forever. Step coordinates are graph nodes/entrances, so the
  // closest step ahead of the user is a much safer progress signal than
  // simply advancing after a timer.
  const gpsStepIdx = useMemo(() => {
    if (!userCoordinates || route.steps.length === 0) return null;

    let bestIdx = 0;
    let bestDistance = Infinity;
    route.steps.forEach((step, idx) => {
      const d = getDistanceMeters(userCoordinates, step.coordinates);
      if (d < bestDistance) {
        bestDistance = d;
        bestIdx = idx;
      }
    });

    return bestIdx;
  }, [userCoordinates, route.steps]);

  useEffect(() => {
    if (gpsStepIdx === null) return;

    // Do not jump backwards because GPS can fluctuate a few metres.
    // Move forward when the user reaches a route step or comes within 20 m.
    const currentDistance = currentStep
      ? getDistanceMeters(userCoordinates!, currentStep.coordinates)
      : Infinity;
    const nextDistance = nextStep
      ? getDistanceMeters(userCoordinates!, nextStep.coordinates)
      : Infinity;

    if (gpsStepIdx > currentStepIdx || nextDistance <= 20 || currentDistance <= 12) {
      updateStep(Math.max(currentStepIdx, gpsStepIdx));
    }
  }, [gpsStepIdx, currentStepIdx, currentStep, nextStep, userCoordinates, route.steps.length]);

  // A freshly recalculated route can have fewer/more steps. Keep the index
  // valid and reset only when the new route actually starts somewhere else.
  useEffect(() => {
    updateStep(Math.min(currentStepIdx, Math.max(0, route.steps.length - 1)));
  }, [route]);

  // Unlock Android WebView & browser audio context on initial mount
  useEffect(() => {
    navigationAudio.unlockAudio();
    return () => {
      navigationAudio.stopAllVoice();
    };
  }, []);

  // Voice Guidance & Turn-by-Turn Audio Announcement
  useEffect(() => {
    if (!isVoiceEnabled || !currentStep) return;

    const text = language === 'hi' ? currentStep.instructionHi : currentStep.instructionEn;

    // Single crystal-clear voice announcement with zero beep
    navigationAudio.speakInstruction(text, language, false);
  }, [currentStepIdx, language, isVoiceEnabled]);

  const handleToggleVoice = () => {
    if (!isVoiceEnabled) {
      navigationAudio.unlockAudio();
      setIsVoiceEnabled(true);
      if (currentStep) {
        const text = language === 'hi' ? currentStep.instructionHi : currentStep.instructionEn;
        navigationAudio.speakInstruction(text, language, false);
      }
    } else {
      navigationAudio.stopAllVoice();
      setIsVoiceEnabled(false);
    }
  };

  const handleExit = () => {
    navigationAudio.stopAllVoice();
    onExit();
  };

  const getStepIcon = (action: NavigationStep['action']) => {
    switch (action) {
      case 'turn-left':
        return <CornerDownLeft className="w-8 h-8 text-zinc-800 stroke-[2.5]" />;
      case 'turn-right':
        return <CornerDownRight className="w-8 h-8 text-zinc-800 stroke-[2.5]" />;
      case 'slight-left':
        return <CornerDownLeft className="w-8 h-8 text-sky-600 stroke-[2.5]" />;
      case 'slight-right':
        return <CornerDownRight className="w-8 h-8 text-sky-600 stroke-[2.5]" />;
      case 'arrive':
        return <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[2.5]" />;
      case 'start':
      case 'straight':
      default:
        return <ArrowUp className="w-8 h-8 text-zinc-800 stroke-[2.5]" />;
    }
  };

  const handleOpenNativeGoogleMaps = () => {
    const lat = toLocation.coordinates[0];
    const lng = toLocation.coordinates[1];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="live-nav-heads-up-display"
      className="fixed inset-x-0 top-0 z-50 pointer-events-none p-3 sm:p-4 flex flex-col items-center animate-fade-in"
    >
      {/* Top Banner (HUD) - Clean Google Maps Style */}
      <div className="pointer-events-auto w-full max-w-lg bg-white rounded-3xl shadow-2xl p-4 text-slate-900 border border-slate-200">
        <div className="flex items-center justify-between gap-3">
          {/* Turn Arrow Indicator */}
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs">
            {currentStep && getStepIcon(currentStep.action)}
          </div>

          {/* Current Instruction */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 block">
              {currentStep?.distanceMeters ? `In ${currentStep.distanceMeters} ${t.meters}` : 'Next Step'}
            </span>
            <h2 className="text-sm sm:text-base font-black leading-snug truncate text-slate-900">
              {currentStep
                ? language === 'hi'
                  ? currentStep.instructionHi
                  : currentStep.instructionEn
                : 'Following Campus Route'}
            </h2>
            {nextStep && (
              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                {language === 'hi' ? `आगे: ${nextStep.instructionHi}` : `Then: ${nextStep.instructionEn}`}
              </p>
            )}
          </div>

          {/* Voice Toggle & Exit */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleVoice}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-full transition ios-press cursor-pointer"
              title={isVoiceEnabled ? 'Mute voice' : 'Enable voice'}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={handleExit}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full transition shadow-xs ios-press cursor-pointer"
              title="Exit Live Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Forward / Backward Controls for Testing/Live walking */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentStepIdx === 0}
              onClick={() => updateStep(currentStepIdx - 1)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-full font-bold text-slate-700 border border-slate-200 transition ios-press cursor-pointer"
            >
              ← {language === 'hi' ? 'पिछला' : 'Prev'}
            </button>
            <button
              disabled={currentStepIdx === route.steps.length - 1}
              onClick={() => updateStep(currentStepIdx + 1)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 rounded-full font-bold transition shadow-xs ios-press border border-blue-600 cursor-pointer"
            >
              {language === 'hi' ? 'अगला मोड़' : 'Next Turn'} →
            </button>
          </div>

          {/* Open In Native Google Maps App */}
          <button
            onClick={handleOpenNativeGoogleMaps}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full transition border border-slate-200 shadow-2xs ios-press cursor-pointer"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
