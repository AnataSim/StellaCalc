---
name: stella-sora-data
description: Query and retrieve Stella Sora game data (characters, stats, skills, discs, items, gacha banners, modes) instantly with minimal token usage using local query engine.
---

# Stella Sora Data Knowledge & Query Engine

This workspace (`e:\Code\SS`) contains datamined game data from Yostar's **Stella Sora**, maintained by `AutumnVN/ss-data`, consolidated in the `database/` directory.

## Important Rule: Token Preservation
**NEVER** load entire JSON files (`database/character.json`, `database/disc.json`, raw `database/EN/bin/` files) directly into context.
Instead, **ALWAYS** use the built-in fast CLI (`node query.js` or `node database/query.js`) via `run_command` in `e:\Code\SS`.

## Quick Query CLI Reference (`node query.js`)

All queries run in milliseconds and return concise, pre-formatted text (averaging 50–150 tokens):

### 1. Characters
- **Summary**: `node query.js character <NameOrId>`
  - Example: `node query.js character Amber` or `node query.js character 103`
  - Returns: Star rating, Element, Class, Attack Type, Faction, Birthday, Voice Actors, Gifts, Base & Max Stats, Skill names.
- **Detailed Skills**: `node query.js character <NameOrId> --skills [--skill-level <1-10>]`
  - Example: `node query.js character Amber --skills --skill-level 1`
  - Returns: Full skill text, cooldowns, resolved damage multipliers/parameters.
- **Stats at Specific Level**: `node query.js character <NameOrId> --level <1-90>`
  - Example: `node query.js character Tilia --level 90`
- **Upgrade Materials**: `node query.js character <NameOrId> --mats`
- **Talent Tree**: `node query.js character <NameOrId> --talents`
- **List All Characters**: `node query.js characters`

### 2. Discs (Equipment / Memories)
- **Lookup Disc**: `node query.js disc "<Disc Name or ID>"`
  - Example: `node query.js disc "Crisp Morning"`
  - Returns: Star rating, Element, Associated Character, Main Skill effects/params, Level 1 to Max stats.

### 3. Items & Currencies
- **Lookup Item**: `node query.js item <ItemNameOrId>`
  - Example: `node query.js item Dorra` or `node query.js item "Count's Rewards"`
  - Returns: Rarity, Type, Description, and Lore.

### 4. Gacha Banners
- **Banner Search**: `node query.js gacha [CharacterOrDiscName]`
  - Example: `node query.js gacha Firenze` or `node query.js gacha --char` or `node query.js gacha --disc`
  - Returns: Banner name, duration dates, 5★ and 4★ rate-up characters/discs.

### 5. Universal Search
- **Search Across All Entities**: `node query.js search <keyword>`
  - Example: `node query.js search Ignis` or `node query.js search EXP`

### 6. Game Modes & Bosses
- **Mode Info**: `node query.js mode <arena|blitz|raid|siege|duel|cata|ascension>`

## Data Architecture Map
- `characterid.json`: Fast ID-to-Name map (e.g. 103: Amber, 107: Tilia, 110: Firenze, 115: Firefly, 142: Cosette).
- `character.json`: Parsed character database with complete leveling curves (Lv1-90), skills, talents, and materials.
- `disc.json`: Parsed disc database.
- `item.json`: Parsed item catalog (2,332 items).
- `gacha.json`: Parsed gacha banner schedules.
- `EN/bin/` & `EN/language/`: Raw Unity game database tables (5,000+ files).
