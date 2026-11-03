import React, { useState, useEffect, useMemo } from 'react';
import type { BuildState, Character } from '../types';
import {
  getCharacterHeadUrl,
  getElementColor,
  getElementIconUrl
} from '../utils/assetUrl';
import {
  Save,
  ArrowLeftRight,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  Check,
  Lock,
  Cloud,
  UserCheck
} from 'lucide-react';
import { firebaseService } from '../services/firebase';
import { FirebaseModal } from './FirebaseModal';
import type { UserSession } from '../services/authService';
import {
  deepSanitizeObject,
  sanitizeString,
  sanitizeBuildState,
  secureStorage
} from '../services/security';

export interface ElementPresetSlot {
  element: string; // 'Ignis' | 'Aqua' | 'Ventus' | 'Terra' | 'Lux' | 'Umbra'
  slot: 1 | 2 | 3;
  characterId: number;
  characterName: string;
  savedAt: number;
  build: BuildState;
}

export type ElementPresetsMap = Record<string, Record<number, ElementPresetSlot | null>>;

export const createEmptyPresetsMap = (): ElementPresetsMap => ({
  Ignis: { 1: null, 2: null, 3: null },
  Aqua: { 1: null, 2: null, 3: null },
  Ventus: { 1: null, 2: null, 3: null },
  Terra: { 1: null, 2: null, 3: null },
  Lux: { 1: null, 2: null, 3: null },
  Umbra: { 1: null, 2: null, 3: null },
});

export const getPresetStorageKey = (username?: string | null): string => {
  const clean = username?.trim().toLowerCase();
  return clean ? `stella_presets_${clean}` : 'stella_presets_guest';
};

export const getActivePresetStorageKey = (username?: string | null): string => {
  const clean = username?.trim().toLowerCase();
  return clean ? `stella_active_preset_${clean}` : 'stella_active_preset_guest';
};

export const ELEMENTS_LIST = [
  { id: 'Ignis', name: 'Ignis', label: 'Fire', color: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-950/30' },
  { id: 'Aqua', name: 'Aqua', label: 'Water', color: 'text-cyan-400', border: 'border-cyan-500/40', bg: 'bg-cyan-950/30' },
  { id: 'Ventus', name: 'Ventus', label: 'Wind', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-950/30' },
  { id: 'Terra', name: 'Terra', label: 'Earth', color: 'text-yellow-500', border: 'border-yellow-600/40', bg: 'bg-yellow-950/30' },
  { id: 'Lux', name: 'Lux', label: 'Light', color: 'text-amber-300', border: 'border-amber-400/50', bg: 'bg-amber-950/30' },
  { id: 'Umbra', name: 'Umbra', label: 'Dark', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-950/30' },
] as const;

interface ElementPresetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentBuild: BuildState;
  mainChar: Character;
  onApplyBuild: (build: BuildState) => void;
  showToast: (msg: string) => void;
  userSession?: UserSession | null;
}

export const ElementPresetDrawer: React.FC<ElementPresetDrawerProps> = ({
  isOpen,
  onClose,
  currentBuild,
  mainChar,
  onApplyBuild,
  showToast,
  userSession,
}) => {
  const username = userSession?.username?.trim() || null;
  const usernameLower = username ? username.toLowerCase() : null;

  // Selected Element Tab for the drawer (defaults to current Main Trekker's element!)
  const [selectedElement, setSelectedElement] = useState<string>(mainChar.element || 'Lux');

  // Hover state for preset slot buttons
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);

  // All element presets saved in storage for the current isolated user
  const [presetsMap, setPresetsMap] = useState<ElementPresetsMap>(() => {
    try {
      const key = getPresetStorageKey(usernameLower);
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return createEmptyPresetsMap();
  });

  // Key of active preset (e.g. 'Lux_2')
  const [activePresetKey, setActivePresetKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(getActivePresetStorageKey(usernameLower));
    } catch {}
    return null;
  });

  // Snapshot of build when the active preset was last saved or loaded (to detect unsaved changes)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(() => {
    try {
      const key = getPresetStorageKey(usernameLower);
      const raw = localStorage.getItem(key);
      const activeKey = localStorage.getItem(getActivePresetStorageKey(usernameLower));
      if (raw && activeKey) {
        const [elem, slotStr] = activeKey.split('_');
        const map = JSON.parse(raw);
        const slotData = map?.[elem]?.[Number(slotStr)];
        if (slotData?.build) {
          return JSON.stringify(slotData.build);
        }
      }
    } catch {}
    return null;
  });

  // Modal State for "Are you sure to Switch before Saving?"
  const [switchConfirmTarget, setSwitchConfirmTarget] = useState<{
    element: string;
    slot: 1 | 2 | 3;
    targetPreset: ElementPresetSlot | null;
  } | null>(null);

  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(() => firebaseService.isConfigured());

  // Auto-sync element tab to main trekker's element when drawer opens or trekker element changes
  useEffect(() => {
    if (mainChar.element) {
      setSelectedElement(mainChar.element);
    }
  }, [mainChar.element, isOpen]);

  // Purge legacy global preset keys from older versions to prevent cross-leakage across users
  useEffect(() => {
    try {
      localStorage.removeItem('stella_element_presets_v1');
      localStorage.removeItem('stella_sora_element_presets_v2');
      localStorage.removeItem('stella_sora_active_preset_key_v2');
      localStorage.removeItem('stella_firebase_custom_doc_id');
      // Clean shared default doc in Firestore so no user inadvertently loads legacy data
      firebaseService.cleanLegacyDefaultPresets().catch(() => {});
    } catch {}
  }, []);

  // When user account changes, reload isolated preset state for that specific user
  useEffect(() => {
    const key = getPresetStorageKey(usernameLower);
    const activeKeyStorage = getActivePresetStorageKey(usernameLower);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setPresetsMap(JSON.parse(raw));
      } else {
        setPresetsMap(createEmptyPresetsMap());
      }
      setActivePresetKey(localStorage.getItem(activeKeyStorage) || null);
    } catch {
      setPresetsMap(createEmptyPresetsMap());
      setActivePresetKey(null);
    }
    setLastSavedSnapshot(null);
  }, [usernameLower]);

  // Realtime Cloud Presets Sync with Firebase Firestore (Strictly user-scoped!)
  useEffect(() => {
    if (!firebaseService.isConfigured()) return;
    setIsCloudConnected(true);

    // Initial load from cloud user-specific document
    firebaseService.loadPresetsFromCloud(usernameLower || undefined).then((cloudMap) => {
      if (cloudMap) {
        setPresetsMap(cloudMap);
        try {
          const key = getPresetStorageKey(usernameLower);
          localStorage.setItem(key, JSON.stringify(cloudMap));
          secureStorage.setItem(key, cloudMap);
        } catch {}
      }
    });

    // Realtime listener strictly scoped to this user
    const unsubscribe = firebaseService.subscribeToPresets((updatedMap) => {
      if (updatedMap) {
        setPresetsMap(updatedMap);
        try {
          const key = getPresetStorageKey(usernameLower);
          localStorage.setItem(key, JSON.stringify(updatedMap));
          secureStorage.setItem(key, updatedMap);
        } catch {}
      }
    }, usernameLower || undefined);

    return () => unsubscribe();
  }, [usernameLower]);

  // Persist presets to localStorage and Firebase Firestore with deep sanitization & user isolation
  const savePresetsMap = (newMap: ElementPresetsMap) => {
    const cleanMap = deepSanitizeObject(newMap);
    setPresetsMap(cleanMap);
    const storageKey = getPresetStorageKey(usernameLower);
    try {
      localStorage.setItem(storageKey, JSON.stringify(cleanMap));
      secureStorage.setItem(storageKey, cleanMap);
    } catch (e) {
      console.error('Failed to save element presets:', e);
    }

    // Auto-save to Firebase Cloud Firestore for this user
    if (firebaseService.isConfigured()) {
      firebaseService.savePresetsToCloud(cleanMap, usernameLower || undefined).catch((e) => {
        console.warn('Firebase cloud sync error:', e);
      });
    }
  };

  // Clear all presets for the active user across local storage & Firestore
  const handleWipeAllPresets = async () => {
    const userLabel = username ? `"${username}"` : 'akun ini';
    const confirmed = window.confirm(
      `Hapus SEMUA preset milik ${userLabel}?\n\nPreset di cloud database (Firestore) dan local storage akan dikosongkan secara permanen.`
    );
    if (!confirmed) return;

    const empty = createEmptyPresetsMap();
    setPresetsMap(empty);
    setActivePresetKey(null);
    setLastSavedSnapshot(null);

    const storageKey = getPresetStorageKey(usernameLower);
    const activeKeyStorage = getActivePresetStorageKey(usernameLower);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(activeKeyStorage);
      secureStorage.removeItem(storageKey);
    } catch {}

    if (firebaseService.isConfigured()) {
      await firebaseService.wipePresetsFromCloud(usernameLower || undefined);
    }

    showToast(`Semua preset untuk ${username || 'user'} berhasil dihapus bersih!`);
  };

  // Check if current build has unsaved changes compared to active preset
  const hasUnsavedChanges = useMemo(() => {
    if (!activePresetKey || !lastSavedSnapshot) return false;
    const currentJson = JSON.stringify(currentBuild);
    return currentJson !== lastSavedSnapshot;
  }, [activePresetKey, lastSavedSnapshot, currentBuild]);

  // Get current active preset data if any (only valid if element matches mainChar.element)
  const currentActivePreset = useMemo(() => {
    if (!activePresetKey) return null;
    const [elem, slotStr] = activePresetKey.split('_');
    const preset = presetsMap?.[elem]?.[Number(slotStr)] || null;
    if (preset && elem === mainChar.element) return preset;
    return null;
  }, [activePresetKey, presetsMap, mainChar.element]);

  // Perform Save into a slot (Strictly restricted to matching mainChar.element!)
  const handleSaveSlot = (element: string, slot: 1 | 2 | 3) => {
    if (element !== mainChar.element) {
      showToast(`Tidak bisa menyimpan di frame ${element}! Main Trekker (${mainChar.name}) berelemen ${mainChar.element}.`);
      return;
    }

    const key = `${element}_${slot}`;
    const cleanBuild = sanitizeBuildState(currentBuild) || currentBuild;
    const newSlotData: ElementPresetSlot = {
      element,
      slot,
      characterId: mainChar.id,
      characterName: sanitizeString(mainChar.name, 100),
      savedAt: Date.now(),
      build: cleanBuild,
    };

    const newMap: ElementPresetsMap = {
      ...presetsMap,
      [element]: {
        ...(presetsMap[element] || {}),
        [slot]: newSlotData,
      },
    };

    savePresetsMap(newMap);
    setActivePresetKey(key);
    setLastSavedSnapshot(JSON.stringify(newSlotData.build));
    try {
      localStorage.setItem(getActivePresetStorageKey(usernameLower), key);
    } catch {}

    showToast(`Preset ${slot} (${element}) berhasil disimpan!`);
  };

  // Perform Recall / Switch to a slot with pre-validated clean build state
  const executeSwitchToSlot = (element: string, slot: 1 | 2 | 3, targetPreset: ElementPresetSlot) => {
    const key = `${element}_${slot}`;
    const cleanBuild = sanitizeBuildState(targetPreset.build) || targetPreset.build;
    onApplyBuild(cleanBuild);
    setActivePresetKey(key);
    setLastSavedSnapshot(JSON.stringify(cleanBuild));
    try {
      localStorage.setItem(getActivePresetStorageKey(usernameLower), key);
    } catch {}
    setSwitchConfirmTarget(null);
    showToast(`Beralih ke Preset ${slot}: ${sanitizeString(targetPreset.characterName, 50)}`);
  };

  // Click handler on a slot button
  const handleSlotClick = (element: string, slot: 1 | 2 | 3) => {
    const key = `${element}_${slot}`;
    const slotData = presetsMap?.[element]?.[slot] || null;

    // Case 1: Slot is empty -> Try to save current build into this slot
    if (!slotData) {
      if (element !== mainChar.element) {
        showToast(`Slot terkunci! Main Trekker ${mainChar.name} (${mainChar.element}) hanya bisa disimpan di frame ${mainChar.element}.`);
        return;
      }
      handleSaveSlot(element, slot);
      return;
    }

    // Case 2: Slot is the CURRENT active preset AND element matches mainChar.element -> Save / Overwrite changes
    if (activePresetKey === key && element === mainChar.element) {
      handleSaveSlot(element, slot);
      return;
    }

    // Case 3: Slot is a different preset to switch/recall -> Request switch!
    // Check if there are unsaved changes in current active preset (only if it matches mainChar.element)
    if (hasUnsavedChanges && currentActivePreset && currentActivePreset.element === mainChar.element) {
      // Trigger confirmation modal: "Are you sure to Switch before Saving?"
      setSwitchConfirmTarget({
        element,
        slot,
        targetPreset: slotData,
      });
    } else {
      // No unsaved changes -> Switch immediately
      executeSwitchToSlot(element, slot, slotData);
    }
  };

  // Confirmation Option 1: "Yes" -> Switch directly without saving current build
  const handleConfirmSwitchYes = () => {
    if (!switchConfirmTarget || !switchConfirmTarget.targetPreset) return;
    executeSwitchToSlot(
      switchConfirmTarget.element,
      switchConfirmTarget.slot,
      switchConfirmTarget.targetPreset
    );
  };

  // Confirmation Option 2: "No" -> Save current build first, then switch!
  const handleConfirmSwitchNo = () => {
    if (!switchConfirmTarget || !switchConfirmTarget.targetPreset) return;
    // 1. Save current build to active preset slot ONLY if it matches mainChar.element
    if (activePresetKey) {
      const [currElem, currSlotStr] = activePresetKey.split('_');
      if (currElem === mainChar.element) {
        handleSaveSlot(currElem, Number(currSlotStr) as 1 | 2 | 3);
      }
    }
    // 2. Then execute switch to target
    executeSwitchToSlot(
      switchConfirmTarget.element,
      switchConfirmTarget.slot,
      switchConfirmTarget.targetPreset
    );
  };

  // Delete / Clear a preset slot
  const handleDeleteSlot = (element: string, slot: 1 | 2 | 3, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${element}_${slot}`;
    const newMap: ElementPresetsMap = {
      ...presetsMap,
      [element]: {
        ...(presetsMap[element] || {}),
        [slot]: null,
      },
    };
    savePresetsMap(newMap);
    if (activePresetKey === key) {
      setActivePresetKey(null);
      setLastSavedSnapshot(null);
      try {
        localStorage.removeItem(getActivePresetStorageKey(usernameLower));
      } catch {}
    }
    showToast(`Preset ${slot} (${element}) dihapus.`);
  };

  if (!isOpen) return null;

  const currentElemColor = getElementColor(mainChar.element || 'Lux');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-in Left Drawer */}
      <aside className="fixed top-0 left-0 bottom-0 z-50 w-[88vw] max-w-sm sm:w-96 bg-zinc-950/95 border-r border-zinc-800 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-left duration-250 select-none">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Build Presets Recall
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>{username ? username : 'Guest'}</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {isCloudConnected ? '• Cloud Synced' : '• Local'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleWipeAllPresets}
              className="p-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors cursor-pointer"
              title={`Hapus semua preset milik ${username || 'user'}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFirebaseModalOpen(true)}
              className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                isCloudConnected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40'
              }`}
              title={isCloudConnected ? `Firestore Cloud Database: Online (User: ${username || 'default'})` : 'Hubungkan Firebase Database'}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[10.5px]">
                {isCloudConnected ? 'Cloud' : 'Connect'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Trekker Indicator Banner */}
        <div className="p-3 mx-3 mt-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={getCharacterHeadUrl(mainChar.id)}
              alt={mainChar.name}
              className="w-8 h-8 rounded-lg object-cover border border-zinc-700 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] text-zinc-400 block font-mono">
                Main Trekker:
              </span>
              <span className="text-xs font-bold text-zinc-100 truncate block">
                {mainChar.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700/80 shrink-0">
            <img
              src={getElementIconUrl(mainChar.element)}
              alt={mainChar.element}
              className="w-3.5 h-3.5"
            />
            <span className={`text-[10px] font-bold font-mono ${currentElemColor.text}`}>
              {mainChar.element}
            </span>
          </div>
        </div>

        {hasUnsavedChanges && currentActivePreset && (
          <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-[11px] text-amber-300 animate-in fade-in duration-150">
            <span className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Preset {currentActivePreset.slot} ada perubahan belum disimpan</span>
            </span>
            <button
              type="button"
              onClick={() => handleSaveSlot(currentActivePreset.element, currentActivePreset.slot)}
              className="px-2 py-0.5 rounded bg-amber-500 text-black font-bold text-[10px] hover:bg-amber-400 transition-colors cursor-pointer shrink-0 ml-1.5"
            >
              Save Now
            </button>
          </div>
        )}

        <div className="p-3 pb-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
            Pilih Elemen:
          </span>
          <div className="grid grid-cols-6 gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            {ELEMENTS_LIST.map((elem) => {
              const isSelected = selectedElement === elem.id;
              const isMainCharElem = mainChar.element === elem.id;

              return (
                <button
                  key={elem.id}
                  type="button"
                  onClick={() => setSelectedElement(elem.id)}
                  title={`${elem.name} (${elem.label})${isMainCharElem ? ' — Elemen Main Trekker' : ''}`}
                  className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? `${elem.bg} ${elem.border} border ring-1 ring-white/20 shadow-sm`
                      : 'hover:bg-zinc-800/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getElementIconUrl(elem.id)}
                    alt={elem.name}
                    className="w-4 h-4 object-contain"
                  />
                  <span className={`text-[9px] font-bold mt-0.5 ${elem.color}`}>
                    {elem.name}
                  </span>

                  {/* Dot indicator if main trekker matches */}
                  {isMainCharElem && (
                    <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-zinc-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Element Frame Section with the 3 Square Buttons */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {ELEMENTS_LIST.filter((elem) => elem.id === selectedElement).map((elem) => {
            const slotsData = presetsMap?.[elem.id] || { 1: null, 2: null, 3: null };

            return (
              <div
                key={elem.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-3"
              >
                {/* Frame Title */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <img
                      src={getElementIconUrl(elem.id)}
                      alt={elem.name}
                      className="w-5 h-5"
                    />
                    <div>
                      <h3 className={`text-xs font-bold ${elem.color} tracking-wide uppercase`}>
                        {elem.name} Frame ({elem.label})
                      </h3>
                      <span className="text-[10px] text-zinc-400">
                        3 Preset Slots
                      </span>
                    </div>
                  </div>

                  {mainChar.element === elem.id ? (
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Main Trekker Match
                    </span>
                  ) : (
                    <span
                      className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 flex items-center gap-1"
                      title={`Main Trekker saat ini berelemen ${mainChar.element}. Frame ini hanya untuk switch/baca.`}
                    >
                      <Lock className="w-2.5 h-2.5 text-zinc-500" />
                      Switch / Baca Saja
                    </span>
                  )}
                </div>

                {/* 3 Square Buttons Frame (Kotak 1, Kotak 2, Kotak 3) */}
                <div className="grid grid-cols-3 gap-2.5">
                  {([1, 2, 3] as const).map((slotNum) => {
                    const slotData = slotsData[slotNum];
                    const key = `${elem.id}_${slotNum}`;
                    const isMatchingElement = mainChar.element === elem.id;
                    const isActive = activePresetKey === key && isMatchingElement;
                    const isHovered = hoveredSlotKey === key;

                    // EMPTY SLOT
                    if (!slotData) {
                      // Non-matching element: Locked empty slot
                      if (!isMatchingElement) {
                        return (
                          <button
                            key={slotNum}
                            type="button"
                            onClick={() => handleSlotClick(elem.id, slotNum)}
                            className="aspect-square rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/30 opacity-40 hover:opacity-80 transition-all flex flex-col items-center justify-center p-2 cursor-not-allowed group relative"
                            title={`Slot terkunci: Main Trekker (${mainChar.name}) berelemen ${mainChar.element}. Hanya Trekker berelemen ${elem.name} yang dapat disimpan di sini.`}
                          >
                            <div className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-600 mb-1 group-hover:text-rose-400 group-hover:border-rose-500/40 transition-colors">
                              <Lock className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-zinc-500">
                              Preset {slotNum}
                            </span>
                            <span className="text-[9px] text-zinc-600 font-medium">
                              Khusus {elem.name}
                            </span>
                          </button>
                        );
                      }

                      // Matching element: Normal clickable empty slot to save
                      return (
                        <button
                          key={slotNum}
                          type="button"
                          onClick={() => handleSlotClick(elem.id, slotNum)}
                          onMouseEnter={() => setHoveredSlotKey(key)}
                          onMouseLeave={() => setHoveredSlotKey(null)}
                          className="aspect-square rounded-xl border border-dashed border-zinc-700 hover:border-amber-400 bg-zinc-950/40 hover:bg-zinc-900/80 transition-all flex flex-col items-center justify-center p-2 cursor-pointer group shadow-xs relative"
                          title={`Simpan build saat ini ke Preset ${slotNum}`}
                        >
                          <div className="p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-500 group-hover:text-amber-400 group-hover:border-amber-400/50 transition-colors mb-1">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                            Preset {slotNum}
                          </span>
                          <span className="text-[9px] text-zinc-600 group-hover:text-amber-400/80 transition-colors">
                            + Simpan
                          </span>
                        </button>
                      );
                    }

                    // FILLED SLOT WITH PHOTO
                    return (
                      <div
                        key={slotNum}
                        onClick={() => handleSlotClick(elem.id, slotNum)}
                        onMouseEnter={() => setHoveredSlotKey(key)}
                        onMouseLeave={() => setHoveredSlotKey(null)}
                        className={`aspect-square rounded-xl border relative overflow-hidden transition-all cursor-pointer group select-none shadow-md ${
                          isActive
                            ? 'border-amber-400 ring-2 ring-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                            : 'border-zinc-750 hover:border-zinc-500 bg-zinc-950'
                        }`}
                        title={
                          isActive
                            ? `Preset ${slotNum}: ${slotData.characterName} (Aktif) — Klik untuk Save / Overwrite`
                            : `Preset ${slotNum}: ${slotData.characterName} — Klik untuk Switch`
                        }
                      >
                        {/* Trekker Head Photo (Full background) */}
                        <img
                          src={getCharacterHeadUrl(slotData.characterId)}
                          alt={slotData.characterName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />

                        {/* Top Gradient & Slot Number Badge */}
                        <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                        <span className="absolute top-1 left-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-black/80 border border-zinc-700/80 text-zinc-200 shadow-xs z-10">
                          #{slotNum}
                        </span>

                        {/* Active Indicator Pin (Only if matching element) */}
                        {isActive && (
                          <span className="absolute top-1 right-1.5 px-1 rounded-full text-[8.5px] font-bold bg-amber-500 text-black shadow-xs z-10 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}

                        {/* Delete Button on Hover */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSlot(elem.id, slotNum, e)}
                          title="Hapus Preset ini"
                          className="absolute top-1 right-1 p-1 rounded bg-black/80 hover:bg-rose-950 border border-zinc-700 hover:border-rose-500 text-zinc-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>

                        {/* Bottom Gradient with Character Name */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-3 pb-1 px-1 text-center pointer-events-none">
                          <span className="text-[10px] font-bold text-white block truncate leading-tight">
                            {slotData.characterName}
                          </span>
                        </div>

                        {/* ============================================================ */}
                        {/* HOVER OVERLAY WITH OPACITY 70% AS REQUESTED */}
                        {/* If cursor aims at active slot (and matching element): Save logo inside photo (opacity 70) */}
                        {/* If cursor aims at another slot: Switch logo inside photo */}
                        {/* ============================================================ */}
                        <div
                          className={`absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-1 transition-opacity z-10 ${
                            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Save className="w-6 h-6 text-emerald-400 animate-in zoom-in-75 duration-150" />
                              <span className="text-[9.5px] font-bold text-white uppercase tracking-wider">
                                Save
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight className="w-6 h-6 text-amber-400 animate-in zoom-in-75 duration-150" />
                              <span className="text-[9.5px] font-bold text-white uppercase tracking-wider">
                                Switch
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer Guide */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Arahkan cursor ke kotak: <strong>Save</strong> (aktif) / <strong>Switch</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: "Are you sure to Switch before Saving?" */}
      {/* ========================================================================= */}
      {switchConfirmTarget && switchConfirmTarget.targetPreset && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-750 rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  Are you sure to Switch before Saving?
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Preset saat ini memiliki perubahan yang belum disimpan.
                </p>
              </div>
            </div>

            {/* Target Details */}
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Target Switch:</span>
              <div className="flex items-center gap-2">
                <img
                  src={getCharacterHeadUrl(switchConfirmTarget.targetPreset.characterId)}
                  alt={switchConfirmTarget.targetPreset.characterName}
                  className="w-5 h-5 rounded-md object-cover"
                />
                <span className="font-bold text-amber-300">
                  Preset {switchConfirmTarget.slot} ({switchConfirmTarget.targetPreset.characterName})
                </span>
              </div>
            </div>

            {/* Action Buttons: Yes, No, Cancel */}
            <div className="flex flex-col gap-2 pt-1">
              {/* Option Yes: Switch without saving */}
              <button
                type="button"
                onClick={handleConfirmSwitchYes}
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Yes</span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  (Pindah langsung tanpa simpan)
                </span>
              </button>

              {/* Option No: Save first, then switch! */}
              <button
                type="button"
                onClick={handleConfirmSwitchNo}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>No</span>
                <span className="text-[10px] text-zinc-900 font-semibold">
                  (Simpan dulu lalu pindah ke Preset {switchConfirmTarget.slot})
                </span>
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => setSwitchConfirmTarget(null)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 text-center py-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* FIREBASE FIRESTORE CLOUD DATABASE MODAL */}
      {/* ========================================================================= */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => {
          setIsFirebaseModalOpen(false);
          setIsCloudConnected(firebaseService.isConfigured());
        }}
        presetsMap={presetsMap}
        onApplyCloudPresets={(cloudMap) => {
          savePresetsMap(cloudMap);
        }}
        showToast={showToast}
        username={username}
      />
    </>
  );
};
