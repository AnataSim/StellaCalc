import React, { useState, useMemo } from 'react';
import type { BuildState, Character } from '../types';
import { getCharacterHeadUrl, getElementColor, getElementIconUrl, getRoleIconUrl, getSkillIconUrl } from '../utils/assetUrl';
import { ALL_EMBLEM_STATS } from '../data/emblemPools';
import { Plus, X, Search, Check, RefreshCw } from 'lucide-react';

interface Props {
  characters: { [id: string]: Character };
  build: BuildState;
  activeSlot: 0 | 1 | 2;
  onSelectSlot: (slot: 0 | 1 | 2) => void;
  onChangeSlotCharacter: (slot: 0 | 1 | 2, characterId: number) => void;
  onClearSupportSlot?: (slot: 1 | 2) => void;
}

const ELEMENT_FILTERS = [
  { key: 'all', label: 'Semua Elemen', icon: '/icons/elem_all.webp', color: '#ffb703' },
  { key: 'Ignis', label: 'Ignis (Fire)', icon: '/icons/elem_ignis.webp', color: '#f97316' },
  { key: 'Aqua', label: 'Aqua (Water)', icon: '/icons/elem_aqua.webp', color: '#0ea5e9' },
  { key: 'Lux', label: 'Lux (Light)', icon: '/icons/elem_lux.webp', color: '#eab308' },
  { key: 'Umbra', label: 'Umbra (Dark)', icon: '/icons/elem_umbra.webp', color: '#a855f7' },
  { key: 'Ventus', label: 'Ventus (Wind)', icon: '/icons/elem_ventus.webp', color: '#10b981' },
  { key: 'Terra', label: 'Terra (Earth)', icon: '/icons/elem_terra.webp', color: '#d97706' },
] as const;

const ROLE_FILTERS = [
  { key: 'all', label: 'Semua Role', icon: '/icons/role_all.webp', color: '#ffb703' },
  { key: 'Vanguard', label: 'Vanguard', icon: '/icons/role_vanguard.webp', color: '#ef4444' },
  { key: 'Support', label: 'Support', icon: '/icons/role_support.webp', color: '#10b981' },
  { key: 'Versatile', label: 'Versatile', icon: '/icons/role_versatile.webp', color: '#06b6d4' },
] as const;

export const TeamBar: React.FC<Props> = ({
  characters,
  build,
  activeSlot,
  onSelectSlot,
  onChangeSlotCharacter,
  onClearSupportSlot,
}) => {
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | 2 | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const mainChar = characters[String(build.characterId)] || Object.values(characters)[0];
  const supp1Char = build.support1?.characterId
    ? characters[String(build.support1.characterId)]
    : null;
  const supp2Char = build.support2?.characterId
    ? characters[String(build.support2.characterId)]
    : null;

  // Clean role tag mapping
  const getRoleTag = (char?: Character | null, isMain?: boolean) => {
    if (!char) return { label: 'Empty', color: 'text-zinc-500 bg-zinc-900 border-zinc-800' };
    if (char.class === 'Vanguard' || isMain) return { label: 'Vanguard', color: 'text-orange-300 bg-orange-950/80 border-orange-800/40' };
    if (char.class === 'Support') return { label: 'Support', color: 'text-emerald-300 bg-emerald-950/80 border-emerald-800/40' };
    if (char.class === 'Versatile') return { label: 'Versatile', color: 'text-blue-300 bg-blue-950/80 border-blue-800/40' };
    return { label: char.class || 'Support', color: 'text-zinc-300 bg-zinc-800/80 border-zinc-700/40' };
  };

  // Effective skill levels (including Lv.80 emblem unique bonus)
  const getEffectiveSkillLevels = (slotIdx: 0 | 1 | 2) => {
    const member = slotIdx === 0 ? build : (slotIdx === 1 ? build.support1 : build.support2);
    const baseLvs = member?.skillLevels || { normal: 10, main: 10, support: 10, ult: 10 };
    const bonus = { normal: 0, main: 0, support: 0, ult: 0 };
    (member?.emblems?.lv80?.lines || []).forEach((line) => {
      if (!line || !line.statId || line.statId === 'none') return;
      const statDef = ALL_EMBLEM_STATS[line.statId];
      if (!statDef || !statDef.isUnique) return;
      const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
      if (statDef.uniqueTarget === 'normal') bonus.normal += val;
      if (statDef.uniqueTarget === 'main') bonus.main += val;
      if (statDef.uniqueTarget === 'support') bonus.support += val;
      if (statDef.uniqueTarget === 'ult') bonus.ult += val;
    });
    return {
      normal: (baseLvs.normal ?? 10) + Math.min(3, bonus.normal),
      main: (baseLvs.main ?? 10) + Math.min(3, bonus.main),
      support: (baseLvs.support ?? 10) + Math.min(3, bonus.support),
      ult: (baseLvs.ult ?? 10) + Math.min(3, bonus.ult),
    };
  };

  const slots = [
    {
      slotIdx: 0 as const,
      label: 'Main',
      char: mainChar,
      level: build.level,
      isMain: true,
      canClear: false,
    },
    {
      slotIdx: 1 as const,
      label: 'Support 1',
      char: supp1Char,
      level: build.support1?.level || 90,
      isMain: false,
      canClear: Boolean(supp1Char && onClearSupportSlot),
    },
    {
      slotIdx: 2 as const,
      label: 'Support 2',
      char: supp2Char,
      level: build.support2?.level || 90,
      isMain: false,
      canClear: Boolean(supp2Char && onClearSupportSlot),
    },
  ];



  // Filtered characters for picker modal
  const allCharactersList = useMemo(() => Object.values(characters), [characters]);
  const filteredPickerChars = useMemo(() => {
    return allCharactersList.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.element.toLowerCase().includes(searchQuery.toLowerCase());
      const matchElement =
        elementFilter === 'all' || c.element.toLowerCase() === elementFilter.toLowerCase();
      const matchClass = classFilter === 'all' || c.class === classFilter;
      return matchSearch && matchElement && matchClass;
    });
  }, [allCharactersList, searchQuery, elementFilter, classFilter]);

  const handleOpenPicker = (slotIdx: 0 | 1 | 2) => {
    onSelectSlot(slotIdx);
    setPickerSlot(slotIdx);
    setSearchQuery('');
    setElementFilter('all');
    setClassFilter('all');
  };

  const handleSelectCharacterFromPicker = (charId: number) => {
    if (pickerSlot !== null) {
      onChangeSlotCharacter(pickerSlot, charId);
      setPickerSlot(null);
    }
  };

  // Currently equipped IDs across team
  const equippedIds = new Set<number>();
  if (build.characterId) equippedIds.add(build.characterId);
  if (build.support1?.characterId) equippedIds.add(build.support1.characterId);
  if (build.support2?.characterId) equippedIds.add(build.support2.characterId);

  return (
    <div className="mb-6">
      {/* Top Header Row (Seamless, No Card Background) */}
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Team Squad
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {[mainChar, supp1Char, supp2Char].map((c, idx) => {
              if (!c?.element) return null;
              const elemColor = getElementColor(c.element);
              return (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-md p-0.5 flex items-center justify-center border shadow-sm backdrop-blur-sm"
                  style={{
                    backgroundColor: `${elemColor.raw}25`,
                    borderColor: `${elemColor.raw}55`,
                  }}
                  title={`${c.name} (${c.element})`}
                >
                  <img
                    src={getElementIconUrl(c.element)}
                    alt={c.element}
                    className="w-full h-full object-contain drop-shadow"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3 Vertical Cards (Aspect ratio ~ 50:100 / 1:1.75, Floating Without Background Box) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5 max-w-xl mx-auto">
        {slots.map((s) => {
          const isSelected = activeSlot === s.slotIdx;
          const hasChar = Boolean(s.char);
          const role = getRoleTag(s.char, s.isMain);
          const elem = s.char ? getElementColor(s.char.element) : null;

          if (!hasChar) {
            // Empty Slot with "+"
            return (
              <button
                key={s.slotIdx}
                onClick={() => handleOpenPicker(s.slotIdx)}
                className={`relative rounded-2xl border-2 border-dashed aspect-[1/1.75] flex flex-col items-center justify-center p-2 sm:p-3 transition-all cursor-pointer group ${
                  isSelected
                    ? 'border-orange-500 bg-orange-950/20 ring-2 ring-orange-500/30'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                {/* Slot Tag on top */}
                <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 text-[9px] sm:text-[10px] font-bold text-zinc-500 font-mono">
                  {s.label}
                </span>

                {/* Big Plus Icon */}
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-orange-500/60 group-hover:text-orange-400 transition-all text-zinc-500 mb-1.5 sm:mb-2 shadow-md">
                  <Plus className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                  Pilih Trekker
                </span>
                <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5">Klik untuk isi</span>
              </button>
            );
          }

          // Filled Slot with Trekker Image
          const skillLvs = getEffectiveSkillLevels(s.slotIdx);
          const memberSkills = [
            { key: 'normal', name: s.char!.normalAtk?.name || 'Auto Attack', icon: s.char!.normalAtk?.icon, level: skillLvs.normal },
            { key: 'main', name: s.char!.skill?.name || 'Main Skill', icon: s.char!.skill?.icon, level: skillLvs.main },
            { key: 'support', name: s.char!.supportSkill?.name || 'Support Skill', icon: s.char!.supportSkill?.icon, level: skillLvs.support },
            { key: 'ult', name: s.char!.ultimate?.name || 'Ultimate', icon: s.char!.ultimate?.icon, level: skillLvs.ult },
          ];

          return (
            <div
              key={s.slotIdx}
              onClick={() => onSelectSlot(s.slotIdx)}
              className={`relative rounded-2xl overflow-hidden aspect-[1/1.75] border transition-all duration-200 cursor-pointer text-left group shadow-xl ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-500/50 shadow-orange-500/20'
                  : 'border-zinc-800/90 hover:border-zinc-600 bg-zinc-950'
              }`}
            >
              {/* Background Trekker Artwork */}
              <div className="absolute inset-0 bg-zinc-950">
                <img
                  src={getCharacterHeadUrl(s.char!.id)}
                  alt={s.char!.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 filter brightness-95 contrast-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Center Reroll Button (Click inside = change character modal, Click outside = select card & switch Trekker Profile) */}
              <div className="absolute inset-0 bg-black/35 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPicker(s.slotIdx);
                  }}
                  title="Ganti / Reroll Trekker"
                  className="pointer-events-auto w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-zinc-950/85 hover:bg-orange-500 border border-white/25 hover:border-orange-400 text-orange-400 hover:text-black flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group/reroll"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-500 group-hover/reroll:rotate-180" />
                </button>
              </div>

              {/* Top Gradient Header Overlay */}
              <div className="absolute top-0 left-0 right-0 p-2 sm:p-2.5 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-end z-20 pointer-events-none">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md p-0.5 flex items-center justify-center shadow backdrop-blur-sm border"
                  style={{
                    backgroundColor: `${elem?.raw}33`,
                    borderColor: `${elem?.raw}66`,
                  }}
                  title={s.char?.element}
                >
                  <img
                    src={getElementIconUrl(s.char?.element)}
                    alt={s.char?.element}
                    className="w-full h-full object-contain drop-shadow"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              </div>

              {/* Bottom Gradient Details Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2.5 md:p-3 pt-12 sm:pt-16 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-20 flex items-end justify-between gap-1 sm:gap-1.5 pointer-events-none">
                {/* Left Column: Role & Character Name */}
                <div className="flex flex-col min-w-0 pointer-events-auto pb-0.5 flex-1 mr-1">
                  {/* Role */}
                  <div className="flex items-center mb-0.5 sm:mb-1">
                    <span className={`text-[8px] sm:text-[9px] font-semibold px-1 sm:px-1.5 py-0.5 rounded border shadow-sm flex items-center gap-1 shrink-0 ${role.color}`}>
                      <img
                        src={getRoleIconUrl(s.char?.class)}
                        alt={role.label}
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain shrink-0"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                      <span className="hidden sm:inline">{role.label}</span>
                    </span>
                  </div>

                  {/* Name */}
                  <span className="text-[11px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-md block">
                    {s.char!.name}
                  </span>
                </div>

                {/* Right Column: 4 Skills (Top to Bottom) + Level in pojok kanan bawah */}
                <div className="flex flex-col items-end shrink-0 pointer-events-auto">
                  {/* 4 Skills Vertical Stack (Top to Bottom: Normal -> Main -> Support -> Ult) */}
                  <div className="flex flex-col gap-0.5 sm:gap-1 items-end mb-0.5 sm:mb-1">
                    {memberSkills.map((sk) => (
                      <div
                        key={sk.key}
                        className="flex items-center gap-0.5 sm:gap-1"
                        title={`${sk.name}: Lv.${sk.level}`}
                      >
                        <span className="text-[8.5px] sm:text-[10px] md:text-xs font-mono font-bold text-zinc-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] text-right min-w-[10px] sm:min-w-[14px]">
                          {sk.level}
                        </span>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 rounded bg-zinc-950/90 border border-zinc-700/80 flex items-center justify-center overflow-hidden shrink-0 shadow-md p-0.5 backdrop-blur-sm">
                          {sk.icon ? (
                            <img
                              src={getSkillIconUrl(sk.icon) || ''}
                              alt={sk.name}
                              className="w-full h-full object-contain filter brightness-110 drop-shadow"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[7px] text-zinc-500 font-bold">•</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Level in digits only (Pojok kanan bawah, aligned horizontally with skill icons) */}
                  <div className="w-4 sm:w-5 md:w-5.5 flex items-center justify-center">
                    <span className="text-[10px] sm:text-xs md:text-sm font-mono font-bold text-zinc-200 drop-shadow-md text-center leading-none">
                      {s.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Highlight Line on Top */}
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 z-30" />
              )}
            </div>
          );
        })}
      </div>

      {/* CHARACTER CARD PICKER MODAL (Dropout List dalam Bentuk Kartu) */}
      {pickerSlot !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-750 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <span>Pilih Trekker</span>
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                    {pickerSlot === 0 ? '👑 Main Trekker' : pickerSlot === 1 ? '🛡️ Support 1' : '⚔️ Support 2'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pilih karakter untuk ditempatkan pada slot tim.
                </p>
              </div>

              <button
                onClick={() => setPickerSlot(null)}
                className="w-8 h-8 rounded-lg bg-zinc-850 hover:bg-zinc-750 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filters Bar */}
            <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/60 space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama Trekker..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Elements & Roles Icon Filter Bar (Pure Logos, No Text Clutter) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-zinc-950/80 p-2 sm:p-2.5 rounded-xl border border-zinc-800">
                {/* Element Filters (Pure Logo Icons, No Text) */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {ELEMENT_FILTERS.map((elem) => {
                    const isElemActive = elementFilter.toLowerCase() === elem.key.toLowerCase();
                    return (
                      <button
                        key={elem.key}
                        onClick={() => setElementFilter(elem.key)}
                        title={elem.label}
                        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl p-1 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isElemActive
                            ? 'scale-110 shadow-lg'
                            : 'bg-zinc-900/80 border border-zinc-800/90 hover:border-zinc-700 opacity-60 hover:opacity-100 hover:scale-105 hover:bg-zinc-850'
                        }`}
                        style={
                          isElemActive
                            ? {
                                backgroundColor: `${elem.color}25`,
                                borderColor: elem.color,
                                borderWidth: '2px',
                                boxShadow: `0 0 16px ${elem.color}55`,
                              }
                            : undefined
                        }
                      >
                        <img
                          src={elem.icon}
                          alt={elem.label}
                          className="w-full h-full object-contain filter drop-shadow"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block h-6 w-px bg-zinc-800" />

                {/* Role/Class Filters (Pure Logo Icons, No Text) */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {ROLE_FILTERS.map((role) => {
                    const isRoleActive = classFilter === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => setClassFilter(role.key)}
                        title={role.label}
                        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl p-1 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isRoleActive
                            ? 'scale-110 shadow-lg'
                            : 'bg-zinc-900/80 border border-zinc-800/90 hover:border-zinc-700 opacity-60 hover:opacity-100 hover:scale-105 hover:bg-zinc-850'
                        }`}
                        style={
                          isRoleActive
                            ? {
                                backgroundColor: `${role.color}25`,
                                borderColor: role.color,
                                borderWidth: '2px',
                                boxShadow: `0 0 16px ${role.color}55`,
                              }
                            : undefined
                        }
                      >
                        <img
                          src={role.icon}
                          alt={role.label}
                          className="w-full h-full object-contain filter drop-shadow"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Character Cards Grid (Dropout List dalam Bentuk Kartu) */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {filteredPickerChars.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Tidak ada Trekker yang cocok dengan pencarian / filter.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredPickerChars.map((c) => {
                    const currentSlotCharId =
                      pickerSlot === 0
                        ? build.characterId
                        : pickerSlot === 1
                        ? build.support1?.characterId
                        : build.support2?.characterId;

                    const isCurrentSlot = currentSlotCharId === c.id;
                    const isUsedInOtherSlot = equippedIds.has(c.id) && !isCurrentSlot;
                    const elem = getElementColor(c.element);
                    const role = getRoleTag(c, pickerSlot === 0);

                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCharacterFromPicker(c.id)}
                        className={`relative rounded-xl overflow-hidden aspect-[1/1.6] border text-left transition-all duration-200 group flex flex-col justify-between shadow-md ${
                          isCurrentSlot
                            ? 'border-orange-500 ring-2 ring-orange-500/50 bg-zinc-950 shadow-orange-500/20'
                            : 'border-zinc-800/90 hover:border-orange-500/60 bg-zinc-950 hover:scale-[1.02]'
                        }`}
                      >
                        {/* Artwork */}
                        <div className="absolute inset-0 bg-zinc-950">
                          <img
                            src={getCharacterHeadUrl(c.id)}
                            alt={c.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Top Overlay */}
                        <div className="relative z-10 p-2 bg-gradient-to-b from-black/85 via-black/30 to-transparent flex items-center justify-between">
                          <div
                            className="w-6 h-6 rounded-lg p-0.5 flex items-center justify-center shadow-md backdrop-blur-sm border"
                            style={{
                              backgroundColor: `${elem.raw}30`,
                              borderColor: `${elem.raw}60`,
                            }}
                            title={c.element}
                          >
                            <img
                              src={getElementIconUrl(c.element)}
                              alt={c.element}
                              className="w-full h-full object-contain drop-shadow"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>

                          <span className="text-[10px] text-amber-400 font-mono font-bold tracking-tighter">
                            {'★'.repeat(c.star || 4)}
                          </span>
                        </div>

                        {/* Center Current / Used Badge */}
                        {isCurrentSlot && (
                          <div className="relative z-10 self-center px-2 py-1 rounded-full bg-orange-500 text-black text-[10px] font-bold shadow-lg flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Terpasang</span>
                          </div>
                        )}
                        {isUsedInOtherSlot && (
                          <div className="relative z-10 self-center px-2 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-400 text-[9px] font-medium shadow-md">
                            Di Slot Lain
                          </div>
                        )}

                        {/* Bottom Details Overlay */}
                        <div className="relative z-10 p-2.5 pt-6 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
                          <div className="font-bold text-xs text-white truncate drop-shadow-sm">
                            {c.name}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <div className="flex items-center gap-1">
                              <img
                                src={getRoleIconUrl(c.class)}
                                alt={c.class}
                                className="w-3.5 h-3.5 object-contain"
                                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                              />
                              <span className={`text-[9px] font-semibold px-1 py-0.2 rounded border ${role.color}`}>
                                {role.label}
                              </span>
                            </div>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              #{c.id}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-500">
              <span>Menampilkan {filteredPickerChars.length} Trekker</span>
              <button
                onClick={() => setPickerSlot(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
