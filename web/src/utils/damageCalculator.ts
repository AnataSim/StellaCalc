import type { BuildState, CalculatedStats, Character, DiscItem, SkillData } from '../types';
import { ALL_EMBLEM_STATS } from '../data/emblemPools';

export interface SkillDamageResult {
  name: string;
  icon?: string;
  cooldownSec: number;
  multiplier: number; // in %
  hits: number;
  typeDmgBonus: number; // e.g. +30% Skill DMG
  effectiveCritRate: number; // e.g. 85%
  effectiveCritDmg: number; // e.g. 210%
  rawDamage: number; // Base non-crit damage
  expectedDamage: number; // Average expected damage including crits
  maxCritDamage: number; // Damage on critical strike
  dps: number; // expectedDamage / cooldownSec
  isAvailable: boolean;
  breakdowns: { label: string; value: string; source: string }[];
}

export interface CharacterDamageReport {
  character: Character;
  isMain: boolean;
  totalAtk: number;
  totalHp: number;
  totalDef: number;
  primaryScalingStat: 'ATK' | 'HP' | 'DEF';
  primaryScalingValue: number;
  elemDmg: number;
  critRate: number;
  critDmg: number;
  elemPen: number;
  defPen: number;
  vulnDmgTaken: number;
  normalAtk: SkillDamageResult;
  mainSkill: SkillDamageResult;
  supportSkill: SkillDamageResult;
  ultimate: SkillDamageResult;
  totalRotationDps: number;
}

export function parseCooldown(cd: string | number | undefined, fallback = 10): number {
  if (!cd) return fallback;
  if (typeof cd === 'number') return Math.max(0.5, cd);
  const match = String(cd).match(/(\d+(?:\.\d+)?)/);
  return match ? Math.max(0.5, parseFloat(match[1])) : fallback;
}

export function parseSkillMultiplier(
  skill: SkillData | null | undefined,
  level = 10,
  char?: Character | null,
  isNormalCombo = false
): { multiplier: number; hits: number } {
  if (!skill || !skill.params || !skill.params.length) return { multiplier: 0, hits: 1 };
  const sParams = skill.params;
  let totalMultiplier = 0;
  let totalHits = 0;
  const rawDesc = skill.desc || '';
  const cleanDesc = rawDesc.replace(/<\/?(?:color|b|i|size|material)[^>]*>/gi, '');

  // Special Handling for Firstlight Noya skills to use true rotation multipliers
  if (skill.name === 'Honed Sword Art') {
    const getVal = (idx: number) => {
      const pStr = String(sParams[idx] || '0');
      const tiers = pStr.split('/');
      return parseFloat(tiers[Math.min(level - 1, tiers.length - 1)]) || 0;
    };
    const s1 = getVal(0) * 2;
    const s2 = getVal(1) * 3;
    const s3 = getVal(2) * 2;
    const s4 = getVal(3) * 2;
    return {
      multiplier: s1 + s2 + s3 + s4,
      hits: 9,
    };
  }

  if (skill.name === 'Storm Flash: Radiance') {
    const getVal = (idx: number) => {
      const pStr = String(sParams[idx] || '0');
      const tiers = pStr.split('/');
      return parseFloat(tiers[Math.min(level - 1, tiers.length - 1)]) || 0;
    };
    const p1 = getVal(0) * 5; // Longsword flurry x5
    const p2 = getVal(1) * 1; // Greatsword slam
    const p3 = getVal(2) * 1; // Starfall
    return {
      multiplier: p1 + p2 + p3,
      hits: 7,
    };
  }

  if (skill.name === 'Thunderstrike: Break') {
    const getVal = (idx: number) => {
      const pStr = String(sParams[idx] || '0');
      const tiers = pStr.split('/');
      return parseFloat(tiers[Math.min(level - 1, tiers.length - 1)]) || 0;
    };
    const p1 = getVal(0) * 8; // Longsword spin x8
    const p2 = getVal(1) * 6; // Greatsword shockwaves x6
    const p3 = getVal(2) * 1; // Greatsword slam
    return {
      multiplier: p1 + p2 + p3,
      hits: 15,
    };
  }

  if (skill.name === 'Empyrean Starender') {
    const getVal = (idx: number) => {
      const pStr = String(sParams[idx] || '0');
      const tiers = pStr.split('/');
      return parseFloat(tiers[Math.min(level - 1, tiers.length - 1)]) || 0;
    };
    // Default Greatsword Form
    const p1 = getVal(0) * 5;
    const p2 = getVal(1) * 1;
    return {
      multiplier: p1 + p2,
      hits: 6,
    };
  }

  // Special Handling: Firstlight Noya's Ultimate has two mutually exclusive forms:
  // "Greatsword Form: ... dealing &Param1& x5 and &Param2& of Max HP as AoE Lux Auto Attack DMG"
  // "Longsword Form: ... dealing &Param3& x7 of Max HP ... then field &Param4& x7 of Max HP"
  // She enters battle with the Greatsword Form by default.
  // We parse the active default form (Greatsword Form) to accurately compute the burst.
  let targetText = cleanDesc;
  if (cleanDesc.includes('Greatsword Form:') && cleanDesc.includes('Longsword Form:')) {
    const gsIndex = cleanDesc.indexOf('Greatsword Form:');
    const lsIndex = cleanDesc.indexOf('Longsword Form:');
    if (gsIndex !== -1 && lsIndex !== -1) {
      targetText = cleanDesc.slice(gsIndex, lsIndex);
    }
  }

  // Captures &Param1& x6 or &Param1& of ATK x2 or &Param1& * 3
  const regex = /&Param(\d+)&(?:[^\n\r&]*?(?:x|\*)\s*(\d+))?/gi;
  let match: RegExpExecArray | null;
  let found = false;

  while ((match = regex.exec(targetText)) !== null) {
    const pIdx = parseInt(match[1], 10) - 1;
    const hitCount = match[2] ? parseInt(match[2], 10) : 1;

    if (skill.params[pIdx]) {
      const pStr = String(skill.params[pIdx]);
      if (pStr.includes('%')) {
        // Context check: Exclude utility buffs, duration, or shield values
        const before = targetText.slice(Math.max(0, match.index - 40), match.index).toLowerCase();
        const after = targetText.slice(match.index, Math.min(targetText.length, match.index + 50)).toLowerCase();

        const isBuff =
          before.includes('increase') ||
          before.includes('boost') ||
          before.includes('shield') ||
          before.includes('restore') ||
          before.includes('reduce') ||
          before.includes('by &param') ||
          after.includes('for &param') ||
          after.includes('for ');

        const isDamage =
          before.includes('deal') ||
          before.includes('strike') ||
          before.includes('shot') ||
          before.includes('fire') ||
          after.includes('of atk') ||
          after.includes('of max hp') ||
          after.includes('of def') ||
          after.includes('dmg') ||
          match[2] !== undefined;

        if (isBuff && !isDamage) {
          continue;
        }

        const tiers = pStr.split('/');
        const valStr = tiers[Math.min(level - 1, tiers.length - 1)] || tiers[tiers.length - 1];
        const val = parseFloat(valStr) || 0;
        totalMultiplier += val * hitCount;
        totalHits += hitCount;
        found = true;
      }
    }
  }

  // Fallback if no param tags found
  if (!found && skill.params[0]) {
    const tiers = String(skill.params[0]).split('/');
    totalMultiplier = parseFloat(tiers[Math.min(level - 1, tiers.length - 1)]) || 0;
    totalHits = 1;
  }

  // Ammo string scaling for Auto Attacks (e.g. pistols firing 12 ammo)
  if (isNormalCombo && char?.fixedStat?.Ammo && totalHits === 1) {
    const ammo = Number(char.fixedStat.Ammo);
    if (ammo > 1) {
      totalHits = ammo;
      totalMultiplier = totalMultiplier * ammo;
    }
  }

  return { multiplier: totalMultiplier, hits: Math.max(1, totalHits) };
}

export function calculateCharacterDamageReport(
  char: Character | null,
  build: BuildState,
  stats: CalculatedStats,
  slotIdx: 0 | 1 | 2 = 0,
  discsMap: { [id: string]: DiscItem } = {}
): CharacterDamageReport | null {
  if (!char) return null;

  const isMain = slotIdx === 0;
  const totalAtk = stats.total.atk || 1;
  const totalHp = stats.total.hp || 1000;
  const totalDef = stats.total.def || 0;
  const elemDmg = stats.total.elemDmg || 0;
  const baseCritRate = stats.total.critRate || 5;
  const baseCritDmg = stats.total.critDmg || 150;
  const defPen = stats.total.defPen || 0;
  const elemPen = stats.total.elemPen || 0;

  // Determine Character Scaling Type (Max HP scaler e.g. Firstlight Noya, DEF scaler, or ATK scaler)
  const charDescAll = [
    char.normalAtk?.desc || '',
    char.skill?.desc || '',
    char.supportSkill?.desc || '',
    char.ultimate?.desc || ''
  ].join(' ').toLowerCase();

  const isCharHpScaler =
    char.name.includes('Firstlight Noya') ||
    /(?:deals?|dealing|strike\s*\d+:)\s*[^.]*?of\s+max\s+hp\s+as/i.test(charDescAll);
  const isCharDefScaler =
    /(?:deals?|dealing|strike\s*\d+:)\s*[^.]*?of\s+def\s+as/i.test(charDescAll);

  const primaryScalingStat: 'ATK' | 'HP' | 'DEF' = isCharHpScaler
    ? 'HP'
    : isCharDefScaler
    ? 'DEF'
    : 'ATK';

  const primaryScalingValue = primaryScalingStat === 'HP'
    ? totalHp
    : primaryScalingStat === 'DEF'
    ? totalDef
    : totalAtk;

  // -------------------------------------------------------------------------
  // 1. EMBLEM BUFFS (Lv.70, Lv.80, Lv.90 4 sub-stat lines per emblem)
  // -------------------------------------------------------------------------
  let emblemAaDmg = 0;
  let emblemSkillDmg = 0;
  let emblemUltDmg = 0;
  let emblemAaCrit = 0;
  let emblemSkillCrit = 0;
  let emblemUltCrit = 0;

  const normalAtkBreakdowns: { label: string; value: string; source: string }[] = [];
  const mainSkillBreakdowns: { label: string; value: string; source: string }[] = [];
  const supportSkillBreakdowns: { label: string; value: string; source: string }[] = [];
  const ultimateBreakdowns: { label: string; value: string; source: string }[] = [];

  const currentEmblems = isMain
    ? build.emblems
    : (slotIdx === 1 ? build.support1?.emblems : build.support2?.emblems) || build.emblems;

  for (const tierKey of ['lv70', 'lv80', 'lv90'] as const) {
    const lines = currentEmblems?.[tierKey]?.lines || [];
    const tierLabel = tierKey === 'lv70' ? 'Emblem Lv.70' : tierKey === 'lv80' ? 'Emblem Lv.80' : 'Emblem Lv.90';

    lines.forEach((line, lineIdx) => {
      if (!line || line.statId === 'none') return;
      const def = ALL_EMBLEM_STATS[line.statId];
      if (!def) return;
      const val = def.values[line.tier - 1] ?? def.values[def.values.length - 1];
      const sourceLabel = `${tierLabel} (L${lineIdx + 1})`;

      if (line.statId === 'aa_dmg') {
        emblemAaDmg += val;
        normalAtkBreakdowns.push({ label: `${sourceLabel}: Auto Attack DMG`, value: `+${val}%`, source: tierLabel });
      }
      if (line.statId === 'skill_dmg') {
        emblemSkillDmg += val;
        mainSkillBreakdowns.push({ label: `${sourceLabel}: Skill DMG`, value: `+${val}%`, source: tierLabel });
        supportSkillBreakdowns.push({ label: `${sourceLabel}: Skill DMG`, value: `+${val}%`, source: tierLabel });
      }
      if (line.statId === 'ult_dmg') {
        emblemUltDmg += val;
        ultimateBreakdowns.push({ label: `${sourceLabel}: Ultimate DMG`, value: `+${val}%`, source: tierLabel });
      }

      if (line.statId === 'aa_crit_rate') {
        emblemAaCrit += val;
        normalAtkBreakdowns.push({ label: `${sourceLabel}: AA Crit Rate`, value: `+${val}%`, source: tierLabel });
      }
      if (line.statId === 'skill_crit_rate') {
        emblemSkillCrit += val;
        mainSkillBreakdowns.push({ label: `${sourceLabel}: Skill Crit Rate`, value: `+${val}%`, source: tierLabel });
        supportSkillBreakdowns.push({ label: `${sourceLabel}: Skill Crit Rate`, value: `+${val}%`, source: tierLabel });
      }
      if (line.statId === 'ult_crit_rate') {
        emblemUltCrit += val;
        ultimateBreakdowns.push({ label: `${sourceLabel}: Ult Crit Rate`, value: `+${val}%`, source: tierLabel });
      }
    });
  }

  // -------------------------------------------------------------------------
  // 2. HARMONY NOTES (Melody of Focus, Melody of Skill, Melody of Ultimate)
  // -------------------------------------------------------------------------
  let noteAaDmg = 0;
  let noteSkillDmg = 0;
  let noteUltDmg = 0;

  const userNotes = build.harmonyNoteLevels || {};
  if (userNotes['90015']) {
    const val = Number((Math.min(99, userNotes['90015']) * 1.2).toFixed(2));
    noteAaDmg += val;
    normalAtkBreakdowns.push({ label: `Melody of Focus (Lv.${userNotes['90015']}): AA DMG`, value: `+${val}%`, source: 'Harmony Note' });
  }
  if (userNotes['90016']) {
    const val = Number((Math.min(99, userNotes['90016']) * 0.46).toFixed(2));
    noteSkillDmg += val;
    mainSkillBreakdowns.push({ label: `Melody of Skill (Lv.${userNotes['90016']}): Skill DMG`, value: `+${val}%`, source: 'Harmony Note' });
    supportSkillBreakdowns.push({ label: `Melody of Skill (Lv.${userNotes['90016']}): Skill DMG`, value: `+${val}%`, source: 'Harmony Note' });
  }
  if (userNotes['90017']) {
    const val = Number((Math.min(99, userNotes['90017']) * 1.0).toFixed(2));
    noteUltDmg += val;
    ultimateBreakdowns.push({ label: `Melody of Ultimate (Lv.${userNotes['90017']}): Ult DMG`, value: `+${val}%`, source: 'Harmony Note' });
  }

  // -------------------------------------------------------------------------
  // 3. POTENTIALS (Core & Normal Potentials with Full Level Scaling 1-9)
  // -------------------------------------------------------------------------
  let potentAaDmg = 0;
  let potentSkillDmg = 0;
  let potentUltDmg = 0;
  let potentAaCrit = 0;
  let potentSkillCrit = 0;
  let potentUltCrit = 0;
  let potentSkillCritDmg = 0;
  let potentUltCritDmg = 0;
  let potentSkillMultBonus = 0;
  let potentAaMultBonus = 0;

  const activeSlotData = isMain
    ? build
    : (slotIdx === 1 ? build.support1 : build.support2);

  const activePotentialsMap = activeSlotData?.potentialLevels || {};

  // Check Lv.90 Emblem Unique Talent Bonus (+1 to +3)
  const emblemTalentBonuses: { [potId: number]: number } = {};
  for (const line of currentEmblems?.lv90?.lines || []) {
    if (line && line.statId === 'unique_talent') {
      const statDef = ALL_EMBLEM_STATS['unique_talent'];
      if (statDef) {
        const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
        const potId = line.targetPotentialId || char.potential?.mainNormal?.[0]?.id;
        if (potId) emblemTalentBonuses[potId] = Math.min(3, (emblemTalentBonuses[potId] || 0) + val);
      }
    }
  }

  if (char.potential) {
    const cats: (keyof typeof char.potential)[] = [
      'mainCore',
      'mainNormal',
      'common',
      'supportCore',
      'supportNormal',
    ];
    for (const cat of cats) {
      for (const p of char.potential[cat] || []) {
        const baseLvl = activePotentialsMap[p.id] || 0;
        if (baseLvl <= 0) continue;
        const eBonus = emblemTalentBonuses[p.id] || 0;
        const effLvl = Math.min(9, baseLvl + eBonus);

        const pParams = p.params || [];
        const effectTypes = [...(p.effectType || []), ...(p.addAttrType || [])];
        const descLower = (p.desc || '').toLowerCase();

        // Helper to extract numeric value from level-scaled parameter
        const getParamAtLevel = (idx: number): number => {
          const raw = pParams[idx];
          if (raw === undefined || raw === null) return 0;
          if (typeof raw === 'number') return raw;
          const str = String(raw);
          if (str.includes('/')) {
            const parts = str.split('/');
            const picked = parts[Math.min(effLvl - 1, parts.length - 1)] || parts[0];
            return parseFloat(picked.replace('%', '')) || 0;
          }
          return parseFloat(str.replace('%', '')) || 0;
        };

        // Scan all parameters
        for (let i = 0; i < pParams.length; i++) {
          const val = getParamAtLevel(i);
          if (val <= 0) continue;

          // Match keywords in effectTypes or desc
          const matchStr = (effectTypes.join(' ') + ' ' + descLower);
          const pLabel = `Potential: ${p.name} (Lv.${effLvl})`;

          if (matchStr.includes('auto attack dmg') || matchStr.includes('auto atk dmg')) {
            potentAaDmg += val;
            normalAtkBreakdowns.push({ label: `${pLabel}: AA DMG`, value: `+${val}%`, source: 'Potential' });
          }
          if (matchStr.includes('skill dmg') && !matchStr.includes('auto attack')) {
            potentSkillDmg += val;
            mainSkillBreakdowns.push({ label: `${pLabel}: Skill DMG`, value: `+${val}%`, source: 'Potential' });
            if (cat === 'supportCore' || cat === 'supportNormal') {
              supportSkillBreakdowns.push({ label: `${pLabel}: Skill DMG`, value: `+${val}%`, source: 'Potential' });
            }
          }
          if (matchStr.includes('ultimate dmg')) {
            potentUltDmg += val;
            ultimateBreakdowns.push({ label: `${pLabel}: Ultimate DMG`, value: `+${val}%`, source: 'Potential' });
          }
          if (matchStr.includes('skill crit rate')) {
            potentSkillCrit += val;
            mainSkillBreakdowns.push({ label: `${pLabel}: Skill Crit Rate`, value: `+${val}%`, source: 'Potential' });
            supportSkillBreakdowns.push({ label: `${pLabel}: Skill Crit Rate`, value: `+${val}%`, source: 'Potential' });
          }
          if (matchStr.includes('skill crit dmg')) {
            potentSkillCritDmg += val;
            mainSkillBreakdowns.push({ label: `${pLabel}: Skill Crit DMG`, value: `+${val}%`, source: 'Potential' });
            supportSkillBreakdowns.push({ label: `${pLabel}: Skill Crit DMG`, value: `+${val}%`, source: 'Potential' });
          }
          if (matchStr.includes('ultimate crit rate') || matchStr.includes('ult crit rate')) {
            potentUltCrit += val;
            ultimateBreakdowns.push({ label: `${pLabel}: Ult Crit Rate`, value: `+${val}%`, source: 'Potential' });
          }
          if (matchStr.includes('ultimate crit dmg') || matchStr.includes('ult crit dmg')) {
            potentUltCritDmg += val;
            ultimateBreakdowns.push({ label: `${pLabel}: Ult Crit DMG`, value: `+${val}%`, source: 'Potential' });
          }
          if (matchStr.includes('dmg multiplier') || matchStr.includes('damage multiplier')) {
            if (descLower.includes('skill') || descLower.includes('storm flash') || descLower.includes('radiance flurry')) {
              potentSkillMultBonus += val;
              mainSkillBreakdowns.push({ label: `${pLabel}: DMG Multiplier`, value: `+${val}%`, source: 'Potential' });
            } else {
              potentAaMultBonus += val;
              normalAtkBreakdowns.push({ label: `${pLabel}: DMG Multiplier`, value: `+${val}%`, source: 'Potential' });
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. TALENTS (Dupe Limit Break T1 to T5)
  // -------------------------------------------------------------------------
  let talentAaDmg = 0;
  let talentSkillDmg = 0;
  let talentUltDmg = 0;
  let talentSkillMultBonus = 0;
  let talentAaMultBonus = 0;
  let talentCritDmg = 0;

  const dupeLevel = Array.isArray(activeSlotData?.potentials) ? activeSlotData.potentials.length : 0;
  if (char.talent && char.talent.length > 0) {
    char.talent.forEach((tGroup, tGroupIdx) => {
      const tierNum = tGroupIdx + 1;
      if (tierNum > dupeLevel) return;

      const majorNode = tGroup.boost?.[0];
      if (!majorNode) return;

      const desc = majorNode.desc || '';
      const params = majorNode.params || [];
      const val0 = parseFloat(String(params[0] || '0').replace('%', '')) || 0;
      const val1 = parseFloat(String(params[1] || '0').replace('%', '')) || 0;
      const tLabel = `Talent (T${tierNum}): ${majorNode.name}`;

      if (desc.includes('Crit DMG by') || desc.includes('Crit DMG dealt')) {
        talentCritDmg += val0;
        normalAtkBreakdowns.push({ label: `${tLabel}: Crit DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
        mainSkillBreakdowns.push({ label: `${tLabel}: Crit DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
        supportSkillBreakdowns.push({ label: `${tLabel}: Crit DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
        ultimateBreakdowns.push({ label: `${tLabel}: Crit DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
      }
      if (desc.includes('Auto Attack DMG')) {
        talentAaDmg += val0;
        normalAtkBreakdowns.push({ label: `${tLabel}: AA DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
      }
      if (desc.includes('Skill DMG') && !desc.includes('Auto Attack')) {
        talentSkillDmg += val0;
        mainSkillBreakdowns.push({ label: `${tLabel}: Skill DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
        supportSkillBreakdowns.push({ label: `${tLabel}: Skill DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
      }
      if (desc.includes('Ultimate DMG')) {
        talentUltDmg += val0;
        ultimateBreakdowns.push({ label: `${tLabel}: Ultimate DMG`, value: `+${val0}%`, source: `Talent T${tierNum}` });
      }
      if (desc.includes('DMG Multiplier') || desc.includes('multiplier')) {
        if (desc.includes('skill') || desc.includes('Radiance Flurry')) {
          const mVal = val1 || val0;
          talentSkillMultBonus += mVal;
          mainSkillBreakdowns.push({ label: `${tLabel}: Skill DMG Multiplier`, value: `+${mVal}%`, source: `Talent T${tierNum}` });
        } else if (desc.includes('Auto Attack') || desc.includes('Dawn') || desc.includes('Daybreak')) {
          talentAaMultBonus += val0;
          normalAtkBreakdowns.push({ label: `${tLabel}: AA DMG Multiplier`, value: `+${val0}%`, source: `Talent T${tierNum}` });
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 5. DISCS BUFFS (Main Discs & Support Discs Squad Buffs)
  // -------------------------------------------------------------------------
  let discAaDmg = 0;
  let discSkillDmg = 0;
  let discUltDmg = 0;
  let discSkillCritDmg = 0;
  let discUltCritDmg = 0;

  if (build.discs) {
    const allDiscSlots = [
      { slot: build.discs.main1, isMain: true, label: 'Main Disc 1' },
      { slot: build.discs.main2, isMain: true, label: 'Main Disc 2' },
      { slot: build.discs.main3, isMain: true, label: 'Main Disc 3' },
      { slot: build.discs.support1, isMain: false, label: 'Support Disc 1' },
      { slot: build.discs.support2, isMain: false, label: 'Support Disc 2' },
      { slot: build.discs.support3, isMain: false, label: 'Support Disc 3' },
    ];

    for (const dItem of allDiscSlots) {
      const slot = dItem.slot;
      if (!slot?.discId) continue;
      const disc = discsMap[String(slot.discId)];
      if (!disc) continue;

      const crescendo = Math.max(1, Math.min(6, slot.dupe || 1));
      const discSource = dItem.label;

      // A. Main Skill
      if (disc.mainSkill?.desc && disc.mainSkill.params) {
        const desc = disc.mainSkill.desc.toLowerCase();
        const isApplicable =
          dItem.isMain ||
          desc.includes('squad') ||
          desc.includes('squadmates') ||
          desc.includes('main trekker') ||
          desc.includes('allies') ||
          desc.includes('dmg taken') ||
          desc.includes('takes');

        if (isApplicable) {
          const levels = disc.mainSkill.params.split('/');
          const pStr = levels[Math.min(levels.length - 1, crescendo - 1)] || levels[0] || '';
          const paramVals = pStr.split(',').map((s) => parseFloat(s.trim().replace('%', '')) || 0);

          if (desc.includes('skill dmg')) {
            const v = paramVals[0] || 0;
            discSkillDmg += v;
            mainSkillBreakdowns.push({ label: `${disc.name} (Melody): Skill DMG`, value: `+${v}%`, source: discSource });
            supportSkillBreakdowns.push({ label: `${disc.name} (Melody): Skill DMG`, value: `+${v}%`, source: discSource });
          }
          if (desc.includes('ultimate dmg')) {
            const v = (paramVals[0] || 0) + (paramVals[1] || 0);
            discUltDmg += v;
            ultimateBreakdowns.push({ label: `${disc.name} (Melody): Ultimate DMG`, value: `+${v}%`, source: discSource });
          }
          if (desc.includes('auto attack') || desc.includes('auto atk')) {
            const v = paramVals[1] || paramVals[0] || 0;
            discAaDmg += v;
            normalAtkBreakdowns.push({ label: `${disc.name} (Melody): AA DMG`, value: `+${v}%`, source: discSource });
          }
        }
      }

      // B. Secondary Skills (Harmony Skills 1 & 2)
      const hSkills = [
        { data: disc.secondarySkill1, lvl: slot.harmonySkill1Level ?? 1 },
        { data: disc.secondarySkill2, lvl: slot.harmonySkill2Level ?? 1 },
      ];

      for (const h of hSkills) {
        if (!h.data?.desc || !h.data.params || h.lvl <= 0) continue;
        const desc = h.data.desc.toLowerCase();
        const isApplicable =
          dItem.isMain ||
          desc.includes('squad') ||
          desc.includes('squadmates') ||
          desc.includes('main trekker') ||
          desc.includes('allies');

        if (isApplicable) {
          const levels = h.data.params.split('/');
          const pStr = levels[Math.min(levels.length - 1, h.lvl - 1)] || levels[0] || '';
          const paramVals = pStr.split(',').map((s) => parseFloat(s.trim().replace('%', '')) || 0);
          const val0 = paramVals[0] || 0;
          const hName = h.data.name || 'Harmony Skill';

          if (desc.includes('skill dmg') && !desc.includes('crit')) {
            discSkillDmg += val0;
            mainSkillBreakdowns.push({ label: `${disc.name} (${hName}): Skill DMG`, value: `+${val0}%`, source: discSource });
            supportSkillBreakdowns.push({ label: `${disc.name} (${hName}): Skill DMG`, value: `+${val0}%`, source: discSource });
          }
          if (desc.includes('auto attack dmg')) {
            discAaDmg += val0;
            normalAtkBreakdowns.push({ label: `${disc.name} (${hName}): AA DMG`, value: `+${val0}%`, source: discSource });
          }
          if (desc.includes('ultimate crit dmg')) {
            discUltCritDmg += val0;
            ultimateBreakdowns.push({ label: `${disc.name} (${hName}): Ult Crit DMG`, value: `+${val0}%`, source: discSource });
          }
          if (desc.includes('skill crit dmg')) {
            const v = paramVals[2] || val0;
            discSkillCritDmg += v;
            mainSkillBreakdowns.push({ label: `${disc.name} (${hName}): Skill Crit DMG`, value: `+${v}%`, source: discSource });
            supportSkillBreakdowns.push({ label: `${disc.name} (${hName}): Skill Crit DMG`, value: `+${v}%`, source: discSource });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. TOTAL DAMAGE MULTIPLIERS & EXPECTED VALUES
  // -------------------------------------------------------------------------
  // Effective skill levels (Base 10 + Emblem Unique Bonus +1..+3 = Max Lv.13)
  const rawSkillLevels = isMain
    ? (build.skillLevels || { normal: 10, main: 10, support: 10, ult: 10 })
    : (activeSlotData?.skillLevels || { normal: 10, main: 10, support: 10, ult: 10 });

  const emblemBonus = stats.emblemBonuses || { normalBonus: 0, mainBonus: 0, supportBonus: 0, ultBonus: 0 };
  const skillLvls = {
    normal: Math.min(13, (rawSkillLevels.normal || 10) + (emblemBonus.normalBonus || 0)),
    main: Math.min(13, (rawSkillLevels.main || 10) + (emblemBonus.mainBonus || 0)),
    support: Math.min(13, (rawSkillLevels.support || 10) + (emblemBonus.supportBonus || 0)),
    ult: Math.min(13, (rawSkillLevels.ult || 10) + (emblemBonus.ultBonus || 0)),
  };

  if (emblemBonus.normalBonus > 0) {
    normalAtkBreakdowns.unshift({ label: `Emblem Unique: Normal Attack (+${emblemBonus.normalBonus} Lv)`, value: `Lv.${skillLvls.normal}`, source: 'Emblem Unique' });
  }
  if (emblemBonus.mainBonus > 0) {
    mainSkillBreakdowns.unshift({ label: `Emblem Unique: Main Skill (+${emblemBonus.mainBonus} Lv)`, value: `Lv.${skillLvls.main}`, source: 'Emblem Unique' });
  }
  if (emblemBonus.supportBonus > 0) {
    supportSkillBreakdowns.unshift({ label: `Emblem Unique: Support Skill (+${emblemBonus.supportBonus} Lv)`, value: `Lv.${skillLvls.support}`, source: 'Emblem Unique' });
  }
  if (emblemBonus.ultBonus > 0) {
    ultimateBreakdowns.unshift({ label: `Emblem Unique: Ultimate (+${emblemBonus.ultBonus} Lv)`, value: `Lv.${skillLvls.ult}`, source: 'Emblem Unique' });
  }

  // Base Multipliers
  const elemMult = 1 + elemDmg / 100;
  const defPenMult = 1 + Math.min(0.5, defPen / 100);
  const elemPenMult = 1 + Math.min(0.3, elemPen / 1000);
  const penMultiplier = defPenMult * elemPenMult;

  // Total Vulnerability / DMG Taken from support skills, support potentials, and discs
  const totalVulnDmgTaken = Math.min(80, Math.max(0, stats.total.vulnDmgTaken || 0));
  const vulnMultiplier = 1 + totalVulnDmgTaken / 100;

  // Single skill calculation helper
  const calcSkill = (
    skillData: SkillData | null | undefined,
    lvl: number,
    typeDmgBonus: number,
    critRateBonus: number,
    critDmgBonus: number,
    multiplierBonus: number,
    defaultCd: number,
    isNormalCombo = false,
    breakdowns: { label: string; value: string; source: string }[] = []
  ): SkillDamageResult => {
    if (!skillData) {
      return {
        name: 'None',
        cooldownSec: defaultCd,
        multiplier: 0,
        hits: 0,
        typeDmgBonus: 0,
        effectiveCritRate: baseCritRate,
        effectiveCritDmg: baseCritDmg,
        rawDamage: 0,
        expectedDamage: 0,
        maxCritDamage: 0,
        dps: 0,
        isAvailable: false,
        breakdowns: [],
      };
    }

    const { multiplier, hits } = parseSkillMultiplier(skillData, lvl, char, isNormalCombo);
    const finalMultiplier = multiplier + multiplierBonus;
    const cdSec = isNormalCombo ? 2.2 : parseCooldown(skillData.cooldown, defaultCd);

    const effectiveCritRate = Math.min(100, Math.max(0, baseCritRate + critRateBonus));
    const effectiveCritDmg = Math.max(100, baseCritDmg + talentCritDmg + critDmgBonus);

    const critMultiplier = 1 + (effectiveCritRate / 100) * ((effectiveCritDmg - 100) / 100);
    const maxCritMultiplier = effectiveCritDmg / 100;

    // Stat Scaling: Check whether this specific skill scales from Max HP, DEF, or ATK
    const sDesc = (skillData.desc || '').toLowerCase();
    const isHpSkill =
      (isCharHpScaler && !sDesc.includes('of atk')) ||
      sDesc.includes('of max hp as') ||
      (sDesc.includes('of max hp') && !sDesc.includes('shield'));
    const isDefSkill =
      (isCharDefScaler && !sDesc.includes('of atk')) ||
      sDesc.includes('of def as') ||
      (sDesc.includes('of def') && !sDesc.includes('shield'));
    const scalingStat = isHpSkill ? totalHp : isDefSkill ? totalDef : totalAtk;

    const typeMult = 1 + typeDmgBonus / 100;
    const rawDamage = scalingStat * (finalMultiplier / 100) * elemMult * typeMult * vulnMultiplier * penMultiplier;
    const expectedDamage = rawDamage * critMultiplier;
    const maxCritDamage = rawDamage * maxCritMultiplier;
    const dps = expectedDamage / Math.max(0.5, cdSec);

    return {
      name: skillData.name,
      icon: skillData.icon,
      cooldownSec: cdSec,
      multiplier: finalMultiplier,
      hits,
      typeDmgBonus,
      effectiveCritRate,
      effectiveCritDmg,
      rawDamage,
      expectedDamage,
      maxCritDamage,
      dps,
      isAvailable: isMain || !isNormalCombo,
      breakdowns,
    };
  };

  // 1. Auto Attack
  const normalAtk = calcSkill(
    char.normalAtk,
    skillLvls.normal,
    emblemAaDmg + noteAaDmg + potentAaDmg + talentAaDmg + discAaDmg,
    emblemAaCrit + potentAaCrit,
    0,
    potentAaMultBonus + talentAaMultBonus,
    2.2,
    true,
    normalAtkBreakdowns
  );

  // 2. Main Skill
  const mainSkill = calcSkill(
    char.skill,
    skillLvls.main,
    emblemSkillDmg + noteSkillDmg + potentSkillDmg + talentSkillDmg + discSkillDmg,
    emblemSkillCrit + potentSkillCrit,
    discSkillCritDmg + potentSkillCritDmg,
    potentSkillMultBonus + talentSkillMultBonus,
    parseCooldown(char.skill?.cooldown, 8),
    false,
    mainSkillBreakdowns
  );

  // 3. Support Skill
  const supportSkill = calcSkill(
    char.supportSkill,
    skillLvls.support,
    emblemSkillDmg + noteSkillDmg + potentSkillDmg + discSkillDmg,
    emblemSkillCrit + potentSkillCrit,
    discSkillCritDmg + potentSkillCritDmg,
    0,
    parseCooldown(char.supportSkill?.cooldown, 12),
    false,
    supportSkillBreakdowns
  );

  // 4. Ultimate
  const ultimate = calcSkill(
    char.ultimate,
    skillLvls.ult,
    emblemUltDmg + noteUltDmg + potentUltDmg + talentUltDmg + discUltDmg,
    emblemUltCrit + potentUltCrit,
    discUltCritDmg + potentUltCritDmg,
    0,
    parseCooldown(char.ultimate?.cooldown, 30),
    false,
    ultimateBreakdowns
  );

  // Full Rotation Sustained DPS:
  // Main Trekker: normal attack sustained DPS + main skill on cooldown + ult on cooldown
  // Support Trekker: support skill on cooldown + ult on cooldown
  const totalRotationDps = isMain
    ? normalAtk.dps + mainSkill.dps + ultimate.dps
    : supportSkill.dps + ultimate.dps;

  return {
    character: char,
    isMain,
    totalAtk,
    totalHp,
    totalDef,
    primaryScalingStat,
    primaryScalingValue,
    elemDmg,
    critRate: baseCritRate,
    critDmg: baseCritDmg,
    elemPen,
    defPen,
    vulnDmgTaken: totalVulnDmgTaken,
    normalAtk,
    mainSkill,
    supportSkill,
    ultimate,
    totalRotationDps,
  };
}
