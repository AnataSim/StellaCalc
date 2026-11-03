import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { BuildState, Character, PotentialData } from '../types';
import type { BreakdownNavigationItem } from '../utils/navigation';
import { getPotentialIconUrl, getCharacterHeadUrl } from '../utils/assetUrl';
import { ALL_EMBLEM_STATS } from '../data/emblemPools';
import {
  decodePresetShareCode,
  type DecodedPresetResult,
  TOP_BLITZ_PRESETS
} from '../utils/presetDecoder';
import potentialPresetsData from '../data/potentialPresets.json';
import {
  Sparkles,
  Search,
  Plus,
  Check,
  X,
  FileCode,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Bookmark,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';

interface Props {
  character: Character;
  build: BuildState;
  onChangeBuild: (updater: (prev: BuildState) => BuildState) => void;
  activeTeamSlot?: 0 | 1 | 2;
}

type CategoryKey = 'mainCore' | 'mainNormal' | 'common' | 'supportCore' | 'supportNormal';

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  badgeColor: string;
  borderColor: string;
  starColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'mainCore',
    label: 'Main core',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    borderColor: 'border-pink-500/40',
    starColor: 'from-pink-500/30 via-rose-500/40 to-pink-600/30'
  },
  {
    key: 'mainNormal',
    label: 'Main Normal',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderColor: 'border-amber-500/40',
    starColor: 'from-amber-500/30 via-orange-500/30 to-yellow-600/30'
  },
  {
    key: 'common',
    label: 'Common',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderColor: 'border-emerald-500/40',
    starColor: 'from-emerald-500/30 via-teal-500/30 to-green-600/30'
  },
  {
    key: 'supportCore',
    label: 'Support Core',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    borderColor: 'border-purple-500/40',
    starColor: 'from-purple-500/30 via-violet-500/40 to-fuchsia-600/30'
  },
  {
    key: 'supportNormal',
    label: 'Support Normal',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    borderColor: 'border-sky-500/40',
    starColor: 'from-sky-500/30 via-blue-500/30 to-indigo-600/30'
  }
];

function getMaxLevelForPotential(p: PotentialData): number {
  if (p.rarity === 'core') return 1;
  // In Stella Sora, base potential level can only be configured from Lv.1 to Lv.6.
  // Levels 7 to 9 are achieved exclusively via the Lv.90 Emblem Unique Talent affix (+1 to +3).
  return 6;
}

function getPotentialRarityTheme(rarity?: string, isActive = false) {
  if (rarity === 'core') {
    // Core Potentials: Pink
    return {
      rarity: 'core' as const,
      titleClass: isActive
        ? 'text-pink-400 font-bold hover:text-pink-300 drop-shadow-[0_1px_4px_rgba(244,114,182,0.35)]'
        : 'text-pink-400/90 font-bold hover:text-pink-300',
      iconBoxBg: 'bg-gradient-to-br from-pink-500/25 via-rose-500/15 to-pink-900/20',
      iconBoxBorder: isActive ? 'border-pink-500/50 shadow-[0_0_8px_rgba(244,114,182,0.35)]' : 'border-transparent',
      cardActiveBorder: 'bg-zinc-950/90 shadow-md'
    };
  }

  if (rarity === 'rare') {
    // Rare Potentials: Rainbow 3-color gradient (Purple/Violet -> Pink -> Cyan/Sky matching in-game Prism)
    return {
      rarity: 'rare' as const,
      titleClass: isActive
        ? 'bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent font-bold drop-shadow-[0_1px_4px_rgba(168,85,247,0.35)]'
        : 'bg-gradient-to-r from-violet-400/90 via-pink-400/90 to-cyan-300/90 bg-clip-text text-transparent font-bold hover:opacity-90',
      iconBoxBg: 'bg-gradient-to-br from-violet-500/25 via-pink-500/20 to-cyan-500/20',
      iconBoxBorder: isActive ? 'border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.35)]' : 'border-transparent',
      cardActiveBorder: 'bg-zinc-950/90 shadow-md'
    };
  }

  // Common Potentials: Emas / Gold
  return {
    rarity: 'common' as const,
    titleClass: isActive
      ? 'text-amber-400 font-bold hover:text-amber-300 drop-shadow-[0_1px_4px_rgba(251,191,36,0.35)]'
      : 'text-amber-400/90 font-bold hover:text-amber-300',
    iconBoxBg: 'bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-amber-900/20',
    iconBoxBorder: isActive ? 'border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]' : 'border-transparent',
    cardActiveBorder: 'bg-zinc-950/90 shadow-md'
  };
}

const STAT_KEYWORDS = [
  'Skill Crit Rate',
  'Auto Attack Crit Rate',
  'Ultimate Crit Rate',
  'Mark Crit Rate',
  'Minion Crit Rate',
  'Auto Attack Crit DMG',
  'Skill Crit DMG',
  'Ultimate Crit DMG',
  'Mark Crit DMG',
  'Minion Crit DMG',
  'Crit Damage',
  'Crit Rate',
  'Crit DMG',
  'Lux Skill DMG',
  'Ignis Skill DMG',
  'Aqua Skill DMG',
  'Terra Skill DMG',
  'Ventus Skill DMG',
  'Umbra Skill DMG',
  'Lux Auto Attack DMG',
  'Ignis Auto Attack DMG',
  'Aqua Auto Attack DMG',
  'Terra Auto Attack DMG',
  'Ventus Auto Attack DMG',
  'Umbra Auto Attack DMG',
  'Lux Ultimate DMG',
  'Ignis Ultimate DMG',
  'Aqua Ultimate DMG',
  'Terra Ultimate DMG',
  'Ventus Ultimate DMG',
  'Umbra Ultimate DMG',
  'Lux Mark DMG',
  'Ignis Mark DMG',
  'Aqua Mark DMG',
  'Terra Mark DMG',
  'Ventus Mark DMG',
  'Umbra Mark DMG',
  'Lux Minion DMG',
  'Umbra Minion DMG',
  'Aqua Minion DMG',
  'Ignis Minion DMG',
  'Lux Skill Damage',
  'Auto Attack DMG',
  'Ultimate DMG',
  'Minion DMG',
  'Skill DMG',
  'Skill damage',
  'DMG multiplier',
  'DMG Multiplier',
  'DMG Taken',
  'Damage Taken',
  'Lux DMG',
  'Ignis DMG',
  'Aqua DMG',
  'Terra DMG',
  'Ventus DMG',
  'Umbra DMG',
  'DEF PEN',
  'Armor PEN',
  'Lux PEN',
  'Ignis PEN',
  'Aqua PEN',
  'Terra PEN',
  'Ventus PEN',
  'Umbra PEN',
  'Attack Speed',
  'Movement Speed',
  'Resilience Break Efficiency',
  'Resilience Break',
  'HP Recovery',
  'Max HP',
  'Base HP',
  'Current HP',
  'Lost HP',
  'Lux Mark',
  'Ignis Mark',
  'Aqua Mark',
  'Terra Mark',
  'Ventus Mark',
  'Umbra Mark',
  'Mark DMG',
  'Damage',
  'Shield',
  'Glimmer',
  'Bloom',
  'Frozen',
  'Freeze',
  'Stun',
  'Superarmor',
  'Energy',
  'Mark',
  'PEN',
  'DMG',
  'ATK',
  'DEF',
  'HP'
];

type StatCategory = 'hp' | 'crit' | 'pen' | 'mark' | 'dmg' | 'atk' | 'def';

function getStatCategory(term: string): StatCategory {
  const lower = term.toLowerCase();
  if (lower.includes('crit')) return 'crit';
  if (lower.includes('pen')) return 'pen';
  if (lower.includes('hp') || lower.includes('heal') || lower.includes('shield')) return 'hp';
  if (lower.includes('mark') || lower.includes('glimmer') || lower.includes('bloom') || lower.includes('stun') || lower.includes('frozen') || lower.includes('freeze')) return 'mark';
  if (lower.includes('dmg') || lower.includes('damage') || lower.includes('multiplier')) return 'dmg';
  if (lower.includes('atk') || lower.includes('speed')) return 'atk';
  if (lower.includes('def') || lower.includes('resilience') || lower.includes('energy')) return 'def';
  return 'dmg';
}

function getStatTheme(cat: StatCategory, isActive = true) {
  if (!isActive) {
    return {
      badgeClass: 'text-zinc-500 bg-zinc-900/60 border-zinc-800'
    };
  }
  switch (cat) {
    case 'hp':
      return {
        // Emerald / Green (Max HP, HP, Shield, Healing)
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
      };
    case 'crit':
      return {
        // Cyan / Sky (Crit Rate, Crit DMG)
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
      };
    case 'pen':
      return {
        // Fuchsia / Purple (Lux PEN, DEF PEN, PEN)
        badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/35'
      };
    case 'mark':
      return {
        // Amber / Yellow (Mark, Glimmer, Bloom, Stun)
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35'
      };
    case 'dmg':
      return {
        // Rose / Orange (Skill DMG, Damage, DMG Multiplier)
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35'
      };
    case 'atk':
      return {
        // Teal / Mint (ATK, Attack Speed)
        badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/35'
      };
    case 'def':
      return {
        // Blue / Indigo (DEF, Resilience Break, Energy)
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/35'
      };
  }
}

function highlightStatText(chunk: string, keyPrefix: string | number): React.ReactNode[] {
  if (!chunk) return [];

  const elements: React.ReactNode[] = [];
  const pattern = new RegExp(`\\b(${STAT_KEYWORDS.join('|')})\\b`, 'gi');
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(chunk)) !== null) {
    if (match.index > lastIdx) {
      elements.push(chunk.substring(lastIdx, match.index));
    }
    const matchedText = match[0];
    const cat = getStatCategory(matchedText);
    const theme = getStatTheme(cat, true);

    elements.push(
      <span
        key={`${keyPrefix}-${match.index}`}
        className={`px-1 py-0.2 mx-0.5 rounded text-[10.5px] font-semibold border inline-block leading-tight align-baseline shadow-xs ${theme.badgeClass}`}
      >
        {matchedText}
      </span>
    );
    lastIdx = pattern.lastIndex;
  }

  if (lastIdx < chunk.length) {
    elements.push(chunk.substring(lastIdx));
  }

  return elements;
}

function parseFormattedGameText(
  text: string,
  params?: (string | number)[],
  level = 1,
  onSelectLevel?: (lvl: number) => void,
  isCore = false
): React.ReactNode {
  if (!text) return null;

  // 1. Strip raw dataminer-dumped parameter debug lines like "\u000bParam1: &Param1& (Effect,EffectTypeFirstSubtype)"
  let resolved = text.replace(
    /[\r\n\x0B]*\s*(?:Hidden)?Param\d+:\s*(?:&Param\d+&|[^\n\r(]+?)\s*\((?:Effect|OnceAdditionalAttribute|HitDamage|ScriptParameterValue|Skill,Title)[^)]*\)/gi,
    ''
  );

  resolved = resolved.replace(/\x0B/g, '\n');
  resolved = resolved.replace(/##([^#]+)#\d+#/g, '$1 🔥');

  const elements: React.ReactNode[] = [];
  const colorTagRegex = /<color=(#[a-fA-F0-9]+)>([\s\S]*?)<\/color>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const processChunk = (chunk: string, activeColor: string | null, chunkKey: string) => {
    if (!chunk) return;
    const parts = chunk.split(/(&Param\d+&)/g);

    parts.forEach((part, partIdx) => {
      if (!part) return;
      const paramMatch = part.match(/^&Param(\d+)&$/);

      if (paramMatch) {
        const pIdx = parseInt(paramMatch[1], 10) - 1;
        const pVal = params && params[pIdx] !== undefined ? params[pIdx] : '';

        if (typeof pVal === 'string' && pVal.includes('/')) {
          // Scaling parameter: e.g. "10/15/20/25/30/35/40/45/50" or "16%/25%/35%/44%/53%/63%/69%/74%/79%"
          const vals = pVal.split('/');
          const effLvl = level > 0 ? level : 1;
          const activeIdx = Math.max(0, Math.min(effLvl - 1, vals.length - 1));
          const highlightColor = activeColor || '#fb8037';

          if (isCore) {
            // For Core potentials: single value only (no "/ / /" scaling list)
            const singleVal = vals[activeIdx] || vals[0];
            elements.push(
              <span
                key={`${chunkKey}-param-${pIdx}-${partIdx}`}
                style={{ color: highlightColor }}
                className="font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
              >
                {singleVal}
              </span>
            );
          } else {
            elements.push(
              <span key={`${chunkKey}-param-${pIdx}-${partIdx}`} className="font-mono">
                {vals.map((val, vIdx) => {
                  const lvl = vIdx + 1;
                  const isCurrent = vIdx === activeIdx;
                  return (
                    <React.Fragment key={vIdx}>
                      {vIdx > 0 && (
                        <span className="text-zinc-500 font-normal select-none mx-0.5">/</span>
                      )}
                      <span
                        onClick={
                          onSelectLevel && lvl <= 6
                            ? (e) => {
                                e.stopPropagation();
                                onSelectLevel(lvl);
                              }
                            : undefined
                        }
                        style={{
                          color: isCurrent ? highlightColor : '#ffffff'
                        }}
                        className={`${
                          isCurrent
                            ? 'font-black drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]'
                            : 'font-normal opacity-90'
                        } ${
                          onSelectLevel && lvl <= 6
                            ? 'cursor-pointer hover:underline hover:opacity-100 transition-all'
                            : ''
                        }`}
                        title={`Lv.${lvl}: ${val}${isCurrent ? ' (Active)' : ''}${lvl > 6 ? ' (Emblem +3)' : ''}`}
                      >
                        {val}
                      </span>
                    </React.Fragment>
                  );
                })}
              </span>
            );
          }
        } else {
          // Single parameter without '/' (e.g. "Skill Crit Rate" or 17 or "20%")
          const strVal = String(pVal);
          if (activeColor) {
            elements.push(
              <span key={`${chunkKey}-param-${pIdx}-${partIdx}`} style={{ color: activeColor }} className="font-bold">
                {strVal}
              </span>
            );
          } else {
            elements.push(...highlightStatText(strVal, `${chunkKey}-param-${pIdx}-${partIdx}`));
          }
        }
      } else {
        // Plain text segment
        if (activeColor) {
          elements.push(
            <span key={`${chunkKey}-txt-${partIdx}`} style={{ color: activeColor }} className="font-bold">
              {part}
            </span>
          );
        } else {
          elements.push(...highlightStatText(part, `${chunkKey}-txt-${partIdx}`));
        }
      }
    });
  };

  while ((match = colorTagRegex.exec(resolved)) !== null) {
    if (match.index > lastIndex) {
      const beforeChunk = resolved.substring(lastIndex, match.index);
      processChunk(beforeChunk, null, `chunk-${lastIndex}`);
    }
    const colorHex = match[1];
    const innerContent = match[2];
    processChunk(innerContent, colorHex, `col-${match.index}`);
    lastIndex = colorTagRegex.lastIndex;
  }

  if (lastIndex < resolved.length) {
    const afterChunk = resolved.substring(lastIndex);
    processChunk(afterChunk, null, `chunk-${lastIndex}`);
  }

  return elements;
}

export interface PotentialActiveStat {
  name: string;
  val: string;
  isPercent: boolean;
}

export function formatPotentialAttrName(attr: string): string {
  if (!attr) return '';

  // 1. Strip raw internal prefix like ELEMENTTYPE_:(Element) -> Element
  let clean = attr
    .replace(/ELEMENTTYPE_:\s*\(([^)]+)\)/gi, '$1 ')
    .replace(/ELEMENTTYPE_:/gi, '')
    .replace(/ELEMENTTYPE_/gi, '');

  // 2. Convert (Element) at the start into Element
  // e.g. "(Lux) Auto Attack DMG" -> "Lux Auto Attack DMG"
  clean = clean.replace(/^\s*\((Lux|Ignis|Aqua|Terra|Ventus|Umbra|Pyro|Hydro)\)\s*/gi, '$1 ');

  // 3. Strip trailing tags like (base), (abs), (%)
  clean = clean.replace(/\s*\((?:base|abs|%)\)\s*/gi, '');

  // 4. Clean up underscores and duplicate spaces
  clean = clean.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  // 5. Handle special cases
  if (clean.toLowerCase() === 'add shield strengthen') return 'Shield Strength';
  if (clean.toLowerCase() === 'dmg multiplier') return 'DMG Multiplier';

  // If it's just an element name standalone (e.g. "Lux"), add "DMG"
  if (/^(Lux|Ignis|Aqua|Terra|Ventus|Umbra|Pyro|Hydro)$/i.test(clean)) {
    clean = `${clean} DMG`;
  }

  return clean;
}

function getPotentialActiveStats(p: PotentialData, level = 1): PotentialActiveStat[] {
  const pParams = p.params || [];
  const tooltips = p.paramsTooltips || [];

  const rawAttrs = [
    ...(p.addAttrType || []),
    ...(p.effectType || [])
  ];
  const uniqueAttrs = Array.from(new Set(rawAttrs)).filter((attr) => {
    if (!attr) return false;
    if (
      attr.startsWith('STATE_CHANGE:') ||
      attr.startsWith('CD:') ||
      attr === 'ADD_TAG' ||
      attr === 'EFFECT_HP_RECOVERY' ||
      attr.startsWith('PLAYER_:') ||
      attr.startsWith('WEIGHT') ||
      attr === 'Weight (base)'
    ) {
      return false;
    }
    return true;
  });

  const statsList: PotentialActiveStat[] = [];

  for (const attr of uniqueAttrs) {
    let valStr = '';
    // 1. Match via paramsTooltips
    for (let i = 0; i < tooltips.length; i++) {
      const tip = tooltips[i];
      const pVal = pParams[i];
      if (!tip || pVal === undefined) continue;

      const isMatch =
        (tip.addAttrType && (tip.addAttrType === attr || tip.addAttrType.includes(attr) || attr.includes(tip.addAttrType))) ||
        (tip.effectType && (tip.effectType === attr || tip.effectType.includes(attr) || attr.includes(tip.effectType)));

      if (isMatch) {
        if (typeof pVal === 'string') {
          if (pVal.includes('/')) {
            const parts = pVal.split('/');
            valStr = parts[Math.min(Math.max(0, level - 1), parts.length - 1)] || parts[0];
          } else if (pVal.includes('%') || !isNaN(parseFloat(pVal))) {
            valStr = pVal;
          }
        } else if (typeof pVal === 'number') {
          valStr = String(pVal);
        }
        if (valStr) break;
      }
    }

    // 2. Fallback search
    if (!valStr) {
      for (let i = pParams.length - 1; i >= 0; i--) {
        const param = pParams[i];
        const tip = tooltips[i];
        if (tip && tip.damageType && !tip.addAttrType && !tip.effectType) continue;

        if (typeof param === 'string') {
          if (param.includes('/')) {
            const parts = param.split('/');
            valStr = parts[Math.min(Math.max(0, level - 1), parts.length - 1)] || parts[0];
            break;
          } else if (param.endsWith('%')) {
            valStr = param;
            break;
          }
        } else if (typeof param === 'number' && i === 0 && pParams.length === 1) {
          valStr = String(param);
          break;
        }
      }
    }

    const displayName = formatPotentialAttrName(attr);
    if (!displayName) continue;
    // Deduplicate if multiple raw attributes map to same display name
    if (statsList.some((s) => s.name === displayName)) continue;

    const isPct = valStr.includes('%') || attr.includes('(%)') || attr.includes('%');
    statsList.push({
      name: displayName,
      val: valStr ? (valStr.startsWith('+') ? valStr : `+${valStr}`) : '',
      isPercent: isPct
    });
  }

  return statsList;
}

export interface UserSavedPreset {
  id: string;
  name: string;
  date: string;
  characterId: number;
  characterName: string;
  build: {
    potentialLevels: Record<number, number>;
    discs: BuildState['discs'];
    harmonyNoteLevels: Record<string, number>;
  };
}

export const TalentPanel: React.FC<Props> = ({ character, build, onChangeBuild, activeTeamSlot: _activeTeamSlot = 0 }) => {
  const activeTab = 'all';
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites / Pinned potentials state (persisted per character in localStorage)
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('stella_sora_favorite_potentials');
      if (raw && character?.id) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed[character.id]) ? parsed[character.id] : [];
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Re-sync favorites when switching active character
  React.useEffect(() => {
    if (!character?.id) return;
    try {
      const raw = localStorage.getItem('stella_sora_favorite_potentials');
      if (raw) {
        const parsed = JSON.parse(raw);
        setFavorites(Array.isArray(parsed[character.id]) ? parsed[character.id] : []);
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
    }
  }, [character?.id]);

  const toggleFavorite = (potId: number) => {
    if (!character?.id) return;
    setFavorites((prev) => {
      const next = prev.includes(potId)
        ? prev.filter((id) => id !== potId)
        : [...prev, potId];

      try {
        const raw = localStorage.getItem('stella_sora_favorite_potentials');
        const allFavs = raw ? JSON.parse(raw) : {};
        allFavs[character.id] = next;
        localStorage.setItem('stella_sora_favorite_potentials', JSON.stringify(allFavs));
      } catch {
        // ignore
      }

      return next;
    });
  };

  // Preset import modal state
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetInput, setPresetInput] = useState('');
  const [selectedCharPresetId, setSelectedCharPresetId] = useState<string>('');
  const [selectedMemberIdx, setSelectedMemberIdx] = useState<0 | 1 | 2>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [highlightedNodeId, setHighlightedNodeId] = useState<number | null>(null);

  const toggleNodeExpand = (id: number) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAnyNodeExpanded = Object.values(expandedNodes).some(Boolean);

  const toggleAllExpand = () => {
    if (isAnyNodeExpanded) {
      setExpandedNodes({});
    } else {
      const allMap: Record<number, boolean> = {};
      categoriesData.forEach((cat) => {
        cat.list.forEach((p) => {
          allMap[p.id] = true;
        });
      });
      setExpandedNodes(allMap);
    }
  };

  // Custom User Saved Presets (Local Storage)
  const [savedCustomPresets, setSavedCustomPresets] = useState<UserSavedPreset[]>(() => {
    try {
      const raw = localStorage.getItem('stella_user_saved_presets');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const handleSaveCurrentBuild = () => {
    const name = newPresetName.trim() || `${character.name} Build (${new Date().toLocaleDateString()})`;
    const newPreset: UserSavedPreset = {
      id: `custom_${Date.now()}`,
      name,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      characterId: character.id,
      characterName: character.name,
      build: {
        potentialLevels: { ...(build.potentialLevels || {}) },
        discs: { ...build.discs },
        harmonyNoteLevels: { ...build.harmonyNoteLevels }
      }
    };
    const updated = [newPreset, ...savedCustomPresets];
    setSavedCustomPresets(updated);
    try {
      localStorage.setItem('stella_user_saved_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    setNewPresetName('');
    setIsSavingPreset(false);
    setToastMessage(`Saved preset "${name}" to My Presets!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteSavedPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedCustomPresets.filter((p) => p.id !== id);
    setSavedCustomPresets(updated);
    try {
      localStorage.setItem('stella_user_saved_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete from localStorage:', e);
    }
  };

  const handleLoadCustomPreset = (preset: UserSavedPreset) => {
    onChangeBuild((prev) => ({
      ...prev,
      characterId: preset.characterId,
      potentialLevels: { ...preset.build.potentialLevels },
      discs: { ...preset.build.discs },
      harmonyNoteLevels: { ...preset.build.harmonyNoteLevels }
    }));
    setToastMessage(`Loaded custom preset "${preset.name}"!`);
    setTimeout(() => setToastMessage(null), 3000);
    setShowPresetModal(false);
  };

  const potentials = character.potential;
  const currentLevels = build.potentialLevels || {};

  // Check Lv.90 Emblem unique talent bonus (+1 to +3)
  const emblemTalentBonuses = useMemo(() => {
    const bonuses: { [potId: number]: number } = {};
    const lv90Lines = build.emblems?.lv90?.lines || [];
    for (const line of lv90Lines) {
      if (line && line.statId === 'unique_talent') {
        const statDef = ALL_EMBLEM_STATS['unique_talent'];
        if (statDef) {
          const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
          const potId = line.targetPotentialId || character.potential?.mainNormal?.[0]?.id;
          if (potId) {
            bonuses[potId] = Math.min(3, (bonuses[potId] || 0) + val);
          }
        }
      }
    }
    return bonuses;
  }, [build.emblems?.lv90?.lines, character.potential?.mainNormal]);

  // Check Emblem unique skill bonuses (+1 to +3) for Normal, Main, Support, Ult
  const emblemSkillBonuses = useMemo(() => {
    const bonuses = { normal: 0, main: 0, support: 0, ult: 0 };
    const allLines = [
      ...(build.emblems?.lv70?.lines || []),
      ...(build.emblems?.lv80?.lines || []),
      ...(build.emblems?.lv90?.lines || [])
    ];
    for (const line of allLines) {
      if (!line?.statId) continue;
      const def = ALL_EMBLEM_STATS[line.statId];
      if (def?.isUnique && def.uniqueTarget) {
        const val = line.tier ? def.values[line.tier - 1] ?? 0 : 0;
        if (def.uniqueTarget === 'normal') bonuses.normal += val;
        if (def.uniqueTarget === 'main') bonuses.main += val;
        if (def.uniqueTarget === 'support') bonuses.support += val;
        if (def.uniqueTarget === 'ult') bonuses.ult += val;
      }
    }
    return {
      normal: Math.min(3, bonuses.normal),
      main: Math.min(3, bonuses.main),
      support: Math.min(3, bonuses.support),
      ult: Math.min(3, bonuses.ult)
    };
  }, [build.emblems]);

  // Dynamic Skill Level for Core Potentials (which scale with Character Skill level 1..13 in Stella Sora)
  const getCoreSkillLevel = useCallback((p: PotentialData) => {
    const tips = p.paramsTooltips || [];
    const dmgTypes = (p.damageType || []).concat(tips.map((t) => t.damageType || '')).join(' ').toLowerCase();

    const isSupport = (character.potential?.supportCore || []).some((x) => x.id === p.id);
    const isNormal = dmgTypes.includes('normal attack') && !dmgTypes.includes('scale with skill');
    const isUlt = dmgTypes.includes('ultimate');

    let baseLvl = 10;
    let bonus = 0;

    if (isSupport) {
      baseLvl = build.skillLevels?.support ?? 10;
      bonus = emblemSkillBonuses.support;
    } else if (isNormal) {
      baseLvl = build.skillLevels?.normal ?? 10;
      bonus = emblemSkillBonuses.normal;
    } else if (isUlt) {
      baseLvl = build.skillLevels?.ult ?? 10;
      bonus = emblemSkillBonuses.ult;
    } else {
      // Default: Main skill (most mainCore potentials scale with Skill)
      baseLvl = build.skillLevels?.main ?? 10;
      bonus = emblemSkillBonuses.main;
    }

    return Math.max(1, Math.min(13, baseLvl + bonus));
  }, [character.potential?.supportCore, build.skillLevels, emblemSkillBonuses]);

  // Decode live preset input
  const decodedPreset = useMemo<DecodedPresetResult>(() => {
    if (!presetInput.trim()) {
      return {
        success: false,
        error: 'Enter or paste any Stella Sora Share Code, or choose a Trekker preset below.'
      };
    }
    return decodePresetShareCode(presetInput.trim());
  }, [presetInput]);

  // Official presets for current character
  const charOfficialPresets = useMemo(() => {
    return Object.values(potentialPresetsData).filter(
      (p: any) => p.characterId === character.id
    );
  }, [character.id]);

  // All official presets grouped by character name for universal selection
  const allTrekkerPresets = useMemo(() => {
    const map = new Map<string, { id: number; characterId: number; characterName: string; name: string; shareCode: string }[]>();
    for (const p of Object.values(potentialPresetsData) as any[]) {
      if (!map.has(p.characterName)) {
        map.set(p.characterName, []);
      }
      map.get(p.characterName)!.push(p);
    }
    return Array.from(map.entries())
      .map(([charName, presets]) => ({ charName, presets }))
      .sort((a, b) => a.charName.localeCompare(b.charName));
  }, []);

  const categoriesData = useMemo(() => {
    if (!potentials) return [];

    return CATEGORIES.map((cat) => {
      const list = (potentials[cat.key] || []) as PotentialData[];
      const filtered = list.filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.desc && p.desc.toLowerCase().includes(q)) ||
          (p.damageType && p.damageType.some((dt: string) => dt.toLowerCase().includes(q)))
        );
      });

      return {
        ...cat,
        list,
        filtered,
        activeCount: list.filter((p) => (currentLevels[p.id] || 0) > 0).length,
        totalCount: list.length
      };
    });
  }, [potentials, currentLevels, searchQuery]);

  const totalActive = useMemo(() => {
    return categoriesData.reduce((acc, c) => acc + c.activeCount, 0);
  }, [categoriesData]);

  // All potentials of current character flattened for easy lookup
  const allCharacterPotentials = useMemo(() => {
    if (!potentials) return [];
    const list: PotentialData[] = [];
    const cats: CategoryKey[] = ['mainCore', 'mainNormal', 'common', 'supportCore', 'supportNormal'];
    for (const cat of cats) {
      for (const p of (potentials[cat] || []) as PotentialData[]) {
        if (!list.some((x) => x.id === p.id)) {
          list.push(p);
        }
      }
    }
    return list;
  }, [potentials]);

  const allPotentialsRef = React.useRef(allCharacterPotentials);
  allPotentialsRef.current = allCharacterPotentials;

  // Listen for navigation requests from breakdown popovers (Combat Stats / Combat DPS)
  useEffect(() => {
    const handleNav = (e: Event) => {
      const ce = e as CustomEvent<BreakdownNavigationItem>;
      if (!ce.detail) return;
      const { label, source } = ce.detail;
      const isPotential = source === 'Potential' || label.includes('Potential:') || label.includes('Potential');
      if (!isPotential) return;

      let cleanName = label.replace(/^Support\s*\d+\s*\([^)]*\)\s*-\s*/i, '');
      cleanName = cleanName.replace(/^Potential:\s*/i, '');
      cleanName = cleanName.replace(/\s*\[[^\]]*\]\s*$/i, '');
      cleanName = cleanName.replace(/\s*\(Lv\.\d+[^)]*\).*$/i, '');
      cleanName = cleanName.replace(/:\s*Skill DMG.*$/i, '');
      cleanName = cleanName.replace(/:\s*AA DMG.*$/i, '');
      cleanName = cleanName.replace(/:\s*Ultimate DMG.*$/i, '');
      cleanName = cleanName.replace(/:\s*Skill Crit.*$/i, '');
      cleanName = cleanName.replace(/:\s*Ult Crit.*$/i, '');
      cleanName = cleanName.replace(/\s*\(Core\).*$/i, '');
      cleanName = cleanName.trim();

      setTimeout(() => {
        const list = allPotentialsRef.current;
        const target = list.find((p) => {
          const pNameLower = p.name.toLowerCase();
          const cleanLower = cleanName.toLowerCase();
          return pNameLower === cleanLower || cleanLower.startsWith(pNameLower) || pNameLower.includes(cleanLower);
        });

        if (target) {
          setExpandedNodes((prev) => ({ ...prev, [target.id]: true }));
          setHighlightedNodeId(target.id);
          setTimeout(() => setHighlightedNodeId(null), 4000);
          setTimeout(() => {
            const el =
              document.getElementById(`potential-node-fav-${target.id}`) ||
              document.getElementById(`potential-node-${target.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
        }
      }, 100);
    };

    window.addEventListener('navigate-breakdown', handleNav);
    return () => window.removeEventListener('navigate-breakdown', handleNav);
  }, []);

  const favoriteNodes = useMemo(() => {
    const list = allCharacterPotentials.filter((p) => {
      if (!favorites.includes(p.id)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.desc && p.desc.toLowerCase().includes(q)) ||
        (p.damageType && p.damageType.some((dt: string) => dt.toLowerCase().includes(q)))
      );
    });

    const getRarityWeight = (p: PotentialData): number => {
      const isCore =
        p.rarity === 'core' ||
        (character.potential?.mainCore || []).some((x) => x.id === p.id) ||
        (character.potential?.supportCore || []).some((x) => x.id === p.id);
      if (isCore) return 1; // Core (Pink)
      if (p.rarity === 'rare') return 2; // Rare (Rainbow 3 colors)
      return 3; // Common (Emas / Gold)
    };

    return [...list].sort((a, b) => {
      const weightA = getRarityWeight(a);
      const weightB = getRarityWeight(b);
      if (weightA !== weightB) {
        return weightA - weightB; // 1 (Pink) -> 2 (Rainbow) -> 3 (Gold)
      }

      // If same tier, prioritize nodes boosted by Lv.90 Emblem Unique Talent (+1..+3)
      const bonusA = emblemTalentBonuses[a.id] || 0;
      const bonusB = emblemTalentBonuses[b.id] || 0;
      if (bonusA !== bonusB) {
        return bonusB - bonusA;
      }

      // If active, prioritize active
      const lvA = currentLevels[a.id] || 0;
      const lvB = currentLevels[b.id] || 0;
      if ((lvA > 0) !== (lvB > 0)) {
        return (lvB > 0 ? 1 : 0) - (lvA > 0 ? 1 : 0);
      }

      return 0;
    });
  }, [allCharacterPotentials, favorites, searchQuery, character.potential, emblemTalentBonuses, currentLevels]);

  const totalEffectivePotentials = useMemo(() => {
    let sum = 0;
    for (const [potIdStr, baseLv] of Object.entries(currentLevels)) {
      if (baseLv <= 0) continue;
      const potId = Number(potIdStr);
      const bonus = emblemTalentBonuses[potId] || 0;
      const effLv = baseLv + bonus;
      sum += effLv;
    }
    return sum;
  }, [currentLevels, emblemTalentBonuses]);

  const handleLevelChange = (potentialId: number, newLevel: number) => {
    onChangeBuild((prev) => {
      const nextLevels = { ...(prev.potentialLevels || {}) };
      if (newLevel <= 0) {
        delete nextLevels[potentialId];
      } else {
        nextLevels[potentialId] = newLevel;
      }
      return {
        ...prev,
        potentialLevels: nextLevels
      };
    });
  };

  const setAllVisible = (level: number) => {
    onChangeBuild((prev) => {
      const nextLevels = { ...(prev.potentialLevels || {}) };
      categoriesData.forEach((cat) => {
        if (activeTab === 'all' || activeTab === 'activeOnly' || activeTab === cat.key) {
          cat.filtered.forEach((p) => {
            if (level <= 0) {
              delete nextLevels[p.id];
            } else {
              const isCore = cat.key === 'mainCore' || cat.key === 'supportCore' || p.rarity === 'core';
              const maxLvl = isCore ? 1 : getMaxLevelForPotential(p);
              nextLevels[p.id] = Math.min(level, maxLvl);
            }
          });
        }
      });
      return {
        ...prev,
        potentialLevels: nextLevels
      };
    });
  };

  // Apply decoded preset potentials to build
  const handleApplyDecodedPreset = (
    mode: 'exact' | 'max' | 'min' = 'exact',
    autoSwitchChar: boolean = false
  ) => {
    if (!decodedPreset.success || !decodedPreset.leader) return;

    const leader = decodedPreset.leader;
    const currentMember =
      selectedMemberIdx === 0
        ? decodedPreset.leader
        : selectedMemberIdx === 1
        ? decodedPreset.support1 || decodedPreset.leader
        : decodedPreset.support2 || decodedPreset.leader;

    const targetMember = autoSwitchChar
      ? leader
      : currentMember.characterId === character.id
      ? currentMember
      : leader.characterId === character.id
      ? leader
      : decodedPreset.support1?.characterId === character.id
      ? decodedPreset.support1
      : decodedPreset.support2?.characterId === character.id
      ? decodedPreset.support2
      : currentMember;

    const targetPotentials = targetMember.activePotentials;

    onChangeBuild((prev) => {
      // Set exact decoded levels or max base lv.6 (core potentials are Lv.1)
      const nextLevels: { [id: number]: number } = {};
      targetPotentials.forEach((p) => {
        if (mode === 'exact') {
          nextLevels[p.id] = p.level;
        } else if (mode === 'max') {
          nextLevels[p.id] = p.category === 'mainCore' || p.category === 'supportCore' ? 1 : 6;
        } else {
          nextLevels[p.id] = 1;
        }
      });

      const nextBuild: BuildState = {
        ...prev,
        potentialLevels: nextLevels
      };

      if (autoSwitchChar && leader.characterId !== character.id) {
        nextBuild.characterId = leader.characterId;
      }

      return nextBuild;
    });

    setToastMessage(
      `Berhasil menerapkan ${targetPotentials.length} potensi untuk ${targetMember.name} (${mode === 'exact' ? 'level sesuai kode' : 'semua Lv.6'})!`
    );
    setTimeout(() => setToastMessage(null), 3000);
    setShowPresetModal(false);
  };

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-5 shadow-lg relative space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            Trekker Potentials
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {character.name} &bull; {totalActive} Active (<span className="text-pink-300 font-bold font-mono">Total: {totalEffectivePotentials}</span>)
          </p>
        </div>

        {/* Global Level Actions & Import Preset */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPresetModal(true)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/70 hover:border-cyan-600 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Import ShareCode preset from recommendation or friends"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preset Code</span>
          </button>

          <button
            type="button"
            onClick={() => setAllVisible(6)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-pink-950/60 text-pink-300 border border-pink-800/50 hover:bg-pink-900/60 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
            title="Aktifkan semua potensi non-core ke Level 6 (Base Max)"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Max (Lv 6)</span>
          </button>

          <button
            type="button"
            onClick={() => setAllVisible(0)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* PRESET IMPORT MODAL OVERLAY */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    Preset Potensial
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                      ShareCode
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Impor kode preset game atau pilih rekomendasi build
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
              {/* ShareCode Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                  <span>Kode Preset / URL:</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Format Stella Sora (27-byte Base64)</span>
                </label>
                <div className="flex items-center rounded-xl border border-zinc-750 bg-zinc-900/90 focus-within:border-pink-500/70 focus-within:ring-1 focus-within:ring-pink-500/30 transition-all p-1">
                  <input
                    type="text"
                    value={presetInput}
                    onChange={(e) => {
                      setPresetInput(e.target.value);
                      setSelectedCharPresetId('');
                    }}
                    placeholder="Paste ShareCode (contoh: AAAAogAAAJs... atau #build=...)"
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setPresetInput(text.trim());
                          setSelectedCharPresetId('');
                        }
                      } catch (err) {
                        console.warn('Clipboard read failed:', err);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Paste dari Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                  {presetInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setPresetInput('');
                        setSelectedCharPresetId('');
                      }}
                      className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
                      title="Hapus"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Selector & Quick Picks */}
              <div className="space-y-2.5 p-3 rounded-xl bg-zinc-900/50 border border-zinc-850">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-pink-400" />
                    Pilih Rekomendasi Build:
                  </span>
                  <select
                    value={selectedCharPresetId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCharPresetId(val);
                      if (val) {
                        if (val.startsWith('custom_')) {
                          const custom = savedCustomPresets.find((p) => p.id === val);
                          if (custom) {
                            handleLoadCustomPreset(custom);
                          }
                          return;
                        }
                        const blitzPreset = TOP_BLITZ_PRESETS.find((p) => p.id === val);
                        if (blitzPreset) {
                          setPresetInput(blitzPreset.shareCode);
                        } else if ((potentialPresetsData as any)[val]) {
                          setPresetInput((potentialPresetsData as any)[val].shareCode);
                        }
                      }
                    }}
                    className="bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-pink-500 font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Preset atau Build Tersimpan --</option>
                    {savedCustomPresets.length > 0 && (
                      <optgroup label="⭐ Build Tersimpan Saya">
                        {savedCustomPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            ★ {p.name} ({p.characterName} · {p.date})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="🏆 Meta Clears Boss Blitz (Top Rank)">
                      {TOP_BLITZ_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.rank} {p.player} · Skor: {p.score.toLocaleString()} ({p.charNames})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={`Trekker Saat Ini (${character.name})`}>
                      {charOfficialPresets.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {character.name} - {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {allTrekkerPresets
                      .filter((g) => g.charName !== character.name)
                      .map(({ charName, presets }) => (
                        <optgroup key={charName} label={charName}>
                          {presets.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {charName} - {p.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                  </select>
                </div>

                {/* Quick pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-zinc-850/80">
                  <span className="text-[10px] text-zinc-500 font-medium">Quick:</span>
                  {charOfficialPresets.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPresetInput(p.shareCode);
                        setSelectedCharPresetId(String(p.id));
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition-all cursor-pointer ${
                        selectedCharPresetId === String(p.id)
                          ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPresetInput('AAAAogAAAJsAAABrzbADYYYYyASAcAK2ABIAY');
                      setSelectedCharPresetId('pagan_t2_1340522');
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950/30 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-mono transition-all cursor-pointer"
                  >
                    ★ Top Blitz 1.34M
                  </button>
                </div>

                {/* Save build inline toggle */}
                <div className="pt-2 border-t border-zinc-850/80 flex items-center justify-between text-xs">
                  {!isSavingPreset ? (
                    <button
                      type="button"
                      onClick={() => setIsSavingPreset(true)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>Simpan build saat ini ke Preset Saya</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder={`Nama build (contoh: Blitz ${character.name})`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCurrentBuild();
                          if (e.key === 'Escape') setIsSavingPreset(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveCurrentBuild}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Simpan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSavingPreset(false)}
                        className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs border border-zinc-800 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>

                {/* Saved custom presets chips */}
                {savedCustomPresets.length > 0 && (
                  <div className="pt-2 border-t border-zinc-850/80 space-y-1.5">
                    <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Bookmark className="w-3 h-3" />
                      Build Tersimpan Saya:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {savedCustomPresets.map((sp) => (
                        <div
                          key={sp.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]"
                        >
                          <button
                            type="button"
                            onClick={() => handleLoadCustomPreset(sp)}
                            className="hover:text-amber-300 font-semibold truncate max-w-36 text-left cursor-pointer"
                            title={`Load ${sp.name} (${sp.characterName})`}
                          >
                            ★ {sp.name}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedPreset(sp.id, e)}
                            className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Decoded Potentials Preview (POTENTIALS ONLY) */}
              {decodedPreset.success && decodedPreset.leader ? (
                <div className="space-y-3 pt-1">
                  {/* Team Members Tabs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { member: decodedPreset.leader, role: 'Leader / Main', idx: 0 as const, color: 'text-cyan-400 border-cyan-500/60 bg-cyan-950/30' },
                      ...(decodedPreset.support1 ? [{ member: decodedPreset.support1, role: 'Support 1', idx: 1 as const, color: 'text-emerald-400 border-emerald-500/60 bg-emerald-950/30' }] : []),
                      ...(decodedPreset.support2 ? [{ member: decodedPreset.support2, role: 'Support 2', idx: 2 as const, color: 'text-amber-400 border-amber-500/60 bg-amber-950/30' }] : [])
                    ].map(({ member, role, idx, color }) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMemberIdx(idx)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                          selectedMemberIdx === idx
                            ? `${color} ring-1 ring-cyan-500/30 shadow-md`
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        <img
                          src={getCharacterHeadUrl(member.characterId)}
                          alt={member.name}
                          className="w-8 h-8 rounded-lg object-cover bg-zinc-950 border border-zinc-750 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold mb-0.5">
                            <span>{role}</span>
                            <span className="font-mono text-zinc-400">{member.points} pts</span>
                          </div>
                          <div className="text-xs font-bold text-zinc-100 truncate">
                            {member.name}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {member.element} &bull; {member.activePotentials.length} potensi
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Active Member Potentials Grid */}
                  {(() => {
                    const activeMember =
                      selectedMemberIdx === 0
                        ? decodedPreset.leader
                        : selectedMemberIdx === 1
                        ? decodedPreset.support1 || decodedPreset.leader
                        : decodedPreset.support2 || decodedPreset.leader;

                    return (
                      <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-850 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                          <div className="flex items-center gap-2">
                            <span>Potensi {activeMember.name}:</span>
                            <span className="text-[11px] font-mono font-normal text-pink-400">
                              {activeMember.activePotentials.length} Aktif ({activeMember.points} Poin)
                            </span>
                          </div>
                          {activeMember.characterId !== character.id && (
                            <span className="text-[10px] text-amber-400">
                              (Trekker saat ini: {character.name})
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                          {activeMember.activePotentials.map((p) => {
                            const isCore = p.category === 'mainCore' || p.category === 'supportCore';
                            const iconUrl = getPotentialIconUrl(p.icon);
                            const potRarity = isCore ? 'core' : (p.rarity || 'common');
                            const theme = getPotentialRarityTheme(potRarity, true);

                            return (
                              <div
                                key={p.id}
                                className={`p-2 rounded-xl border flex flex-col items-center text-center relative ${
                                  isCore
                                    ? 'bg-pink-950/20 border-pink-500/40'
                                    : 'bg-zinc-900/80 border-zinc-800'
                                }`}
                              >
                                {/* Level badge */}
                                <div className="absolute top-1.5 left-1.5 z-10">
                                  {isCore ? (
                                    <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold flex items-center justify-center">
                                      ✦
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white font-mono text-[9.5px] font-bold shadow-xs">
                                      Lv.{p.level}
                                    </span>
                                  )}
                                </div>

                                {/* Icon */}
                                <div className={`w-9 h-9 my-1 rounded-lg ${theme.iconBoxBg} border ${theme.iconBoxBorder} flex items-center justify-center overflow-hidden`}>
                                  {iconUrl ? (
                                    <img
                                      src={iconUrl}
                                      alt={p.name}
                                      className="w-7 h-7 object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <Sparkles className="w-4 h-4 text-zinc-500" />
                                  )}
                                </div>

                                {/* Name */}
                                <span className={`text-[10px] font-semibold line-clamp-1 leading-tight ${theme.titleClass}`}>
                                  {p.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-1 border transition-all ${
                    !presetInput.trim()
                      ? 'bg-zinc-900/30 border-zinc-800 text-zinc-400'
                      : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 ${
                        !presetInput.trim() ? 'text-zinc-500' : 'text-rose-400'
                      }`}
                    />
                    <span>{decodedPreset.error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-zinc-850 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-850/60 hover:bg-zinc-800 border border-zinc-750 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {decodedPreset.success &&
                  decodedPreset.leader &&
                  decodedPreset.leader.characterId !== character.id && (
                    <button
                      type="button"
                      onClick={() => handleApplyDecodedPreset('exact', true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-black shadow-md transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Ganti ke {decodedPreset.leader.name} & Terapkan</span>
                    </button>
                  )}

                <button
                  type="button"
                  disabled={!decodedPreset.success}
                  onClick={() => handleApplyDecodedPreset('exact', false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-md disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terapkan Potensi (Level Asli)</span>
                </button>

                <button
                  type="button"
                  disabled={!decodedPreset.success}
                  onClick={() => handleApplyDecodedPreset('max', false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-40 transition-all cursor-pointer"
                  title="Aktifkan potensi dengan level maksimal Lv.6"
                >
                  Semua Max (Lv.6)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Input & Expand All Toggle (Default All view) */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search potential name, effect, multiplier, or damage type..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleAllExpand}
            className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            title={isAnyNodeExpanded ? "Tutup Semua Deskripsi" : "Buka Semua Deskripsi"}
          >
            {isAnyNodeExpanded ? <ChevronUp className="w-3.5 h-3.5 text-pink-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAnyNodeExpanded ? 'Tutup Deskripsi' : 'Buka Deskripsi'}</span>
          </button>
        </div>

      {/* Helper function to render a single potential card */}
      {(() => null)()}
      {/* Potentials List */}
      <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
        {/* 1. Pinned Favorites Section (Placed at the very top, above Main Core) */}
        {favoriteNodes.length > 0 && (
          <div className="space-y-2.5 pb-2.5 mb-2.5 bg-amber-950/15 p-2.5 rounded-2xl">
            <div className="flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur-sm py-1.5 px-2 z-10 rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h3 className="text-xs font-bold text-amber-300 tracking-wide uppercase">
                  Favorites (Pinned Above Main Core)
                </h3>
              </div>
              <span className="text-[10px] text-amber-400/90 font-mono font-semibold">
                {favoriteNodes.length} pinned
              </span>
            </div>

            <div className="space-y-2">
              {favoriteNodes.map((p) => {
                const baseLevel = currentLevels[p.id] || 0;
                const isActive = baseLevel > 0;
                const isCore = p.rarity === 'core' || (character.potential?.mainCore || []).some((x) => x.id === p.id) || (character.potential?.supportCore || []).some((x) => x.id === p.id);
                const maxLevel = getMaxLevelForPotential(p);
                const iconUrl = getPotentialIconUrl(p.icon);

                // Unique Talent Emblem Bonus (+1 to +3)
                const potBonus = !isCore ? (emblemTalentBonuses[p.id] || 0) : 0;
                const effectiveLevel = isCore ? getCoreSkillLevel(p) : (isActive ? Math.min(9, baseLevel + potBonus) : 0);
                const activeStats = getPotentialActiveStats(p, effectiveLevel || 1);
                const isExpanded = !!expandedNodes[p.id];
                const isFavorited = favorites.includes(p.id);

                const potRarity = isCore ? 'core' : (p.rarity || 'common');
                const theme = getPotentialRarityTheme(potRarity, isActive);
                const isHighlighted = highlightedNodeId === p.id;

                return (
                  <div
                    key={p.id}
                    id={`potential-node-fav-${p.id}`}
                    className={`p-3 rounded-xl transition-all relative ${
                      isHighlighted
                        ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 bg-amber-950/40 scale-[1.015]'
                        : isActive
                          ? theme.cardActiveBorder
                          : 'bg-zinc-950/40 hover:bg-zinc-950/70'
                    }`}
                  >
                    {/* Top Row: Icon + Name + Stat Badges + Level Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Left Side: Icon & Titles */}
                      <div
                        onClick={() => toggleNodeExpand(p.id)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 select-none"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg relative flex items-center justify-center border shrink-0 ${theme.iconBoxBg} ${theme.iconBoxBorder}`}
                        >
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={p.name}
                              className="w-7 h-7 object-contain drop-shadow"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Sparkles className="w-5 h-5 text-amber-300/80" />
                          )}

                          {/* Emblem Lv.90 Unique Talent Boost Badge (+1 to +3) on the logo */}
                          {potBonus > 0 && (
                            <div
                              className="absolute -top-1.5 -right-1.5 px-1 py-0.2 min-w-4 text-center rounded-full text-[8.5px] font-mono font-black bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md border border-amber-300 z-10 leading-tight"
                              title={`Boosted by Lv.90 Emblem (+${potBonus})`}
                            >
                              +{potBonus}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-bold transition-colors truncate inline-block ${theme.titleClass}`}>
                              {p.name}
                            </span>
                          </div>

                          {/* Primary Stat Highlight: Shown only when description is collapsed */}
                          {!isExpanded && activeStats.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {activeStats.map((stat, sIdx) => {
                                const cat = getStatCategory(stat.name);
                                const theme = getStatTheme(cat, isActive);
                                return (
                                  <span
                                    key={sIdx}
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                      isActive
                                        ? `${theme.badgeClass} shadow-xs font-semibold`
                                        : 'text-zinc-500 bg-zinc-900/60 border-zinc-800'
                                    }`}
                                  >
                                    {stat.name}: <strong className={isActive ? 'font-bold' : 'text-zinc-400'}>{stat.val || '-'}</strong>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Level Controller + Favorite Star + Dropdown Chevron */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                      >
                        {!isCore ? (
                          isActive ? (
                            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleLevelChange(p.id, Math.max(0, baseLevel - 1))}
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Kurangi Level"
                              >
                                -
                              </button>
                              <span className="px-1.5 font-mono font-bold text-xs text-zinc-100 min-w-8 text-center">
                                Lv.{baseLevel}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleLevelChange(p.id, Math.min(maxLevel, baseLevel + 1))}
                                disabled={baseLevel >= maxLevel}
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
                                title="Tambah Level (Max Base Lv.6)"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLevelChange(p.id, maxLevel)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                                  baseLevel === maxLevel
                                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                                    : 'bg-pink-950/60 text-pink-300 hover:bg-pink-900/80 border-pink-800/50'
                                }`}
                                title="Set ke Max Base (Lv.6)"
                              >
                                Max
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLevelChange(p.id, 0)}
                                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer ml-0.5"
                                title="Hapus / Nonaktifkan"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLevelChange(p.id, maxLevel)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-pink-600 text-zinc-400 hover:text-white border border-zinc-800 hover:border-pink-500/50 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Aktifkan</span>
                            </button>
                          )
                        ) : (
                          /* Core Potential Button */
                          <button
                            type="button"
                            onClick={() => handleLevelChange(p.id, isActive ? 0 : 1)}
                            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                              isActive
                                ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-sm'
                                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-pink-400' : 'bg-zinc-600'}`} />
                            <span>{isActive ? 'Active' : 'Aktifkan'}</span>
                          </button>
                        )}

                        {/* Favorite Star Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(p.id);
                          }}
                          className={`p-1 rounded-lg transition-all cursor-pointer ${
                            isFavorited
                              ? 'text-amber-400 hover:text-amber-300 bg-amber-950/40'
                              : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800/60'
                          }`}
                          title={isFavorited ? 'Hapus dari Favorite' : 'Tambah ke Favorite (Pin ke Atas Main Core)'}
                        >
                          <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>

                        {/* Dropdown Chevron Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleNodeExpand(p.id)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer ml-0.5"
                          title={isExpanded ? 'Sembunyikan Deskripsi' : 'Buka Deskripsi'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-pink-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Description Dropdown (Collapsible downwards) */}
                    {isExpanded && p.desc && (
                      <div className="mt-2 text-[11px] leading-relaxed text-zinc-300 pt-2 border-t border-zinc-850 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="whitespace-pre-line">
                          {parseFormattedGameText(
                            p.desc,
                            p.params,
                            effectiveLevel || 1,
                            !isCore ? (lvl) => handleLevelChange(p.id, lvl) : undefined,
                            isCore
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Natural Categories List */}
        {categoriesData.map((cat) => {
          // In default all view, favorited potentials have moved to the pinned section above Main Core
          const displayNodes = cat.filtered.filter((p) => !favorites.includes(p.id));
          if (displayNodes.length === 0) return null;

          return (
            <div key={cat.key} className="space-y-2.5">
              {/* Category Subheader */}
              <div className="flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur-sm py-1.5 z-10 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <h3 className="text-xs font-bold text-zinc-200 tracking-wide uppercase">
                    {cat.label}
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {displayNodes.length} nodes
                </span>
              </div>

              {/* Potential Nodes Grid */}
              <div className="space-y-2">
                {displayNodes.map((p) => {
                  const baseLevel = currentLevels[p.id] || 0;
                  const isActive = baseLevel > 0;
                  const isCore = cat.key === 'mainCore' || cat.key === 'supportCore' || p.rarity === 'core';
                  const maxLevel = getMaxLevelForPotential(p);
                  const iconUrl = getPotentialIconUrl(p.icon);

                  // Unique Talent Emblem Bonus (+1 to +3)
                  const potBonus = !isCore ? (emblemTalentBonuses[p.id] || 0) : 0;
                  const effectiveLevel = isCore ? getCoreSkillLevel(p) : (isActive ? Math.min(9, baseLevel + potBonus) : 0);
                  const activeStats = getPotentialActiveStats(p, effectiveLevel || 1);
                  const isExpanded = !!expandedNodes[p.id];
                  const isFavorited = favorites.includes(p.id);

                  const potRarity = isCore ? 'core' : (p.rarity || 'common');
                  const theme = getPotentialRarityTheme(potRarity, isActive);
                  const isHighlighted = highlightedNodeId === p.id;

                  return (
                    <div
                      key={p.id}
                      id={`potential-node-${p.id}`}
                      className={`p-3 rounded-xl transition-all relative ${
                        isHighlighted
                          ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 bg-amber-950/40 scale-[1.015]'
                          : isActive
                            ? theme.cardActiveBorder
                            : 'bg-zinc-950/40 hover:bg-zinc-950/70'
                      }`}
                    >
                      {/* Top Row: Icon + Name + Stat Badges + Level Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Left Side: Icon & Titles */}
                        <div
                          onClick={() => toggleNodeExpand(p.id)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 select-none"
                        >
                          <div
                            className={`w-10 h-10 rounded-lg relative flex items-center justify-center border shrink-0 ${theme.iconBoxBg} ${theme.iconBoxBorder}`}
                          >
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt={p.name}
                                className="w-7 h-7 object-contain drop-shadow"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Sparkles className="w-5 h-5 text-pink-300/80" />
                            )}

                            {/* Emblem Lv.90 Unique Talent Boost Badge (+1 to +3) on the logo */}
                            {potBonus > 0 && (
                              <div
                                className="absolute -top-1.5 -right-1.5 px-1 py-0.2 min-w-4 text-center rounded-full text-[8.5px] font-mono font-black bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md border border-amber-300 z-10 leading-tight"
                                title={`Boosted by Lv.90 Emblem (+${potBonus})`}
                              >
                                +{potBonus}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-bold transition-colors truncate inline-block ${theme.titleClass}`}>
                                {p.name}
                              </span>
                            </div>

                            {/* Primary Stat Highlight: Shown only when description is collapsed */}
                            {!isExpanded && activeStats.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {activeStats.map((stat, sIdx) => {
                                  const cat = getStatCategory(stat.name);
                                  const theme = getStatTheme(cat, isActive);
                                  return (
                                    <span
                                      key={sIdx}
                                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                        isActive
                                          ? `${theme.badgeClass} shadow-xs font-semibold`
                                          : 'text-zinc-500 bg-zinc-900/60 border-zinc-800'
                                      }`}
                                    >
                                      {stat.name}: <strong className={isActive ? 'font-bold' : 'text-zinc-400'}>{stat.val || '-'}</strong>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Level Controller + Favorite Star + Dropdown Chevron */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                        >
                          {cat.key !== 'mainCore' && cat.key !== 'supportCore' && p.rarity !== 'core' ? (
                            isActive ? (
                              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => handleLevelChange(p.id, Math.max(0, baseLevel - 1))}
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                  title="Kurangi Level"
                                >
                                  -
                                </button>
                                <span className="px-1.5 font-mono font-bold text-xs text-zinc-100 min-w-8 text-center">
                                  Lv.{baseLevel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleLevelChange(p.id, Math.min(maxLevel, baseLevel + 1))}
                                  disabled={baseLevel >= maxLevel}
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
                                  title="Tambah Level (Max Base Lv.6)"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLevelChange(p.id, maxLevel)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                                    baseLevel === maxLevel
                                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                                      : 'bg-pink-950/60 text-pink-300 hover:bg-pink-900/80 border-pink-800/50'
                                  }`}
                                  title="Set ke Max Base (Lv.6)"
                                >
                                  Max
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLevelChange(p.id, 0)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer ml-0.5"
                                  title="Hapus / Nonaktifkan"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLevelChange(p.id, maxLevel)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-pink-600 text-zinc-400 hover:text-white border border-zinc-800 hover:border-pink-500/50 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Aktifkan</span>
                              </button>
                            )
                          ) : (
                            /* Core Potential Button */
                            <button
                              type="button"
                              onClick={() => handleLevelChange(p.id, isActive ? 0 : 1)}
                              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-sm'
                                  : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-pink-400' : 'bg-zinc-600'}`} />
                              <span>{isActive ? 'Active' : 'Aktifkan'}</span>
                            </button>
                          )}

                          {/* Favorite Star Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(p.id);
                            }}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              isFavorited
                                ? 'text-amber-400 hover:text-amber-300 bg-amber-950/40'
                                : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800/60'
                            }`}
                            title={isFavorited ? 'Hapus dari Favorite' : 'Tambah ke Favorite (Pin ke Atas Main Core)'}
                          >
                            <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          {/* Dropdown Chevron Toggle Button */}
                          <button
                            type="button"
                            onClick={() => toggleNodeExpand(p.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer ml-0.5"
                            title={isExpanded ? 'Sembunyikan Deskripsi' : 'Buka Deskripsi'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-pink-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Description Dropdown (Collapsible downwards) */}
                      {isExpanded && p.desc && (
                        <div className="mt-2 text-[11px] leading-relaxed text-zinc-300 pt-2 border-t border-zinc-850 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="whitespace-pre-line">
                            {parseFormattedGameText(
                              p.desc,
                              p.params,
                              effectiveLevel || 1,
                              !isCore ? (lvl) => handleLevelChange(p.id, lvl) : undefined,
                              isCore
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
