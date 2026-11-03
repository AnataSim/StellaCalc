import React, { useState, useEffect } from 'react';
import type { BuildState, Character, DiscItem, DiscSlotState } from '../types';
import type { BreakdownNavigationItem } from '../utils/navigation';
import {
  getDiscCoverUrl,
  getElementColor,
  getHarmonyNoteIconUrl,
  getHarmonyNoteCdnUrl
} from '../utils/assetUrl';
import { getCharacterSignatureDisc, getActiveSignatureCrescendo } from '../utils/signature';
import harmonyNotesData from '../data/harmonyNotes.json';
import {
  Disc as DiscIcon,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Music,
  Trash2,
  Zap,
  Lock,
  Plus,
  Shield
} from 'lucide-react';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const noteNameToId: { [name: string]: string } = {};
for (const [id, def] of Object.entries(harmonyNotesData)) {
  noteNameToId[(def as any).name] = id;
}

interface Props {
  discs: { [id: string]: DiscItem };
  build: BuildState;
  onChangeBuild: (updater: (prev: BuildState) => BuildState) => void;
  character?: Character;
}

const renderSkillDesc = (rawDesc: string, paramString: string) => {
  const paramValues = paramString ? paramString.split(',').map((s) => s.trim()) : [];

  let text = rawDesc
    .replace(/<color=#[0-9a-fA-F]+>(\{\d+\})<\/color>/gi, '$1')
    .replace(/□/g, '\n');

  paramValues.forEach((val, idx) => {
    const placeholder = `{${idx + 1}}`;
    text = text.split(placeholder).join(`<span class="text-amber-400 font-bold font-mono">${val}</span>`);
  });

  text = text
    .replace(/##([^#]+)#\d+#/g, '$1')
    .replace(/<color=[^>]+>(.*?)<\/color>/gi, '$1')
    .replace(/<\/?color[^>]*>/gi, '');

  const lines = text.split(/[\u000b\r\n]+/).map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-1.5 text-[11px] leading-relaxed text-zinc-300">
      {lines.map((line, idx) => (
        <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />
      ))}
    </div>
  );
};

export const DiscPanel: React.FC<Props> = ({ discs, build, onChangeBuild, character }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'support' | 'notes'>('main');
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [highlightedDiscSlot, setHighlightedDiscSlot] = useState<string | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<string | null>(null);

  useEffect(() => {
    const handleNav = (e: Event) => {
      const ce = e as CustomEvent<BreakdownNavigationItem>;
      if (!ce.detail) return;
      const { label, source } = ce.detail;
      const lowerSource = source.toLowerCase();
      const lowerLabel = label.toLowerCase();

      // 1. Harmony Note / Melody
      if (lowerSource.includes('harmony note') || lowerLabel.includes('melody of') || lowerLabel.includes('harmony note')) {
        setActiveTab('notes');

        let matchedNoteId: string | null = null;
        for (const [id, def] of Object.entries(harmonyNotesData)) {
          if (lowerLabel.includes((def as any).name.toLowerCase())) {
            matchedNoteId = id;
            break;
          }
        }

        if (matchedNoteId) {
          setHighlightedNoteId(matchedNoteId);
          setTimeout(() => setHighlightedNoteId(null), 4000);
          setTimeout(() => {
            const el = document.getElementById(`harmony-note-${matchedNoteId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 120);
        }
        return;
      }

      // 2. Specific Disc Slot (Main 1, 2, 3 or Support 1, 2, 3)
      let targetSlotKey: 'main1' | 'main2' | 'main3' | 'support1' | 'support2' | 'support3' | null = null;

      if (lowerSource.includes('support disc 1') || lowerLabel.includes('support disc 1')) {
        targetSlotKey = 'support1';
      } else if (lowerSource.includes('support disc 2') || lowerLabel.includes('support disc 2')) {
        targetSlotKey = 'support2';
      } else if (lowerSource.includes('support disc 3') || lowerLabel.includes('support disc 3')) {
        targetSlotKey = 'support3';
      } else if (lowerSource.includes('main disc 1') || lowerLabel.includes('main disc 1') || lowerSource === 'disc 1') {
        targetSlotKey = 'main1';
      } else if (lowerSource.includes('main disc 2') || lowerLabel.includes('main disc 2') || lowerSource === 'disc 2') {
        targetSlotKey = 'main2';
      } else if (lowerSource.includes('main disc 3') || lowerLabel.includes('main disc 3') || lowerSource === 'disc 3') {
        targetSlotKey = 'main3';
      } else if (lowerSource.includes('disc') || lowerLabel.includes('disc')) {
        // Fallback: match by equipped disc names
        for (const sKey of ['main1', 'main2', 'main3', 'support1', 'support2', 'support3'] as const) {
          const dId = build.discs[sKey]?.discId;
          if (dId && discs[String(dId)]) {
            const dName = discs[String(dId)].name.toLowerCase();
            if (lowerLabel.includes(dName)) {
              targetSlotKey = sKey;
              break;
            }
          }
        }
      }

      if (targetSlotKey) {
        const isMain = targetSlotKey.startsWith('main');
        setActiveTab(isMain ? 'main' : 'support');
        setExpandedSlots((prev) => ({ ...prev, [targetSlotKey!]: true }));
        setHighlightedDiscSlot(targetSlotKey);
        setTimeout(() => setHighlightedDiscSlot(null), 4000);
        setTimeout(() => {
          const el = document.getElementById(`disc-slot-${targetSlotKey}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    };

    window.addEventListener('navigate-breakdown', handleNav);
    return () => window.removeEventListener('navigate-breakdown', handleNav);
  }, [discs, build.discs]);
  const [search, setSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<string>('All');
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});

  const toggleSlotExpand = (slotKey: string) => {
    setExpandedSlots((prev) => ({
      ...prev,
      [slotKey]: !prev[slotKey],
    }));
  };

  const charSignatureDisc = character ? getCharacterSignatureDisc(character.name, discs) : null;
  const signatureInfo = character ? getActiveSignatureCrescendo(character.name, build.discs, discs) : null;

  const discList = Object.values(discs).sort(
    (a, b) => (b.star || 0) - (a.star || 0) || a.name.localeCompare(b.name)
  );

  const filteredDiscs = discList.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.element.toLowerCase().includes(search.toLowerCase()) ||
      (d.mainSkill?.name && d.mainSkill.name.toLowerCase().includes(search.toLowerCase()));

    const matchesElem =
      elementFilter === 'All' || d.element.toLowerCase() === elementFilter.toLowerCase();

    return matchesSearch && matchesElem;
  });

  const mainSlots = [
    { key: 'main1' as const, label: 'Main Disc 1' },
    { key: 'main2' as const, label: 'Main Disc 2' },
    { key: 'main3' as const, label: 'Main Disc 3' },
  ];

  const supportSlots = [
    { key: 'support1' as const, label: 'Support Disc 1' },
    { key: 'support2' as const, label: 'Support Disc 2' },
    { key: 'support3' as const, label: 'Support Disc 3' },
  ];

  const currentSlots = activeTab === 'main' ? mainSlots : supportSlots;

  const updateDiscSlot = (slotKey: keyof BuildState['discs'], updates: Partial<DiscSlotState>) => {
    onChangeBuild((prev) => {
      const current = prev.discs[slotKey];
      const rawDupe = updates.dupe !== undefined ? updates.dupe : current.dupe;
      const newDupe = Math.max(1, Math.min(6, rawDupe || 1));

      return {
        ...prev,
        discs: {
          ...prev.discs,
          [slotKey]: {
            ...current,
            ...updates,
            dupe: newDupe,
            harmonySkillLevel: newDupe,
          },
        },
      };
    });
  };

  const updateHarmonyNote = (noteId: string, level: number) => {
    const clamped = Math.max(0, Math.min(99, level));
    onChangeBuild((prev) => ({
      ...prev,
      harmonyNoteLevels: {
        ...(prev.harmonyNoteLevels || {}),
        [noteId]: clamped,
      },
    }));
  };

  const getSupportDiscsSummary = () => {
    let totalHp = 0;
    let totalAtk = 0;
    const notesCount: { [name: string]: number } = {};
    let equippedCount = 0;

    const supKeys: (keyof BuildState['discs'])[] = ['support1', 'support2', 'support3'];
    for (const key of supKeys) {
      const st = build.discs[key];
      if (!st?.discId) continue;
      equippedCount++;
      const d = discs[String(st.discId)];
      if (!d) continue;

      const c = Math.max(1, Math.min(6, st.dupe || 1));
      const lvlIdx = Math.max(0, Math.min((st.level || 1) - 1, (d.stat?.length || 1) - 1));
      const stat = d.stat?.[lvlIdx];
      const dupeAtk = c >= 2 && d.dupe?.length ? d.dupe[Math.min(c - 2, d.dupe.length - 1)]?.ATK || 0 : 0;

      totalHp += stat?.HP ? Number(stat.HP) : 0;
      totalAtk += (stat?.ATK || 0) + dupeAtk;

      const tier = Math.min(8, Math.max(0, Math.floor((st.level - 1) / 10)));
      const tierNotes = d.supportNote?.[tier];
      if (tierNotes && typeof tierNotes === 'object') {
        for (const [name, qty] of Object.entries(tierNotes)) {
          notesCount[name] = (notesCount[name] || 0) + (Number(qty) || 0);
        }
      }
    }
    return { totalHp, totalAtk, notesCount, equippedCount };
  };

  const supportSummary = getSupportDiscsSummary();

  const handleSetAllNotes = (level: number) => {
    const newLevels: { [id: string]: number } = {};
    for (const id of Object.keys(harmonyNotesData)) {
      newLevels[id] = level;
    }
    onChangeBuild((prev) => ({
      ...prev,
      harmonyNoteLevels: newLevels,
    }));
  };

  const elementsList = ['All', 'Ignis', 'Aqua', 'Lux', 'Umbra', 'Ventus', 'Terra'];
  const quickDiscLevels = [1, 60, 70, 80, 90];

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <DiscIcon className="w-4 h-4 text-cyan-400" />
            Discs & Harmony Setup
          </h2>
        </div>

        {/* Tab switch */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/90 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('main');
              setSelectingSlot(null);
            }}
            className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'main'
                ? 'bg-zinc-800 text-cyan-400 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3 Main Discs
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('support');
              setSelectingSlot(null);
            }}
            className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'support'
                ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3 Support Discs
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('notes');
              setSelectingSlot(null);
            }}
            className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-zinc-800 text-amber-400 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Harmony Notes (13)</span>
          </button>
        </div>
      </div>

      {/* DISCS TABS (MAIN / SUPPORT) */}
      {activeTab !== 'notes' && (
        <div className="space-y-3.5">
          {/* Active Trekker Signature Disc Status Banner */}
          {charSignatureDisc && (
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                signatureInfo?.isEquipped
                  ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono shrink-0 ${
                    signatureInfo?.isEquipped
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {character?.name}'s Signature
                </span>
                <span className="font-bold text-zinc-100 truncate">
                  {charSignatureDisc.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {signatureInfo?.isEquipped ? (
                  <span className="font-mono font-bold text-amber-400 flex items-center gap-1 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Equipped in {signatureInfo.slotKey?.toUpperCase()} (C{signatureInfo.crescendo})
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Not Equipped ➔ C0
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Unified Harmony Skills Card at Top of Main Discs (In-Game Aesthetic) */}
          {activeTab === 'main' && (
            <div className="bg-zinc-950/80 rounded-2xl p-4 space-y-3.5 shadow-xl">
              {/* Header with In-Game Vibe & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Music className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>Harmony Skills</span>
                      <span className="text-[10px] text-zinc-400 font-mono font-normal">
                        (6 In-Combat Skills)
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeBuild((prev) => ({
                        ...prev,
                        discs: {
                          ...prev.discs,
                          main1: { ...prev.discs.main1, harmonySkill1Level: 5, harmonySkill2Level: 5 },
                          main2: { ...prev.discs.main2, harmonySkill1Level: 5, harmonySkill2Level: 5 },
                          main3: { ...prev.discs.main3, harmonySkill1Level: 5, harmonySkill2Level: 5 },
                        },
                      }));
                    }}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                    title="Setel semua Harmony Skills ke Level 5"
                  >
                    Max All (Lv.5)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeBuild((prev) => ({
                        ...prev,
                        discs: {
                          ...prev.discs,
                          main1: { ...prev.discs.main1, harmonySkill1Level: 0, harmonySkill2Level: 0 },
                          main2: { ...prev.discs.main2, harmonySkill1Level: 0, harmonySkill2Level: 0 },
                          main3: { ...prev.discs.main3, harmonySkill1Level: 0, harmonySkill2Level: 0 },
                        },
                      }));
                    }}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-all cursor-pointer"
                    title="Matikan semua Harmony Skills"
                  >
                    Reset (Off)
                  </button>
                </div>
              </div>

              {/* 3 Main Discs Rows */}
              <div className="space-y-3">
                {mainSlots.map((mSlot, idx) => {
                  const mState = build.discs[mSlot.key];
                  const mDisc = mState?.discId ? discs[String(mState.discId)] : null;
                  const s1Lv = mState.harmonySkill1Level !== undefined ? mState.harmonySkill1Level : 1;
                  const s2Lv = mState.harmonySkill2Level !== undefined ? mState.harmonySkill2Level : 1;

                  return (
                    <div key={mSlot.key} className="space-y-1.5 p-2.5 rounded-xl bg-zinc-900/40">
                      {/* Compact Disc Slot Title */}
                      <div className="flex items-center justify-between text-[11px] px-0.5 pb-1 border-b border-zinc-800/40">
                        <span className="font-bold text-zinc-300 flex items-center gap-2">
                          <span className="text-cyan-400 font-mono">Disc {idx + 1}:</span>
                          <span>{mDisc ? mDisc.name : <span className="text-zinc-500 font-normal italic">(Belum Terpasang)</span>}</span>
                          {mDisc && (
                            <span className="text-[10px] text-amber-400 font-mono">
                              {'★'.repeat(mDisc.star)}
                            </span>
                          )}
                        </span>
                        {mDisc && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {mDisc.element}
                          </span>
                        )}
                      </div>

                      {mDisc ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                          {/* Harmony Skill 1 Card */}
                          {mDisc.secondarySkill1 ? (
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900/90 transition-all shadow-sm">
                              {/* In-Game Style Icon Square */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                                s1Lv > 0
                                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                              }`}>
                                <Sparkles className="w-5 h-5" />
                              </div>

                              {/* Card Content: Title on Row 1, Buttons on Row 2 */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="text-xs sm:text-sm font-bold text-zinc-100 truncate"
                                    title={mDisc.secondarySkill1.name}
                                  >
                                    {mDisc.secondarySkill1.name}
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                                    s1Lv > 0
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-zinc-850 text-zinc-500 border-zinc-750'
                                  }`}>
                                    {s1Lv > 0 ? `Level ${s1Lv}` : 'Off'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-zinc-500 font-mono mr-0.5">Tier:</span>
                                  <button
                                    type="button"
                                    onClick={() => updateDiscSlot(mSlot.key, { harmonySkill1Level: 0 })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                      s1Lv === 0
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black'
                                        : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                                    }`}
                                  >
                                    Off
                                  </button>
                                  {[1, 2, 3, 4, 5].map((lv) => (
                                    <button
                                      key={lv}
                                      type="button"
                                      onClick={() => updateDiscSlot(mSlot.key, { harmonySkill1Level: lv })}
                                      className={`w-5 sm:w-6 h-5 rounded text-[10px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                                        s1Lv === lv
                                          ? 'bg-amber-500 text-black shadow-sm font-black'
                                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                                      }`}
                                    >
                                      {lv}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-3 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-[11px] text-zinc-500 font-mono">
                              Tidak Ada Skill 1
                            </div>
                          )}

                          {/* Harmony Skill 2 Card */}
                          {mDisc.secondarySkill2 ? (
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900/90 transition-all shadow-sm">
                              {/* In-Game Style Icon Square */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                                s2Lv > 0
                                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                              }`}>
                                <Zap className="w-5 h-5" />
                              </div>

                              {/* Card Content: Title on Row 1, Buttons on Row 2 */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="text-xs sm:text-sm font-bold text-zinc-100 truncate"
                                    title={mDisc.secondarySkill2.name}
                                  >
                                    {mDisc.secondarySkill2.name}
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                                    s2Lv > 0
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-zinc-850 text-zinc-500 border-zinc-750'
                                  }`}>
                                    {s2Lv > 0 ? `Level ${s2Lv}` : 'Off'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-zinc-500 font-mono mr-0.5">Tier:</span>
                                  <button
                                    type="button"
                                    onClick={() => updateDiscSlot(mSlot.key, { harmonySkill2Level: 0 })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                      s2Lv === 0
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black'
                                        : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                                    }`}
                                  >
                                    Off
                                  </button>
                                  {[1, 2, 3, 4, 5].map((lv) => (
                                    <button
                                      key={lv}
                                      type="button"
                                      onClick={() => updateDiscSlot(mSlot.key, { harmonySkill2Level: lv })}
                                      className={`w-5 sm:w-6 h-5 rounded text-[10px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                                        s2Lv === lv
                                          ? 'bg-amber-500 text-black shadow-sm font-black'
                                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                                      }`}
                                    >
                                      {lv}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-3 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-[11px] text-zinc-500 font-mono">
                              Hanya Memiliki 1 Harmony Skill (Disc 4★)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-[11px] text-zinc-500 italic text-center">
                          Pilih disc di Disc {idx + 1} di bawah untuk mengatur tier Harmony Skill
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Support Discs Contribution Summary Card */}
          {activeTab === 'support' && (
            <div className="bg-zinc-950/80 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>Support Discs Contribution</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-700/50">
                        {supportSummary.equippedCount}/3 Terpasang
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeBuild((prev) => ({
                        ...prev,
                        discs: {
                          ...prev.discs,
                          support1: { ...prev.discs.support1, level: 90, dupe: 6 },
                          support2: { ...prev.discs.support2, level: 90, dupe: 6 },
                          support3: { ...prev.discs.support3, level: 90, dupe: 6 },
                        },
                      }));
                    }}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                    title="Setel semua Support Discs ke Lv.90 & Crescendo C6"
                  >
                    Max All (Lv.90 · C6)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeBuild((prev) => ({
                        ...prev,
                        discs: {
                          ...prev.discs,
                          support1: { ...prev.discs.support1, level: 1, dupe: 1 },
                          support2: { ...prev.discs.support2, level: 1, dupe: 1 },
                          support3: { ...prev.discs.support3, level: 1, dupe: 1 },
                        },
                      }));
                    }}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition-all cursor-pointer"
                    title="Reset level semua Support Discs ke Lv.1 & C1"
                  >
                    All Lv.1
                  </button>
                </div>
              </div>

              {/* Total Contribution Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  Total Kontribusi:
                </span>
                <span className="font-mono text-zinc-200 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 font-bold">
                  HP +{supportSummary.totalHp.toLocaleString()}
                </span>
                <span className="font-mono text-zinc-200 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 font-bold">
                  ATK +{supportSummary.totalAtk.toLocaleString()}
                </span>
                {Object.keys(supportSummary.notesCount).length > 0 ? (
                  Object.entries(supportSummary.notesCount).map(([name, qty]) => {
                    const nid = noteNameToId[name];
                    return (
                      <span
                        key={name}
                        title={name}
                        className="font-mono text-amber-300 px-2 py-0.5 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-1.5 font-bold shadow-xs cursor-help"
                      >
                        {nid ? (
                          <img
                            src={getHarmonyNoteIconUrl(nid, 'small')}
                            alt={name}
                            className="w-3.5 h-3.5 object-contain shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = getHarmonyNoteCdnUrl(nid, 'small');
                            }}
                          />
                        ) : (
                          <Music className="w-3 h-3 text-amber-400" />
                        )}
                        <span>+{qty}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-zinc-500 italic">
                    Belum ada Support Notes dari Discs
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Slots List */}
          {currentSlots.map((slot) => {
            const slotState = build.discs[slot.key];
            const selectedDisc = slotState?.discId ? discs[String(slotState.discId)] : null;
            const elem = getElementColor(selectedDisc?.element || 'None');
            const isPickingThis = selectingSlot === slot.key;
            const isExpanded = !!expandedSlots[slot.key];
            const coverUrl = selectedDisc ? getDiscCoverUrl(selectedDisc.icon) : null;
            const isMain = activeTab === 'main';
            const currentCrescendo = Math.max(1, Math.min(6, slotState.dupe || 1));

            const melodySkillLevel = currentCrescendo;
            const melodyParams = selectedDisc?.mainSkill?.params?.split('/') || [];
            const currentMelodyParam =
              melodyParams[Math.min(melodyParams.length - 1, melodySkillLevel - 1)] || '';

            const hSkill1Lv =
              slotState.harmonySkill1Level !== undefined ? slotState.harmonySkill1Level : 1;
            const hSkill2Lv =
              slotState.harmonySkill2Level !== undefined ? slotState.harmonySkill2Level : 1;

            const tier = Math.min(8, Math.max(0, Math.floor((slotState.level - 1) / 10)));
            const providedHere = selectedDisc?.supportNote?.[tier];

            const levelIdx = Math.max(
              0,
              Math.min((slotState.level || 1) - 1, (selectedDisc?.stat?.length || 1) - 1)
            );
            const dStat = selectedDisc?.stat?.[levelIdx];
            const dupeAtk =
              currentCrescendo >= 2 && selectedDisc?.dupe?.length
                ? selectedDisc.dupe[Math.min(currentCrescendo - 2, selectedDisc.dupe.length - 1)]?.ATK || 0
                : 0;

            const isHighlighted = highlightedDiscSlot === slot.key;

            return (
              <div
                key={slot.key}
                id={`disc-slot-${slot.key}`}
                className={`p-3.5 rounded-xl relative space-y-3 transition-all ${
                  isHighlighted
                    ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 bg-amber-950/40 scale-[1.015]'
                    : 'bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                {/* Slot Header Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      {slot.label}
                    </span>
                    {!isMain && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-mono">
                        +Stats & Notes
                      </span>
                    )}
                    {selectedDisc && charSignatureDisc && selectedDisc.id === charSignatureDisc.id && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-500/60 bg-amber-950/60 text-amber-300 font-mono">
                        ✦ Signature
                      </span>
                    )}
                  </div>

                  {selectedDisc && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${elem.border} ${elem.bg} ${elem.text}`}
                      >
                        {selectedDisc.element}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDiscSlot(slot.key, { discId: null })}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Lepas Disc"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Disc Selection Button */}
                <button
                  type="button"
                  onClick={() => setSelectingSlot(isPickingThis ? null : slot.key)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    selectedDisc
                      ? 'bg-zinc-900/80 hover:bg-zinc-900'
                      : 'bg-zinc-950/80 border border-dashed border-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  {selectedDisc ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-750 overflow-hidden shrink-0 relative flex items-center justify-center shadow-md">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={selectedDisc.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <DiscIcon className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-100 truncate flex items-center gap-1.5">
                          <span>{selectedDisc.name}</span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {'★'.repeat(selectedDisc.star)}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {!isMain && providedHere && Object.keys(providedHere).length > 0 ? (
                            <span className="text-amber-400 font-mono text-[10px] flex items-center gap-1 font-semibold">
                              <Music className="w-3 h-3 text-amber-400" />
                              <span>Notes: {Object.entries(providedHere).map(([n, q]) => `${n} +${q}`).join(', ')}</span>
                            </span>
                          ) : (
                            <span>{selectedDisc.mainSkill?.name || 'Standard Disc'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 flex items-center gap-2 py-1.5">
                      <Plus className="w-4 h-4 text-zinc-500" /> Pilih Disc untuk Slot Ini...
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                      isPickingThis ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Disc Picker Modal */}
                {isPickingThis && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-80 flex flex-col">
                    <div className="mb-2.5 space-y-2">
                      <input
                        type="text"
                        placeholder="Cari nama disc, elemen, atau skill..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                        autoFocus
                      />

                      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                        {elementsList.map((elemName) => (
                          <button
                            key={elemName}
                            type="button"
                            onClick={() => setElementFilter(elemName)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer ${
                              elementFilter === elemName
                                ? 'bg-cyan-500 text-black font-bold'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {elemName}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateDiscSlot(slot.key, { discId: null });
                          setSelectingSlot(null);
                        }}
                        className="w-full text-xs text-left p-2 rounded-lg bg-zinc-900/50 hover:bg-rose-950/30 text-rose-400 border border-transparent hover:border-rose-800/40 transition-all font-semibold cursor-pointer"
                      >
                        [Lepas Disc]
                      </button>

                      {filteredDiscs.map((d) => {
                        const dCover = getDiscCoverUrl(d.icon);
                        const dElem = getElementColor(d.element);
                        const isEquippedHere = slotState.discId === d.id;

                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              updateDiscSlot(slot.key, { discId: d.id });
                              setSelectingSlot(null);
                              setSearch('');
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                              isEquippedHere
                                ? 'bg-zinc-800/90 border border-cyan-500/60 shadow-md'
                                : 'bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-750 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                                {dCover ? (
                                  <img
                                    src={dCover}
                                    alt={d.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <DiscIcon className="w-5 h-5 text-zinc-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-zinc-100 truncate flex items-center gap-1.5">
                                  <span>{d.name}</span>
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    {'★'.repeat(d.star)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {d.mainSkill?.name || 'Standard'}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${dElem.border} ${dElem.bg} ${dElem.text}`}
                            >
                              {d.element}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Config Controls (Level & Crescendo) if Equipped */}
                {selectedDisc && (
                  <div className="space-y-3 pt-1">
                    {/* Level & Crescendo in a Clean 2-Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Level Box */}
                      <div className="bg-zinc-900/70 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-300">
                            Level <span className={`font-mono font-bold ${isMain ? 'text-cyan-400' : 'text-emerald-400'}`}>Lv.{slotState.level}</span>
                          </span>
                          <div className="flex gap-1">
                            {quickDiscLevels.map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => updateDiscSlot(slot.key, { level: lvl })}
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  slotState.level === lvl
                                    ? isMain ? 'bg-cyan-500 text-black' : 'bg-emerald-500 text-black'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
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
                          value={slotState.level}
                          onChange={(e) =>
                            updateDiscSlot(slot.key, { level: parseInt(e.target.value, 10) })
                          }
                          className={`w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer ${
                            isMain ? 'accent-cyan-500' : 'accent-emerald-500'
                          }`}
                        />
                      </div>

                      {/* Crescendo Box */}
                      <div className="bg-zinc-900/70 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-zinc-300">
                          <span>Crescendo</span>
                          <span className="font-mono font-bold text-amber-400">
                            C{currentCrescendo}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {[1, 2, 3, 4, 5, 6].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() =>
                                updateDiscSlot(slot.key, { dupe: c, harmonySkillLevel: c })
                              }
                              className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                currentCrescendo === c
                                  ? 'bg-amber-500 text-black shadow-sm'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                              }`}
                            >
                              C{c}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Compact Stat Summary Row */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400 pt-0.5">
                      <span className="text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                        Bonus Stats:
                      </span>
                      <span className="font-mono text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        HP +{dStat?.HP ? Number(dStat.HP).toLocaleString() : 0}
                      </span>
                      <span className="font-mono text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        ATK +{((dStat?.ATK || 0) + dupeAtk).toLocaleString()}
                      </span>
                      {selectedDisc.element && dStat?.[`${selectedDisc.element} DMG`] && (
                        <span className={`font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 ${
                          isMain ? 'text-cyan-400' : 'text-emerald-400'
                        }`}>
                          {selectedDisc.element} DMG +{dStat[`${selectedDisc.element} DMG`]}
                        </span>
                      )}
                      {providedHere && Object.keys(providedHere).length > 0 && (
                        <span className="font-mono text-amber-300 px-2 py-0.5 rounded-lg bg-amber-950/40 border border-amber-800/40 ml-auto flex items-center gap-2 font-semibold">
                          <span className="text-zinc-500 text-[10px] uppercase font-bold">Notes:</span>
                          {Object.entries(providedHere).map(([n, q]) => {
                            const nid = noteNameToId[n];
                            return (
                              <span key={n} title={n} className="flex items-center gap-1 cursor-help">
                                {nid ? (
                                  <img
                                    src={getHarmonyNoteIconUrl(nid, 'small')}
                                    alt={n}
                                    className="w-3.5 h-3.5 object-contain shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = getHarmonyNoteCdnUrl(nid, 'small');
                                    }}
                                  />
                                ) : (
                                  <Music className="w-3 h-3 text-amber-400" />
                                )}
                                <span>+{String(q)}</span>
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </div>

                    {/* Collapsible Toggle for Skill Descriptions (Melody & Harmony) */}
                    {isMain && (
                      <div className="pt-1 border-t border-zinc-800/60">
                        <button
                          type="button"
                          onClick={() => toggleSlotExpand(slot.key)}
                          className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-zinc-800/60"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-semibold text-zinc-300">
                              Detail Deskripsi Skill:
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                              Melody Lv.{melodySkillLevel}
                            </span>
                            {selectedDisc.secondarySkill1 && (
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                hSkill1Lv > 0
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-zinc-850 text-zinc-500 border-zinc-700'
                              }`}>
                                H1: {hSkill1Lv > 0 ? `T${hSkill1Lv}` : 'Off'}
                              </span>
                            )}
                            {selectedDisc.secondarySkill2 && (
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                hSkill2Lv > 0
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-zinc-850 text-zinc-500 border-zinc-700'
                              }`}>
                                H2: {hSkill2Lv > 0 ? `T${hSkill2Lv}` : 'Off'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 shrink-0 ml-2">
                            <span>{isExpanded ? 'Sembunyikan' : 'Lihat'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </button>

                        {/* Collapsed downward details */}
                        {isExpanded && (
                          <div className="mt-2.5 space-y-2.5 animate-in fade-in duration-150">
                            {/* 1. Melody Skill */}
                            {selectedDisc.mainSkill && (
                              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                                    <span className="text-cyan-300 font-bold">Melody Skill:</span>
                                    <span>{selectedDisc.mainSkill.name}</span>
                                  </div>
                                  <div
                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono font-bold text-[10px]"
                                    title={`Melody Skill level terkunci ke Crescendo C${currentCrescendo}`}
                                  >
                                    <Lock className="w-2.5 h-2.5 text-cyan-400" />
                                    <span>Lv.{melodySkillLevel} [{ROMAN_NUMERALS[melodySkillLevel - 1]}]</span>
                                  </div>
                                </div>
                                <div className="pt-1.5 border-t border-zinc-800/60">
                                  {renderSkillDesc(selectedDisc.mainSkill.desc, currentMelodyParam)}
                                </div>
                              </div>
                            )}

                            {/* 2. Harmony Skill 1 Description */}
                            {selectedDisc.secondarySkill1 && (
                              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                                <div className="flex items-center justify-between mb-1.5 text-xs flex-wrap gap-2">
                                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                                    <span className="text-zinc-400 font-mono text-[11px]">H1:</span>
                                    <span>{selectedDisc.secondarySkill1.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                    hSkill1Lv > 0
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-zinc-850 text-zinc-500 border-zinc-700'
                                  }`}>
                                    {hSkill1Lv > 0 ? `Tier ${hSkill1Lv}` : 'Off (Preview Tier 1)'}
                                  </span>
                                </div>
                                <div className="pt-1.5 border-t border-zinc-800/60">
                                  {(() => {
                                    const s1Tiers = selectedDisc.secondarySkill1.params?.split('/') || [];
                                    const activeLv = hSkill1Lv > 0 ? hSkill1Lv : 1;
                                    const s1Param = s1Tiers[Math.max(0, Math.min(s1Tiers.length - 1, activeLv - 1))] || '';
                                    return renderSkillDesc(selectedDisc.secondarySkill1.desc, s1Param);
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* 3. Harmony Skill 2 Description */}
                            {selectedDisc.secondarySkill2 && (
                              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                                <div className="flex items-center justify-between mb-1.5 text-xs flex-wrap gap-2">
                                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                                    <span className="text-zinc-400 font-mono text-[11px]">H2:</span>
                                    <span>{selectedDisc.secondarySkill2.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                    hSkill2Lv > 0
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-zinc-850 text-zinc-500 border-zinc-700'
                                  }`}>
                                    {hSkill2Lv > 0 ? `Tier ${hSkill2Lv}` : 'Off (Preview Tier 1)'}
                                  </span>
                                </div>
                                <div className="pt-1.5 border-t border-zinc-800/60">
                                  {(() => {
                                    const s2Tiers = selectedDisc.secondarySkill2.params?.split('/') || [];
                                    const activeLv = hSkill2Lv > 0 ? hSkill2Lv : 1;
                                    const s2Param = s2Tiers[Math.max(0, Math.min(s2Tiers.length - 1, activeLv - 1))] || '';
                                    return renderSkillDesc(selectedDisc.secondarySkill2.desc, s2Param);
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HARMONY NOTES (LEVEL 1-99) TAB */}
      {activeTab === 'notes' && (
        <div className="space-y-3.5">
          {/* Top Quick Actions Bar */}
          <div className="flex items-center justify-between gap-2.5 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
            <div>
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-amber-400" />
                Harmony Notes (Support Notes)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSetAllNotes(0)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 transition-all cursor-pointer"
                title="Reset semua ke Lv 0"
                aria-label="Clear all notes"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* In-Game Style Musical Note Skills Overview Strip */}
          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300 px-1">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Musical Note Skills (Overview)</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                13 Melodi
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {Object.entries(harmonyNotesData).map(([noteId, nDef]) => {
                const currentLv = build.harmonyNoteLevels?.[noteId] ?? 0;
                return (
                  <div
                    key={noteId}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border min-w-[54px] shrink-0 transition-all ${
                      currentLv > 0
                        ? 'bg-amber-950/25 border-amber-500/40 shadow-xs'
                        : 'bg-zinc-900/40 border-zinc-800/80 opacity-55'
                    }`}
                    title={`${nDef.name}: Lv.${currentLv} (${nDef.briefDesc})`}
                  >
                    <img
                      src={getHarmonyNoteIconUrl(noteId, 'small')}
                      alt={nDef.name}
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getHarmonyNoteCdnUrl(noteId, 'small');
                      }}
                    />
                    <span className={`text-[11px] font-mono font-bold ${
                      currentLv > 0 ? 'text-amber-400' : 'text-zinc-500'
                    }`}>
                      {currentLv}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 13 Melody Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {Object.entries(harmonyNotesData).map(([noteId, nDef]) => {
              const currentLv = build.harmonyNoteLevels?.[noteId] ?? 0;
              const bonusVal = Number((currentLv * nDef.perLevelValue).toFixed(2));
              const isHighlighted = highlightedNoteId === noteId;

              return (
                <div
                  key={noteId}
                  id={`harmony-note-${noteId}`}
                  className={`p-2.5 px-3 bg-zinc-950/70 border rounded-xl transition-all flex items-center justify-between gap-3 shadow-sm ${
                    isHighlighted
                      ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] border-amber-400 bg-amber-950/40 scale-[1.015]'
                      : 'border-zinc-800/80 hover:border-zinc-700/80'
                  }`}
                >
                  {/* Left: Icon & Name & Brief Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center shrink-0 relative overflow-hidden shadow-sm">
                      <img
                        src={getHarmonyNoteIconUrl(noteId)}
                        alt={nDef.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getHarmonyNoteCdnUrl(noteId);
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-100 truncate" title={nDef.name}>
                        {nDef.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {nDef.briefDesc}
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Bonus Pill & Direct Numeric Input */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-1 rounded-lg transition-colors ${
                        currentLv > 0
                          ? 'text-amber-400 bg-amber-950/40 border border-amber-800/50'
                          : 'text-zinc-500 bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      {currentLv > 0 ? `+${bonusVal}%` : 'Off (0%)'}
                    </span>

                    {/* Stepper with Direct Input */}
                    <div className="flex items-center gap-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateHarmonyNote(noteId, currentLv - 1)}
                        disabled={currentLv <= 0}
                        className="w-6 h-6 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer transition-colors"
                        title="Kurangi level"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={currentLv}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) updateHarmonyNote(noteId, val);
                        }}
                        className="w-10 text-center font-mono font-bold text-xs bg-transparent py-0.5 text-amber-300 focus:outline-none focus:text-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateHarmonyNote(noteId, currentLv + 1)}
                        disabled={currentLv >= 99}
                        className="w-6 h-6 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer transition-colors"
                        title="Tambah level"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
