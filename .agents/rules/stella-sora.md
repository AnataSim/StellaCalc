# Stella Sora Workspace Rules

1. **Zero-Token-Waste Policy**:
   - Never use `view_file` or dump raw JSON files from `character.json` (8.7MB), `disc.json` (1.7MB), or `EN/bin/` into context.
   - For all questions regarding Stella Sora characters, stats, skills, discs, items, gacha banners, and modes, always run `node query.js <command>` locally to fetch concise output (<150 tokens).

2. **Available Commands**:
   - `node query.js character <NameOrId> [--skills] [--mats] [--talents] [--level <N>] [--skill-level <N>]`
   - `node query.js characters`
   - `node query.js disc <NameOrId>`
   - `node query.js item <NameOrId>`
   - `node query.js gacha [Name] [--char] [--disc]`
   - `node query.js search <keyword>`
   - `node query.js mode <arena|blitz|raid|siege|duel|cata|ascension>`
