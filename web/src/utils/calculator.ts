import type { BuildState, CalculatedStats, Character, DiscItem, TeamMemberSlot } from '../types';
import affinityData from '../data/affinity.json';
import { ALL_EMBLEM_STATS } from '../data/emblemPools';
import charactersData from '../data/characters.json';

export function calculateEffectiveStats(
  char: Character | null,
  build: BuildState,
  discsMap: { [id: string]: DiscItem }
): CalculatedStats {
  const allCharsMap = (charactersData as unknown) as Record<string, Character>;
  const supp1Char = build.support1?.characterId ? allCharsMap[String(build.support1.characterId)] : null;
  const supp2Char = build.support2?.characterId ? allCharsMap[String(build.support2.characterId)] : null;
  const squad = [char, supp1Char, supp2Char].filter(Boolean) as Character[];

  const result: CalculatedStats = {
    base: {
      hp: 0,
      atk: 0,
      def: 0,
      critRate: 5,
      critDmg: 150,
      chargeEffMain: 100,
      chargeEffSupport: 75,
      elemDmg: 0,
      elemPen: 0,
      defPen: 0,
      vulnDmgTaken: 0
    },
    bonus: {
      hp: 0,
      atk: 0,
      def: 0,
      critRate: 0,
      critDmg: 0,
      chargeEffMain: 0,
      chargeEffSupport: 0,
      elemDmg: 0,
      elemPen: 0,
      defPen: 0,
      vulnDmgTaken: 0
    },
    total: {
      hp: 0,
      atk: 0,
      def: 0,
      critRate: 5,
      critDmg: 150,
      chargeEffMain: 100,
      chargeEffSupport: 75,
      elemDmg: 0,
      elemPen: 0,
      defPen: 0,
      vulnDmgTaken: 0
    },
    effectiveSkillLevels: {
      normal: 10,
      main: 10,
      support: 10,
      ult: 10
    },
    emblemBonuses: {
      normalBonus: 0,
      mainBonus: 0,
      supportBonus: 0,
      ultBonus: 0,
      talentBonus: 0
    },
    breakdowns: {
      hp: [],
      atk: [],
      def: [],
      critRate: [],
      critDmg: [],
      chargeEffMain: [],
      chargeEffSupport: [],
      elemDmg: [],
      elemPen: [],
      defPen: [],
      vulnDmgTaken: []
    }
  };

  if (!char) return result;

  // 1. Base Stats from Character Level Curve
  const lvlStats = (char.stat || []).find((s) => s.Level === build.level) ||
    char.stat?.[char.stat.length - 1] || { HP: 1000, ATK: 200, DEF: 0, 'Crit Rate': '5%', 'Crit DMG': '150%' };

  result.base.hp = Number(lvlStats.HP) || 1000;
  result.base.atk = Number(lvlStats.ATK) || 200;
  result.base.def = lvlStats.DEF !== undefined && lvlStats.DEF !== null && !isNaN(Number(lvlStats.DEF)) ? Number(lvlStats.DEF) : 0;
  result.base.critRate = parseFloat(lvlStats['Crit Rate']) || 5;
  result.base.critDmg = parseFloat(lvlStats['Crit DMG']) || 150;

  result.breakdowns.hp.push({ label: `Base HP (Lv.${build.level})`, value: String(result.base.hp), source: 'Base Stat' });
  result.breakdowns.atk.push({ label: `Base ATK (Lv.${build.level})`, value: String(result.base.atk), source: 'Base Stat' });
  result.breakdowns.def.push({ label: `Base DEF`, value: String(result.base.def), source: 'Base Stat' });
  result.breakdowns.critRate.push({ label: `Base Crit Rate`, value: `${result.base.critRate}%`, source: 'Base Stat' });
  result.breakdowns.critDmg.push({ label: `Base Crit DMG`, value: `${result.base.critDmg}%`, source: 'Base Stat' });

  let flatHpBonus = 0;
  let percentHpBonus = 0;

  let flatAtkBonus = 0;
  let percentAtkBonus = 0;

  let flatDefBonus = 0;
  let percentDefBonus = 0;

  // 2. Discs Calculation (Single Unified Pass: 3 Main + 3 Support, C0 to C5, Harmony Skill Lv 1 to 6)
  const discSlots = [
    { slot: 'Main Disc 1', d: build.discs.main1, isMain: true },
    { slot: 'Main Disc 2', d: build.discs.main2, isMain: true },
    { slot: 'Main Disc 3', d: build.discs.main3, isMain: true },
    { slot: 'Support Disc 1', d: build.discs.support1, isMain: false },
    { slot: 'Support Disc 2', d: build.discs.support2, isMain: false },
    { slot: 'Support Disc 3', d: build.discs.support3, isMain: false },
  ];

  for (const item of discSlots) {
    if (!item.d?.discId) continue;
    const disc = discsMap[String(item.d.discId)];
    if (!disc) continue;

    // A. Base Disc Flat Stats & Element DMG from Level (1-90)
    const levelIdx = Math.max(0, Math.min((item.d.level || 1) - 1, (disc.stat?.length || 1) - 1));
    const dStat = disc.stat?.[levelIdx];
    if (dStat) {
      if (dStat.HP) {
        flatHpBonus += dStat.HP;
        result.breakdowns.hp.push({
          label: `${disc.name} (Lv.${item.d.level})`,
          value: `+${dStat.HP.toLocaleString()}`,
          source: item.slot
        });
      }
      if (dStat.ATK) {
        flatAtkBonus += dStat.ATK;
        result.breakdowns.atk.push({
          label: `${disc.name} (Lv.${item.d.level})`,
          value: `+${dStat.ATK.toLocaleString()}`,
          source: item.slot
        });
      }
      const elemKey = `${char.element} DMG`;
      if (dStat[elemKey]) {
        const elemVal = parseFloat(String(dStat[elemKey]).replace('%', ''));
        if (!isNaN(elemVal) && elemVal > 0) {
          result.bonus.elemDmg += elemVal;
          result.breakdowns.elemDmg.push({
            label: `${disc.name} (Lv.${item.d.level})`,
            value: `+${elemVal}%`,
            source: item.slot
          });
        }
      }
    }

    // B. Crescendo Dupe ATK Bonus (C1 to C6: C2-C6 unlock disc.dupe[0..4])
    const crescendo = Math.max(1, Math.min(6, item.d.dupe || 1));
    if (crescendo >= 2 && disc.dupe && disc.dupe.length > 0) {
      const dupeIdx = Math.min(crescendo - 2, disc.dupe.length - 1);
      const dupeAtk = disc.dupe[dupeIdx]?.ATK || 0;
      if (dupeAtk > 0) {
        flatAtkBonus += dupeAtk;
        result.breakdowns.atk.push({
          label: `${disc.name} (Crescendo C${crescendo})`,
          value: `+${dupeAtk.toLocaleString()}`,
          source: `${item.slot} Dupe`
        });
      }
    }

    // C. Skills: Active for Main Discs, or Support Discs that buff the Squad / Main Trekker!
    const applySkillBuffs = (
      skillName: string,
      skillType: 'Melody Skill' | 'Harmony Skill',
      desc: string,
      paramsStr: string,
      level: number
    ) => {
      if (!desc || !paramsStr || level <= 0) return;
      const levels = paramsStr.split('/');
      const pStr = levels[Math.min(levels.length - 1, level - 1)] || levels[0] || '';
      const paramValues = pStr.split(',').map((s: string) => s.trim());
      const cleanDesc = desc
        .replace(/<\/?(?:color|b|i|size|material)[^>]*>/gi, '')
        .replace(/##[^#]+#\d+#/g, '')
        .replace(/[\r\n\x0B]+/g, ' ');

      const appliedStats = new Set<string>();

      for (let idx = 0; idx < paramValues.length; idx++) {
        const rawVal = paramValues[idx];
        if (!rawVal || !rawVal.includes('%')) continue;
        const num = parseFloat(rawVal.replace('%', ''));
        if (isNaN(num) || num <= 0) continue;

        const placeholder = `{${idx + 1}}`;
        const pIndex = cleanDesc.indexOf(placeholder);
        if (pIndex === -1) continue;

        const beforeText = cleanDesc.slice(Math.max(0, pIndex - 60), pIndex);
        const afterText = cleanDesc.slice(pIndex, Math.min(cleanDesc.length, pIndex + 40));
        const clause = (beforeText + afterText).toLowerCase();

        // If from Support Disc, ONLY apply if it targets the squad, squadmates, main trekker, allies, or enemies
        if (!item.isMain) {
          const isSquadEffect =
            clause.includes('squad') ||
            clause.includes('squadmates') ||
            clause.includes('main trekker') ||
            clause.includes('allies') ||
            clause.includes(`all ${char.element.toLowerCase()}`) ||
            clause.includes(`${char.element.toLowerCase()} trekkers in the squad`) ||
            clause.includes('dmg taken') ||
            clause.includes('takes');
          if (!isSquadEffect) continue;
        }

        // 1. Condition check (e.g. "HP is above 80%", "drops below", "more than", "above")
        if (
          clause.includes('hp is above') ||
          clause.includes('drops below') ||
          clause.includes('hp is below') ||
          clause.includes('above ' + placeholder.toLowerCase()) ||
          clause.includes('below ' + placeholder.toLowerCase())
        ) {
          continue;
        }

        // 2. Debuff / shield check
        if (clause.includes('shield equal to')) {
          continue;
        }

        // 2b. Vulnerability / DMG Taken debuff on enemies
        const isEnemyVuln =
          (clause.includes('dmg taken by the target') ||
            clause.includes('the target takes') ||
            clause.includes('target takes') ||
            clause.includes('dmg taken by target') ||
            (clause.includes('target') && clause.includes('dmg taken'))) &&
          !clause.includes('reduces the dmg taken') &&
          !clause.includes('reduces dmg taken') &&
          num <= 60;

        if (!appliedStats.has('vulnDmgTaken') && isEnemyVuln) {
          appliedStats.add('vulnDmgTaken');
          result.bonus.vulnDmgTaken = (result.bonus.vulnDmgTaken || 0) + num;
          result.breakdowns.vulnDmgTaken.push({
            label: `${skillType}: ${skillName} (Lv.${level}) [Vulnerability]`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
          continue;
        }

        // 3. HP% stat buff
        if (
          !appliedStats.has('hp') &&
          (clause.includes('increases') ||
            clause.includes("increases the squad's") ||
            clause.includes("increases the main trekker's")) &&
          clause.includes('hp by ' + placeholder.toLowerCase()) &&
          !clause.includes('shield')
        ) {
          appliedStats.add('hp');
          percentHpBonus += num;
          result.breakdowns.hp.push({
            label: `${skillType}: ${skillName} (Lv.${level})`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
        }
        // 4. Crit Rate
        else if (
          !appliedStats.has('critRate') &&
          (clause.includes('crit rate by ' + placeholder.toLowerCase()) ||
            clause.includes('crit rate is increased by ' + placeholder.toLowerCase()) ||
            clause.includes('crit rate of all'))
        ) {
          appliedStats.add('critRate');
          result.bonus.critRate += num;
          result.breakdowns.critRate.push({
            label: `${skillType}: ${skillName} (Lv.${level})`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
        }
        // 5. Crit DMG
        else if (
          !appliedStats.has('critDmg') &&
          (clause.includes('crit dmg by ' + placeholder.toLowerCase()) ||
            clause.includes('crit dmg is increased by ' + placeholder.toLowerCase()))
        ) {
          appliedStats.add('critDmg');
          result.bonus.critDmg += num;
          result.breakdowns.critDmg.push({
            label: `${skillType}: ${skillName} (Lv.${level})`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
        }
        // 6. ATK%
        else if (
          !appliedStats.has('atk') &&
          (clause.includes('atk by ' + placeholder.toLowerCase()) ||
            clause.includes('their atk by ' + placeholder.toLowerCase()) ||
            clause.includes('increases the atk of') ||
            clause.includes('increases atk by')) &&
          !clause.includes('auto attack')
        ) {
          appliedStats.add('atk');
          percentAtkBonus += num;
          result.breakdowns.atk.push({
            label: `${skillType}: ${skillName} (Lv.${level})`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
        }
        // 7. DEF%
        else if (
          !appliedStats.has('def') &&
          clause.includes('def by ' + placeholder.toLowerCase()) &&
          !clause.includes('def taken')
        ) {
          appliedStats.add('def');
          percentDefBonus += num;
          result.breakdowns.def.push({
            label: `${skillType}: ${skillName} (Lv.${level})`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
        }
        // 8. Element DMG matching character element
        else if (
          !appliedStats.has('elemDmg') &&
          (clause.includes(`${char.element.toLowerCase()} dmg by ` + placeholder.toLowerCase()) ||
            clause.includes(`squad's ${char.element.toLowerCase()} dmg by ` + placeholder.toLowerCase()) ||
            clause.includes(`${char.element.toLowerCase()} dmg dealt by ` + placeholder.toLowerCase()) ||
            (clause.includes(`${char.element.toLowerCase()} dmg`) &&
              clause.includes(placeholder.toLowerCase())))
        ) {
          appliedStats.add('elemDmg');
          result.bonus.elemDmg += num;
          result.breakdowns.elemDmg.push({
            label: `${skillType}: ${skillName} (Lv.${level})`,
            value: `+${num}%`,
            source: `${item.slot}`
          });
        }
      }
    };

    // 1. Melody Skill (Skill Level is strictly synced and locked to Crescendo C1..C6)
    if (disc.mainSkill?.params) {
      applySkillBuffs(
        disc.mainSkill.name,
        'Melody Skill',
        disc.mainSkill.desc || '',
        disc.mainSkill.params,
        crescendo
      );
    }

    // 2. Harmony Skill 1 (configurable level 0..5)
    if (disc.secondarySkill1?.params) {
      const hLv1 =
        item.d.harmonySkill1Level !== undefined
          ? item.d.harmonySkill1Level
          : (item.d.harmonySkillLevel ?? 1);
      if (hLv1 > 0) {
        applySkillBuffs(
          disc.secondarySkill1.name,
          'Harmony Skill',
          disc.secondarySkill1.desc || '',
          disc.secondarySkill1.params,
          Math.min(5, hLv1)
        );
      }
    }

    // 3. Harmony Skill 2 (configurable level 0..5)
    if (disc.secondarySkill2?.params) {
      const hLv2 =
        item.d.harmonySkill2Level !== undefined
          ? item.d.harmonySkill2Level
          : (item.d.harmonySkillLevel ?? 1);
      if (hLv2 > 0) {
        applySkillBuffs(
          disc.secondarySkill2.name,
          'Harmony Skill',
          disc.secondarySkill2.desc || '',
          disc.secondarySkill2.params,
          Math.min(5, hLv2)
        );
      }
    }
  }

  // 3. Emblems Calculation (4 attribute lines per slot for Lv70, Lv80, Lv90)
  const emblemBonuses = {
    normalBonus: 0,
    mainBonus: 0,
    supportBonus: 0,
    ultBonus: 0,
    talentBonus: 0,
  };

  const emblemSlotList: { slotKey: 'lv70' | 'lv80' | 'lv90'; label: string }[] = [
    { slotKey: 'lv70', label: 'Emblem Lv.70' },
    { slotKey: 'lv80', label: 'Emblem Lv.80' },
    { slotKey: 'lv90', label: 'Emblem Lv.90' },
  ];

  for (const em of emblemSlotList) {
    const emState = build.emblems[em.slotKey];
    if (!emState) continue;

    const lines = emState.lines || [];
    lines.forEach((line, lineIdx) => {
      if (!line || !line.statId || line.statId === 'none') return;
      const statDef = ALL_EMBLEM_STATS[line.statId];
      const maxTier = statDef.maxTier || 4;
      const tier = Math.min(line.tier || 4, maxTier);
      const val = statDef.values[tier - 1] ?? statDef.values[statDef.values.length - 1];
      const sourceLabel = `${em.label} (L${lineIdx + 1})`;

      // Unique Skill / Talent modifiers
      if (statDef.isUnique) {
        if (statDef.uniqueTarget === 'normal') emblemBonuses.normalBonus += val;
        if (statDef.uniqueTarget === 'main') emblemBonuses.mainBonus += val;
        if (statDef.uniqueTarget === 'support') emblemBonuses.supportBonus += val;
        if (statDef.uniqueTarget === 'ult') emblemBonuses.ultBonus += val;
        if (statDef.uniqueTarget === 'talent') emblemBonuses.talentBonus += val;
        return;
      }

      // Normal Stat Buffs
      if (statDef.id === 'hp') {
        flatHpBonus += val;
        result.breakdowns.hp.push({ label: `${sourceLabel}: HP`, value: `+${val.toLocaleString()}`, source: em.label });
      } else if (statDef.id === 'hp_pct') {
        percentHpBonus += val;
        result.breakdowns.hp.push({ label: `${sourceLabel}: HP%`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'atk') {
        flatAtkBonus += val;
        result.breakdowns.atk.push({ label: `${sourceLabel}: ATK`, value: `+${val.toLocaleString()}`, source: em.label });
      } else if (statDef.id === 'atk_pct') {
        percentAtkBonus += val;
        result.breakdowns.atk.push({ label: `${sourceLabel}: ATK%`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'def') {
        flatDefBonus += val;
        result.breakdowns.def.push({ label: `${sourceLabel}: DEF`, value: `+${val.toLocaleString()}`, source: em.label });
      } else if (statDef.id === 'def_pct') {
        percentDefBonus += val;
        result.breakdowns.def.push({ label: `${sourceLabel}: DEF%`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'crit_rate') {
        result.bonus.critRate += val;
        result.breakdowns.critRate.push({ label: `${sourceLabel}: Crit Rate`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'skill_crit_rate') {
        result.bonus.critRate += val;
        result.breakdowns.critRate.push({ label: `${sourceLabel}: Skill Crit Rate (In-Combat)`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'crit_dmg') {
        result.bonus.critDmg += val;
        result.breakdowns.critDmg.push({ label: `${sourceLabel}: Crit DMG`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'elem_dmg') {
        result.bonus.elemDmg += val;
        result.breakdowns.elemDmg.push({ label: `${sourceLabel}: ${char.element} DMG`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'elem_pen') {
        result.bonus.elemPen += val;
        result.breakdowns.elemPen.push({ label: `${sourceLabel}: ${char.element} PEN`, value: `+${val}`, source: em.label });
      } else if (statDef.id === 'charge_main') {
        result.bonus.chargeEffMain += val;
        result.breakdowns.chargeEffMain.push({ label: `${sourceLabel}: Charge Eff (Main)`, value: `+${val}%`, source: em.label });
      } else if (statDef.id === 'charge_support') {
        result.bonus.chargeEffSupport += val;
        result.breakdowns.chargeEffSupport.push({ label: `${sourceLabel}: Charge Eff (Support)`, value: `+${val}%`, source: em.label });
      }
    });

    // Fallback for legacy builds with mainStat
    if (lines.length === 0 && emState.mainStat) {
      const statStr = emState.mainStat.trim();
      const colonIdx = statStr.indexOf(':');
      if (colonIdx !== -1) {
        const statName = statStr.slice(0, colonIdx).trim();
        const statValStr = statStr.slice(colonIdx + 1).trim().replace('*', '');
        const num = parseFloat(statValStr) || 0;
        if (statName === 'HP') {
          if (statValStr.endsWith('%')) percentHpBonus += num;
          else flatHpBonus += num;
        } else if (statName === 'ATK') {
          if (statValStr.endsWith('%')) percentAtkBonus += num;
          else flatAtkBonus += num;
        } else if (statName === 'DEF') {
          if (statValStr.endsWith('%')) percentDefBonus += num;
          else flatDefBonus += num;
        } else if (statName.includes('Crit Rate')) {
          result.bonus.critRate += num;
        } else if (statName.includes('Crit DMG')) {
          result.bonus.critDmg += num;
        } else if (statName.includes('Elemental DMG')) {
          result.bonus.elemDmg += num;
        } else if (statName.includes('Elemental PEN')) {
          result.bonus.elemPen += num;
        }
      }
    }
  }

  // Stella Sora rule: Unique Attribute level bonuses can never exceed +3
  emblemBonuses.normalBonus = Math.min(3, emblemBonuses.normalBonus);
  emblemBonuses.mainBonus = Math.min(3, emblemBonuses.mainBonus);
  emblemBonuses.supportBonus = Math.min(3, emblemBonuses.supportBonus);
  emblemBonuses.ultBonus = Math.min(3, emblemBonuses.ultBonus);
  emblemBonuses.talentBonus = Math.min(3, emblemBonuses.talentBonus);

  result.emblemBonuses = emblemBonuses;
  result.effectiveSkillLevels = {
    normal: Math.min(13, (build.skillLevels?.normal || 1) + emblemBonuses.normalBonus),
    main: Math.min(13, (build.skillLevels?.main || 1) + emblemBonuses.mainBonus),
    support: Math.min(13, (build.skillLevels?.support || 1) + emblemBonuses.supportBonus),
    ult: Math.min(13, (build.skillLevels?.ult || 1) + emblemBonuses.ultBonus),
  };

  // 4. Talents & Dupe Limit Break Calculation (T0 to T5)
  // build.potentials controls active dupe ranks: [] (T0), [1] (T1), [1, 2] (T2), ..., [1..5] (T5)
  const dupeLevel = Array.isArray(build.potentials) ? build.potentials.length : 0;

  if (char.talent && char.talent.length > 0) {
    char.talent.forEach((tGroup, tGroupIdx) => {
      const tierNum = tGroupIdx + 1; // 1 to 5 (T1 to T5)
      const isDupeTierActive = tierNum <= dupeLevel;
      const boosts = tGroup.boost || [];
      if (boosts.length === 0) return;

      // When this dupe tier is locked (e.g. at T0 for T1-T5), do not apply any passives or stat nodes!
      if (!isDupeTierActive) return;

      const getParamVal = (params: (string | number)[] | undefined, idx: number = 0): number => {
        if (!params) return 0;
        const raw = params[idx];
        if (raw === undefined || raw === null) return 0;
        if (typeof raw === 'number') return raw;
        const str = String(raw).replace('%', '').trim();
        return parseFloat(str) || 0;
      };

      // A. Major Limit Break / Dupe Talent Passive (boost[0])
      const majorNode = boosts[0];
        const name = majorNode.name || `Talent T${tierNum}`;
        const desc = majorNode.desc || '';
        const effectTypes = majorNode.effectType || [];
        const params = majorNode.params || [];
        const val0 = getParamVal(params, 0);
        const val1 = getParamVal(params, 1);
        const sourceLabel = `Talent (T${tierNum})`;

        let handled = false;

        // 1. Direct effectType mapping
        if (effectTypes.includes('HP (%)')) {
          if (val0 > 0) {
            percentHpBonus += val0;
            result.breakdowns.hp.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            handled = true;
          }
        }
        if (effectTypes.includes('ATK (%)')) {
          if (val0 > 0) {
            percentAtkBonus += val0;
            result.breakdowns.atk.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            handled = true;
          }
        }
        if (effectTypes.includes('DEF (%)')) {
          if (val0 > 0) {
            percentDefBonus += val0;
            result.breakdowns.def.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            handled = true;
          }
        }
        if (effectTypes.includes('Crit Rate (base)')) {
          if (val0 > 0) {
            result.bonus.critRate += val0;
            result.breakdowns.critRate.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            handled = true;
          }
        }
        if (effectTypes.includes('Crit DMG (base)')) {
          if (val0 > 0) {
            result.bonus.critDmg += val0;
            result.breakdowns.critDmg.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            handled = true;
          }
        }
        const elemBaseType = `${char.element} DMG (base)`;
        if (effectTypes.includes(elemBaseType)) {
          if (val0 > 0) {
            result.bonus.elemDmg += val0;
            result.breakdowns.elemDmg.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            handled = true;
          }
        }

        // 2. Specific Character Talents without explicit effectType or with unique text
        if (!handled) {
          if (name === 'Blaze Unbound') {
            if (val0 > 0) {
              result.bonus.critRate += val0;
              result.breakdowns.critRate.push({ label: `${sourceLabel}: ${name} (Crit Rate)`, value: `+${val0}%`, source: sourceLabel });
            }
            if (val1 > 0) {
              result.bonus.critDmg += val1;
              result.breakdowns.critDmg.push({ label: `${sourceLabel}: ${name} (Crit DMG)`, value: `+${val1}%`, source: sourceLabel });
            }
          } else if (desc.includes('Crit DMG by') || desc.includes('Crit DMG dealt')) {
            // E.g. Firstlight Noya T1 (Buried Past: +12% Crit DMG), Freesia T5 (+48%)
            if (val0 > 0) {
              result.bonus.critDmg += val0;
              result.breakdowns.critDmg.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            }
          } else if (desc.includes(`${char.element} DMG`) && (desc.includes('increased by') || desc.includes('increases') || desc.includes('elite') || desc.includes('targets'))) {
            // E.g. Firstlight Noya T3 (Resolve Beyond Fate: +18% Lux DMG), Nanoha T5 (+24%), Chaton T5 (+24%), Firefly T5 (+24%), etc.
            if (val0 > 0) {
              result.bonus.elemDmg += val0;
              result.breakdowns.elemDmg.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            }
          } else if (desc.includes('Crit Rate') && (desc.includes('increased by') || desc.includes('increases'))) {
            // E.g. Snowish Laru T1 (Skill Crit Rate +10%)
            if (val0 > 0) {
              result.bonus.critRate += val0;
              result.breakdowns.critRate.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            }
          } else if (desc.includes('Max HP by') || desc.includes('Increases Max HP')) {
            if (val0 > 0) {
              percentHpBonus += val0;
              result.breakdowns.hp.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            }
          } else if (desc.includes('Increases ATK by') || desc.includes('increases ATK by') || desc.includes("squad's ATK by")) {
            if (val0 > 0) {
              percentAtkBonus += val0;
              result.breakdowns.atk.push({ label: `${sourceLabel}: ${name}`, value: `+${val0}%`, source: sourceLabel });
            }
          }
        }
      });
    }

  // 4b. Potentials Calculation (Synced with Potential Levels 1-9 & Lv.90 Emblem Unique Bonus)
  if (char.potential && build.potentialLevels) {
    // Check if Lv.90 Emblem boosts specific potentials (supports multiple unique_talent lines)
    const emblemTalentBonuses: { [potId: number]: number } = {};
    for (const line of build.emblems?.lv90?.lines || []) {
      if (line && line.statId === 'unique_talent') {
        const statDef = ALL_EMBLEM_STATS['unique_talent'];
        if (statDef) {
          const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
          const potId = line.targetPotentialId || char.potential.mainNormal?.[0]?.id;
          if (potId) {
            emblemTalentBonuses[potId] = Math.min(3, (emblemTalentBonuses[potId] || 0) + val);
          }
        }
      }
    }

    const cats = ['mainCore', 'mainNormal', 'common', 'supportCore', 'supportNormal'] as const;
    for (const cat of cats) {
      for (const p of char.potential[cat] || []) {
        const baseLvl = build.potentialLevels[p.id] || 0;
        const eBonus = emblemTalentBonuses[p.id] || 0;
        // If not selected/activated by user (baseLvl === 0), it MUST remain 0 even if upgraded in Lv.90 emblem
        // Base level is capped at 6, and with Emblem bonus (+1..+3) total effective level is max 9.
        const effectiveLvl = baseLvl > 0 ? Math.min(9, baseLvl + eBonus) : 0;

        if (effectiveLvl > 0) {
          const pParams = p.params || [];
          const tooltips = p.paramsTooltips || [];

          // Collect attributes to evaluate from addAttrType, effectType, and tooltips
          const attrList: { type: 'addAttrType' | 'effectType'; name: string }[] = [];
          (p.addAttrType || []).forEach((a) => {
            if (!attrList.some((x) => x.name === a)) attrList.push({ type: 'addAttrType', name: a });
          });
          (p.effectType || []).forEach((e) => {
            if (!attrList.some((x) => x.name === e)) attrList.push({ type: 'effectType', name: e });
          });
          tooltips.forEach((tip) => {
            if (tip?.addAttrType && !attrList.some((x) => x.name === tip.addAttrType)) {
              attrList.push({ type: 'addAttrType', name: tip.addAttrType });
            }
            if (tip?.effectType && !attrList.some((x) => x.name === tip.effectType)) {
              attrList.push({ type: 'effectType', name: tip.effectType });
            }
          });

          attrList.forEach(({ type: attrKind, name: attr }) => {
            let valStr = '';

            // 1. Match via paramsTooltips
            for (let i = 0; i < tooltips.length; i++) {
              const tip = tooltips[i];
              const pVal = pParams[i];
              if (!tip || pVal === undefined) continue;

              const isMatch =
                (attrKind === 'addAttrType' &&
                  tip.addAttrType &&
                  (tip.addAttrType === attr || tip.addAttrType.includes(attr) || attr.includes(tip.addAttrType))) ||
                (attrKind === 'effectType' &&
                  tip.effectType &&
                  (tip.effectType === attr || tip.effectType.includes(attr) || attr.includes(tip.effectType)));

              if (isMatch) {
                if (typeof pVal === 'string') {
                  if (pVal.includes('/')) {
                    const parts = pVal.split('/');
                    valStr = parts[Math.min(effectiveLvl - 1, parts.length - 1)] || parts[0];
                  } else if (pVal.includes('%') || !isNaN(parseFloat(pVal))) {
                    valStr = pVal;
                  }
                } else if (typeof pVal === 'number') {
                  valStr = String(pVal);
                }
                if (valStr) break;
              }
            }

            // 2. Fallback search in pParams if tooltip didn't match
            if (!valStr) {
              for (let i = pParams.length - 1; i >= 0; i--) {
                const param = pParams[i];
                const tip = tooltips[i];
                // Skip purely damage scaling multipliers
                if (tip && tip.damageType && !tip.addAttrType && !tip.effectType) continue;

                if (typeof param === 'string') {
                  if (param.includes('/')) {
                    const parts = param.split('/');
                    valStr = parts[Math.min(effectiveLvl - 1, parts.length - 1)] || parts[0];
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

            const numVal = parseFloat(valStr.replace('%', ''));
            if (!isNaN(numVal) && numVal !== 0) {
              const isCore = cat === 'mainCore' || cat === 'supportCore' || p.rarity === 'core';
              const labelSuffix = isCore
                ? ' (Core)'
                : eBonus > 0
                ? ` (Lv.${effectiveLvl} [Base ${baseLvl}+${eBonus}])`
                : ` (Lv.${effectiveLvl})`;

              if (attr.includes('ATK (%)') || attr.includes('ATK%')) {
                percentAtkBonus += numVal;
                result.breakdowns.atk.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}%`, source: 'Potential' });
              } else if (attr.includes('ATK (base)')) {
                flatAtkBonus += numVal;
                result.breakdowns.atk.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}`, source: 'Potential' });
              } else if (attr.includes('Crit Rate')) {
                result.bonus.critRate += numVal;
                result.breakdowns.critRate.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}%`, source: 'Potential' });
              } else if (attr.includes('Crit DMG')) {
                result.bonus.critDmg += numVal;
                result.breakdowns.critDmg.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}%`, source: 'Potential' });
              } else if (attr.includes('DEF PEN')) {
                result.bonus.defPen += numVal;
                result.breakdowns.defPen.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}`, source: 'Potential' });
              } else if (attr.includes('DEF (base)') || attr.includes('DEF (abs)')) {
                flatDefBonus += numVal;
                result.breakdowns.def.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `${numVal > 0 ? '+' : ''}${numVal}`, source: 'Potential' });
              } else if (attr.includes('DEF (%)')) {
                percentDefBonus += numVal;
                result.breakdowns.def.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}%`, source: 'Potential' });
              } else if (attr.includes('HP (base)')) {
                flatHpBonus += numVal;
                result.breakdowns.hp.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}`, source: 'Potential' });
              } else if (attr.includes('HP (%)')) {
                percentHpBonus += numVal;
                result.breakdowns.hp.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}%`, source: 'Potential' });
              } else if (
                (attr.includes('DMG (base)') || attr.includes('DMG')) &&
                attr.toLowerCase().includes(char.element.toLowerCase())
              ) {
                result.bonus.elemDmg += numVal;
                result.breakdowns.elemDmg.push({ label: `Potential: ${p.name}${labelSuffix}`, value: `+${numVal}%`, source: 'Potential' });
              } else if (
                attr.includes('PEN') ||
                attr.toLowerCase().includes(`${char.element.toLowerCase()} pen`) ||
                attr.toLowerCase().includes('elemental pen')
              ) {
                const descLower = (p.desc || '').toLowerCase();
                let multiplier = 1;
                let stackNote = '';
                if (descLower.includes('in the squad') || descLower.includes('on the squad')) {
                  const matchingCount = squad.filter(
                    (c) => c && c.element && c.element.toLowerCase() === char.element.toLowerCase()
                  ).length;
                  multiplier = Math.max(1, matchingCount);
                  stackNote = ` (${multiplier}x ${char.element} in Squad)`;
                }

                const totalVal = numVal * multiplier;
                result.bonus.elemPen += totalVal;
                result.breakdowns.elemPen.push({
                  label: `Potential: ${p.name}${labelSuffix}${stackNote}`,
                  value: `+${totalVal}`,
                  source: 'Potential'
                });
              }
            }
          });
        }
      }
    }
  }



  // 4d. Harmony Notes Calculation (13 SubNoteSkills, Lv. 1-99)
  const userNotes = build.harmonyNoteLevels || {};
  const noteDefs: { [id: string]: { name: string; stat: string; perLv: number } } = {
    '90011': { name: 'Melody of Pummel', stat: 'ATK', perLv: 0.3 },
    '90012': { name: 'Melody of Luck', stat: 'Crit Rate', perLv: 0.1 },
    '90013': { name: 'Melody of Burst', stat: 'Crit DMG', perLv: 0.46 },
    '90014': { name: 'Melody of Stamina', stat: 'Max HP', perLv: 0.3 },
    '90015': { name: 'Melody of Focus', stat: 'Auto Attack DMG', perLv: 1.2 },
    '90016': { name: 'Melody of Skill', stat: 'Skill DMG', perLv: 0.46 },
    '90017': { name: 'Melody of Ultimate', stat: 'Ultimate DMG', perLv: 1.0 },
    '90018': { name: 'Melody of Aqua', stat: 'Aqua DMG', perLv: 0.3 },
    '90019': { name: 'Melody of Ignis', stat: 'Ignis DMG', perLv: 0.3 },
    '90020': { name: 'Melody of Ventus', stat: 'Ventus DMG', perLv: 0.3 },
    '90021': { name: 'Melody of Terra', stat: 'Terra DMG', perLv: 0.3 },
    '90022': { name: 'Melody of Lux', stat: 'Lux DMG', perLv: 0.3 },
    '90023': { name: 'Melody of Umbra', stat: 'Umbra DMG', perLv: 0.3 },
  };

  for (const [nId, def] of Object.entries(noteDefs)) {
    const rawLv = userNotes[nId];
    if (rawLv === undefined || rawLv === null || rawLv <= 0) continue;

    const noteLv = Math.max(1, Math.min(99, rawLv));
    const bonusVal = Number((noteLv * def.perLv).toFixed(2));

    if (def.stat === 'ATK') {
      percentAtkBonus += bonusVal;
      result.breakdowns.atk.push({
        label: `Harmony Note: ${def.name} (Lv.${noteLv})`,
        value: `+${bonusVal}%`,
        source: 'Harmony Note'
      });
    } else if (def.stat === 'Crit Rate') {
      result.bonus.critRate += bonusVal;
      result.breakdowns.critRate.push({
        label: `Harmony Note: ${def.name} (Lv.${noteLv})`,
        value: `+${bonusVal}%`,
        source: 'Harmony Note'
      });
    } else if (def.stat === 'Crit DMG') {
      result.bonus.critDmg += bonusVal;
      result.breakdowns.critDmg.push({
        label: `Harmony Note: ${def.name} (Lv.${noteLv})`,
        value: `+${bonusVal}%`,
        source: 'Harmony Note'
      });
    } else if (def.stat === 'Max HP') {
      percentHpBonus += bonusVal;
      result.breakdowns.hp.push({
        label: `Harmony Note: ${def.name} (Lv.${noteLv})`,
        value: `+${bonusVal}%`,
        source: 'Harmony Note'
      });
    } else if (def.stat.includes('DMG') && char.element && def.stat.toLowerCase().includes(char.element.toLowerCase())) {
      result.bonus.elemDmg += bonusVal;
      result.breakdowns.elemDmg.push({
        label: `Harmony Note: ${def.name} (Lv.${noteLv})`,
        value: `+${bonusVal}%`,
        source: 'Harmony Note'
      });
    }
  }

  // 5. In-Combat Active Buffs (Skill / Ult) - Synced with Effective Skill Levels (Always Active)
  if (char.name.includes('Noya')) {
    const crVal = result.effectiveSkillLevels.ult >= 10 ? 20 : 18.2;
    result.bonus.critRate += crVal;
    result.breakdowns.critRate.push({
      label: `Ultimate: Empyrean Starender (Lv.${result.effectiveSkillLevels.ult})`,
      value: `+${crVal}%`,
      source: 'Ultimate Active'
    });
  } else {
    percentAtkBonus += 15;
    result.breakdowns.atk.push({
      label: `Ultimate In-Combat Surge`,
      value: `+15%`,
      source: 'Combat Buff'
    });
  }

  // 5b. Cross-Trekker Squad & Support Buffs (Support 1 & Support 2 -> Main Trekker)
  const supportSlots: {
    slotKey: 'support1' | 'support2';
    label: string;
    slotData?: TeamMemberSlot;
    char?: Character | null;
  }[] = [
    { slotKey: 'support1', label: 'Support 1', slotData: build.support1, char: supp1Char },
    { slotKey: 'support2', label: 'Support 2', slotData: build.support2, char: supp2Char }
  ];

  for (const supp of supportSlots) {
    if (!supp.slotData || !supp.char) continue;
    const sChar = supp.char;
    const sSlot = supp.slotData;

    // A. Support Skill Buffs (Always active in-combat)
    if (
      sChar.supportSkill &&
      sChar.supportSkill.desc &&
      sChar.supportSkill.params
    ) {
      const sDesc = sChar.supportSkill.desc;
      const sParams = sChar.supportSkill.params;
      const sLvl = Math.max(1, Math.min(10, sSlot.skillLevels?.support || 10));
      const sourceTag = `${supp.label} (${sChar.name})`;

      // 1. Robust pattern matching: 'increases ... &ParamX& [stat] by &ParamY& [val]'
      const clean = sDesc.replace(/<\/?(?:color|b|i|size|material)[^>]*>/gi, '');
      const pairRegex = /(?:additionally\s+)?(?:increases|boosts)\s+(?:the\s+)?(?:squad(?:'s)?|main trekker(?:'s)?|friendly|allies|target(?:'s)?)?\s*&Param(\d+)&(?:\s+dealt)?\s+by\s+&Param(\d+)&/gi;
      let pMatch;
      let handledByPair = false;

      while ((pMatch = pairRegex.exec(clean)) !== null) {
        const statNameRaw = sParams[parseInt(pMatch[1], 10) - 1];
        const statName = String(statNameRaw || '').toLowerCase();
        const valRaw = sParams[parseInt(pMatch[2], 10) - 1];
        if (!valRaw) continue;

        let valStr = String(valRaw);
        if (valStr.includes('/')) {
          const parts = valStr.split('/');
          valStr = parts[Math.min(sLvl - 1, parts.length - 1)] || parts[0];
        }
        const num = parseFloat(valStr.replace('%', ''));
        if (isNaN(num) || num <= 0) continue;

        if (statName.includes('atk')) {
          percentAtkBonus += num;
          result.breakdowns.atk.push({
            label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
            value: `+${num}%`,
            source: supp.label
          });
          handledByPair = true;
        } else if (statName.includes('crit rate')) {
          result.bonus.critRate += num;
          result.breakdowns.critRate.push({
            label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
            value: `+${num}%`,
            source: supp.label
          });
          handledByPair = true;
        } else if (statName.includes('crit dmg')) {
          result.bonus.critDmg += num;
          result.breakdowns.critDmg.push({
            label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
            value: `+${num}%`,
            source: supp.label
          });
          handledByPair = true;
        } else if (
          statName.includes('dmg taken') ||
          statName.includes('vul')
        ) {
          result.bonus.vulnDmgTaken = (result.bonus.vulnDmgTaken || 0) + num;
          if (!result.breakdowns.vulnDmgTaken) result.breakdowns.vulnDmgTaken = [];
          result.breakdowns.vulnDmgTaken.push({
            label: `${sourceTag}: Vulnerability (Lv.${sLvl})`,
            value: `+${num}%`,
            source: supp.label
          });
          handledByPair = true;
        } else if (
          statName.includes('dmg') &&
          char.element &&
          statName.includes(char.element.toLowerCase())
        ) {
          result.bonus.elemDmg += num;
          result.breakdowns.elemDmg.push({
            label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
            value: `+${num}%`,
            source: supp.label
          });
          handledByPair = true;
        }
      }

      // 2. Direct string fallback (e.g. 'increases the squad's ATK by &ParamX&')
      if (!handledByPair) {
        const sDescLower = sDesc.toLowerCase();
        const isSquadBuff =
          sDescLower.includes("squad's") ||
          sDescLower.includes("squad receives") ||
          sDescLower.includes("all friendly") ||
          sDescLower.includes("friendly units") ||
          sDescLower.includes("main trekker") ||
          sDescLower.includes(`increases the atk of ${char.element.toLowerCase()} trekkers`) ||
          sDescLower.includes(`increases the atk of`) ||
          sDescLower.includes(`increases ${char.element.toLowerCase()} dmg`);

        if (isSquadBuff) {
          for (let idx = 0; idx < sParams.length; idx++) {
            const pVal = sParams[idx];
            if (typeof pVal === 'string' && (pVal.includes('/') || pVal.includes('%'))) {
              const placeholder = `&Param${idx + 1}&`.toLowerCase();
              const pIndex = sDescLower.indexOf(placeholder);
              if (pIndex === -1) continue;

              const before = sDescLower.slice(Math.max(0, pIndex - 50), pIndex);
              const after = sDescLower.slice(pIndex, Math.min(sDescLower.length, pIndex + 40));
              const clause = before + after;

              // Only take if it is an increase/buff, NOT an attack damage line
              if (!clause.includes('increase') && !clause.includes('boost')) continue;

              let valStr = pVal;
              if (pVal.includes('/')) {
                const parts = pVal.split('/');
                valStr = parts[Math.min(sLvl - 1, parts.length - 1)] || parts[0];
              }
              const num = parseFloat(valStr.replace('%', ''));
              if (isNaN(num) || num <= 0) continue;

              if (clause.includes('atk')) {
                percentAtkBonus += num;
                result.breakdowns.atk.push({
                  label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
                  value: `+${num}%`,
                  source: supp.label
                });
                break;
              } else if (clause.includes('crit rate')) {
                result.bonus.critRate += num;
                result.breakdowns.critRate.push({
                  label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
                  value: `+${num}%`,
                  source: supp.label
                });
                break;
              } else if (clause.includes('crit dmg')) {
                result.bonus.critDmg += num;
                result.breakdowns.critDmg.push({
                  label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
                  value: `+${num}%`,
                  source: supp.label
                });
                break;
              } else if (clause.includes(`${char.element.toLowerCase()} dmg`)) {
                result.bonus.elemDmg += num;
                result.breakdowns.elemDmg.push({
                  label: `${sourceTag}: Support Skill (Lv.${sLvl})`,
                  value: `+${num}%`,
                  source: supp.label
                });
                break;
              }
            }
          }
        }
      }
    }

    // B. Support Potentials (supportCore, supportNormal, common, mainNormal)
    if (sSlot.potentialLevels && sChar.potential) {
      const sEmblemBonuses: { [potId: number]: number } = {};
      for (const line of sSlot.emblems?.lv90?.lines || []) {
        if (line && line.statId === 'unique_talent') {
          const statDef = ALL_EMBLEM_STATS['unique_talent'];
          if (statDef) {
            const val = statDef.values[line.tier - 1] ?? statDef.values[statDef.values.length - 1];
            const potId = line.targetPotentialId || sChar.potential.mainNormal?.[0]?.id;
            if (potId) sEmblemBonuses[potId] = Math.min(3, (sEmblemBonuses[potId] || 0) + val);
          }
        }
      }

      const suppCats = ['supportCore', 'supportNormal', 'common', 'mainNormal'] as const;
      for (const cat of suppCats) {
        for (const p of sChar.potential[cat] || []) {
          const baseLvl = sSlot.potentialLevels[p.id] || 0;
          const eBonus = sEmblemBonuses[p.id] || 0;
          const effLvl = baseLvl > 0 ? Math.min(9, baseLvl + eBonus) : 0;

          if (effLvl > 0) {
            const desc = (p.desc || '').toLowerCase();
            const isSquadTarget =
              desc.includes('squad') ||
              desc.includes('main trekker') ||
              desc.includes('friendly') ||
              desc.includes('allies') ||
              desc.includes('their') ||
              desc.includes('dmg taken') ||
              (desc.includes(`${char.element.toLowerCase()} trekker`) && desc.includes('increases'));

            if (isSquadTarget) {
              const pParams = p.params || [];
              for (let idx = 0; idx < pParams.length; idx++) {
                const param = pParams[idx];
                if (typeof param === 'string' && (param.includes('/') || param.includes('%') || !isNaN(parseFloat(param)))) {
                  let valStr = param;
                  if (param.includes('/')) {
                    const parts = param.split('/');
                    valStr = parts[Math.min(effLvl - 1, parts.length - 1)] || parts[0];
                  }
                  const num = parseFloat(valStr.replace('%', ''));
                  if (!isNaN(num) && num > 0) {
                    const prevP = (pParams[idx - 1] ? String(pParams[idx - 1]) : '').toUpperCase();
                    const nextP = (pParams[idx + 1] ? String(pParams[idx + 1]) : '').toUpperCase();
                    const label = `${supp.label} (${sChar.name}) - Potential: ${p.name} (Lv.${effLvl})`;

                    // 1. Vulnerability / DMG Taken
                    const isVulnParam =
                      (prevP.includes('DMG TAKEN') || prevP.includes('VUL') || desc.includes('dmg taken')) &&
                      !nextP.includes('DMG TAKEN') &&
                      num <= 35; // Value of vuln per stack/hit is never >35%

                    if (isVulnParam) {
                      // Stellar Crash / Luminous Onslaught stacking check
                      let stackCount = 1;
                      if (p.name.includes('Stellar Crash')) stackCount = 10; // average realistic combat stacks ~10
                      else if (p.name.includes('Luminous Onslaught')) stackCount = 4;
                      const totalVuln = Number((num * stackCount).toFixed(1));

                      result.bonus.vulnDmgTaken = (result.bonus.vulnDmgTaken || 0) + totalVuln;
                      if (!result.breakdowns.vulnDmgTaken) result.breakdowns.vulnDmgTaken = [];
                      result.breakdowns.vulnDmgTaken.push({
                        label: `${label} [Vulnerability]`,
                        value: `+${totalVuln}%`,
                        source: supp.label
                      });
                      break;
                    }
                    // 2. Squad / Main Trekker ATK
                    else if (
                      prevP.includes('ATK') ||
                      nextP.includes('ATK') ||
                      desc.includes("squad's atk") ||
                      desc.includes("increases atk") ||
                      desc.includes("increases the atk")
                    ) {
                      percentAtkBonus += num;
                      result.breakdowns.atk.push({ label, value: `+${num}%`, source: supp.label });
                      break;
                    }
                    // 3. DEF
                    else if (prevP.includes('DEF') || nextP.includes('DEF') || desc.includes('def by')) {
                      percentDefBonus += num;
                      result.breakdowns.def.push({ label, value: `+${num}%`, source: supp.label });
                      break;
                    }
                    // 4. Crit Rate
                    else if (prevP.includes('CRIT RATE') || nextP.includes('CRIT RATE') || desc.includes('crit rate')) {
                      result.bonus.critRate += num;
                      result.breakdowns.critRate.push({ label, value: `+${num}%`, source: supp.label });
                      break;
                    }
                    // 5. Crit DMG
                    else if (prevP.includes('CRIT DMG') || nextP.includes('CRIT DMG') || desc.includes('crit dmg')) {
                      result.bonus.critDmg += num;
                      result.breakdowns.critDmg.push({ label, value: `+${num}%`, source: supp.label });
                      break;
                    }
                    // 6. Element DMG (e.g. Domain of Purity: +40% Lux DMG + 32% on-field)
                    else if (
                      prevP.includes('DMG') ||
                      nextP.includes('DMG') ||
                      desc.includes(`${char.element.toLowerCase()} dmg`)
                    ) {
                      result.bonus.elemDmg += num;
                      result.breakdowns.elemDmg.push({ label, value: `+${num}%`, source: supp.label });
                      // Note: Do not break if next param is also an element DMG boost (like Domain of Purity)
                      if (!pParams[idx + 1] || !String(pParams[idx + 1]).includes('%')) {
                        break;
                      }
                    }
                    // 7. PEN
                    else if (desc.includes('pen') || prevP.includes('PEN')) {
                      result.bonus.elemPen += num;
                      result.breakdowns.elemPen.push({ label, value: `+${num}`, source: supp.label });
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  if (build.affinityLevel > 0) {
    const lvl = Math.max(0, Math.min(30, build.affinityLevel));
    const lvlData = affinityData.levels[lvl];
    if (lvlData) {
      if (lvlData.hp > 0) {
        flatHpBonus += lvlData.hp;
        result.breakdowns.hp.push({
          label: `Affinity Rank ${lvl} (Flat)`,
          value: `+${lvlData.hp.toLocaleString()}`,
          source: 'Affinity'
        });
      }
      if (lvlData.atk > 0) {
        flatAtkBonus += lvlData.atk;
        result.breakdowns.atk.push({
          label: `Affinity Rank ${lvl} (Flat)`,
          value: `+${lvlData.atk.toLocaleString()}`,
          source: 'Affinity'
        });
      }

      const tmpl = char?.affinityTemplate === 3 ? 3 : 2;
      const boost = lvlData.boost?.[tmpl];
      if (boost && boost.percent > 0) {
        if (boost.stat === 'ATK') {
          percentAtkBonus += boost.percent;
          result.breakdowns.atk.push({
            label: `Affinity Rank ${lvl} Boost (+${boost.percent}%)`,
            value: `+${boost.percent}% (+${Math.round((result.base.atk * boost.percent) / 100).toLocaleString()})`,
            source: 'Affinity Milestone'
          });
        } else if (boost.stat === 'HP') {
          percentHpBonus += boost.percent;
          result.breakdowns.hp.push({
            label: `Affinity Rank ${lvl} Boost (+${boost.percent}%)`,
            value: `+${boost.percent}% (+${Math.round((result.base.hp * boost.percent) / 100).toLocaleString()})`,
            source: 'Affinity Milestone'
          });
        }
      }
    }
  }

  // Calculate Final Totals
  const totalHpBonus = flatHpBonus + Math.round((result.base.hp * percentHpBonus) / 100);
  const totalAtkBonus = flatAtkBonus + Math.round((result.base.atk * percentAtkBonus) / 100);
  const totalDefBonus = flatDefBonus + Math.round((result.base.def * percentDefBonus) / 100);

  result.bonus.hp = totalHpBonus;
  result.bonus.atk = totalAtkBonus;
  result.bonus.def = totalDefBonus;

  result.total.hp = result.base.hp + result.bonus.hp;
  result.total.atk = result.base.atk + result.bonus.atk;
  result.total.def = result.base.def + result.bonus.def;
  result.total.critRate = Math.min(100, Math.round((result.base.critRate + result.bonus.critRate) * 10) / 10);
  result.total.critDmg = Math.round((result.base.critDmg + result.bonus.critDmg) * 10) / 10;
  result.total.chargeEffMain = result.base.chargeEffMain + result.bonus.chargeEffMain;
  result.total.chargeEffSupport = result.base.chargeEffSupport + result.bonus.chargeEffSupport;
  result.total.elemDmg = result.base.elemDmg + result.bonus.elemDmg;
  result.total.elemPen = result.base.elemPen + result.bonus.elemPen;
  result.total.defPen = result.base.defPen + result.bonus.defPen;
  result.total.vulnDmgTaken = (result.base.vulnDmgTaken || 0) + (result.bonus.vulnDmgTaken || 0);

  return result;
}
