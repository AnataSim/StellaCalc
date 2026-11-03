import React, { useState, useEffect } from 'react';
import type { BuildState, Character } from '../types';
import type { BreakdownNavigationItem } from '../utils/navigation';
import { getCharacterHeadUrl, getElementColor, getElementIconUrl, getRoleIconUrl } from '../utils/assetUrl';
import { Sparkles, Award, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  characters: { [id: string]: Character };
  build: BuildState;
  onChangeBuild: (updater: (prev: BuildState) => BuildState) => void;
  activeTeamSlot?: 0 | 1 | 2;
}

export const CharacterPanel: React.FC<Props> = ({ characters, build, onChangeBuild, activeTeamSlot = 0 }) => {
  const [showTalentDetails, setShowTalentDetails] = useState(false);
  const [highlightedTalentTier, setHighlightedTalentTier] = useState<number | null>(null);
  const selectedChar = characters[String(build.characterId)] || Object.values(characters)[0];
  const elem = getElementColor(selectedChar?.element || 'Ignis');
  const quickLevels = [1, 60, 70, 80, 90];

  useEffect(() => {
    const handleNav = (e: Event) => {
      const ce = e as CustomEvent<BreakdownNavigationItem>;
      if (!ce.detail) return;
      const { label, source } = ce.detail;

      if (source.includes('Talent') || label.includes('Talent')) {
        const tMatch = label.match(/T(\d+)/i) || source.match(/T(\d+)/i);
        let tier = tMatch ? parseInt(tMatch[1], 10) : null;

        if (!tier && selectedChar?.talent) {
          selectedChar.talent.forEach((tGroup, idx) => {
            const majorNode = tGroup.boost?.[0];
            if (majorNode && majorNode.name && label.toLowerCase().includes(majorNode.name.toLowerCase())) {
              tier = idx + 1;
            }
          });
        }

        if (tier) {
          setShowTalentDetails(true);
          setHighlightedTalentTier(tier);
          setTimeout(() => setHighlightedTalentTier(null), 4000);
          setTimeout(() => {
            const el = document.getElementById(`talent-item-t${tier}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
        }
      }
    };

    window.addEventListener('navigate-breakdown', handleNav);
    return () => window.removeEventListener('navigate-breakdown', handleNav);
  }, [selectedChar]);

  // Helper to extract active buff tags for summary
  const getTalentBuffTag = (majorNode: any) => {
    if (!majorNode) return '';
    const params = majorNode.params || [];
    const p0 = params[0] ? String(params[0]) : '';
    const p1 = params[1] ? String(params[1]) : '';
    const name = majorNode.name || '';
    const desc = majorNode.desc || '';
    if (name === 'Blaze Unbound') return `+${p0} CR / +${p1} CDM`;
    if (desc.includes('Crit DMG by') || desc.includes('Crit DMG dealt')) return `+${p0} Crit DMG`;
    if (desc.includes(`${selectedChar?.element} DMG`)) return `+${p0} ${selectedChar?.element} DMG`;
    if (desc.includes('Crit Rate')) return `+${p0} Crit Rate`;
    if (desc.includes('Max HP by') || desc.includes('Increases Max HP')) return `+${p0} Max HP`;
    if (desc.includes('Increases ATK by') || desc.includes('increases ATK by')) return `+${p0} ATK`;
    if (p0) return `+${p0}`;
    return majorNode.name || '';
  };

  const activeTalentCount = build.potentials?.length || 0;

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-5 shadow-lg space-y-4">
      {/* 1. Integrated Trekker Header & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl bg-zinc-850 border overflow-hidden shrink-0 relative shadow-inner"
            style={{ borderColor: `${elem.raw}50` }}
          >
            <img
              src={getCharacterHeadUrl(selectedChar.id)}
              alt={selectedChar.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-zinc-500 -z-10">
              {selectedChar.name[0]}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                {selectedChar.name}
              </h2>
              <span className="text-xs text-amber-400 font-mono tracking-tighter">
                {'★'.repeat(selectedChar.star || 4)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-4 h-4 rounded p-0.5 flex items-center justify-center border"
                style={{
                  backgroundColor: `${elem.raw}25`,
                  borderColor: `${elem.raw}60`,
                }}
                title={selectedChar.element}
              >
                <img
                  src={getElementIconUrl(selectedChar.element)}
                  alt={selectedChar.element}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                <img
                  src={getRoleIconUrl(selectedChar.class)}
                  alt={selectedChar.class}
                  className="w-3 h-3 object-contain"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
                <span>{selectedChar.class}</span>
              </span>
              <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                {selectedChar.attackType}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
            {activeTeamSlot === 0 ? 'Main Trekker' : `Support ${activeTeamSlot}`}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">ID: {selectedChar.id}</span>
        </div>
      </div>

      {/* 2. Level & Affinity in a Clean 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Level Box */}
        <div className="bg-zinc-950/60 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              Level <span className="font-mono font-bold text-orange-400">Lv.{build.level}</span>
            </span>
            <div className="flex gap-1">
              {quickLevels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onChangeBuild((prev) => ({ ...prev, level: lvl }))}
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    build.level === lvl
                      ? 'bg-orange-500 text-black'
                      : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="90"
            value={build.level}
            onChange={(e) => onChangeBuild((prev) => ({ ...prev, level: parseInt(e.target.value, 10) }))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Affinity Box */}
        <div className="bg-zinc-950/60 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-pink-400" />
              Affinity <span className="font-mono font-bold text-pink-400">Rank {build.affinityLevel}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              +{build.affinityLevel * 50} HP · +{build.affinityLevel * 6} ATK
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={build.affinityLevel}
            onChange={(e) => onChangeBuild((prev) => ({ ...prev, affinityLevel: parseInt(e.target.value, 10) }))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>
      </div>

      {/* 3. Talent (Dupes / Limit Break) */}
      <div className="bg-zinc-950/60 p-3.5 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Limit Break / Talent</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-yellow-400">
            {activeTalentCount === 0 ? 'T0 (Base)' : `T${activeTalentCount} Active (${activeTalentCount}/5)`}
          </span>
        </div>

        {/* T0 - T5 Selector */}
        <div className="grid grid-cols-6 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((tNum) => {
            const isSelected = activeTalentCount === tNum;
            return (
              <button
                key={tNum}
                onClick={() => {
                  onChangeBuild((prev) => {
                    if (tNum === 0) return { ...prev, potentials: [] };
                    const next = [];
                    for (let i = 1; i <= tNum; i++) next.push(i);
                    return { ...prev, potentials: next };
                  });
                }}
                className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-yellow-500/20 text-yellow-300 shadow-sm shadow-yellow-500/10'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                T{tNum}
              </button>
            );
          })}
        </div>

        {/* Active Buffs Summary Chips */}
        {selectedChar?.talent && selectedChar.talent.length > 0 && (
          <div className="pt-1.5 border-t border-zinc-800/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeTalentCount === 0 ? (
                  <span className="text-[11px] text-zinc-500 italic">
                    Belum ada dupe talent aktif.
                  </span>
                ) : (
                  selectedChar.talent.slice(0, activeTalentCount).map((tGroup, idx) => {
                    const tag = getTalentBuffTag(tGroup.boost?.[0]);
                    return (
                      <span
                        key={idx}
                        className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300"
                      >
                        T{idx + 1}: {tag}
                      </span>
                    );
                  })
                )}
              </div>

              {/* Accordion Toggle for Full Descriptions */}
              <button
                type="button"
                onClick={() => setShowTalentDetails((prev) => !prev)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors py-0.5 cursor-pointer ml-auto"
              >
                <span>{showTalentDetails ? 'Sembunyikan Deskripsi' : 'Lihat Detail Deskripsi'}</span>
                {showTalentDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Collapsible Descriptions List */}
            {showTalentDetails && (
              <div className="mt-2.5 space-y-2 max-h-64 overflow-y-auto pr-1 pt-1 border-t border-zinc-800/60">
                {selectedChar.talent.map((tGroup, idx) => {
                  const tier = idx + 1;
                  const isActive = tier <= activeTalentCount;
                  const majorNode = tGroup.boost?.[0];
                  if (!majorNode) return null;

                  const params = majorNode.params || [];
                  let formattedDesc = majorNode.desc || '';
                  params.forEach((p, pIdx) => {
                    formattedDesc = formattedDesc.replace(
                      new RegExp(`&Param${pIdx + 1}&`, 'g'),
                      `<span class="text-amber-300 font-semibold">${p}</span>`
                    );
                  });
                  formattedDesc = formattedDesc
                    .replace(/<color=[^>]+>/gi, '<span class="text-amber-300 font-semibold">')
                    .replace(/<\/color>/gi, '</span>')
                    .replace(/##[^#]+#\d+#/g, (m) => m.split('#')[1] || '')
                    .replace(/\x0B/g, ' ')
                    .trim();

                  const buffTag = getTalentBuffTag(majorNode);
                  const isHighlighted = highlightedTalentTier === tier;

                  return (
                    <div
                      key={tier}
                      id={`talent-item-t${tier}`}
                      onClick={() => {
                        onChangeBuild((prev) => {
                          const current = prev.potentials?.length || 0;
                          const target = current === tier ? tier - 1 : tier;
                          const next = [];
                          for (let i = 1; i <= target; i++) next.push(i);
                          return { ...prev, potentials: next };
                        });
                      }}
                      className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                        isHighlighted
                          ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 bg-amber-950/60 scale-[1.015]'
                          : isActive
                            ? 'bg-yellow-950/30 text-yellow-300 shadow-sm border border-yellow-800/40'
                            : 'bg-zinc-900/40 text-zinc-400 border border-zinc-800/60 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isActive
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60'
                            }`}
                          >
                            T{tier}
                          </span>
                          <span className={`text-xs font-bold ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                            {majorNode.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {buffTag && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isActive
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                  : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {buffTag}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-1 py-0.5 rounded ${
                              isActive
                                ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30'
                                : 'text-zinc-500 bg-zinc-800/80'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'LOCKED'}
                          </span>
                        </div>
                      </div>
                      <div
                        className="text-[11px] leading-relaxed text-zinc-400"
                        dangerouslySetInnerHTML={{ __html: formattedDesc }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
