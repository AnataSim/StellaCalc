import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { BuildState, Character, DiscItem, CalculatedStats } from '../types';
import { getCharacterHeadUrl, getSkillIconUrl, getDiscCoverUrl, getElementColor, getRoleIconUrl } from '../utils/assetUrl';
import { ALL_EMBLEM_STATS } from '../data/emblemPools';
import { getActiveSignatureCrescendo } from '../utils/signature';
import { calculateCharacterDamageReport } from '../utils/damageCalculator';
import * as htmlToImage from 'html-to-image';
import {
  Download,
  Zap,
  Shield,
  Heart,
  Swords,
  Sparkles,
  Layers,
  Disc as DiscIcon,
  BarChart2,
  ChevronDown,
} from 'lucide-react';

interface Props {
  character: Character;
  build: BuildState;
  discs: { [id: string]: DiscItem };
  stats: CalculatedStats;
  characters?: { [id: string]: Character };
}

export const HorizontalBuildCard: React.FC<Props> = ({
  character,
  build,
  discs,
  stats,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [ceMode, setCeMode] = useState<'main' | 'support'>('main');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCe = () => {
    setCeMode((prev) => (prev === 'main' ? 'support' : 'main'));
    setRotationDeg((prev) => prev + 180);
  };

  // 2 Slides Carousel: 100% total progress cycle covers both bars (50% per bar)
  // 0% - 50% => Slide 0 (Combat Stats, Bar 1 fills 0 -> 100%)
  // 50% - 100% => Slide 1 (Combat DPS, Bar 1 stays 100%, Bar 2 fills 0 -> 100%)
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const TOTAL_CYCLE_MS = 10000; // 5s for Bar 1 (Slide 1), 5s for Bar 2 (Slide 2)
  const TICK_MS = 50;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_MS / TOTAL_CYCLE_MS) * 100;
        return next >= 100 ? 0 : next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Derived state: zero risk of state desync or repeat loops
  const activeSlide: 0 | 1 = progress < 50 ? 0 : 1;
  const bar1Width = Math.min(100, Math.max(0, (progress / 50) * 100));
  const bar2Width = progress < 50 ? 0 : Math.min(100, Math.max(0, ((progress - 50) / 50) * 100));

  const handleSelectSlide = (slide: 0 | 1) => {
    setProgress(slide === 0 ? 0 : 50);
  };

  // Real-time DPS calculation for the main character
  const dpsReport = useMemo(() => {
    return calculateCharacterDamageReport(character, build, stats, 0, discs);
  }, [character, build, stats, discs]);

  const formatDot = (val: number) => Math.round(val).toLocaleString('id-ID');

  const skillsList = dpsReport
    ? [
        {
          key: 'normalAtk',
          label: 'Auto Attack',
          tag: 'Combo String (~2.2s)',
          hoverTitle: 'Full Normal Attack Combo String (~2.2s)',
          icon: Swords,
          iconUrl: getSkillIconUrl(character.normalAtk?.icon),
          multiplier: dpsReport.normalAtk.multiplier,
          dps: dpsReport.normalAtk.dps,
          expectedDamage: dpsReport.normalAtk.expectedDamage,
        },
        {
          key: 'mainSkill',
          label: 'Main Skill',
          tag: `${dpsReport.mainSkill.cooldownSec}s CD`,
          hoverTitle: `Cooldown ${dpsReport.mainSkill.cooldownSec}s`,
          icon: Zap,
          iconUrl: getSkillIconUrl(character.skill?.icon),
          multiplier: dpsReport.mainSkill.multiplier,
          dps: dpsReport.mainSkill.dps,
          expectedDamage: dpsReport.mainSkill.expectedDamage,
        },
        {
          key: 'supportSkill',
          label: 'Support Skill',
          tag: `${dpsReport.supportSkill.cooldownSec}s CD`,
          hoverTitle: `Cooldown ${dpsReport.supportSkill.cooldownSec}s`,
          icon: Shield,
          iconUrl: getSkillIconUrl(character.supportSkill?.icon),
          multiplier: dpsReport.supportSkill.multiplier,
          dps: dpsReport.supportSkill.dps,
          expectedDamage: dpsReport.supportSkill.expectedDamage,
        },
        {
          key: 'ultimate',
          label: 'Ultimate Burst',
          tag: `${dpsReport.ultimate.cooldownSec}s CD`,
          hoverTitle: `Cooldown ${dpsReport.ultimate.cooldownSec}s`,
          icon: Sparkles,
          iconUrl: getSkillIconUrl(character.ultimate?.icon),
          multiplier: dpsReport.ultimate.multiplier,
          dps: dpsReport.ultimate.dps,
          expectedDamage: dpsReport.ultimate.expectedDamage,
        },
      ]
    : [];

  const elem = getElementColor(character.element);
  const avatarUrl = getCharacterHeadUrl(character.id);

  // Talent dupe (T0-T5)
  const talentRank = build.potentials ? build.potentials.length : 0;
  // Signature Disc Crescendo: C0 if signature disc is not equipped in any of the 6 slots, C1-C6 if equipped
  const signatureInfo = getActiveSignatureCrescendo(character.name, build.discs, discs);
  const crescendoRank = signatureInfo.crescendo;
  const talentCrescendoLabel = `T${talentRank}C${crescendoRank}`;

  // Check Lv.90 Emblem unique talent bonuses (+1 to +3 per potential)
  const emblemTalentBonuses: { [potId: number]: number } = {};
  for (const line of build.emblems?.lv90?.lines || []) {
    if (line && line.statId === 'unique_talent') {
      const statDef = ALL_EMBLEM_STATS['unique_talent'];
      if (statDef) {
        const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
        const potId = line.targetPotentialId || character.potential?.mainNormal?.[0]?.id;
        if (potId) {
          emblemTalentBonuses[potId] = Math.min(3, (emblemTalentBonuses[potId] || 0) + val);
        }
      }
    }
  }

  // Total Potentials sum (sum of effective potential levels: base level + emblem bonus)
  let totalPotentialLevelSum = 0;
  let activeNodesCount = 0;
  for (const [potIdStr, baseLv] of Object.entries(build.potentialLevels || {})) {
    if (baseLv <= 0) continue;
    activeNodesCount++;
    const potId = parseInt(potIdStr, 10);
    const bonus = emblemTalentBonuses[potId] || 0;
    totalPotentialLevelSum += Math.min(9, baseLv + bonus);
  }

  // Discs with safe lookup
  const mainDiscSlots = [
    { key: 'main1', state: build.discs.main1, label: 'M1', defaultSkillLv: 4 },
    { key: 'main2', state: build.discs.main2, label: 'M2', defaultSkillLv: 3 },
    { key: 'main3', state: build.discs.main3, label: 'M3', defaultSkillLv: 4 }
  ];

  const suppDiscSlots = [
    { key: 'support1', state: build.discs.support1, label: 'S1', defaultSkillLv: 2 },
    { key: 'support2', state: build.discs.support2, label: 'S2', defaultSkillLv: 3 },
    { key: 'support3', state: build.discs.support3, label: 'S3', defaultSkillLv: 2 }
  ];

  // 4 Skills Data
  const skillsData = [
    {
      key: 'normal',
      name: character.normalAtk?.name || 'Auto Attack',
      icon: character.normalAtk?.icon,
      level: stats.effectiveSkillLevels?.normal || build.skillLevels.normal || 10,
      label: 'Normal'
    },
    {
      key: 'main',
      name: character.skill?.name || 'Main Skill',
      icon: character.skill?.icon,
      level: stats.effectiveSkillLevels?.main || build.skillLevels.main || 10,
      label: 'Skill'
    },
    {
      key: 'support',
      name: character.supportSkill?.name || 'Support Skill',
      icon: character.supportSkill?.icon,
      level: stats.effectiveSkillLevels?.support || build.skillLevels.support || 10,
      label: 'Support'
    },
    {
      key: 'ult',
      name: character.ultimate?.name || 'Ultimate',
      icon: character.ultimate?.icon,
      level: stats.effectiveSkillLevels?.ult || build.skillLevels.ult || 10,
      label: 'Ultimate'
    }
  ];

  // Download Card as PNG Image
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#09090b'
      });
      const link = document.createElement('a');
      link.download = `${character.name.replace(/\\s+/g, '_')}_Build_Card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export build card image:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mb-6">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1 mb-3">
        <div className="flex items-center">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Passionate Trekker Card
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mobile Collapse Toggle (Only on mobile to save screen height) */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="sm:hidden px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title={isCollapsed ? 'Tampilkan Card Lengkap' : 'Sembunyikan Card'}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
            <span>{isCollapsed ? 'Buka Card' : 'Tutup'}</span>
          </button>

          {/* CE Mode Toggle Button (With 2-arrow circular icon, no border, no Switch To) */}
          <button
            onClick={handleToggleCe}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer select-none flex items-center gap-1.5 ${
              ceMode === 'main'
                ? 'bg-zinc-900 hover:bg-zinc-850 text-cyan-400'
                : 'bg-zinc-900 hover:bg-zinc-850 text-purple-400'
            }`}
            title="Click to switch between CE Main and CE Support"
          >
            {/* 2-Arrow Circular Switch Icon with Always Clockwise Animation */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: `rotate(${rotationDeg}deg)` }}
              className="w-3.5 h-3.5 shrink-0 transition-transform duration-500 ease-in-out"
            >
              {/* Panah 1 (Top Arc / Main Arrow): Cyan when Main, Gray when Support */}
              <g className="transition-colors duration-300" stroke={ceMode === 'main' ? '#22d3ee' : '#71717a'}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </g>
              {/* Panah 2 (Bottom Arc / Support Arrow): Purple when Support, Gray when Main */}
              <g className="transition-colors duration-300" stroke={ceMode === 'support' ? '#c084fc' : '#71717a'}>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <polyline points="8 16 3 16 3 21" />
              </g>
            </svg>
            <span>{ceMode === 'main' ? 'CE: Main' : 'CE: Support'}</span>
          </button>

          {/* Download PNG Button (Icon Only) */}
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-md hover:shadow-amber-500/20 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
            title={downloading ? 'Rendering card image...' : 'Download Card (.png)'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* THE HORIZONTAL CARD */}
      {!isCollapsed && (
        <div
          ref={cardRef}
          id="stella-sora-build-card"
          className="w-full bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-zinc-950 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-3 sm:p-5 shadow-2xl transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group select-none"
          style={{
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            backgroundClip: 'padding-box'
          }}
        >
        {/* Subtle Element Glow Ambient Background */}
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 group-hover:opacity-30"
          style={{ backgroundColor: elem.raw }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700 group-hover:opacity-25"
          style={{ backgroundColor: elem.raw }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {/* ============================================================= */}
          {/* LEFT SECTION (Photo, Name, Lv, T0C0, Potentials, 4 Skills, Discs) */}
          {/* ============================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
            {/* Row 1: Trekker Avatar + Name + Level + T0C0 + Total Potentials */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              {/* Trekker Avatar with Element Glow */}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-2xl bg-zinc-900 border-2 overflow-hidden shrink-0 relative flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 ${elem.border}`}
                style={{
                  boxShadow: `0 4px 20px ${elem.raw}33`
                }}
              >
                <img
                  src={avatarUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {/* Element Badge in Corner */}
                <div
                  className="absolute bottom-1 right-1 px-1 sm:px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9px] font-bold font-mono uppercase border shadow"
                  style={{
                    backgroundColor: '#09090b',
                    borderColor: elem.raw,
                    color: elem.raw
                  }}
                >
                  {character.element}
                </div>
              </div>

              {/* Trekker Details */}
              <div className="min-w-0 flex-1 space-y-1">
                {/* Role Icon + Star Rating row ABOVE Trekker Name */}
                <div className="flex items-center gap-1.5">
                  <img
                    src={getRoleIconUrl(character.class)}
                    alt={character.class || 'Role'}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain drop-shadow"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                  <span className="text-[10px] sm:text-[11px] text-amber-400 font-mono tracking-wider drop-shadow-sm">
                    {'★'.repeat(character.star || 5)}
                  </span>
                </div>

                {/* Trekker Name & Level */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate drop-shadow-sm">
                    {character.name}
                  </h2>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 text-cyan-300 font-mono font-bold text-[11px] sm:text-xs shrink-0 shadow-sm">
                    Lv.{build.level}
                  </span>
                </div>

                {/* Talent (T0-T5) + Crescendo (C1-C6) & Total Potentials (Plain Text, No Borders) */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs pt-0.5">
                  {/* Talent + Crescendo Plain Text */}
                  <span
                    className="font-mono font-black text-[11px] sm:text-xs tracking-wider"
                    style={{ color: elem.raw }}
                    title={
                      signatureInfo.isEquipped && signatureInfo.signatureDisc
                        ? `Talent: T${talentRank} (T0-T5) · Signature (${signatureInfo.signatureDisc.name}): C${crescendoRank} (C1-C6)`
                        : `Talent: T${talentRank} (T0-T5) · Signature: C0 (${
                            signatureInfo.signatureDisc
                               ? `Signature "${signatureInfo.signatureDisc.name}" is not equipped`
                              : `No signature disc in game for ${character.name}`
                          })`
                    }
                  >
                    {talentCrescendoLabel}
                  </span>

                  <span className="text-zinc-600 font-bold">&bull;</span>

                  {/* Total Potentials Plain Text */}
                  <span
                    className="text-zinc-300 text-[11px] sm:text-xs font-medium flex items-center gap-1.5"
                    title={`Total Potentials: ${totalPotentialLevelSum} (Sum of all ${activeNodesCount} active potential levels, including Lv.90 Emblem bonuses)`}
                  >
                    <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400" />
                    <span className="text-zinc-400 font-medium">Total Potentials:</span>
                    <span className="text-pink-300 font-bold font-mono">
                      {totalPotentialLevelSum}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: 1 Bar berisikan 4 Logo Skills dengan Level Skills di Pojok Kanan Bawah */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
                <span>Trekker Skills:</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {skillsData.map((sk) => {
                  const iconUrl = getSkillIconUrl(sk.icon);
                  return (
                    <div
                      key={sk.key}
                      className="p-1 sm:p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5 sm:gap-2 relative overflow-hidden group/sk hover:border-zinc-600 transition-all shadow-sm"
                      title={`${sk.label}: ${sk.name} (Lv.${sk.level})`}
                    >
                      {/* Skill Icon Container */}
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-md bg-zinc-900 border border-zinc-750 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={sk.name}
                            className="w-full h-full object-contain filter drop-shadow"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />
                        )}

                        {/* POJOK KANAN BAWAH: Level Skills */}
                        <div className="absolute bottom-0 right-0 px-0.5 sm:px-1 py-0.2 rounded-tl-md bg-black/95 border-t border-l border-cyan-500/70 text-cyan-300 font-mono font-black text-[8.5px] sm:text-[9px] leading-tight shadow-md">
                          {sk.level}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 hidden sm:block">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block truncate">
                          {sk.label}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-200 block truncate leading-tight">
                          {sk.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Gambar Main Disc sama Support Disc Doang (Responsive 3 cols mobile, 6 cols desktop) */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
                <span>Equipped Discs:</span>
              </div>

              {/* 6 Discs Grid (3 cols on mobile, 6 cols on sm/desktop) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
                {/* 3 Main Discs */}
                {mainDiscSlots.map((slot, i) => {
                  const disc = slot.state?.discId ? discs[String(slot.state.discId)] : null;
                  const cover = disc ? getDiscCoverUrl(disc.icon) : null;
                  const dupe = Math.max(1, Math.min(6, slot.state?.dupe || 1));

                  return (
                    <div
                      key={slot.key}
                      className="p-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500/60 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all shadow-sm"
                      title={`Main Disc ${i + 1}: ${disc?.name || 'Empty'} (Crescendo C${dupe} • Melody Skill Lv.${dupe})`}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-zinc-900 border border-zinc-750 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {cover ? (
                          <img
                            src={cover}
                            alt={disc?.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <DiscIcon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700" />
                        )}

                        {/* Bottom-right Crescendo badge */}
                        <div className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl bg-amber-500 text-black font-mono font-bold text-[8px] shadow border-t border-l border-amber-300/60">
                          C{dupe}
                        </div>
                      </div>

                      <span className="text-[9px] font-semibold text-zinc-300 truncate w-full mt-1">
                        {disc?.name || `Main ${i + 1}`}
                      </span>
                    </div>
                  );
                })}

                {/* 3 Support Discs */}
                {suppDiscSlots.map((slot, i) => {
                  const disc = slot.state?.discId ? discs[String(slot.state.discId)] : null;
                  const cover = disc ? getDiscCoverUrl(disc.icon) : null;
                  const dupe = Math.max(1, Math.min(6, slot.state?.dupe || 1));
                  const level = slot.state?.level || 90;

                  return (
                    <div
                      key={slot.key}
                      className="p-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all shadow-sm"
                      title={`Support Disc ${i + 1}: ${disc?.name || 'Empty'} (Lv.${level} • C${dupe})`}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-zinc-900 border border-zinc-750 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {cover ? (
                          <img
                            src={cover}
                            alt={disc?.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <DiscIcon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700" />
                        )}

                        {/* Bottom-right Crescendo badge */}
                        <div className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl bg-emerald-600 text-white font-mono font-bold text-[8px] shadow border-t border-l border-emerald-400/60">
                          C{dupe}
                        </div>
                      </div>

                      <span className="text-[9px] font-semibold text-zinc-300 truncate w-full mt-1">
                        {disc?.name || `Supp ${i + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT SECTION: 2 SLIDES CAROUSEL (Slide 1: Stats, Slide 2: DPS) */}
          {/* ============================================================= */}
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="lg:col-span-5 flex flex-col justify-between p-3 sm:p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 shadow-inner sm:min-h-[355px] space-y-2 sm:space-y-2.5"
          >
            {/* Slide 1: Effective Combat Stats */}
            {activeSlide === 0 ? (
              <div className="flex flex-col flex-1 justify-between space-y-2 sm:min-h-[268px]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                    Combat Stats
                  </span>
                  <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleSelectSlide(0)}
                      title="Combat Stats"
                      aria-label="Combat Stats"
                      className="p-1 rounded-md transition-all bg-zinc-800 text-amber-300 border border-zinc-700 shadow-sm"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSlide(1)}
                      title="Combat DPS"
                      aria-label="Combat DPS"
                      className="p-1 rounded-md transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                    >
                      <Swords className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 8 Stats Grid */}
                <div className="grid grid-cols-2 grid-rows-4 gap-2 text-xs flex-1">
                  {/* 1. HP */}
                  <div className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>HP</span>
                    </div>
                    <span className="font-mono font-black text-zinc-100 text-xs sm:text-sm">
                      {formatDot(stats.total.hp)}
                    </span>
                  </div>

                  {/* 2. ATK */}
                  <div className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ATK</span>
                    </div>
                    <span className="font-mono font-black text-amber-300 text-xs sm:text-sm">
                      {formatDot(stats.total.atk)}
                    </span>
                  </div>

                  {/* 3. DEF */}
                  <div className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>DEF</span>
                    </div>
                    <span className="font-mono font-black text-zinc-300 text-xs sm:text-sm">
                      {formatDot(stats.total.def)}
                    </span>
                  </div>

                  {/* 4. PEN (Elemental PEN - next to DEF) */}
                  <div
                    className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm"
                    title={
                      stats.total.defPen > 0
                        ? `${character.element} PEN: ${Math.round(stats.total.elemPen)} | DEF PEN: ${Math.round(stats.total.defPen)}`
                        : `${character.element} PEN`
                    }
                  >
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium truncate">
                      <Swords className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">PEN</span>
                    </div>
                    <div className="text-right flex items-baseline gap-1">
                      <span className="font-mono font-black text-emerald-300 text-xs sm:text-sm">
                        {formatDot(stats.total.elemPen)}
                      </span>
                      {stats.total.defPen > 0 && (
                        <span
                          className="text-[10px] font-mono text-teal-400 font-semibold"
                          title={`DEF PEN: +${Math.round(stats.total.defPen)}`}
                        >
                          +{Math.round(stats.total.defPen)}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5. CR (Crit Rate) */}
                  <div className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>CR</span>
                    </div>
                    <span className="font-mono font-black text-yellow-300 text-xs sm:text-sm">
                      {stats.total.critRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* 6. CDM (Crit DMG - next to CR) */}
                  <div className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>CDM</span>
                    </div>
                    <span className="font-mono font-black text-orange-300 text-xs sm:text-sm">
                      {stats.total.critDmg.toFixed(1)}%
                    </span>
                  </div>

                  {/* 7. CE (Charge Efficiency - Switchable CE Main / CE Support) */}
                  <div
                    onClick={handleToggleCe}
                    className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 cursor-pointer flex items-center justify-between shadow-sm transition-all group/ce"
                    title="Click to toggle between CE Main and CE Support"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: `rotate(${rotationDeg}deg)` }}
                        className="w-3.5 h-3.5 shrink-0 transition-transform duration-500 ease-in-out"
                      >
                        <g className="transition-colors duration-300" stroke={ceMode === 'main' ? '#22d3ee' : '#71717a'}>
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <polyline points="21 3 21 8 16 8" />
                        </g>
                        <g className="transition-colors duration-300" stroke={ceMode === 'support' ? '#c084fc' : '#71717a'}>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <polyline points="8 16 3 16 3 21" />
                        </g>
                      </svg>
                      <span className={`text-[11px] font-bold ${ceMode === 'main' ? 'text-cyan-300' : 'text-purple-300'}`}>
                        {ceMode === 'main' ? 'CE (Main)' : 'CE (Supp)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono font-black text-xs sm:text-sm ${ceMode === 'main' ? 'text-cyan-300' : 'text-purple-300'}`}>
                        {ceMode === 'main'
                          ? `${Math.round(stats.total.chargeEffMain)}%`
                          : `${Math.round(stats.total.chargeEffSupport)}%`}
                      </span>
                    </div>
                  </div>

                  {/* 8. Elemental DMG (Lux DMG, Ignis DMG, etc.) */}
                  <div className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-medium truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: elem.raw }}
                      />
                      <span className="truncate">{character.element} DMG</span>
                    </div>
                    <span
                      className="font-mono font-black text-xs sm:text-sm"
                      style={{ color: elem.raw }}
                    >
                      {stats.total.elemDmg.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Slide 2: Sustained DPS & Skills Breakdown */
              <div className="flex flex-col flex-1 justify-between space-y-2 sm:min-h-[268px]">
                {/* Header: Exactly matching Slide 1 Combat Stats header, with total DPS and switcher buttons on the right */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                    Combat DPS
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-xs sm:text-sm font-black text-amber-300">
                        {formatDot(dpsReport?.totalRotationDps || 0)}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500">DPS</span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleSelectSlide(0)}
                        title="Combat Stats"
                        aria-label="Combat Stats"
                        className="p-1 rounded-md transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSlide(1)}
                        title="Combat DPS"
                        aria-label="Combat DPS"
                        className="p-1 rounded-md transition-all bg-zinc-800 text-amber-300 border border-zinc-700 shadow-sm"
                      >
                        <Swords className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Skill Rows matching the 4 rows of 8 stats in Slide 1 */}
                <div className="grid grid-cols-1 grid-rows-4 gap-2 text-xs flex-1">
                  {skillsList.map((skill) => {
                    const IconComp = skill.icon;
                    return (
                      <div
                        key={skill.key}
                        className="h-full p-2 sm:p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 flex items-center justify-between gap-2 shadow-sm transition-all"
                      >
                        {/* Left: Icon + Skill Label + Cooldown/Combo String */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                            {skill.iconUrl ? (
                              <img
                                src={skill.iconUrl}
                                alt={skill.label}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <IconComp className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span className="text-xs font-bold text-zinc-200 truncate">
                              {skill.label}
                            </span>
                            <span
                              className="text-[10px] font-mono text-zinc-500 shrink-0"
                              title={skill.hoverTitle}
                            >
                              • {skill.tag}
                            </span>
                          </div>
                        </div>

                        {/* Right: DPS + Expected Hit Damage */}
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="font-mono font-black text-xs sm:text-sm text-zinc-100">
                              {formatDot(skill.dps)}
                            </span>
                            <span className="text-[10px] font-bold text-amber-400 font-mono">DPS</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">
                            Hit ~{formatDot(skill.expectedDamage)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2-Split Animated Loading Progress Bar */}
            <div className="grid grid-cols-2 gap-2.5 pt-1.5">
              {/* Bar 1 (Slide 1: Combat Stats) */}
              <button
                type="button"
                onClick={() => handleSelectSlide(0)}
                className="h-1.5 sm:h-2 w-full bg-zinc-850 hover:bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer transition-colors p-0 border border-zinc-800/80 group"
                title="Slide 1: Combat Stats (Klik untuk buka)"
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-[width] duration-75 ease-linear shadow-sm"
                  style={{
                    width: `${bar1Width}%`,
                  }}
                />
              </button>

              {/* Bar 2 (Slide 2: Combat DPS) */}
              <button
                type="button"
                onClick={() => handleSelectSlide(1)}
                className="h-1.5 sm:h-2 w-full bg-zinc-850 hover:bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer transition-colors p-0 border border-zinc-800/80 group"
                title="Slide 2: Combat DPS (Klik untuk buka)"
              >
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-300 rounded-full transition-[width] duration-75 ease-linear shadow-sm"
                  style={{
                    width: `${bar2Width}%`,
                  }}
                />
              </button>
            </div>

            {/* Bottom Card Footer Branding */}
            <div className="flex items-center justify-between pt-1.5 border-t border-zinc-850 text-[10px] text-zinc-500 font-mono">
              <span>STELLACALC &bull; Stella Sora</span>
              <span>Theorycrafting Build Card</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
