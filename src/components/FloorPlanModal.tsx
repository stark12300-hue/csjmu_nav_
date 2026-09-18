import React, { useState } from 'react';
import {
  Compass,
  Building,
  X
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface FloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const FloorPlanModal: React.FC<FloorPlanModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<'uiet2' | 'admin' | 'library'>('uiet2');
  const [selectedFloor, setSelectedFloor] = useState<string>('2nd');
  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  return (
    <div
      id="floor-plan-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        id="floor-plan-modal-card"
        className="ios-liquid-modal border border-white/95 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/60 flex items-center justify-between ios-liquid-header">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-2xs font-bold">
              <Compass className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900">
                {t.floorPlansHeader}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {t.floorPlansSub}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Building & Floor Selectors */}
        <div className="p-3 bg-white/40 backdrop-blur-md border-b border-white/60 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
            <button
              onClick={() => {
                setSelectedBuilding('uiet2');
                setSelectedFloor('2nd');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
                selectedBuilding === 'uiet2'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-2xs'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>UIET Block 2 ({language === 'hi' ? 'कंप्यूटर साइंस' : 'CSE / IT'})</span>
            </button>
            <button
              onClick={() => {
                setSelectedBuilding('admin');
                setSelectedFloor('ground');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
                selectedBuilding === 'admin'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-2xs'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'प्रशासनिक (डिग्री/SSC)' : 'Admin Block (Degree/SSC)'}</span>
            </button>
            <button
              onClick={() => {
                setSelectedBuilding('library');
                setSelectedFloor('1st');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
                selectedBuilding === 'library'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-2xs'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>{t.library}</span>
            </button>
          </div>

          {/* Floor selector */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-semibold">
            {selectedBuilding === 'uiet2' && (
              <>
                <button
                  onClick={() => setSelectedFloor('ground')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === 'ground' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.groundFloor}
                </button>
                <button
                  onClick={() => setSelectedFloor('1st')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === '1st' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.firstFloor}
                </button>
                <button
                  onClick={() => setSelectedFloor('2nd')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === '2nd' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.secondFloor} (HOD)
                </button>
              </>
            )}
            {selectedBuilding === 'admin' && (
              <>
                <button
                  onClick={() => setSelectedFloor('ground')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === 'ground' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.groundFloor} ({language === 'hi' ? 'काउंटर 1-6' : 'Degree Counter'})
                </button>
                <button
                  onClick={() => setSelectedFloor('1st')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === '1st' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.firstFloor} (VC / Registrar)
                </button>
              </>
            )}
            {selectedBuilding === 'library' && (
              <>
                <button
                  onClick={() => setSelectedFloor('ground')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === 'ground' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.groundFloor} ({language === 'hi' ? 'रीडिंग हॉल' : 'Reading Hall'})
                </button>
                <button
                  onClick={() => setSelectedFloor('1st')}
                  className={`px-2.5 py-1 rounded-lg transition text-xs font-bold ${
                    selectedFloor === '1st' ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.firstFloor} (E-Library)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Blueprint Diagram */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-zinc-50/40 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 relative shadow-sm">
            <div className="text-center mb-4">
              <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900">
                {selectedBuilding === 'uiet2' && `UIET BLOCK 2 - ${selectedFloor.toUpperCase()} FLOOR`}
                {selectedBuilding === 'admin' && `ADMIN BLOCK - ${selectedFloor.toUpperCase()} FLOOR`}
                {selectedBuilding === 'library' && `CENTRAL LIBRARY - ${selectedFloor.toUpperCase()} FLOOR`}
              </h3>
              <p className="text-[10px] text-zinc-500">
                {t.indoorBlueprint}
              </p>
            </div>

            {/* UIET Block 2 Floor Diagrams */}
            {selectedBuilding === 'uiet2' && selectedFloor === '2nd' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Room 201</span>
                    <span className="text-[11px] font-extrabold text-zinc-900">{language === 'hi' ? 'AI व रोबोटिक्स लैब' : 'AI & Robotics Lab'}</span>
                  </div>
                  <div className="p-2.5 bg-blue-600 text-white border border-blue-600 rounded-xl text-center shadow-xs">
                    <span className="text-[9px] text-blue-100 font-bold block">Cabin 204</span>
                    <span className="text-[11px] font-black text-white">Dr. Sandesh Gupta</span>
                    <span className="text-[9px] text-blue-100 font-semibold block">{language === 'hi' ? 'HOD (CSE & IT)' : 'HOD CSE'}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Cabin 206</span>
                    <span className="text-[11px] font-extrabold text-zinc-900">Dr. R.K. Ambasta</span>
                  </div>
                </div>

                <div className="py-2 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl text-center flex items-center justify-between px-3">
                  <span className="text-[9px] text-zinc-500 font-mono">{t.staircaseEast}</span>
                  <span className="text-[10px] font-bold text-zinc-700 tracking-widest uppercase">
                    {t.centralCorridor}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">{t.staircaseWest}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 font-bold block">Room 205</span>
                    <span className="text-[11px] font-bold text-zinc-900">Prof. Katiyar</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Cabin 211</span>
                    <span className="text-[11px] font-bold text-zinc-900">Dr. Alok Kumar</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 font-bold block">Room 209</span>
                    <span className="text-[11px] font-bold text-zinc-900">Dr. Verma</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Block Ground Floor Diagram */}
            {selectedBuilding === 'admin' && selectedFloor === 'ground' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Counter 1 & 2</span>
                    <span className="text-[11px] font-bold text-zinc-900">{language === 'hi' ? 'डिग्री वितरण' : 'Degree Dispatch'}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Counter 3 & 4</span>
                    <span className="text-[11px] font-bold text-zinc-900">{language === 'hi' ? 'माइग्रेशन व सत्यापन' : 'Migration Desk'}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Counter 5</span>
                    <span className="text-[11px] font-bold text-zinc-900">{language === 'hi' ? 'छात्र पूछताछ' : 'Student Help'}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">Fee Bank</span>
                    <span className="text-[11px] font-bold text-zinc-900">{language === 'hi' ? 'चालान व फीस' : 'BOB Counter'}</span>
                  </div>
                </div>

                <div className="py-2 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-zinc-700 tracking-widest uppercase">
                    {t.mainEntranceLobby}
                  </span>
                </div>
              </div>
            )}

            {/* Library Floor */}
            {selectedBuilding === 'library' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                  <span className="text-xs font-bold text-zinc-900 block">{t.generalStack}</span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">2.5 Lakh+ Books & Journals</span>
                </div>
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                  <span className="text-xs font-bold text-zinc-900 block">{t.digitalLibrary}</span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">50+ Terminals with IEEE Access</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
