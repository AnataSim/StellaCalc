import React, { useState, useMemo, useRef } from 'react';
import type { BuildState, CalculatedStats, Character, DiscItem } from '../types';
import { calculateCharacterDamageReport } from '../utils/damageCalculator';
import { calculateEffectiveStats } from '../utils/calculator';
import { getElementColor, getSkillIconUrl } from '../utils/assetUrl';
import { Swords, Zap, Shield, Sparkles, ChevronDown, ChevronUp, BarChart2, CheckCircle2 } from 'lucide-react';
import { navigateFromBreakdown } from '../utils/navigation';

interface Props {
  mainChar: Character;
  support1Char: Character | null;
  support2Char: Character | null;
  build: BuildState;
  stats: CalculatedStats;
  discs: { [id: string]: DiscItem };
  activeTab?: 'stats' | 'dps';
  onTabChange?: (tab: 'stats' | 'dps') => void;
}

export const DamageStatsCard: React.FC<Props> = ({
  mainChar,
  support1Char,
  support2Char,
  build,
  stats,
  discs,
  activeTab = 'dps',
  onTabChange,
}) => {
  // Determine available damage dealers (Main + any support characters)
  const dpsCandidates: { char: Character; isMain: boolean; slotIdx: 0 | 1 | 2; roleLabel: string }[] = [
    { char: mainChar, isMain: true, slotIdx: 0, roleLabel: 'Vanguard' },
  ];

  if (support1Char) {
    const isVersatile = support1Char.class === 'Versatile';
    dpsCandidates.push({
      char: support1Char,
      isMain: false,
      slotIdx: 1,
      roleLabel: isVersatile ? 'Versatile' : `Support 1 (${support1Char.class || 'Support'})`,
    });
  }
  if (support2Char) {
    const isVersatile = support2Char.class === 'Versatile';
    dpsCandidates.push({
      char: support2Char,
      isMain: false,
      slotIdx: 2,
      roleLabel: isVersatile ? 'Versatile' : `Support 2 (${support2Char.class || 'Support'})`,
    });
  }

  const [activeDpsSlot, setActiveDpsSlot] = useState<0 | 1 | 2>(0);
  const [expandedSkills, setExpandedSkills] = useState<{ [key: string]: boolean }>({});
  const skillsContainerRef = useRef<HTMLDivElement>(null);

  const toggleSkill = (key: string) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const currentCandidate =
    dpsCandidates.find((c) => c.slotIdx === activeDpsSlot) || dpsCandidates[0];
  const currentChar = currentCandidate.char;
  const isMain = currentCandidate.isMain;

  // Calculate true effective stats for the selected character
  const currentCharStats = useMemo(() => {
    if (isMain || !currentChar) return stats;
    return calculateEffectiveStats(currentChar, build, discs);
  }, [currentChar, isMain, stats, build, discs]);

  const report = calculateCharacterDamageReport(currentChar, build, currentCharStats, currentCandidate.slotIdx, discs);
  const elem = getElementColor(currentChar.element);

  if (!report) return null;

  const formatDot = (val: number) => Math.round(val).toLocaleString('id-ID');

  const skillsList = [
    {
      key: 'normalAtk',
      label: 'Auto Attack',
      sublabel: '',
      icon: Swords,
      data: report.normalAtk,
      isAllowedForSlot: true,
      isOffFieldOnly: !isMain,
      color: 'text-amber-400',
      borderGlow: 'border-amber-500/30',
      bgGlow: 'bg-amber-950/20',
    },
    {
      key: 'mainSkill',
      label: 'Main Skill',
      sublabel: `${report.mainSkill.cooldownSec}s CD`,
      icon: Zap,
      data: report.mainSkill,
      isAllowedForSlot: true,
      isOffFieldOnly: !isMain,
      color: 'text-orange-400',
      borderGlow: 'border-orange-500/30',
      bgGlow: 'bg-orange-950/20',
    },
    {
      key: 'supportSkill',
      label: 'Support Skill',
      sublabel: `${report.supportSkill.cooldownSec}s CD`,
      icon: Shield,
      data: report.supportSkill,
      isAllowedForSlot: true,
      isOffFieldOnly: false,
      color: 'text-emerald-400',
      borderGlow: 'border-emerald-500/30',
      bgGlow: 'bg-emerald-950/20',
    },
    {
      key: 'ultimate',
      label: 'Ultimate Burst',
      sublabel: `${report.ultimate.cooldownSec}s CD`,
      icon: Sparkles,
      data: report.ultimate,
      isAllowedForSlot: true,
      isOffFieldOnly: false,
      color: 'text-purple-400',
      borderGlow: 'border-purple-500/30',
      bgGlow: 'bg-purple-950/20',
    },
  ];

  return (
    <div
      onWheel={(e) => {
        if (
          skillsContainerRef.current &&
          !skillsContainerRef.current.contains(e.target as Node)
        ) {
          skillsContainerRef.current.scrollTop += e.deltaY;
        }
      }}
      className="bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden backdrop-blur-md"
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-10 pointer-events-none rounded-full"
        style={{ backgroundColor: elem.raw }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-800 gap-2">
        <h2 className="text-sm sm:text-base font-bold text-zinc-100 shrink-0">
          Combat DPS
        </h2>

        <div className="flex items-center gap-2">
          {/* DPS Candidate Tabs (If versatile sub-DPS exists) */}
          {dpsCandidates.length > 1 && (
            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              {dpsCandidates.map((c) => {
                const active = c.slotIdx === activeDpsSlot;
                return (
                  <button
                    key={c.slotIdx}
                    onClick={() => setActiveDpsSlot(c.slotIdx)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      active
                        ? 'bg-orange-500 text-black shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {c.char.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab Switcher Buttons (Statistic & Swords) */}
          {onTabChange && (
            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 shadow-inner">
              <button
                type="button"
                onClick={() => onTabChange('stats')}
                title="Combat Stats"
                aria-label="Combat Stats"
                className={`p-1.5 rounded-md transition-all ${
                  activeTab === 'stats'
                    ? 'bg-zinc-800 text-amber-300 border border-zinc-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onTabChange('dps')}
                title="Combat DPS"
                aria-label="Combat DPS"
                className={`p-1.5 rounded-md transition-all ${
                  activeTab === 'dps'
                    ? 'bg-zinc-800 text-amber-300 border border-zinc-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <Swords className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rotation DPS Banner */}
      <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-750 flex items-center justify-between shadow-inner">
        <div>
          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white drop-shadow">
            {formatDot(report.totalRotationDps)}{' '}
            <span className="text-xs font-semibold text-orange-400">DPS</span>
          </span>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] text-zinc-300 font-mono block">
            {report.primaryScalingStat === 'HP'
              ? `Max HP ${formatDot(report.totalHp)}`
              : report.primaryScalingStat === 'DEF'
              ? `Base DEF ${formatDot(report.totalDef)}`
              : `Base ATK ${formatDot(report.totalAtk)}`}
          </span>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[10px] font-mono font-semibold" style={{ color: elem.raw }}>
              +{report.elemDmg.toFixed(1)}% {currentChar.element}
            </span>
            {report.vulnDmgTaken > 0 && (
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                +{report.vulnDmgTaken.toFixed(0)}% Vuln
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4 Skill Cards List (Scrollable frame) */}
      <div
        ref={skillsContainerRef}
        className="space-y-2 max-h-[calc(100vh-17.5rem)] overflow-y-auto overscroll-contain pr-1.5 custom-scrollbar"
      >
        {skillsList.map((item) => {
          const isExpanded = !!expandedSkills[item.key];
          const skillIcon = getSkillIconUrl(item.data.icon);
          const isAllowed = item.isAllowedForSlot;

          return (
            <div
              key={item.key}
              className={`rounded-xl border transition-all overflow-hidden ${
                isAllowed
                  ? isExpanded
                    ? 'border-zinc-600 bg-zinc-850/80 shadow-md'
                    : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700'
                  : 'border-zinc-850 bg-zinc-950/30 opacity-40'
              }`}
            >
              {/* Header row */}
              <div
                onClick={() => {
                  if (isAllowed) toggleSkill(item.key);
                }}
                className={`p-2.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  isAllowed ? 'hover:bg-zinc-800/40' : 'cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center shrink-0 relative overflow-hidden">
                    {skillIcon ? (
                      <img
                        src={skillIcon}
                        alt={item.data.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-200 truncate block">
                      {item.label}
                    </span>
                    {item.sublabel && isAllowed ? (
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        {item.sublabel}
                      </span>
                    ) : !isAllowed ? (
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        Hanya aktif saat Main Trekker
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-right flex items-center gap-2 shrink-0">
                  {isAllowed ? (
                    <div>
                      <div className="text-sm font-bold font-mono text-zinc-100">
                        {formatDot(item.data.dps)}{' '}
                        <span className="text-[10px] font-semibold text-orange-400">DPS</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        Hit ~{formatDot(item.data.expectedDamage)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-600">N/A</span>
                  )}

                  {isAllowed && (
                    <button className="text-zinc-500 hover:text-zinc-300">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Skill Damage Details */}
              {isAllowed && isExpanded && (
                <div className="p-3 pt-2 bg-zinc-950 border-t border-zinc-800 text-xs space-y-2.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-zinc-900/70 p-2 rounded-lg border border-zinc-800">
                    <div>
                      <span className="text-zinc-500 block">Non-Crit Hit:</span>
                      <span className="text-zinc-300 font-semibold">
                        {formatDot(item.data.rawDamage)}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-400 block">Critical Hit:</span>
                      <span className="text-amber-300 font-bold">
                        {formatDot(item.data.maxCritDamage)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Avg Expected Hit:</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatDot(item.data.expectedDamage)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Effective Crit:</span>
                      <span className="text-yellow-400 font-semibold">
                        {item.data.effectiveCritRate.toFixed(1)}% ({report.critDmg.toFixed(0)}% CDM)
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-400 space-y-0.5 border-t border-zinc-900 pt-1.5">
                    <div className="flex justify-between">
                      <span>Scaling Stat ({report.primaryScalingStat}):</span>
                      <span className="font-mono text-zinc-300">
                        {formatDot(report.primaryScalingValue)}
                      </span>
                    </div>
                    {report.primaryScalingStat !== 'ATK' && (
                      <div className="flex justify-between">
                        <span>Total ATK:</span>
                        <span className="font-mono text-zinc-400">{formatDot(report.totalAtk)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Skill Multiplier:</span>
                      <span className="font-mono text-zinc-300">
                        {item.data.multiplier.toFixed(1)}% ({item.data.hits} hits)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Elemental DMG:</span>
                      <span className="font-mono text-zinc-300">
                        +{report.elemDmg.toFixed(1)}% {currentChar.element}
                      </span>
                    </div>
                    {item.data.typeDmgBonus > 0 && (
                      <div className="flex justify-between">
                        <span>Skill Type Bonus:</span>
                        <span className="font-mono text-emerald-400">
                          +{item.data.typeDmgBonus.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {report.vulnDmgTaken > 0 && (
                      <div className="flex justify-between">
                        <span>Vulnerability (Vuln):</span>
                        <span className="font-mono text-rose-300">
                          +{report.vulnDmgTaken.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Inline Breakdown Buff List */}
                  <div className="mt-1 p-2.5 rounded-lg bg-zinc-950 border border-zinc-700/80 shadow-inner">
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Breakdown Buff: {item.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSkill(item.key);
                        }}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono cursor-pointer"
                      >
                        [Tutup]
                      </button>
                    </div>

                    <div className="space-y-1 text-xs max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                      {(item.data.breakdowns || []).length > 0 ? (
                        item.data.breakdowns.map((b, idx) => {
                          const isBase = b.source === 'Base' || b.source.toLowerCase().includes('base');

                          if (isBase) {
                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center py-1.5 px-2 rounded-lg text-[11px] select-none text-zinc-400 bg-zinc-950/40"
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  <span className="truncate">{b.label}</span>
                                  <span className="text-zinc-600 font-mono text-[9px] shrink-0">
                                    ({b.source})
                                  </span>
                                </span>
                                <span className="font-mono font-bold text-zinc-300 ml-2 shrink-0">
                                  {b.value}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                navigateFromBreakdown({
                                  label: b.label,
                                  source: b.source,
                                  charName: currentChar?.name
                                });
                              }}
                              title="Klik untuk langsung melihat detail & penjelasan sumber ini"
                              className="group flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-zinc-800/80 hover:border-amber-500/40 border border-transparent transition-all text-[11px] cursor-pointer select-none"
                            >
                              <span className="text-zinc-300 group-hover:text-amber-300 transition-colors truncate flex items-center gap-1.5">
                                <span className="truncate">{b.label}</span>
                                <span className="text-zinc-500 font-mono text-[9px] shrink-0">
                                  ({b.source})
                                </span>
                              </span>
                              <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                                {b.value}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-zinc-500 text-center py-2 text-[11px]">
                          Hanya multiplier dasar tanpa buff khusus skill.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
