/**
 * Fast Stella Sora (ss-data) Query CLI
 * Designed for near-zero token consumption and instant lookups.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;

function loadJson(filename) {
  const filePath = path.join(ROOT_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to load ${filename}:`, e.message);
    return null;
  }
}

// Lazy loaded data
let _character = null;
let _characterId = null;
let _disc = null;
let _item = null;
let _gacha = null;

function getCharacters() {
  if (!_character) _character = loadJson('character.json') || {};
  return _character;
}

function getCharacterIds() {
  if (!_characterId) _characterId = loadJson('characterid.json') || {};
  return _characterId;
}

function getDiscs() {
  if (!_disc) _disc = loadJson('disc.json') || {};
  return _disc;
}

function getItems() {
  if (!_item) _item = loadJson('item.json') || {};
  return _item;
}

function getGacha() {
  if (!_gacha) _gacha = loadJson('gacha.json') || {};
  return _gacha;
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<color=[^>]+>/gi, '')
    .replace(/<\/color>/gi, '')
    .replace(/##[^#]+#\d+#/g, (m) => m.split('#')[1] || '')
    .replace(/\x0B/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

function resolveSkillText(desc, params, skillLevel = null) {
  if (!desc) return '';
  let txt = desc;
  if (Array.isArray(params)) {
    params.forEach((p, idx) => {
      let val = p;
      if (typeof p === 'string' && p.includes('/') && skillLevel) {
        const parts = p.split('/');
        val = parts[Math.min(skillLevel - 1, parts.length - 1)] || p;
      }
      txt = txt.replace(new RegExp(`&Param${idx + 1}&`, 'g'), `[${val}]`);
    });
  }
  return cleanText(txt);
}

function findCharacter(query) {
  const chars = getCharacters();
  const q = String(query).toLowerCase().trim();

  // 1. Direct ID match
  if (chars[query]) return chars[query];

  // 2. Exact name match
  for (const id in chars) {
    if (chars[id].name && chars[id].name.toLowerCase() === q) {
      return chars[id];
    }
  }

  // 3. Partial name match
  for (const id in chars) {
    if (chars[id].name && chars[id].name.toLowerCase().includes(q)) {
      return chars[id];
    }
  }

  return null;
}

function handleCharacter(args) {
  const query = args[0];
  if (!query) {
    console.log('Error: Missing character name or ID. Example: node query.js character Amber');
    return;
  }

  const char = findCharacter(query);
  if (!char) {
    console.log(`Character '${query}' not found.`);
    const chars = getCharacters();
    const matches = Object.values(chars)
      .filter((c) => c.name && c.name.toLowerCase().includes(query.toLowerCase()))
      .map((c) => `${c.name} (ID: ${c.id})`);
    if (matches.length > 0) {
      console.log(`Did you mean: ${matches.join(', ')}?`);
    } else {
      console.log('Run `node query.js characters` to list all available characters.');
    }
    return;
  }

  const showSkills = args.includes('--skills') || args.includes('-s');
  const showMats = args.includes('--mats') || args.includes('-m');
  const showTalents = args.includes('--talents') || args.includes('-t');
  const lvlIdx = args.indexOf('--level');
  const reqLevel = lvlIdx !== -1 && args[lvlIdx + 1] ? parseInt(args[lvlIdx + 1], 10) : null;
  const skillLvlIdx = args.indexOf('--skill-level');
  const reqSkillLvl = skillLvlIdx !== -1 && args[skillLvlIdx + 1] ? parseInt(args[skillLvlIdx + 1], 10) : null;

  console.log(`=== CHARACTER: ${char.name} (ID: ${char.id}) ===`);
  console.log(`Rarity: ${'★'.repeat(char.star || 0)} | Element: ${char.element} | Class: ${char.class} | Attack: ${char.attackType}`);
  if (char.style || char.force) console.log(`Faction/Force: ${char.force || '-'} | Style: ${char.style || '-'}`);
  if (char.birthday) console.log(`Birthday: ${char.birthday} | CV (CN): ${char.cnCv || '-'} | CV (JP): ${char.jpCv || '-'}`);
  if (char.loveGift) console.log(`Favorite Gifts: ${char.loveGift}`);
  if (char.hateGift) console.log(`Disliked Gifts: ${char.hateGift}`);

  // Base and Max Stats
  if (reqLevel && char.stat) {
    const s = char.stat.find((x) => x.Level === reqLevel) || char.stat[char.stat.length - 1];
    console.log(`\n[Stats at Level ${reqLevel}]`);
    console.log(`HP: ${s.HP} | ATK: ${s.ATK} | DEF: ${s.DEF} | Crit: ${s['Crit Rate']} | Crit DMG: ${s['Crit DMG']}`);
  } else if (char.stat && char.stat.length > 0) {
    const lvl1 = char.stat[0];
    const lvlMax = char.stat[char.stat.length - 1];
    console.log(`\n[Base Stats Lv1 -> Lv${lvlMax.Level}]`);
    console.log(`HP: ${lvl1.HP} -> ${lvlMax.HP} | ATK: ${lvl1.ATK} -> ${lvlMax.ATK} | DEF: ${lvl1.DEF} -> ${lvlMax.DEF}`);
    console.log(`Crit Rate: ${lvl1['Crit Rate']} | Crit DMG: ${lvl1['Crit DMG']}`);
  }

  if (char.fixedStat) {
    console.log(`Fixed: Ammo: ${char.fixedStat.Ammo || '-'} | Range: ${char.fixedStat['Attack Range'] || '-'} | Run Spd: ${char.fixedStat['Run Speed'] || '-'}`);
  }

  // Skills
  console.log('\n[Skills Overview]');
  if (char.normalAtk) console.log(`- Normal Attack: ${char.normalAtk.name || '-'}`);
  if (char.skill) console.log(`- Main Skill: ${char.skill.name || '-'}`);
  if (char.supportSkill) console.log(`- Support Skill: ${char.supportSkill.name || '-'}`);
  if (char.ultimate) console.log(`- Ultimate: ${char.ultimate.name || '-'}`);

  if (showSkills) {
    console.log('\n--- DETAILED SKILLS ---');
    const skillList = [
      { type: 'Normal Attack', s: char.normalAtk },
      { type: 'Main Skill', s: char.skill },
      { type: 'Support Skill', s: char.supportSkill },
      { type: 'Ultimate', s: char.ultimate }
    ];
    for (const item of skillList) {
      if (!item.s) continue;
      console.log(`\n[${item.type}]: ${item.s.name}`);
      if (item.s.cooldown) {
        const cd = String(item.s.cooldown);
        console.log(`Cooldown: ${cd.endsWith('s') ? cd : cd + 's'}`);
      }
      if (item.s.desc) {
        console.log(`Desc: ${resolveSkillText(item.s.desc, item.s.params, reqSkillLvl)}`);
      }
    }
  }

  if (showMats && char.upgrade) {
    console.log('\n--- UPGRADE MATERIALS ---');
    char.upgrade.forEach((m, idx) => {
      console.log(`Phase ${idx + 1}: ${JSON.stringify(m)}`);
    });
  }

  if (showTalents && char.talent && char.talent.length > 0) {
    console.log('\n--- TALENT TREE ---');
    char.talent.forEach((t) => {
      console.log(`\nTalent: ${t.name}`);
      if (t.boost) {
        t.boost.slice(0, 5).forEach((b) => {
          console.log(`  * ${b.name}: ${cleanText(b.desc)}`);
        });
        if (t.boost.length > 5) console.log(`  ... and ${t.boost.length - 5} more nodes`);
      }
    });
  }
}

function handleCharactersList() {
  const chars = getCharacters();
  const list = Object.values(chars).sort((a, b) => (b.star || 0) - (a.star || 0) || a.name.localeCompare(b.name));
  console.log(`Total Characters: ${list.length}`);
  console.log('ID\t★\tElement\t\tClass\t\tName');
  console.log('------------------------------------------------------------');
  for (const c of list) {
    const star = '★'.repeat(c.star || 0);
    const elem = (c.element || '-').padEnd(12);
    const cls = (c.class || '-').padEnd(14);
    console.log(`${c.id}\t${star}\t${elem}\t${cls}\t${c.name}`);
  }
}

function handleItem(args) {
  const query = args.join(' ').toLowerCase().trim();
  if (!query) {
    console.log('Error: Missing item name or ID. Example: node query.js item Dorra');
    return;
  }

  const items = getItems();
  const matches = [];

  for (const id in items) {
    const it = items[id];
    if (String(it.id) === query || (it.name && it.name.toLowerCase() === query)) {
      matches.unshift(it);
      break;
    } else if (it.name && it.name.toLowerCase().includes(query)) {
      matches.push(it);
    }
  }

  if (matches.length === 0) {
    console.log(`Item '${query}' not found.`);
    return;
  }

  if (matches.length === 1 || matches[0].name.toLowerCase() === query || String(matches[0].id) === query) {
    const it = matches[0];
    console.log(`=== ITEM: ${it.name} (ID: ${it.id}) ===`);
    console.log(`Rarity: ${it.rarity || '-'} | Type: ${it.type || '-'}`);
    if (it.desc) console.log(`Description: ${cleanText(it.desc)}`);
    if (it.literary) console.log(`Lore: ${cleanText(it.literary)}`);
  } else {
    console.log(`Found ${matches.length} matching items:`);
    matches.slice(0, 15).forEach((it) => {
      console.log(`- [ID: ${it.id}] ${it.name} (${it.rarity || '-'} / ${it.type || '-'})`);
    });
    if (matches.length > 15) {
      console.log(`... and ${matches.length - 15} more. Please be more specific.`);
    }
  }
}

function handleDisc(args) {
  const query = args.join(' ').toLowerCase().trim();
  if (!query) {
    console.log('Error: Missing disc name or ID. Example: node query.js disc "Crisp Morning"');
    return;
  }

  const discs = getDiscs();
  const matches = [];

  for (const id in discs) {
    const d = discs[id];
    if (String(d.id) === query || (d.name && d.name.toLowerCase() === query)) {
      matches.unshift(d);
      break;
    } else if (d.name && d.name.toLowerCase().includes(query)) {
      matches.push(d);
    }
  }

  if (matches.length === 0) {
    console.log(`Disc '${query}' not found.`);
    return;
  }

  const d = matches[0];
  console.log(`=== DISC: ${d.name} (ID: ${d.id}) ===`);
  console.log(`Rarity: ${'★'.repeat(d.star || 0)} | Element: ${d.element || 'None'} | Character: ${d.char ? d.char.join(', ') : '-'}`);
  if (d.tag) console.log(`Tags: ${d.tag.join(', ')} | Source: ${d.source ? d.source.join(', ') : '-'}`);

  if (d.mainSkill) {
    console.log(`\n[Main Skill]: ${d.mainSkill.name}`);
    console.log(`Description: ${cleanText(d.mainSkill.desc)}`);
    if (d.mainSkill.params) console.log(`Parameters: ${d.mainSkill.params}`);
  }

  if (d.stat && d.stat.length > 0) {
    const base = d.stat[0];
    const max = d.stat[d.stat.length - 1];
    console.log(`\n[Stats Lv1 -> Lv${d.stat.length}]: HP: ${base.HP} -> ${max.HP} | ATK: ${base.ATK} -> ${max.ATK}`);
  }
}

function handleGacha(args) {
  const gacha = getGacha();
  let list = Object.values(gacha);

  const typeFilter = args.includes('--char') ? 'character' : args.includes('--disc') ? 'disc' : null;
  const searchFilter = args.filter((a) => !a.startsWith('--')).join(' ').toLowerCase().trim();

  if (typeFilter) {
    list = list.filter((g) => g.type === typeFilter);
  }

  if (searchFilter) {
    list = list.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(searchFilter)) ||
        (g.rateUp5Star && g.rateUp5Star.some((x) => x.name.toLowerCase().includes(searchFilter))) ||
        (g.rateUp4Star && g.rateUp4Star.some((x) => x.name.toLowerCase().includes(searchFilter)))
    );
  }

  console.log(`=== GACHA BANNERS (Showing ${Math.min(list.length, 10)} of ${list.length}) ===\n`);

  list.slice(0, 10).forEach((g) => {
    console.log(`[${g.type?.toUpperCase() || 'BANNER'}] ${g.name} (ID: ${g.id})`);
    if (g.startTime && g.endTime) console.log(`Duration: ${g.startTime} to ${g.endTime}`);
    if (g.rateUp5Star && g.rateUp5Star.length > 0) {
      console.log(`Rate-Up 5★: ${g.rateUp5Star.map((x) => `${x.name} (${x.element})`).join(', ')}`);
    }
    if (g.rateUp4Star && g.rateUp4Star.length > 0) {
      console.log(`Rate-Up 4★: ${g.rateUp4Star.map((x) => `${x.name} (${x.element})`).join(', ')}`);
    }
    console.log('------------------------------------------------------------');
  });

  if (list.length > 10) {
    console.log(`\n... and ${list.length - 10} more. Use 'node query.js gacha <character_name>' or '--char' / '--disc' to filter.`);
  }
}

function handleSearch(args) {
  const query = args.join(' ').toLowerCase().trim();
  if (!query) {
    console.log('Error: Missing search keyword.');
    return;
  }

  console.log(`=== SEARCH RESULTS FOR: "${query}" ===\n`);

  // Characters
  const chars = getCharacters();
  const charMatches = Object.values(chars).filter((c) => c.name && c.name.toLowerCase().includes(query));
  if (charMatches.length > 0) {
    console.log(`[Characters (${charMatches.length})]`);
    charMatches.forEach((c) => console.log(`  - ${c.name} (${'★'.repeat(c.star || 0)}, ${c.element} ${c.class}) [ID: ${c.id}]`));
    console.log();
  }

  // Discs
  const discs = getDiscs();
  const discMatches = Object.values(discs).filter((d) => d.name && d.name.toLowerCase().includes(query));
  if (discMatches.length > 0) {
    console.log(`[Discs (${discMatches.length})]`);
    discMatches.slice(0, 10).forEach((d) => console.log(`  - ${d.name} (${'★'.repeat(d.star || 0)}, ${d.element}) [ID: ${d.id}]`));
    if (discMatches.length > 10) console.log(`  ... and ${discMatches.length - 10} more`);
    console.log();
  }

  // Items
  const items = getItems();
  const itemMatches = Object.values(items).filter((it) => it.name && it.name.toLowerCase().includes(query));
  if (itemMatches.length > 0) {
    console.log(`[Items (${itemMatches.length})]`);
    itemMatches.slice(0, 10).forEach((it) => console.log(`  - ${it.name} (${it.rarity || '-'}, ${it.type || '-'}) [ID: ${it.id}]`));
    if (itemMatches.length > 10) console.log(`  ... and ${itemMatches.length - 10} more`);
    console.log();
  }
}

function handleMode(args) {
  const mode = args[0]?.toLowerCase();
  const validModes = ['arena', 'blitz', 'raid', 'siege', 'duel', 'cata', 'ascension'];
  if (!mode || !validModes.includes(mode)) {
    console.log(`Usage: node query.js mode <${validModes.join('|')}>`);
    return;
  }

  const data = loadJson(`${mode}.json`);
  if (!data) {
    console.log(`No data file found for mode: ${mode}`);
    return;
  }

  if (Array.isArray(data)) {
    console.log(`=== MODE: ${mode.toUpperCase()} (${data.length} entries) ===`);
    console.log('Sample entry:', JSON.stringify(data[0], null, 2));
  } else {
    const keys = Object.keys(data);
    console.log(`=== MODE: ${mode.toUpperCase()} (${keys.length} entries) ===`);
    console.log('Available keys/IDs (first 10):', keys.slice(0, 10).join(', '));
  }
}

function handleHelp() {
  console.log(`
Stella Sora (ss-data) Instant Query Engine
Usage:
  node query.js character <name|id> [--skills] [--mats] [--talents] [--level <N>] [--skill-level <N>]
  node query.js characters
  node query.js item <name|id>
  node query.js disc <name|id>
  node query.js gacha [name] [--char] [--disc]
  node query.js mode <arena|blitz|raid|siege|duel|cata|ascension>
  node query.js search <keyword>
`);
}

// Main Router
const [,, command, ...args] = process.argv;

switch (command) {
  case 'char':
  case 'character':
    handleCharacter(args);
    break;
  case 'chars':
  case 'characters':
    handleCharactersList();
    break;
  case 'item':
  case 'items':
    handleItem(args);
    break;
  case 'disc':
  case 'discs':
    handleDisc(args);
    break;
  case 'gacha':
  case 'banner':
  case 'banners':
    handleGacha(args);
    break;
  case 'mode':
    handleMode(args);
    break;
  case 'search':
  case 'find':
    handleSearch(args);
    break;
  default:
    handleHelp();
    break;
}
