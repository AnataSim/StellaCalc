import React, { useState, useEffect } from 'react';
import type { BuildState, Character, SkillData } from '../types';
import type { BreakdownNavigationItem } from '../utils/navigation';
import { getSkillIconUrl } from '../utils/assetUrl';
import { ALL_EMBLEM_STATS } from '../data/emblemPools';
import { Swords, Sparkles, ShieldAlert, Crosshair, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  character: Character;
  build: BuildState;
  onChangeBuild: (updater: (prev: BuildState) => BuildState) => void;
  activeTeamSlot?: 0 | 1 | 2;
}

export const SkillPanel: React.FC<Props> = ({ character, build, onChangeBuild, activeTeamSlot = 0 }) => {
  const [expandedSkills, setExpandedSkills] = useState<{ [key: string]: boolean }>({});
  const [highlightedSkillKey, setHighlightedSkillKey] = useState<string | null>(null);
  const isSupportSlot = activeTeamSlot !== 0;

  useEffect(() => {
    const handleNav = (e: Event) => {
      const ce = e as CustomEvent<BreakdownNavigationItem>;
      if (!ce.detail) return;
      const { label, source } = ce.detail;

      if (source.includes('Potential') || label.includes('Potential:')) return;
      if (source.includes('Disc') || label.includes('Disc')) return;
      if (source.includes('Emblem') || label.includes('Emblem')) return;
      if (source.includes('Talent') || label.includes('Talent')) return;

      const lowerLabel = label.toLowerCase();
      const lowerSource = source.toLowerCase();

      let targetKey: 'normal' | 'main' | 'support' | 'ult' | null = null;
      if (lowerLabel.includes('support skill') || lowerSource.includes('support skill')) {
        targetKey = 'support';
      } else if (lowerLabel.includes('main skill') || lowerSource.includes('main skill')) {
        targetKey = 'main';
      } else if (lowerLabel.includes('auto attack') || lowerLabel.includes('normal attack')) {
        targetKey = 'normal';
      } else if (lowerLabel.includes('ultimate') || lowerSource.includes('ultimate')) {
        targetKey = 'ult';
      }

      if (targetKey) {
        setExpandedSkills((prev) => ({ ...prev, [targetKey!]: true }));
        setHighlightedSkillKey(targetKey);
        setTimeout(() => setHighlightedSkillKey(null), 4000);
        setTimeout(() => {
          const el = document.getElementById(`skill-card-${targetKey}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    };

    window.addEventListener('navigate-breakdown', handleNav);
    return () => window.removeEventListener('navigate-breakdown', handleNav);
  }, []);

  const toggleSkill = (key: string) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Calculate unique skill level bonuses from Lv.80 Emblem (Strictly capped at max +3 in Stella Sora: Base 10 + 3 = Lv.13)
  const rawEmblemBonus = {
    normal: 0,
    main: 0,
    support: 0,
    ult: 0,
  };

  (build.emblems?.lv80?.lines || []).forEach((line) => {
    if (!line || !line.statId || line.statId === 'none') return;
    const statDef = ALL_EMBLEM_STATS[line.statId];
    if (!statDef || !statDef.isUnique) return;
    const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
    if (statDef.uniqueTarget === 'normal') rawEmblemBonus.normal += val;
    if (statDef.uniqueTarget === 'main') rawEmblemBonus.main += val;
    if (statDef.uniqueTarget === 'support') rawEmblemBonus.support += val;
    if (statDef.uniqueTarget === 'ult') rawEmblemBonus.ult += val;
  });

  const emblemBonus = {
    normal: Math.min(3, rawEmblemBonus.normal),
    main: Math.min(3, rawEmblemBonus.main),
    support: Math.min(3, rawEmblemBonus.support),
    ult: Math.min(3, rawEmblemBonus.ult),
  };

  const skillsConfig: {
    key: 'normal' | 'main' | 'support' | 'ult';
    label: string;
    icon: any;
    data?: SkillData | null;
  }[] = [
    { key: 'normal', label: 'Normal Attack', icon: Swords, data: character.normalAtk },
    { key: 'main', label: 'Main Skill', icon: Crosshair, data: character.skill },
    { key: 'support', label: 'Support Skill', icon: ShieldAlert, data: character.supportSkill },
    { key: 'ult', label: 'Ultimate', icon: Sparkles, data: character.ultimate },
  ];

  const updateSkillLevel = (key: 'normal' | 'main' | 'support' | 'ult', lvl: number) => {
    onChangeBuild((prev) => ({
      ...prev,
      skillLevels: {
        ...prev.skillLevels,
        [key]: lvl,
      },
    }));
  };

  const setAllSkillsMax = () => {
    onChangeBuild((prev) => ({
      ...prev,
      skillLevels: {
        normal: 10,
        main: 10,
        support: 10,
        ult: 10,
      },
    }));
  };

  // Resolves &ParamX& based on the effective skill level (1-13)
  const resolveSkillDescNodes = (desc?: string, params?: any[], level: number = 10) => {
    if (!desc) return null;
    let txt = desc;

    if (Array.isArray(params)) {
      params.forEach((p, idx) => {
        let val = p;
        if (typeof p === 'string' && p.includes('/')) {
          const parts = p.split('/');
          val = parts[Math.min(level - 1, parts.length - 1)] || p;
        }
        txt = txt.replace(new RegExp(`&Param${idx + 1}&`, 'gi'), `[[PARAM::${val}]]`);
      });
    }

    // Clean Unity tags
    txt = txt
      .replace(/<color=[^>]+>/gi, '')
      .replace(/<\/color>/gi, '')
      .replace(/##([^#]+)#\d+#/g, '$1')
      .replace(/\x0B/g, ' ')
      .trim();

    const segments = txt.split(/(\[\[PARAM::.*?\]\])/g);
    return segments.map((seg, i) => {
      if (seg.startsWith('[[PARAM::') && seg.endsWith(']]')) {
        const value = seg.slice(9, -2);
        return (
          <span
            key={i}
            className="font-mono font-bold text-amber-400 bg-amber-950/40 px-1 py-0.5 rounded border border-amber-800/40 mx-0.5"
          >
            {value}
          </span>
        );
      }
      return <span key={i}>{seg}</span>;
    });
  };

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h2 className="text-base font-bold text-zinc-100">
            Skills & Multipliers
          </h2>
          <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full ml-1">
            Max Lv.13
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={setAllSkillsMax}
            className="text-[11px] font-semibold text-zinc-400 hover:text-orange-400 bg-zinc-800/80 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition-all cursor-pointer"
            title="Set semua skill ke Lv.10"
          >
            Max All (Lv.10)
          </button>
        </div>
      </div>

      {/* Grid of 4 Skills (2x2 on sm/md/lg) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {skillsConfig.map((item) => {
          const s = item.data;
          const baseLvl = build.skillLevels?.[item.key] || 1;
          const bonus = emblemBonus[item.key] || 0;
          const effectiveLevel = Math.min(13, baseLvl + bonus);
          const iconUrl = getSkillIconUrl(s?.icon);
          const isExpanded = !!expandedSkills[item.key];
          const isInactiveForSupport = isSupportSlot && (item.key === 'normal' || item.key === 'main');
          const isActiveForSupport = isSupportSlot && (item.key === 'support' || item.key === 'ult');
          const isHighlighted = highlightedSkillKey === item.key;

          return (
            <div
              key={item.key}
              id={`skill-card-${item.key}`}
              className={`p-3 rounded-xl transition-all ${
                isHighlighted
                  ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 bg-amber-950/40 scale-[1.015]'
                  : isInactiveForSupport
                    ? 'bg-zinc-950/40 opacity-60 hover:opacity-90'
                    : 'bg-zinc-950/60 hover:bg-zinc-950/80'
              }`}
            >
              {/* Top Row: Icon + Name + Level Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={s?.name || item.label}
                        className="w-full h-full object-cover"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                    ) : (
                      <item.icon className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-200 truncate flex items-center gap-1.5">
                      <span>{s?.name || item.label}</span>
                      {isInactiveForSupport && (
                        <span className="text-[9px] text-zinc-500 font-mono font-normal">
                          (Inaktif)
                        </span>
                      )}
                      {isActiveForSupport && (
                        <span className="text-[9px] text-emerald-400 font-mono font-medium">
                          (Aktif)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {item.label} {s?.cooldown ? `· CD ${s.cooldown}s` : ''}
                    </div>
                  </div>
                </div>

                {/* Level Tag */}
                <div className="shrink-0 text-right">
                  {bonus > 0 ? (
                    <span
                      className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700/80 text-purple-300 shadow-sm inline-block"
                      title={`Base Lv.${baseLvl} + Lv.80 Emblem (+${bonus})`}
                    >
                      Lv.{effectiveLevel}
                    </span>
                  ) : (
                    <span className="text-xs font-bold font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded inline-block">
                      Lv.{effectiveLevel}
                    </span>
                  )}
                </div>
              </div>

              {/* Slider Row */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                  <span>Base: Lv.{baseLvl}</span>
                  {bonus > 0 && <span className="text-purple-400">+Emblem {bonus}</span>}
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={baseLvl}
                  onChange={(e) => updateSkillLevel(item.key, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              {/* Accordion Toggle for Multiplier / Description */}
              {s?.desc && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleSkill(item.key)}
                    className="w-full flex items-center justify-between text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors py-1 pt-1.5 border-t border-zinc-800/60 cursor-pointer"
                  >
                    <span className="flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Detail Multiplier (Lv.{effectiveLevel})
                    </span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-1.5 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/90 text-[11px] leading-relaxed text-zinc-300 animate-in fade-in duration-150">
                      {resolveSkillDescNodes(s.desc, s.params, effectiveLevel)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
