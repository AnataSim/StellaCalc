import { useState, useEffect, useMemo } from 'react';
import charactersData from './data/characters.json';
import discsData from './data/discs.json';
import type { BuildState, Character, DiscItem, TeamMemberSlot, EmblemSlotState } from './types';
import { calculateEffectiveStats } from './utils/calculator';
import { calculateCharacterDamageReport } from './utils/damageCalculator';
import { getElementColor } from './utils/assetUrl';
import {
  User,
  Zap,
  GitBranch,
  Disc3,
  Award,
  Swords,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Header } from './components/Header';
import { TeamBar } from './components/TeamBar';
import { CharacterPanel } from './components/CharacterPanel';
import { SkillPanel } from './components/SkillPanel';
import { EmblemPanel } from './components/EmblemPanel';
import { DiscPanel } from './components/DiscPanel';
import { TalentPanel } from './components/TalentPanel';
import { StatSummaryCard } from './components/StatSummaryCard';
import { DamageStatsCard } from './components/DamageStatsCard';
import { HorizontalBuildCard } from './components/HorizontalBuildCard';
import { QuickNavDock } from './components/QuickNavDock';
import { CombatStatsPalette } from './components/CombatStatsPalette';
import { ElementPresetDrawer } from './components/ElementPresetDrawer';
import { StartTrekkerMenu } from './components/StartTrekkerMenu';
import { LoadingScreen } from './components/LoadingScreen';
import { authService, type UserSession } from './services/authService';
import type { BreakdownNavigationItem } from './utils/navigation';
import {
  DEFAULT_SLOTS,
  STORAGE_KEY_SLOTS,
  STORAGE_KEY_AUTOSORT
} from './utils/combatStats';

export type MobileSection = 'character' | 'skills' | 'potentials' | 'discs' | 'emblems' | 'dps' | 'all';

const MOBILE_SECTIONS = [
  { id: 'character' as const, label: 'Trekker', icon: User, color: 'text-amber-400' },
  { id: 'skills' as const, label: 'Skills', icon: Zap, color: 'text-orange-400' },
  { id: 'potentials' as const, label: 'Potensial', icon: GitBranch, color: 'text-pink-400' },
  { id: 'discs' as const, label: 'Discs', icon: Disc3, color: 'text-cyan-400' },
  { id: 'emblems' as const, label: 'Emblem', icon: Award, color: 'text-purple-400' },
  { id: 'dps' as const, label: 'Combat DPS', icon: Swords, color: 'text-red-400' },
  { id: 'all' as const, label: 'Semua', icon: Layers, color: 'text-zinc-400' },
];

const CHARACTERS = (charactersData as unknown) as { [id: string]: Character };
const DISCS = (discsData as unknown) as { [id: string]: DiscItem };

export const getBuildStorageKey = (username?: string | null): string => {
  const clean = username?.trim().toLowerCase();
  return clean ? `stella_build_${clean}` : 'stella_build_guest';
};

export const emptyEmblems: { lv70: EmblemSlotState; lv80: EmblemSlotState; lv90: EmblemSlotState } = {
  lv70: {
    lines: [
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
    ],
  },
  lv80: {
    lines: [
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
    ],
  },
  lv90: {
    lines: [
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
      { statId: 'none', tier: 4 },
    ],
  },
};

export const emptyDiscs = {
  main1: { discId: null, level: 1, dupe: 1, harmonySkillLevel: 1 },
  main2: { discId: null, level: 1, dupe: 1, harmonySkillLevel: 1 },
  main3: { discId: null, level: 1, dupe: 1, harmonySkillLevel: 1 },
  support1: { discId: null, level: 1, dupe: 1, harmonySkillLevel: 1 },
  support2: { discId: null, level: 1, dupe: 1, harmonySkillLevel: 1 },
  support3: { discId: null, level: 1, dupe: 1, harmonySkillLevel: 1 },
};

export const emptyHarmonyNoteLevels: Record<string, number> = {
  '90011': 1,
  '90012': 1,
  '90013': 1,
  '90014': 1,
  '90015': 1,
  '90016': 1,
  '90017': 1,
  '90018': 1,
  '90019': 1,
  '90020': 1,
  '90021': 1,
  '90022': 1,
  '90023': 1,
};

export const defaultSupport1: TeamMemberSlot = {
  characterId: 107,
  level: 90,
  skillLevels: {
    normal: 1,
    main: 1,
    support: 1,
    ult: 1,
  },
  potentials: [],
  potentialLevels: {},
  activeTalents: {},
  affinityLevel: 1,
  emblems: emptyEmblems,
};

export const defaultSupport2: TeamMemberSlot = {
  characterId: 158,
  level: 90,
  skillLevels: {
    normal: 1,
    main: 1,
    support: 1,
    ult: 1,
  },
  potentials: [],
  potentialLevels: {},
  activeTalents: {},
  affinityLevel: 1,
  emblems: emptyEmblems,
};

export const defaultBuild: BuildState = {
  characterId: 103, // Amber default
  level: 90,
  skillLevels: {
    normal: 1,
    main: 1,
    support: 1,
    ult: 1,
  },
  potentials: [],
  potentialLevels: {},
  activeTalents: {},
  affinityLevel: 1,
  emblems: emptyEmblems,
  support1: undefined,
  support2: undefined,
  activeTeamSlot: 0,
  discs: emptyDiscs,
  harmonyNoteLevels: emptyHarmonyNoteLevels,
  combatToggles: {
    markActive: false,
    ultBuffActive: false,
    skillBuffActive: false,
  },
};

function normalizeBuild(saved: any): BuildState {
  if (!saved) return defaultBuild;
  const build = { ...defaultBuild, ...saved };
  if (!build.potentialLevels) {
    build.potentialLevels = {};
  } else {
    // Clamp saved potential levels to max base 6 (Core potentials stay max 1)
    for (const [potId, lvl] of Object.entries(build.potentialLevels)) {
      if (typeof lvl === 'number' && lvl > 6) {
        build.potentialLevels[Number(potId)] = 6;
      }
    }
  }
  if (build.support1?.potentialLevels) {
    for (const [potId, lvl] of Object.entries(build.support1.potentialLevels)) {
      if (typeof lvl === 'number' && lvl > 6) {
        build.support1.potentialLevels[Number(potId)] = 6;
      }
    }
  }
  if (build.support2?.potentialLevels) {
    for (const [potId, lvl] of Object.entries(build.support2.potentialLevels)) {
      if (typeof lvl === 'number' && lvl > 6) {
        build.support2.potentialLevels[Number(potId)] = 6;
      }
    }
  }
  if (!build.harmonyNoteLevels) {
    build.harmonyNoteLevels = { ...defaultBuild.harmonyNoteLevels };
  }
  if (!saved.support1) {
    build.support1 = undefined;
  }
  if (!saved.support2) {
    build.support2 = undefined;
  }
  if (build.activeTeamSlot !== 0 && build.activeTeamSlot !== 1 && build.activeTeamSlot !== 2) {
    build.activeTeamSlot = 0;
  }

  const slots: ('lv70' | 'lv80' | 'lv90')[] = ['lv70', 'lv80', 'lv90'];
  const normalizeEmblemSet = (emblems: any) => {
    if (!emblems) return defaultBuild.emblems;
    const res: any = { ...emblems };
    for (const s of slots) {
      if (!res[s]?.lines || res[s].lines.length !== 4) {
        res[s] = defaultBuild.emblems[s];
      } else {
        res[s].lines = res[s].lines.map((line: any) => {
          if (!line || !line.statId || line.statId === 'none') {
            return { statId: 'none', tier: 4 };
          }
          let tier = line.tier || 4;
          if (line.statId === 'crit_dmg' && tier > 3) {
            tier = 3;
          }
          return {
            statId: line.statId,
            tier,
            ...(line.targetPotentialId ? { targetPotentialId: line.targetPotentialId } : {}),
          };
        });
      }
    }
    return res;
  };

  build.emblems = normalizeEmblemSet(build.emblems);
  if (build.support1?.emblems) {
    build.support1.emblems = normalizeEmblemSet(build.support1.emblems);
  }
  if (build.support2?.emblems) {
    build.support2.emblems = normalizeEmblemSet(build.support2.emblems);
  }

  return build;
}

export default function App() {
  // Initial Join / Refresh Loading Screen
  const [isLoadingScreen, setIsLoadingScreen] = useState(true);

  // User Authentication & Device Session
  const [userSession, setUserSession] = useState<UserSession | null>(() => authService.getCurrentSession());

  const [build, setBuild] = useState<BuildState>(() => {
    try {
      const initialUser = authService.getCurrentSession()?.username;
      const key = getBuildStorageKey(initialUser);
      let saved = localStorage.getItem(key);
      if (!saved && initialUser) {
        const legacy = localStorage.getItem('stella_sora_build_v2');
        if (legacy) {
          localStorage.setItem(key, legacy);
          localStorage.removeItem('stella_sora_build_v2');
          saved = legacy;
        }
      }
      if (saved) return normalizeBuild(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load saved build:', e);
    }
    return defaultBuild;
  });

  const [hasSavedPreset, setHasSavedPreset] = useState(false);
  const [isPresetDrawerOpen, setIsPresetDrawerOpen] = useState(false);
  const [isStartMenu, setIsStartMenu] = useState<boolean>(() => {
    try {
      const initialUser = authService.getCurrentSession()?.username;
      const key = getBuildStorageKey(initialUser);
      const saved = localStorage.getItem(key);
      if (!saved && initialUser) {
        return !localStorage.getItem('stella_sora_build_v2');
      }
      return !saved; // If no saved build for this user -> Show start menu!
    } catch {}
    return true;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoBackup, setUndoBackup] = useState<BuildState | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [rightPanelTab, setRightPanelTab] = useState<'stats' | 'dps'>('stats');
  const [mobileSection, setMobileSection] = useState<MobileSection>('character');

  // Combat Stats 10-slot layout & Auto-Sort vs Placing mode states
  const [combatStatsSlots, setCombatStatsSlots] = useState<(string | null)[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 10) {
          return parsed;
        }
      }
    } catch {}
    return [...DEFAULT_SLOTS];
  });

  const [combatStatsAutoSort, setCombatStatsAutoSort] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTOSORT);
      if (raw !== null) {
        return JSON.parse(raw) === true;
      }
    } catch {}
    return false; // Default: Placing mode (positions stay fixed!)
  });

  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);
  const [selectedPaletteStat, setSelectedPaletteStat] = useState<string | null>(null);

  const handleUpdateCombatSlots = (newSlots: (string | null)[]) => {
    setCombatStatsSlots(newSlots);
    try {
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(newSlots));
    } catch {}
  };

  const handleToggleAutoSort = () => {
    const nextVal = !combatStatsAutoSort;
    setCombatStatsAutoSort(nextVal);
    try {
      localStorage.setItem(STORAGE_KEY_AUTOSORT, JSON.stringify(nextVal));
    } catch {}

    if (nextVal) {
      // Pack slots upwards to fill empty holes
      const packed = combatStatsSlots.filter(Boolean);
      while (packed.length < 10) packed.push(null);
      handleUpdateCombatSlots(packed);
    }
  };

  const handleResetCombatSlots = () => {
    const def = [...DEFAULT_SLOTS];
    handleUpdateCombatSlots(def);
    setPickingSlotIndex(null);
    setSelectedPaletteStat(null);
    showToast('Combat stats di-reset ke 10 default.');
  };

  // Load user-scoped build whenever session changes (login, logout, switch)
  useEffect(() => {
    const username = userSession?.username;
    const key = getBuildStorageKey(username);
    try {
      let saved = localStorage.getItem(key);
      if (!saved && username) {
        const legacy = localStorage.getItem('stella_sora_build_v2');
        if (legacy) {
          localStorage.setItem(key, legacy);
          localStorage.removeItem('stella_sora_build_v2');
          saved = legacy;
        }
      }
      if (saved) {
        setBuild(normalizeBuild(JSON.parse(saved)));
        setIsStartMenu(false);
      } else {
        // Brand new user or no saved build -> Start clean from Start Menu with nothing!
        setBuild(defaultBuild);
        setIsStartMenu(true);
      }
    } catch (e) {
      console.warn('Failed to load user build:', e);
      setBuild(defaultBuild);
      setIsStartMenu(true);
    }
  }, [userSession?.username]);

  // Auto-save build strictly for the active user
  useEffect(() => {
    const key = getBuildStorageKey(userSession?.username);
    try {
      localStorage.setItem(key, JSON.stringify(build));
      setHasSavedPreset(true);
    } catch (e) {
      console.error('Save error:', e);
    }
  }, [build, userSession?.username]);

  // 60-second Redo countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setUndoBackup(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectMainTrekkerFromStart = (charId: number) => {
    setBuild({
      ...defaultBuild,
      characterId: charId,
    });
    setIsStartMenu(false);
    showToast(`${CHARACTERS[String(charId)]?.name || 'Trekker'} dipilih sebagai Main Trekker!`);
  };

  const handleUndo = () => {
    setUndoBackup(build);
    setBuild(defaultBuild);
    setIsStartMenu(true);
    setCountdown(60);
    showToast('Build di-reset. Silakan pilih Main Trekker.');
  };

  const handleRedo = () => {
    if (undoBackup) {
      setBuild(undoBackup);
      setIsStartMenu(false);
      setUndoBackup(null);
      setCountdown(0);
      showToast('Build berhasil dipulihkan!');
    }
  };

  const handleSavePreset = () => {
    const key = getBuildStorageKey(userSession?.username);
    localStorage.setItem(key, JSON.stringify(build));
    showToast('Build saved to local memory.');
  };

  // Active Team Slot (0 = Main, 1 = Support 1, 2 = Support 2)
  const activeSlot = (build.activeTeamSlot ?? 0) as 0 | 1 | 2;

  // Main Trekker (Always on-field Leader)
  const mainChar = useMemo(() => {
    return CHARACTERS[String(build.characterId)] || Object.values(CHARACTERS)[0];
  }, [build.characterId]);

  const support1Char = useMemo(() => {
    return build.support1?.characterId ? CHARACTERS[String(build.support1.characterId)] || null : null;
  }, [build.support1?.characterId]);

  const support2Char = useMemo(() => {
    return build.support2?.characterId ? CHARACTERS[String(build.support2.characterId)] || null : null;
  }, [build.support2?.characterId]);

  // Trekker currently being configured in the input forms
  const activeChar = useMemo(() => {
    if (activeSlot === 1 && build.support1?.characterId) {
      return CHARACTERS[String(build.support1.characterId)] || CHARACTERS['107'];
    }
    if (activeSlot === 2 && build.support2?.characterId) {
      return CHARACTERS[String(build.support2.characterId)] || CHARACTERS['158'];
    }
    return mainChar;
  }, [activeSlot, mainChar, build.support1?.characterId, build.support2?.characterId]);

  // Synthetic state providing configuration inputs for the active slot
  const activeMemberBuild: BuildState = useMemo(() => {
    if (activeSlot === 0) return build;
    const slotData = activeSlot === 1 ? build.support1 : build.support2;
    const fallbackCharId = activeSlot === 1 ? 107 : 158;
    return {
      ...build,
      characterId: slotData?.characterId || fallbackCharId,
      level: slotData?.level || 90,
      skillLevels: slotData?.skillLevels || { normal: 1, main: 1, support: 1, ult: 1 },
      potentials: slotData?.potentials || [],
      potentialLevels: slotData?.potentialLevels || {},
      activeTalents: slotData?.activeTalents || {},
      affinityLevel: slotData?.affinityLevel || 1,
      emblems: slotData?.emblems || emptyEmblems,
    };
  }, [build, activeSlot]);

  // Synchronizer updating the correct team slot
  const handleActiveMemberChangeBuild = (updater: (prev: BuildState) => BuildState) => {
    setBuild((prev) => {
      const slot = prev.activeTeamSlot ?? 0;
      if (slot === 0) {
        return updater(prev);
      }
      const slotKey = slot === 1 ? 'support1' : 'support2';
      const currentSlotData: TeamMemberSlot = prev[slotKey] || (slot === 1 ? defaultSupport1 : defaultSupport2);

      const syntheticState: BuildState = {
        ...prev,
        characterId: currentSlotData.characterId,
        level: currentSlotData.level,
        skillLevels: currentSlotData.skillLevels,
        potentials: currentSlotData.potentials,
        potentialLevels: currentSlotData.potentialLevels || {},
        activeTalents: currentSlotData.activeTalents,
        affinityLevel: currentSlotData.affinityLevel,
        emblems: currentSlotData.emblems,
      };

      const nextSynthetic = updater(syntheticState);

      return {
        ...prev,
        [slotKey]: {
          characterId: nextSynthetic.characterId,
          level: nextSynthetic.level,
          skillLevels: nextSynthetic.skillLevels,
          potentials: nextSynthetic.potentials,
          potentialLevels: nextSynthetic.potentialLevels || {},
          activeTalents: nextSynthetic.activeTalents,
          affinityLevel: nextSynthetic.affinityLevel,
          emblems: nextSynthetic.emblems,
        },
        discs: nextSynthetic.discs,
        harmonyNoteLevels: nextSynthetic.harmonyNoteLevels,
        combatToggles: nextSynthetic.combatToggles,
      };
    });
  };

  const handleSelectSlot = (slot: 0 | 1 | 2) => {
    setBuild((prev) => ({
      ...prev,
      activeTeamSlot: slot,
    }));
  };

  // Deep-link navigation from breakdown items (Combat Stats / Combat DPS)
  useEffect(() => {
    const handleBreakdownNav = (e: Event) => {
      const ce = e as CustomEvent<BreakdownNavigationItem>;
      if (!ce.detail) return;
      const { label, source, charName } = ce.detail;

      const lowerSource = source.toLowerCase();
      const lowerLabel = label.toLowerCase();

      // 1. Determine target trekker slot (Main 0, Support 1, Support 2)
      let targetSlot: 0 | 1 | 2 | null = null;

      // Check if breakdown explicitly comes from Support 1 or Support 2
      if (lowerSource.startsWith('support 1') || lowerLabel.startsWith('support 1')) {
        targetSlot = 1;
      } else if (lowerSource.startsWith('support 2') || lowerLabel.startsWith('support 2')) {
        targetSlot = 2;
      } else if (charName) {
        if (mainChar && mainChar.name.toLowerCase() === charName.toLowerCase()) {
          targetSlot = 0;
        } else if (support1Char && support1Char.name.toLowerCase() === charName.toLowerCase()) {
          targetSlot = 1;
        } else if (support2Char && support2Char.name.toLowerCase() === charName.toLowerCase()) {
          targetSlot = 2;
        }
      }

      // Fallback: check if character name is in parentheses (e.g. "Support 2 (Firefly) - ...")
      if (targetSlot === null) {
        if (support1Char && lowerLabel.includes(`(${support1Char.name.toLowerCase()})`)) {
          targetSlot = 1;
        } else if (support2Char && lowerLabel.includes(`(${support2Char.name.toLowerCase()})`)) {
          targetSlot = 2;
        } else if (mainChar && lowerLabel.includes(`(${mainChar.name.toLowerCase()})`)) {
          targetSlot = 0;
        }
      }

      if (targetSlot !== null && activeSlot !== targetSlot) {
        handleSelectSlot(targetSlot);
      }

      // 2. Identify target section
      const isPotential = lowerSource.includes('potential') || lowerLabel.includes('potential');
      const isTalent = lowerSource.includes('talent') || lowerLabel.includes('talent');
      const isEmblem = lowerSource.includes('emblem') || lowerLabel.includes('emblem');
      const isHarmony = lowerSource.includes('harmony note') || lowerLabel.includes('harmony note') || lowerLabel.includes('melody of');
      const isDisc = (lowerSource.includes('disc') || lowerLabel.includes('disc')) && !isHarmony;
      const isSkill = (lowerSource.includes('skill') || lowerLabel.includes('support skill') || lowerLabel.includes('main skill')) && !isPotential && !isDisc && !isHarmony && !isEmblem;
      const isChar = lowerSource.includes('affinity') || lowerLabel.includes('affinity') || isTalent;

      let targetSectionId = '';
      if (isPotential) {
        setMobileSection('potentials');
        targetSectionId = 'section-potentials';
      } else if (isSkill) {
        setMobileSection('skills');
        targetSectionId = 'section-skills';
      } else if (isEmblem) {
        setMobileSection('emblems');
        targetSectionId = 'section-emblems';
      } else if (isHarmony || isDisc) {
        setMobileSection('discs');
        targetSectionId = 'section-discs';
      } else if (isChar) {
        setMobileSection('character');
        targetSectionId = 'section-character';
      }

      if (targetSectionId) {
        setTimeout(() => {
          const el = document.getElementById(targetSectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    };

    window.addEventListener('navigate-breakdown', handleBreakdownNav);
    return () => window.removeEventListener('navigate-breakdown', handleBreakdownNav);
  }, [activeSlot, mainChar, support1Char, support2Char]);

  const handleClearSupportSlot = (slot: 1 | 2) => {
    setBuild((prev) => ({
      ...prev,
      [slot === 1 ? 'support1' : 'support2']: undefined,
    }));
    showToast(`Support ${slot} dikosongkan.`);
  };

  const handleChangeSlotCharacter = (slot: 0 | 1 | 2, characterId: number) => {
    if (slot === 0) {
      setBuild((prev) => ({
        ...prev,
        characterId,
        activeTalents: {},
        activeTeamSlot: 0,
      }));
    } else if (slot === 1) {
      setBuild((prev) => ({
        ...prev,
        support1: {
          characterId,
          level: 90,
          skillLevels: { normal: 1, main: 1, support: 1, ult: 1 },
          potentials: [],
          potentialLevels: {},
          activeTalents: {},
          affinityLevel: 1,
          emblems: emptyEmblems,
        },
        activeTeamSlot: 1,
      }));
    } else {
      setBuild((prev) => ({
        ...prev,
        support2: {
          characterId,
          level: 90,
          skillLevels: { normal: 1, main: 1, support: 1, ult: 1 },
          potentials: [],
          potentialLevels: {},
          activeTalents: {},
          affinityLevel: 1,
          emblems: emptyEmblems,
        },
        activeTeamSlot: 2,
      }));
    }
    showToast(`Trekker slot ${slot === 0 ? 'Main' : `Support ${slot}`} diubah!`);
  };

  // Auto-sync Lv.90 unique_talent targetPotentialId to active character if invalid or from another character
  useEffect(() => {
    if (!activeChar?.potential) return;
    const nonCoreCats: ('mainNormal' | 'common' | 'supportCore' | 'supportNormal')[] = [
      'mainNormal',
      'common',
      'supportCore',
      'supportNormal'
    ];
    const validIds = new Set<number>();
    for (const cat of nonCoreCats) {
      for (const p of activeChar.potential[cat] || []) {
        validIds.add(p.id);
      }
    }

    const currentEmblems = activeSlot === 0
      ? build.emblems
      : (activeSlot === 1 ? build.support1?.emblems : build.support2?.emblems);

    const lv90Lines = currentEmblems?.lv90?.lines;
    if (lv90Lines) {
      let needsUpdate = false;
      const updatedLines = lv90Lines.map((line) => {
        if (line.statId === 'unique_talent') {
          if (!line.targetPotentialId || !validIds.has(line.targetPotentialId)) {
            needsUpdate = true;
            return {
              ...line,
              targetPotentialId: activeChar.potential?.mainNormal?.[0]?.id || activeChar.potential?.supportNormal?.[0]?.id
            };
          }
        }
        return line;
      });

      if (needsUpdate) {
        handleActiveMemberChangeBuild((prev) => ({
          ...prev,
          emblems: {
            ...prev.emblems,
            lv90: {
              ...prev.emblems.lv90,
              lines: updatedLines
            }
          }
        }));
      }
    }
  }, [activeChar.id, activeSlot]);

  // Real-time calculation: ALWAYS focused on the Main Trekker, incorporating all support cross-buffs!
  const calculatedStats = useMemo(() => {
    return calculateEffectiveStats(mainChar, build, DISCS);
  }, [mainChar, build]);

  // Live damage report for the Main Trekker
  const liveDpsReport = useMemo(() => {
    return calculateCharacterDamageReport(mainChar, build, calculatedStats, 0, DISCS);
  }, [mainChar, build, calculatedStats]);

  const formattedLiveDps = useMemo(() => {
    if (!liveDpsReport) return '0';
    return Math.round(liveDpsReport.totalRotationDps).toLocaleString('id-ID');
  }, [liveDpsReport]);

  const mainCharElemColor = useMemo(() => {
    return getElementColor(mainChar.element || 'Lux');
  }, [mainChar.element]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Initial Join / Refresh Loading Screen with Integrated Simple Auth */}
      {isLoadingScreen && (
        <LoadingScreen
          userSession={userSession}
          onSuccess={(session) => {
            setUserSession(session);
          }}
          onFinish={() => {
            setIsLoadingScreen(false);
          }}
          showToast={showToast}
        />
      )}

      <Header
        onUndo={handleUndo}
        canRedo={!!undoBackup && countdown > 0}
        onRedo={handleRedo}
        countdown={countdown}
        onSavePreset={handleSavePreset}
        hasSavedPreset={hasSavedPreset}
        onTogglePresetDrawer={() => setIsPresetDrawerOpen((prev) => !prev)}
        isPresetDrawerOpen={isPresetDrawerOpen}
        userSession={userSession}
        onSessionUpdated={(updated) => setUserSession(updated)}
        onLogout={() => {
          authService.logout();
          setUserSession(null);
          setBuild(defaultBuild);
          setIsStartMenu(true);
          setIsLoadingScreen(true);
          showToast('Anda telah keluar dari sesi.');
        }}
        showToast={showToast}
      />

      <ElementPresetDrawer
        isOpen={isPresetDrawerOpen}
        onClose={() => setIsPresetDrawerOpen(false)}
        currentBuild={build}
        mainChar={mainChar}
        onApplyBuild={(loadedBuild) => {
          setBuild(normalizeBuild(loadedBuild));
        }}
        showToast={showToast}
        userSession={userSession}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold text-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Main Container */}
      {isStartMenu ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 py-4 sm:p-4 lg:p-8 flex items-center justify-center">
          <StartTrekkerMenu
            characters={CHARACTERS}
            onSelectCharacter={handleSelectMainTrekkerFromStart}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-8 py-2.5 sm:py-4 pb-24 lg:pb-8 animate-in fade-in duration-300">
          {/* Floating In-Game Mini Navigation Dock (Hidden on mobile phones to prevent clutter) */}
          <QuickNavDock />

          {/* 1. Horizontal Build Showcase Card (Passionate Trekker Card) */}
          <div id="section-passionate-card" className="scroll-mt-24">
            <HorizontalBuildCard
              character={mainChar}
              build={build}
              discs={DISCS}
              stats={calculatedStats}
              characters={CHARACTERS}
            />
          </div>

          {/* 1 Main + 2 Supports Squad 3 Vertical Cards Bar */}
          <TeamBar
            characters={CHARACTERS}
            build={build}
            activeSlot={activeSlot}
            onSelectSlot={handleSelectSlot}
            onChangeSlotCharacter={handleChangeSlotCharacter}
            onClearSupportSlot={handleClearSupportSlot}
          />

          {/* ========================================================================= */}
          {/* MOBILE SECTION TABS (< lg) — Ultra Clean, Spacious & Zero Clutter */}
          {/* ========================================================================= */}
          <div className="lg:hidden sticky top-[49px] z-30 -mx-2 px-2 py-2 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-850 mb-3.5 select-none">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
              {MOBILE_SECTIONS.map((tab) => {
                const Icon = tab.icon;
                const isActive = mobileSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setMobileSection(tab.id);
                      const el = document.getElementById('mobile-section-content');
                      if (el) {
                        const yOffset = -115;
                        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 border border-amber-400/80 text-white shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/30'
                        : 'bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : 'text-zinc-400'}`} />
                    <span>{tab.label}</span>
                    {tab.id === 'dps' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div id="mobile-section-content" className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left Column (Active Trekker Configuration Forms) */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6">
              {/* 2. Trekker Frame (Level, Affinity, Limit Break) */}
              <div
                id="section-character"
                className={`scroll-mt-28 ${
                  mobileSection === 'character' || mobileSection === 'all' ? 'block' : 'hidden lg:block'
                }`}
              >
                <CharacterPanel
                  characters={CHARACTERS}
                  build={activeMemberBuild}
                  onChangeBuild={handleActiveMemberChangeBuild}
                  activeTeamSlot={activeSlot}
                />
              </div>

              {/* 3. Skill & Multipliers */}
              <div
                id="section-skills"
                className={`scroll-mt-28 ${
                  mobileSection === 'skills' || mobileSection === 'all' ? 'block' : 'hidden lg:block'
                }`}
              >
                <SkillPanel
                  character={activeChar}
                  build={activeMemberBuild}
                  onChangeBuild={handleActiveMemberChangeBuild}
                  activeTeamSlot={activeSlot}
                />
              </div>

              {/* 4. Trekker Potentials */}
              <div
                id="section-potentials"
                className={`scroll-mt-28 ${
                  mobileSection === 'potentials' || mobileSection === 'all' ? 'block' : 'hidden lg:block'
                }`}
              >
                <TalentPanel
                  character={activeChar}
                  build={activeMemberBuild}
                  onChangeBuild={handleActiveMemberChangeBuild}
                  activeTeamSlot={activeSlot}
                />
              </div>

              {/* 5. Discs & Harmony Skills */}
              <div
                id="section-discs"
                className={`scroll-mt-28 ${
                  mobileSection === 'discs' || mobileSection === 'all' ? 'block' : 'hidden lg:block'
                }`}
              >
                <DiscPanel
                  discs={DISCS}
                  build={build}
                  onChangeBuild={setBuild}
                  character={mainChar}
                />
              </div>

              {/* 6. Emblem System */}
              <div
                id="section-emblems"
                className={`scroll-mt-28 ${
                  mobileSection === 'emblems' || mobileSection === 'all' ? 'block' : 'hidden lg:block'
                }`}
              >
                <EmblemPanel
                  build={activeMemberBuild}
                  onChangeBuild={handleActiveMemberChangeBuild}
                  character={activeChar}
                />
              </div>
            </div>

            {/* Right Column (Sticky True Effective Stats & Damage Calculation Dashboard) */}
            <div
              className={`lg:col-span-4 lg:sticky lg:top-20 space-y-4 sm:space-y-5 ${
                mobileSection === 'dps' || mobileSection === 'all' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className={rightPanelTab === 'stats' ? 'block' : 'hidden'}>
                <StatSummaryCard
                  stats={calculatedStats}
                  character={mainChar}
                  activeTab={rightPanelTab}
                  onTabChange={setRightPanelTab}
                  slots={combatStatsSlots}
                  onUpdateSlots={handleUpdateCombatSlots}
                  autoSort={combatStatsAutoSort}
                  onToggleAutoSort={handleToggleAutoSort}
                  onResetSlots={handleResetCombatSlots}
                  pickingSlotIndex={pickingSlotIndex}
                  onSelectSlotToPick={setPickingSlotIndex}
                  selectedPaletteStat={selectedPaletteStat}
                  onSelectPaletteStat={setSelectedPaletteStat}
                />
              </div>

              <div className={rightPanelTab === 'dps' ? 'block' : 'hidden'}>
                <DamageStatsCard
                  mainChar={mainChar}
                  support1Char={support1Char}
                  support2Char={support2Char}
                  build={build}
                  stats={calculatedStats}
                  discs={DISCS}
                  activeTab={rightPanelTab}
                  onTabChange={setRightPanelTab}
                />
              </div>

              {/* Combat Stats Selection Palette (Replaced Quick Pick) */}
              <div className={rightPanelTab === 'stats' ? 'block' : 'hidden'}>
                <CombatStatsPalette
                  character={mainChar}
                  stats={calculatedStats}
                  slots={combatStatsSlots}
                  onUpdateSlots={handleUpdateCombatSlots}
                  onResetSlots={handleResetCombatSlots}
                  pickingSlotIndex={pickingSlotIndex}
                  onSelectSlotToPick={setPickingSlotIndex}
                  selectedPaletteStat={selectedPaletteStat}
                  onSelectPaletteStat={setSelectedPaletteStat}
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FLOATING MINI LIVE DPS HUD PILL (< lg) */}
          {/* ========================================================================= */}
          {mobileSection !== 'dps' && (
            <aside
              aria-label="Floating Mobile DPS Pill"
              className="fixed bottom-3 left-3 right-3 z-30 lg:hidden flex items-center justify-between px-3.5 py-2 rounded-2xl bg-zinc-900/95 border border-amber-500/40 backdrop-blur-xl shadow-2xl shadow-black/95 animate-in slide-in-from-bottom-3 duration-250 select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 truncate">
                    <span className="font-bold text-zinc-200">{mainChar.name}</span>
                    <span className="text-zinc-600">•</span>
                    <span className={`font-bold ${mainCharElemColor.text}`}>{mainChar.element}</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white font-mono tracking-tight flex items-baseline gap-1.5">
                    <span className="text-amber-300 drop-shadow-sm">{formattedLiveDps}</span>
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">DPS</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileSection('dps');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Buka DPS</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </aside>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-center text-xs text-zinc-500">
        <p>
          Stella Sora Data powered by <span className="text-zinc-300 font-medium">AutumnVN/ss-data</span> & Assets by <span className="text-zinc-300 font-medium">AutumnVN/ssassets</span>.
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Built for Theorycrafting & True Effective Combat Calculations.
        </p>
      </footer>
    </div>
  );
}
