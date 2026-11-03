/**
 * Extracts and prepares compact dataset for the Web Stats Calculator.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(__dirname, 'src/data');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Process Characters
const rawCharacters = JSON.parse(fs.readFileSync(path.join(ROOT, 'character.json'), 'utf8'));
const rawCharAffinityTemplate = JSON.parse(fs.readFileSync(path.join(ROOT, 'EN/bin/CharAffinityTemplate.json'), 'utf8'));
const processedCharacters = {};

for (const id in rawCharacters) {
  const c = rawCharacters[id];
  processedCharacters[id] = {
    id: c.id,
    name: c.name,
    star: c.star,
    element: c.element,
    class: c.class,
    attackType: c.attackType,
    affinityTemplate: rawCharAffinityTemplate[id]?.TemplateId || 2,
    style: c.style,
    force: c.force,
    cnCv: c.cnCv,
    jpCv: c.jpCv,
    birthday: c.birthday,
    loveGift: c.loveGift,
    hateGift: c.hateGift,
    fixedStat: c.fixedStat,
    normalAtk: c.normalAtk ? {
      name: c.normalAtk.name,
      icon: c.normalAtk.icon,
      desc: c.normalAtk.desc,
      params: c.normalAtk.params
    } : null,
    skill: c.skill ? {
      name: c.skill.name,
      icon: c.skill.icon,
      desc: c.skill.desc,
      cooldown: c.skill.cooldown,
      params: c.skill.params
    } : null,
    supportSkill: c.supportSkill ? {
      name: c.supportSkill.name,
      icon: c.supportSkill.icon,
      desc: c.supportSkill.desc,
      cooldown: c.supportSkill.cooldown,
      params: c.supportSkill.params
    } : null,
    ultimate: c.ultimate ? {
      name: c.ultimate.name,
      icon: c.ultimate.icon,
      desc: c.ultimate.desc,
      cooldown: c.ultimate.cooldown,
      energyLimit: c.ultimate.energyLimit,
      params: c.ultimate.params
    } : null,
    talent: (c.talent || []).map(t => ({
      name: t.name,
      boost: (t.boost || []).map(b => ({
        name: b.name,
        desc: b.desc,
        effectType: b.effectType,
        params: b.params
      }))
    })),
    potential: c.potential || [],
    stat: c.stat || [] // Level 1 to 90 stats
  };
}

fs.writeFileSync(path.join(OUT_DIR, 'characters.json'), JSON.stringify(processedCharacters));
console.log(`Saved ${Object.keys(processedCharacters).length} characters to src/data/characters.json`);

// 2. Process Discs
const rawDiscs = JSON.parse(fs.readFileSync(path.join(ROOT, 'disc.json'), 'utf8'));
const rawItem = JSON.parse(fs.readFileSync(path.join(ROOT, 'EN/bin/Item.json'), 'utf8'));
const processedDiscs = {};

for (const id in rawDiscs) {
  const d = rawDiscs[id];
  const itemData = rawItem[id];
  const outfitIcon = itemData?.Icon ? itemData.Icon.split('/').pop() : null;

  processedDiscs[id] = {
    id: d.id,
    name: d.name,
    icon: outfitIcon, // e.g. "outfit_1001"
    star: d.star,
    element: d.element,
    char: d.char,
    tag: d.tag,
    mainSkill: d.mainSkill ? {
      name: d.mainSkill.name,
      desc: d.mainSkill.desc,
      params: d.mainSkill.params,
      effectType: d.mainSkill.effectType,
      icon: d.mainSkill.icon
    } : null,
    stat: d.stat,
    dupe: d.dupe,
    supportNote: d.supportNote
  };
}

fs.writeFileSync(path.join(OUT_DIR, 'discs.json'), JSON.stringify(processedDiscs));
console.log(`Saved ${Object.keys(processedDiscs).length} discs to src/data/discs.json`);

// 3. Process Emblems
const rawEmblem = JSON.parse(fs.readFileSync(path.join(ROOT, 'emblem.json'), 'utf8'));
fs.writeFileSync(path.join(OUT_DIR, 'emblems.json'), JSON.stringify(rawEmblem));
console.log('Saved emblems to src/data/emblems.json');

// 4. Process Affinity Data (Levels 0-30 & Milestone Rewards)
const rawAffinityLevel = JSON.parse(fs.readFileSync(path.join(ROOT, 'EN/bin/AffinityLevel.json'), 'utf8'));
const rawEffectValue = JSON.parse(fs.readFileSync(path.join(ROOT, 'EN/bin/EffectValue.json'), 'utf8'));
const rawUpReward = JSON.parse(fs.readFileSync(path.join(ROOT, 'EN/bin/AffinityUpReward.json'), 'utf8'));
const rawUpRewardLang = JSON.parse(fs.readFileSync(path.join(ROOT, 'EN/language/en_US/AffinityUpReward.json'), 'utf8'));
const { ATTR_TYPE } = require(path.join(ROOT, 'utils.js'));

const levels = [];
for (let lvl = 0; lvl <= 30; lvl++) {
  if (lvl === 0) {
    levels.push({
      level: 0,
      hp: 0,
      atk: 0,
      boost: { 2: { stat: 'ATK', percent: 0 }, 3: { stat: 'HP', percent: 0 } }
    });
    continue;
  }
  const row2 = Object.values(rawAffinityLevel).find(x => x.TemplateId === 2 && x.AffinityLevel === lvl);
  const row3 = Object.values(rawAffinityLevel).find(x => x.TemplateId === 3 && x.AffinityLevel === lvl);

  let hp = 0, atk = 0;
  let pct2 = 0, pct3 = 0;

  for (const eid of (row2?.Effect || [])) {
    const ev = rawEffectValue[eid];
    if (!ev) continue;
    const type = ATTR_TYPE[ev.EffectTypeFirstSubtype];
    if (ev.EffectTypeSecondSubtype === 1) {
      if (type === 'HP') hp = +ev.EffectTypeParam1;
      if (type === 'ATK') atk = +ev.EffectTypeParam1;
    } else if (ev.EffectTypeSecondSubtype === 2) {
      pct2 = Math.round(+ev.EffectTypeParam1 * 100);
    }
  }

  for (const eid of (row3?.Effect || [])) {
    const ev = rawEffectValue[eid];
    if (ev && ev.EffectTypeSecondSubtype === 2) {
      pct3 = Math.round(+ev.EffectTypeParam1 * 100);
    }
  }

  levels.push({
    level: lvl,
    hp,
    atk,
    boost: {
      2: { stat: 'ATK', percent: pct2 },
      3: { stat: 'HP', percent: pct3 }
    }
  });
}

const milestones = [5, 10, 15, 20, 25, 30].map(lvl => {
  const r = Object.values(rawUpReward).find(x => x.CharId === 103 && x.RewardLevel === lvl);
  const unlocks = [];
  if (r) {
    for (let i = 1; i <= 3; i++) {
      const f = rawUpRewardLang[r['DescFront' + i]];
      const a = rawUpRewardLang[r['DescAfter' + i]];
      if (f && a) unlocks.push({ category: f, title: a });
    }
  }
  return {
    level: lvl,
    unlocks,
    stepBoost: {
      2: { stat: 'ATK', percent: 4, label: 'ATK +4%' },
      3: { stat: 'HP', percent: 2, label: 'HP +2%' }
    },
    totalBoost: {
      2: { stat: 'ATK', percent: levels[lvl].boost[2].percent, label: `ATK +${levels[lvl].boost[2].percent}%` },
      3: { stat: 'HP', percent: levels[lvl].boost[3].percent, label: `HP +${levels[lvl].boost[3].percent}%` }
    }
  };
});

const affinityData = {
  templates: {
    2: { name: 'Standard (ATK Boost)', stat: 'ATK', stepPercent: 4 },
    3: { name: 'HP Specialist (HP Boost)', stat: 'HP', stepPercent: 2 }
  },
  levels,
  milestones
};

fs.writeFileSync(path.join(OUT_DIR, 'affinity.json'), JSON.stringify(affinityData, null, 2));
console.log('Saved affinity configuration to src/data/affinity.json');

