import React, { useState, useEffect } from 'react';
import type { BuildState, Character, EmblemTierLevel } from '../types';
import type { BreakdownNavigationItem } from '../utils/navigation';
import {
  ALL_EMBLEM_STATS,
  getEmblemStatsForLevel,
  TIER_CONFIG,
  formatEmblemLine,
  getCharacterEmblems,
  type EmblemStatLine,
} from '../data/emblemPools';
import { getEmblemCdnUrl } from '../utils/assetUrl';
import { Sparkles, RotateCcw, X, Check, Award, ChevronsUp } from 'lucide-react';

interface Props {
  build: BuildState;
  onChangeBuild: (updater: (prev: BuildState) => BuildState) => void;
  character?: Character | null;
}

type SlotKey = 'lv70' | 'lv80' | 'lv90';

export const EmblemPanel: React.FC<Props> = ({ build, onChangeBuild, character }) => {
  // Editing state: slot and line index
  const [editing, setEditing] = useState<{ slot: SlotKey; lineIdx: number } | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<SlotKey | null>(null);

  useEffect(() => {
    const handleNav = (e: Event) => {
      const ce = e as CustomEvent<BreakdownNavigationItem>;
      if (!ce.detail) return;
      const { label, source } = ce.detail;

      if (source.includes('Emblem') || label.includes('Emblem')) {
        const lowerLabel = label.toLowerCase();
        const lowerSource = source.toLowerCase();

        let targetSlot: SlotKey | null = null;
        if (lowerLabel.includes('lv.70') || lowerSource.includes('lv.70') || lowerLabel.includes('spike')) {
          targetSlot = 'lv70';
        } else if (lowerLabel.includes('lv.80') || lowerSource.includes('lv.80') || lowerLabel.includes('rhombus')) {
          targetSlot = 'lv80';
        } else if (lowerLabel.includes('lv.90') || lowerSource.includes('lv.90') || lowerLabel.includes('starlight')) {
          targetSlot = 'lv90';
        }

        if (targetSlot) {
          setHighlightedSlot(targetSlot);
          setTimeout(() => setHighlightedSlot(null), 4000);
          setTimeout(() => {
            const el = document.getElementById(`emblem-slot-${targetSlot}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }
      }
    };

    window.addEventListener('navigate-breakdown', handleNav);
    return () => window.removeEventListener('navigate-breakdown', handleNav);
  }, []);

  // Dynamic emblems from database for this character
  const charEmblems = getCharacterEmblems(character);
  const slots: SlotKey[] = ['lv70', 'lv80', 'lv90'];
  const charElem = character?.element || 'Ignis';

  // Update a single line
  const updateLine = (
    slot: SlotKey,
    lineIdx: number,
    statId: string,
    tier: EmblemTierLevel,
    targetPotentialId?: number
  ) => {
    onChangeBuild((prev) => {
      const existingLines = (prev.emblems[slot]?.lines && prev.emblems[slot].lines.length === 4)
        ? [...prev.emblems[slot].lines]
        : [
            { statId: 'none', tier: 4 as EmblemTierLevel },
            { statId: 'none', tier: 4 as EmblemTierLevel },
            { statId: 'none', tier: 4 as EmblemTierLevel },
            { statId: 'none', tier: 4 as EmblemTierLevel },
          ];

      let finalTargetPotId = targetPotentialId ?? existingLines[lineIdx]?.targetPotentialId;
      if (statId === 'unique_talent' && !finalTargetPotId && character?.potential) {
        finalTargetPotId = character.potential.mainNormal?.[0]?.id;
      }

      const statDef = ALL_EMBLEM_STATS[statId];
      const maxT = (statDef?.maxTier || 4) as EmblemTierLevel;
      const safeTier = Math.min(tier, maxT) as EmblemTierLevel;

      existingLines[lineIdx] = { statId, tier: safeTier, targetPotentialId: finalTargetPotId };

      return {
        ...prev,
        emblems: {
          ...prev.emblems,
          [slot]: {
            ...prev.emblems[slot],
            lines: existingLines,
          },
        },
      };
    });
  };

  // Set single slot to Tier 4
  const setSlotTier4 = (slot: SlotKey) => {
    onChangeBuild((prev) => {
      const existingLines = (prev.emblems[slot]?.lines && prev.emblems[slot].lines.length === 4)
        ? prev.emblems[slot].lines.map((l) => {
            const def = ALL_EMBLEM_STATS[l.statId];
            const maxT = (def?.maxTier || 4) as EmblemTierLevel;
            return { ...l, tier: maxT };
          })
        : [
            { statId: 'none', tier: 4 as EmblemTierLevel },
            { statId: 'none', tier: 4 as EmblemTierLevel },
            { statId: 'none', tier: 4 as EmblemTierLevel },
            { statId: 'none', tier: 4 as EmblemTierLevel },
          ];

      return {
        ...prev,
        emblems: {
          ...prev.emblems,
          [slot]: {
            ...prev.emblems[slot],
            lines: existingLines,
          },
        },
      };
    });
  };

  // Clear single slot
  const clearSlot = (slot: SlotKey) => {
    onChangeBuild((prev) => ({
      ...prev,
      emblems: {
        ...prev.emblems,
        [slot]: {
          ...prev.emblems[slot],
          lines: [
            { statId: 'none', tier: 4 },
            { statId: 'none', tier: 4 },
            { statId: 'none', tier: 4 },
            { statId: 'none', tier: 4 },
          ],
        },
      },
    }));
    if (editing?.slot === slot) setEditing(null);
  };

  // Reset all 3 emblems
  const resetAllEmblems = () => {
    slots.forEach((s) => clearSlot(s));
    setEditing(null);
  };

  return (
    <div className="bg-zinc-900/90 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Top Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            Emblem System
            {character && (
              <span className="text-xs font-normal text-zinc-400">
                · {character.name}
              </span>
            )}
          </h2>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetAllEmblems}
            className="p-1.5 rounded-lg text-xs font-semibold bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all flex items-center justify-center cursor-pointer"
            title="Reset all lines on all emblems"
            aria-label="Reset All"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Emblems in 1 Unified Frame: Responsive 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {slots.map((slot) => {
          const emblemMeta = charEmblems[slot];
          const emblemData = build.emblems[slot] || { lines: [] };
          const lines: EmblemStatLine[] = emblemData.lines && emblemData.lines.length === 4
            ? emblemData.lines
            : [
                { statId: 'none', tier: 4 },
                { statId: 'none', tier: 4 },
                { statId: 'none', tier: 4 },
                { statId: 'none', tier: 4 },
              ];

          const activeCount = lines.filter((l) => l.statId && l.statId !== 'none').length;
          const availableStats = getEmblemStatsForLevel(slot);
          const uniqueStats = availableStats.filter((s) => s.isUnique);
          const normalStats = availableStats.filter((s) => !s.isUnique);

          const isHighlighted = highlightedSlot === slot;

          return (
            <div
              key={slot}
              id={`emblem-slot-${slot}`}
              className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between p-3.5 sm:p-4 bg-gradient-to-b ${
                isHighlighted
                  ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 scale-[1.015]'
                  : emblemMeta.theme.cardBorder
              } ${emblemMeta.theme.gradient} bg-zinc-950/90`}
            >
              {/* Card Header: Level Badge & Faction / Active Count */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${emblemMeta.theme.accentDot}`} />
                    <span className={`text-xs font-extrabold font-mono uppercase tracking-wider ${emblemMeta.theme.textColor}`}>
                      {emblemMeta.levelLabel}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      ({emblemMeta.shapeLabel})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${emblemMeta.theme.badgeClass}`}>
                      {emblemMeta.typeName}
                    </span>
                    {activeCount === 4 && (
                      <span title="All 4 Stats Configured">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Emblem Visual & Title */}
                <div className="flex flex-col items-center justify-center py-1 relative">
                  <div className="w-20 h-20 relative flex items-center justify-center">
                    {/* Theme-colored soft glow */}
                    <div
                      className="absolute inset-0 rounded-full blur-xl pointer-events-none opacity-30"
                      style={{ backgroundColor: emblemMeta.theme.glow }}
                    />
                    <img
                      src={emblemMeta.image}
                      alt={emblemMeta.name}
                      className="w-16 h-16 object-contain drop-shadow-xl relative z-10 transition-transform hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getEmblemCdnUrl(emblemMeta.id);
                      }}
                    />
                  </div>

                  {/* Emblem Title */}
                  <div className="text-center mt-1.5 mb-3 px-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80 text-[9px] text-white flex items-center justify-center font-bold">
                        ▲
                      </span>
                      <h3 className="text-xs font-bold text-zinc-100 truncate" title={emblemMeta.name}>
                        {emblemMeta.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* 4 In-Game Style Attribute Rows */}
                <div className="space-y-2">
                  {lines.map((line, idx) => {
                    const formatted = formatEmblemLine(line, charElem, character);
                    const isThisEditing = editing?.slot === slot && editing?.lineIdx === idx;
                    const currentStatDef = ALL_EMBLEM_STATS[line.statId];
                    const isUnique = currentStatDef?.isUnique;

                    return (
                      <div key={idx} className="space-y-1.5">
                        {/* Display Row */}
                        <div
                          onClick={() => {
                            if (isThisEditing) {
                              setEditing(null);
                            } else {
                              setEditing({ slot, lineIdx: idx });
                            }
                          }}
                          className={`flex items-center gap-1.5 cursor-pointer group transition-all select-none ${
                            isThisEditing ? 'ring-1 ring-cyan-500/80 rounded-xl' : ''
                          }`}
                        >
                          {/* Left Badge: Tier colored indicator (compact without STATS text) */}
                          <div
                            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-105 ${
                              line.statId !== 'none'
                                ? formatted.tierConfig.badgeClass
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}
                            title={line.statId !== 'none' ? `${formatted.tierConfig.name} (${formatted.tierConfig.colorName}) · ${isUnique ? 'Unique Attribute' : 'Stats'}` : 'Empty Slot'}
                          >
                            {isUnique ? (
                              <Sparkles className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronsUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                          </div>

                          {/* Right Card: Stat Name + Value */}
                          <div
                            className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${
                              line.statId !== 'none'
                                ? 'bg-zinc-900/90 border-zinc-800 group-hover:border-zinc-600'
                                : 'bg-zinc-900/40 border-dashed border-zinc-800/80 group-hover:border-zinc-700'
                            }`}
                          >
                            <span
                              className={`text-[11px] font-semibold truncate ${
                                line.statId !== 'none' ? 'text-zinc-200' : 'text-zinc-500 italic'
                              }`}
                            >
                              {line.statId !== 'none' ? formatted.displayName : `Line ${idx + 1}`}
                            </span>

                            <span
                              className={`text-xs font-black font-mono tracking-tight shrink-0 ml-2 ${
                                line.statId !== 'none' ? formatted.tierConfig.cardText : 'text-zinc-600'
                              }`}
                            >
                              {formatted.displayValue}
                            </span>
                          </div>
                        </div>

                        {/* Inline Editor Drawer for this row */}
                        {isThisEditing && (
                          <div className="p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                            {/* Editor Header */}
                            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300 pb-1 border-b border-zinc-800">
                              <span>Configure Line {idx + 1}:</span>
                              <div className="flex items-center gap-2">
                                {line.statId !== 'none' && (
                                  <button
                                    onClick={() => updateLine(slot, idx, 'none', 4)}
                                    className="text-[10px] text-rose-400 hover:underline"
                                  >
                                    Clear
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditing(null)}
                                  className="text-zinc-400 hover:text-white p-0.5 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Stat Dropdown */}
                            <div>
                              <select
                                value={line.statId}
                                onChange={(e) => updateLine(slot, idx, e.target.value, line.tier)}
                                className="w-full text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                              >
                                <option value="none">[Empty Line]</option>
                                {uniqueStats.length > 0 && (
                                  <optgroup label="✨ UNIQUE ATTRIBUTES (MAX +3)">
                                    {uniqueStats.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        ⭐ {s.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                <optgroup label="NORMAL ATTRIBUTES">
                                  {normalStats.map((s) => {
                                    let labelName = s.name;
                                    if (s.id === 'elem_pen') labelName = `${charElem} PEN`;
                                    if (s.id === 'elem_dmg') labelName = `${charElem} DMG`;
                                    return (
                                      <option key={s.id} value={s.id}>
                                        {labelName}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              </select>
                            </div>

                            {/* Specific Potential Selector for Lv.90 Unique Talent */}
                            {line.statId === 'unique_talent' && character?.potential && (
                              <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-700/80 space-y-1">
                                <label className="text-[10px] font-bold text-purple-300 block">
                                  Target Talent / Potential:
                                </label>
                                <select
                                  value={line.targetPotentialId || character.potential.mainNormal?.[0]?.id}
                                  onChange={(e) =>
                                    updateLine(slot, idx, 'unique_talent', line.tier, Number(e.target.value))
                                  }
                                  className="w-full text-[11px] font-mono bg-zinc-900 border border-purple-600 rounded px-2 py-1 text-white focus:outline-none"
                                >
                                  {character.potential.mainNormal?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      ⭐ {p.name} (Main Normal)
                                    </option>
                                  ))}
                                  {character.potential.common?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      ⭐ {p.name} (Common)
                                    </option>
                                  ))}
                                  {character.potential.supportNormal?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      ⭐ {p.name} (Support Normal)
                                    </option>
                                  ))}
                                  {character.potential.supportCore?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      ⭐ {p.name} (Support Core)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Tier Selection Buttons */}
                            {line.statId !== 'none' && currentStatDef && (() => {
                              // For Unique Skill / Potential Level Up:
                              // Level 1 (+1) = Kuning / Legendary (Tier 3)
                              // Level 2 (+2) = Rainbow (Tier 4)
                              // Level 3 (+3) = Rainbow (Tier 4)
                              if (currentStatDef.isUnique) {
                                const currentEffectiveVal = currentStatDef.values[(line.tier || 4) - 1] ?? 3;
                                const uniqueOptions = [
                                  { tierVal: 1, addLv: 1, label: 'Level 1', colorName: 'Legendary', cfg: TIER_CONFIG[3] },
                                  { tierVal: 2, addLv: 2, label: 'Level 2', colorName: 'Rainbow', cfg: TIER_CONFIG[4] },
                                  { tierVal: 3, addLv: 3, label: 'Level 3', colorName: 'Rainbow Max', cfg: TIER_CONFIG[4] },
                                ];

                                return (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                                      <span>Select Skill Level Bonus:</span>
                                      <span className="text-amber-400 font-mono">Lv 1 (Yellow) · Lv 2-3 (Rainbow)</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {uniqueOptions.map((opt) => {
                                        const isSelected = currentEffectiveVal === opt.addLv;
                                        return (
                                          <button
                                            key={opt.tierVal}
                                            onClick={() => updateLine(slot, idx, line.statId, opt.tierVal as EmblemTierLevel)}
                                            className={`py-1.5 px-1 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                                              isSelected
                                                ? `${opt.cfg.badgeClass} ring-2 ring-white/30 scale-[1.02]`
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                            }`}
                                          >
                                            <span className="text-[9px] opacity-90">{opt.colorName}</span>
                                            <span className="font-mono text-xs font-black">+{opt.addLv}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }

                              const maxTier = currentStatDef.maxTier || 4;
                              const availableTiers = ([1, 2, 3, 4] as EmblemTierLevel[]).filter((t) => t <= maxTier);

                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                                    <span>Select Tier:</span>
                                    {maxTier < 4 && (
                                      <span className="text-amber-400 font-mono">Max T3 Yellow</span>
                                    )}
                                  </div>
                                  <div className={`grid gap-1 ${availableTiers.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                                    {availableTiers.map((t) => {
                                      const tCfg = TIER_CONFIG[t];
                                      const isSelected = line.tier === t;
                                      const tVal = currentStatDef.values[t - 1];
                                      const formattedVal =
                                        currentStatDef.unit === '+Lv'
                                          ? `+${tVal}`
                                          : currentStatDef.unit === '%'
                                          ? `${tVal}%`
                                          : `${tVal.toLocaleString()}`;

                                      return (
                                        <button
                                          key={t}
                                          onClick={() => updateLine(slot, idx, line.statId, t)}
                                          className={`py-1 px-1 rounded-md border text-[10px] font-bold transition-all flex flex-col items-center justify-center ${
                                            isSelected
                                              ? `${tCfg.badgeClass} ring-1 ring-white/30 scale-[1.02]`
                                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                          }`}
                                        >
                                          <span className="text-[9px] opacity-80">T{t}</span>
                                          <span className="font-mono text-[10px]">{formattedVal}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Done Button */}
                            <button
                              onClick={() => setEditing(null)}
                              className="w-full py-1 text-center text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors flex items-center justify-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer: Quick Actions for this single Emblem */}
              <div className="mt-3.5 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-zinc-500">
                  {activeCount} / 4 Set
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSlotTier4(slot)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1"
                    title={`Set all lines of ${emblemMeta.levelLabel} to T4`}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                    <span>T4 Max</span>
                  </button>
                  <button
                    onClick={() => clearSlot(slot)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-all"
                    title={`Clear ${emblemMeta.levelLabel}`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful Hint */}
      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Click any line above to select attribute and tier directly.</span>
        <span className="font-mono text-[10px] text-zinc-400">
          Lv.70 (Spike) · Lv.80 (Rhombus) · Lv.90 (Starlight)
        </span>
      </div>
    </div>
  );
};
