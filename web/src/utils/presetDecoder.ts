import type { PotentialData } from '../types';
import charactersData from '../data/characters.json';
import discsData from '../data/discs.json';
import harmonyNotesData from '../data/harmonyNotes.json';
import blitzRankingData from '../data/blitzRanking.json';

const charsMap = charactersData as unknown as Record<string, any>;
const discsMap = discsData as unknown as Record<string, any>;
const notesMap = harmonyNotesData as unknown as Record<string, any>;

// =============================================================================
// BITSTREAM READER (MSB-first, verified against game Lua engine)
// =============================================================================
class BitReader {
  private bytes: Uint8Array;
  private bitOffset = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  readBits(numBits: number): number {
    if (this.bitOffset + numBits > this.bytes.length * 8) {
      throw new Error('Read past end of preset bitstream');
    }
    let value = 0;
    for (let i = 0; i < numBits; i++) {
      const byteIdx = (this.bitOffset + i) >>> 3;
      const bitInByte = 7 - ((this.bitOffset + i) & 7);
      const bit = (this.bytes[byteIdx]! >>> bitInByte) & 1;
      value = (value << 1) | bit;
    }
    this.bitOffset += numBits;
    return value >>> 0;
  }

  remainingBits(): number {
    return this.bytes.length * 8 - this.bitOffset;
  }
}

export function extractShareCode(input: string): string {
  let s = input.trim();
  if (!s) return '';
  // Match URL query or hash params: ?code=..., #build=..., &shareCode=..., ?preset=...
  const urlParamMatch = s.match(/[?#&](?:build|code|shareCode|preset)=([A-Za-z0-9+/=_-]+)/i);
  if (urlParamMatch && urlParamMatch[1]) {
    s = urlParamMatch[1];
  }
  // Remove whitespace and wrapping quotes
  s = s.replace(/[\s"']/g, '');
  // If wrapped in descriptive text, extract the base64 share code sequence
  const b64Seq = s.match(/[A-Za-z0-9+/_-]{32,44}={0,2}/);
  if (b64Seq && b64Seq[0]) {
    s = b64Seq[0];
  }
  return s;
}

function base64Decode(input: string): Uint8Array | null {
  let s = extractShareCode(input);
  if (!s) return null;
  // Normalize URL-safe alphabet
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  // If 37 chars (36 chars + 1 stray char), strip trailing char
  if (s.length % 4 === 1) {
    s = s.slice(0, -1);
  }
  while (s.length % 4 !== 0) s += '=';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null;

  try {
    let binStr: string;
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      binStr = window.atob(s);
    } else {
      binStr = atob(s);
    }
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

// =============================================================================
// PUBLIC INTERFACES
// =============================================================================
export interface DecodedPotentialItem {
  id: number;
  name: string;
  category: 'mainCore' | 'mainNormal' | 'common' | 'supportCore' | 'supportNormal';
  level: number; // 1 for specific/core, 1-6 for normal/common
  desc?: string;
  icon?: string;
  rarity?: string;
}

export interface DecodedTeamMember {
  characterId: number;
  name: string;
  element: string;
  class: string;
  isLeader: boolean;
  avatarIcon?: string;
  points: number; // Calculated Ascension / Preselection points spent
  activePotentials: DecodedPotentialItem[];
  recommendedDiscs: {
    id: number;
    name: string;
    star: number;
    element: string;
    icon?: string | null;
    mainSkillName?: string;
    isSignature?: boolean;
  }[];
  recommendedNotes: {
    id: string;
    name: string;
    briefDesc: string;
    recommendedLv: number;
  }[];
}

export interface DecodedPresetResult {
  success: boolean;
  error?: string;
  shareCode?: string;
  sourceType?: 'user_preset' | 'leaderboard_preset';
  summaryText?: string; // e.g. "Firstlight Noya, Shia, Tilia · 44/12/19 · 75 total"
  totalPoints?: number;
  leader?: DecodedTeamMember;
  support1?: DecodedTeamMember;
  support2?: DecodedTeamMember;
  teamDiscs?: {
    main1?: number;
    main2?: number;
    main3?: number;
    support1?: number;
    support2?: number;
    support3?: number;
    main1SkillLevel?: number;
    main2SkillLevel?: number;
    main3SkillLevel?: number;
    support1SkillLevel?: number;
    support2SkillLevel?: number;
    support3SkillLevel?: number;
  };
  teamHarmonyNotes?: Record<string, number>;
  blitzClearInfo?: {
    rank: number;
    player: string;
    score: number;
    recordName?: string;
    discSkillLevels?: {
      main: [number, number, number];
      support: [number, number, number];
    };
  };
  matchingBlitzComp?: BlitzClearMatch | null;
}

export interface BlitzClearMatch {
  rank: number;
  player: string;
  score: number;
  teamIdx: number;
  recordName: string;
  charIds: number[];
  charNames: string;
  discs: { id: number; name: string }[];
  discSkillLevels: {
    main: [number, number, number];
    support: [number, number, number];
  };
  notes: { id: number; name: string; qty: number }[];
  shareCodeFallback: string;
}

export const TOP_BLITZ_PRESETS = [
  {
    id: 'pagan_t2_1340522',
    player: 'Pagan',
    rank: 2,
    score: 1340522,
    recordName: 'Team 2: Abyssal Sea Sovereign · Record: 35 (10380)',
    charNames: 'Firstlight Noya + Shia + Tilia',
    shareCode: 'AAAAogAAAJsAAABrzbADYYYYyASAcAK2ABIAY',
    mainDiscSkills: [4, 3, 4] as [number, number, number],
    suppDiscSkills: [2, 3, 2] as [number, number, number],
    notesSummary: 'Luck x30, Lux x60, Skill x62, Stamina x45, Ult x3'
  },
  {
    id: 'niumit_t2_1846052',
    player: 'Niumit',
    rank: 1,
    score: 1846052,
    recordName: 'Team 2 · 1,846,052',
    charNames: 'Firstlight Noya + Firefly + Tilia',
    shareCode: 'AAAAogAAAHMAAABrzbADaYbFiAAMAGyIAABA',
    mainDiscSkills: [4, 4, 4] as [number, number, number],
    suppDiscSkills: [1, 1, 1] as [number, number, number],
    notesSummary: 'Ult x29, Luck x28, Lux x55, Skill x55, Stamina x3'
  },
  {
    id: 'niumit_t1_2184548',
    player: 'Niumit',
    rank: 1,
    score: 2184548,
    recordName: 'Team 1 · 2,184,548',
    charNames: 'Allie + Donna + Suntide Willow',
    shareCode: 'AAAAiwAAAIIAAAB+MAXE4gBRsQAMAKxwAGBA',
    mainDiscSkills: [4, 4, 4] as [number, number, number],
    suppDiscSkills: [3, 3, 3] as [number, number, number],
    notesSummary: 'Pummel x55, Aqua x56, Luck x49, Ult x7, Burst x9, Skill x12'
  },
  {
    id: 'pagan_t1_2340208',
    player: 'Pagan',
    rank: 2,
    score: 2340208,
    recordName: 'Team 1 · 2,340,208',
    charNames: 'Allie + Suntide Willow + Teresa',
    shareCode: 'AAAAiwAAAKAAAAB+MAXE4gBRsQAMAKxwAGBA',
    mainDiscSkills: [4, 4, 4] as [number, number, number],
    suppDiscSkills: [3, 3, 3] as [number, number, number],
    notesSummary: 'Luck x45, Aqua x61, Ult x11, Pummel x55, Skill x7'
  },
  {
    id: 'tyrant_t2_1566588',
    player: 'Tyrant',
    rank: 3,
    score: 1566588,
    recordName: 'Team 2 · 1,566,588',
    charNames: 'Firstlight Noya + Tilia + Firefly',
    shareCode: 'AAAAogAAAJsAAABrzbADYYYYyASAcAK2ABIAY',
    mainDiscSkills: [4, 4, 4] as [number, number, number],
    suppDiscSkills: [3, 3, 3] as [number, number, number],
    notesSummary: 'Skill x55, Lux x55, Ult x20, Luck x25'
  }
];

export function findBlitzClear(queryOrCharIds: string | number[]): BlitzClearMatch | null {
  const entries = (blitzRankingData as any)?.ranking?.entries || [];

  if (Array.isArray(queryOrCharIds)) {
    const targetIds = queryOrCharIds;
    for (const entry of entries) {
      for (let tIdx = 0; tIdx < (entry.teams || []).length; tIdx++) {
        const team = entry.teams[tIdx];
        const teamCharIds: number[] = team.chars.map((c: any) => c.id);
        if (targetIds.length === 3 && targetIds.every((id) => teamCharIds.includes(id))) {
          return formatBlitzMatch(entry, team, tIdx + 1);
        }
      }
    }
    return null;
  }

  const q = String(queryOrCharIds).trim().toLowerCase();
  if (!q) return null;

  // Exact ID / Key lookup
  for (const preset of TOP_BLITZ_PRESETS) {
    if (preset.id === q || q.includes(preset.id)) {
      const match = findBlitzClear(String(preset.score));
      if (match) return match;
    }
  }

  // Exact score search: e.g. "1340522"
  const numScore = parseInt(q.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(numScore) && numScore > 100000) {
    for (const entry of entries) {
      for (let tIdx = 0; tIdx < (entry.teams || []).length; tIdx++) {
        const team = entry.teams[tIdx];
        if (team.score === numScore) {
          return formatBlitzMatch(entry, team, tIdx + 1);
        }
      }
    }
  }

  // Player / Record search: e.g. "pagan", "abyssal"
  for (const entry of entries) {
    const isPlayer = entry.nickname.toLowerCase().includes(q);
    for (let tIdx = 0; tIdx < (entry.teams || []).length; tIdx++) {
      const team = entry.teams[tIdx];
      const charStr = team.chars.map((c: any) => c.name.toLowerCase()).join(' ');
      if (isPlayer || charStr.includes(q)) {
        return formatBlitzMatch(entry, team, tIdx + 1);
      }
    }
  }

  return null;
}

function formatBlitzMatch(entry: any, team: any, teamIdx: number): BlitzClearMatch {
  // Extract skill levels according to game blitz schema:
  // skills[0] = Main 1, skills[1] = Supp 1, skills[2] = Main 2, skills[3] = Supp 2, skills[4] = Main 3, skills[5] = Supp 3
  const s = team.skills || [];
  const m1 = s[0] ? (s[0].id % 10) : 4;
  const s1 = s[1] ? (s[1].id % 10) : 2;
  const m2 = s[2] ? (s[2].id % 10) : 3;
  const s2 = s[3] ? (s[3].id % 10) : 3;
  const m3 = s[4] ? (s[4].id % 10) : 4;
  const s3 = s[5] ? (s[5].id % 10) : 2;

  const charIds = team.chars.map((c: any) => c.id);
  let shareCodeFallback = 'AAAAogAAAJsAAABrzbADYYYYyASAcAK2ABIAY';
  if (charIds.includes(162) && charIds.includes(155) && charIds.includes(107)) {
    shareCodeFallback = 'AAAAogAAAJsAAABrzbADYYYYyASAcAK2ABIAY';
  } else if (charIds.includes(162) && charIds.includes(107)) {
    shareCodeFallback = 'AAAAogAAAHMAAABrzbADaYbFiAAMAGyIAABA';
  } else if (charIds.includes(110)) {
    shareCodeFallback = 'AAAAbgAAAIcAAACOMAbYMEHNMCCAAM2BAAIg';
  }

  return {
    rank: entry.rank,
    player: entry.nickname,
    score: team.score,
    teamIdx,
    recordName:
      teamIdx === 2 && entry.nickname === 'Pagan'
        ? 'Team 2: Abyssal Sea Sovereign · Record: 35 (10380)'
        : `${entry.nickname} Team ${teamIdx} (${team.score.toLocaleString()})`,
    charIds,
    charNames: team.chars.map((c: any) => c.name).join(' + '),
    discs: team.discs || [],
    discSkillLevels: {
      main: [m1, m2, m3],
      support: [s1, s2, s3]
    },
    notes: team.notes || [],
    shareCodeFallback
  };
}

// =============================================================================
// UNIVERSAL CUSTOM TEXT METADATA PARSER
// =============================================================================
export interface ParsedCustomMetadata {
  shareCode: string;
  discSkills?: {
    main?: [number, number, number];
    support?: [number, number, number];
  };
  customNotes?: Record<string, number>;
}

export function parseCustomMetadata(rawInput: string): ParsedCustomMetadata {
  const code = extractShareCode(rawInput);
  const result: ParsedCustomMetadata = { shareCode: code };

  // 1. Disc skill levels:
  // Examples: "Main: 4 3 4 / Supp: 2 3 2" or "4 3 4 / 2 3 2"
  const mainDiscMatch = rawInput.match(/main(?:[\s:]+|[\s\w]*:\s*)([1-9])[\s,]+([1-9])[\s,]+([1-9])/i);
  const suppDiscMatch = rawInput.match(/supp(?:ort)?(?:[\s:]+|[\s\w]*:\s*)([1-9])[\s,]+([1-9])[\s,]+([1-9])/i);

  if (mainDiscMatch && suppDiscMatch) {
    result.discSkills = {
      main: [parseInt(mainDiscMatch[1], 10), parseInt(mainDiscMatch[2], 10), parseInt(mainDiscMatch[3], 10)],
      support: [parseInt(suppDiscMatch[1], 10), parseInt(suppDiscMatch[2], 10), parseInt(suppDiscMatch[3], 10)]
    };
  } else {
    // Try matching pattern "4 3 4 / 2 3 2" or "4, 3, 4 / 2, 3, 2"
    const sixDigits = rawInput.match(/([1-9])[\s,]+([1-9])[\s,]+([1-9])\s*(?:\/|\n|\r|\|)\s*([1-9])[\s,]+([1-9])[\s,]+([1-9])/);
    if (sixDigits) {
      result.discSkills = {
        main: [parseInt(sixDigits[1], 10), parseInt(sixDigits[2], 10), parseInt(sixDigits[3], 10)],
        support: [parseInt(sixDigits[4], 10), parseInt(sixDigits[5], 10), parseInt(sixDigits[6], 10)]
      };
    }
  }

  // 2. Custom Notes / Melodies:
  const noteNameMap: Record<string, string> = {
    pummel: '90011',
    luck: '90012',
    burst: '90013',
    stamina: '90014',
    focus: '90015',
    skill: '90016',
    ult: '90017',
    ultimate: '90017',
    aqua: '90018',
    water: '90018',
    ignis: '90019',
    fire: '90019',
    ventus: '90020',
    wind: '90020',
    terra: '90021',
    earth: '90021',
    lux: '90022',
    light: '90022',
    umbra: '90023',
    dark: '90023'
  };

  const foundNotes: Record<string, number> = {};
  for (const [name, id] of Object.entries(noteNameMap)) {
    const rx = new RegExp(`(?:Melody\\s+of\\s+)?\\b${name}\\b(?:\\s*(?:x|:|lv\\.?|=)?\\s*|\\s+)(\\d+)`, 'i');
    const m = rawInput.match(rx);
    if (m && m[1]) {
      const val = parseInt(m[1], 10);
      if (val > 0 && val <= 99) {
        foundNotes[id] = val;
      }
    }
  }

  // Also check note IDs directly: e.g. "90016: 60" or "90022 x 62"
  const idRegex = /\b(900[12]\d)\b[\s:x=]+(\d+)/g;
  let idMatch;
  while ((idMatch = idRegex.exec(rawInput)) !== null) {
    const nid = idMatch[1];
    const nval = parseInt(idMatch[2], 10);
    if (nval > 0 && nval <= 99) {
      foundNotes[nid] = nval;
    }
  }

  if (Object.keys(foundNotes).length > 0) {
    result.customNotes = foundNotes;
  }

  return result;
}

// =============================================================================
// MAIN DECODER FUNCTION (UNIVERSAL & LEADERBOARD INDEPENDENT)
// =============================================================================
export function decodePresetShareCode(rawCode: string): DecodedPresetResult {
  try {
    const trimmed = rawCode.trim();
    const isDirectLeaderboardPreset = TOP_BLITZ_PRESETS.some(
      (p) => p.id === trimmed.toLowerCase() || trimmed.toLowerCase().includes(p.id)
    );

    // Check if rawCode is or matches a Blitz record (e.g. "pagan_t2_1340522", "1340522", "Pagan", "Abyssal")
    let directBlitzMatch: BlitzClearMatch | null = null;
    let codeToDecode = trimmed;

    if (!base64Decode(extractShareCode(codeToDecode))) {
      directBlitzMatch = findBlitzClear(codeToDecode);
      if (directBlitzMatch) {
        codeToDecode = directBlitzMatch.shareCodeFallback;
      }
    }

    const parsedMeta = parseCustomMetadata(rawCode);
    const cleanedCode = parsedMeta.shareCode || extractShareCode(codeToDecode);
    if (!cleanedCode) {
      return { success: false, error: 'Enter or paste any Stella Sora Share Code (27-byte Base64) to decode.' };
    }

    const bytes = base64Decode(cleanedCode);
    if (!bytes) {
      return { success: false, error: 'Invalid Base64 format. Ensure you copied the full Share Code.' };
    }

    if (bytes.length < 12) {
      return {
        success: false,
        error: `Preset code is too short (${bytes.length} bytes, expected at least 12 bytes for header).`
      };
    }

    const cleanBytes = bytes.length >= 27 ? bytes.subarray(0, 27) : bytes;
    const reader = new BitReader(cleanBytes);

    // Header: 3 uint32 CharIds (MSB-first)
    const leaderId = reader.readBits(32);
    const supp1Id = reader.readBits(32);
    const supp2Id = reader.readBits(32);

    const charIds = [leaderId, supp1Id, supp2Id];
    const decodedMembers: DecodedTeamMember[] = [];

    // Check if there is a matching Blitz Clear for these characters in the database
    const blitzCompMatch = findBlitzClear(charIds);

    // CRITICAL: Only hijack into Blitz Leaderboard if user explicitly asked for a leaderboard preset
    // If the user pastes an in-game share code (even if rank ribuan), treat it as their authentic run!
    const blitzMatch = isDirectLeaderboardPreset || directBlitzMatch ? (directBlitzMatch || blitzCompMatch) : null;
    const sourceType: 'user_preset' | 'leaderboard_preset' = blitzMatch ? 'leaderboard_preset' : 'user_preset';

    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      const charId = charIds[slotIdx]!;
      const isLeader = slotIdx === 0;

      const char = charsMap[String(charId)];
      const name = char?.name || `Trekker #${charId}`;
      const element = char?.element || 'None';
      const charClass = char?.class || 'Attacker';

      const coreList: PotentialData[] =
        (isLeader ? char?.potential?.mainCore : char?.potential?.supportCore) || [];
      const normalList: PotentialData[] =
        (isLeader ? char?.potential?.mainNormal : char?.potential?.supportNormal) || [];
      const commonList: PotentialData[] = char?.potential?.common || [];

      const activePotentials: DecodedPotentialItem[] = [];
      let points = 0;

      // 1. Specific Potentials (1 bit each)
      const specLen = coreList.length || 4;
      for (let i = 0; i < specLen; i++) {
        const on = reader.readBits(1);
        if (on === 1 && coreList[i]) {
          points += 1;
          activePotentials.push({
            id: coreList[i]!.id,
            name: coreList[i]!.name,
            category: isLeader ? 'mainCore' : 'supportCore',
            level: 1,
            desc: coreList[i]!.desc,
            icon: (coreList[i] as any)!.icon,
            rarity: coreList[i]!.rarity
          });
        }
      }

      // 2. Normal Potentials (3 bits each: 0..7 representing level)
      const normLen = normalList.length || 9;
      for (let i = 0; i < normLen; i++) {
        const lvl = reader.readBits(3);
        if (lvl > 0 && normalList[i]) {
          points += lvl;
          activePotentials.push({
            id: normalList[i]!.id,
            name: normalList[i]!.name,
            category: isLeader ? 'mainNormal' : 'supportNormal',
            level: lvl,
            desc: normalList[i]!.desc,
            icon: (normalList[i] as any)!.icon,
            rarity: normalList[i]!.rarity
          });
        }
      }

      // 3. Common Potentials (3 bits each: 0..7 representing level)
      const commLen = commonList.length || 3;
      for (let i = 0; i < commLen; i++) {
        const lvl = reader.readBits(3);
        if (lvl > 0 && commonList[i]) {
          points += lvl;
          activePotentials.push({
            id: commonList[i]!.id,
            name: commonList[i]!.name,
            category: 'common',
            level: lvl,
            desc: commonList[i]!.desc,
            icon: (commonList[i] as any)!.icon,
            rarity: commonList[i]!.rarity
          });
        }
      }

      // Recommend signature and matching discs for this character
      const recommendedDiscs = getRecommendedDiscsForCharacter(name, element);
      const recommendedNotes = getRecommendedNotesForElement(element);

      decodedMembers.push({
        characterId: charId,
        name,
        element,
        class: charClass,
        isLeader,
        points,
        activePotentials,
        recommendedDiscs,
        recommendedNotes
      });
    }

    const leader = decodedMembers[0];
    const support1 = decodedMembers[1];
    const support2 = decodedMembers[2];

    const totalPoints = (leader?.points || 0) + (support1?.points || 0) + (support2?.points || 0);
    const summaryText = blitzMatch
      ? `${leader?.name || 'Leader'}, ${support1?.name || 'Support 1'}, ${support2?.name || 'Support 2'} · Score: ${blitzMatch.score.toLocaleString()} (${blitzMatch.player} Rank ${blitzMatch.rank})`
      : `${leader?.name || 'Leader'}, ${support1?.name || 'Support 1'}, ${support2?.name || 'Support 2'} · ${leader?.points || 0}/${support1?.points || 0}/${support2?.points || 0} · ${totalPoints} total`;

    // Build the full 6-disc setup for the team (Main: 4 3 4 / Support: 2 3 2 or custom text overrides)
    const teamDiscs = buildTeamDiscs(leader, support1, support2, blitzMatch, parsedMeta.discSkills);

    // Build the full 13-note Harmony Notes setup for the team (universal high synergy or custom text overrides)
    const teamHarmonyNotes = buildTeamHarmonyNotes(
      leader?.element || 'Lux',
      blitzMatch,
      parsedMeta.customNotes,
      [teamDiscs.main1, teamDiscs.main2, teamDiscs.main3, teamDiscs.support1, teamDiscs.support2, teamDiscs.support3],
      leader?.class
    );

    return {
      success: true,
      shareCode: cleanedCode,
      sourceType,
      summaryText,
      totalPoints,
      leader,
      support1,
      support2,
      teamDiscs,
      teamHarmonyNotes,
      blitzClearInfo: blitzMatch
        ? {
            rank: blitzMatch.rank,
            player: blitzMatch.player,
            score: blitzMatch.score,
            recordName: blitzMatch.recordName,
            discSkillLevels: blitzMatch.discSkillLevels
          }
        : undefined,
      matchingBlitzComp: blitzCompMatch
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to decode preset: ${err?.message || 'Invalid format'}`
    };
  }
}

// =============================================================================
// DISC & HARMONY HELPER FUNCTIONS
// =============================================================================

function getRecommendedDiscsForCharacter(charName: string, element: string) {
  const discEntries = Object.values(discsMap);
  const results: DecodedTeamMember['recommendedDiscs'] = [];

  // Exact signature match
  const exactSigs = discEntries.filter((d: any) =>
    d.char && d.char.some((c: string) => c.toLowerCase() === charName.toLowerCase())
  ).sort((a: any, b: any) => (b.star || 0) - (a.star || 0));

  for (const d of exactSigs) {
    results.push({
      id: d.id,
      name: d.name,
      star: d.star,
      element: d.element,
      icon: d.icon,
      mainSkillName: d.mainSkill?.name,
      isSignature: true
    });
  }

  // Partial name match if no exact found
  if (results.length === 0) {
    const partialSigs = discEntries.filter((d: any) =>
      d.char && d.char.some((c: string) => charName.toLowerCase().includes(c.toLowerCase()))
    ).sort((a: any, b: any) => (b.star || 0) - (a.star || 0));

    for (const d of partialSigs) {
      if (!results.some(r => r.id === d.id)) {
        results.push({
          id: d.id,
          name: d.name,
          star: d.star,
          element: d.element,
          icon: d.icon,
          mainSkillName: d.mainSkill?.name,
          isSignature: true
        });
      }
    }
  }

  // Element matching 5★ discs
  const elemDiscs = discEntries.filter(
    (d: any) =>
      d.element &&
      d.element.toLowerCase() === element.toLowerCase() &&
      !results.some(rd => rd.id === d.id)
  ).sort((a: any, b: any) => (b.star || 0) - (a.star || 0));

  for (const d of elemDiscs) {
    if (results.length < 5) {
      results.push({
        id: d.id,
        name: d.name,
        star: d.star,
        element: d.element,
        icon: d.icon,
        mainSkillName: d.mainSkill?.name,
        isSignature: false
      });
    }
  }

  return results;
}

function getRecommendedNotesForElement(element: string) {
  const notes: DecodedTeamMember['recommendedNotes'] = [
    {
      id: '90011',
      name: notesMap['90011']?.name || 'Melody of Pummel',
      briefDesc: notesMap['90011']?.briefDesc || 'ATK +0.3%',
      recommendedLv: 30
    },
    {
      id: '90012',
      name: notesMap['90012']?.name || 'Melody of Luck',
      briefDesc: notesMap['90012']?.briefDesc || 'Crit Rate +0.1%',
      recommendedLv: 30
    },
    {
      id: '90013',
      name: notesMap['90013']?.name || 'Melody of Burst',
      briefDesc: notesMap['90013']?.briefDesc || 'Crit DMG +0.46%',
      recommendedLv: 35
    }
  ];

  const elemMap: Record<string, string> = {
    Aqua: '90018',
    Ignis: '90019',
    Ventus: '90020',
    Terra: '90021',
    Lux: '90022',
    Umbra: '90023'
  };

  const elemId = elemMap[element];
  if (elemId && notesMap[elemId]) {
    notes.push({
      id: elemId,
      name: notesMap[elemId].name,
      briefDesc: notesMap[elemId].briefDesc,
      recommendedLv: 60
    });
  }

  return notes;
}

export function buildTeamDiscs(
  leader?: DecodedTeamMember,
  supp1?: DecodedTeamMember,
  supp2?: DecodedTeamMember,
  blitzMatch?: BlitzClearMatch | null,
  customSkills?: ParsedCustomMetadata['discSkills']
) {
  if (blitzMatch && blitzMatch.discs && blitzMatch.discs.length >= 6) {
    return {
      main1: blitzMatch.discs[0]?.id,
      main2: blitzMatch.discs[1]?.id,
      main3: blitzMatch.discs[2]?.id,
      support1: blitzMatch.discs[3]?.id,
      support2: blitzMatch.discs[4]?.id,
      support3: blitzMatch.discs[5]?.id,
      main1SkillLevel: customSkills?.main?.[0] ?? blitzMatch.discSkillLevels.main[0],
      main2SkillLevel: customSkills?.main?.[1] ?? blitzMatch.discSkillLevels.main[1],
      main3SkillLevel: customSkills?.main?.[2] ?? blitzMatch.discSkillLevels.main[2],
      support1SkillLevel: customSkills?.support?.[0] ?? blitzMatch.discSkillLevels.support[0],
      support2SkillLevel: customSkills?.support?.[1] ?? blitzMatch.discSkillLevels.support[1],
      support3SkillLevel: customSkills?.support?.[2] ?? blitzMatch.discSkillLevels.support[2]
    };
  }

  // Exact user specified default skill levels:
  // Top row (Main Discs 1, 2, 3): 4, 3, 4
  // Bottom row (Support Discs 1, 2, 3): 2, 3, 2
  const teamDiscs: DecodedPresetResult['teamDiscs'] = {
    main1SkillLevel: customSkills?.main?.[0] ?? 4,
    main2SkillLevel: customSkills?.main?.[1] ?? 3,
    main3SkillLevel: customSkills?.main?.[2] ?? 4,
    support1SkillLevel: customSkills?.support?.[0] ?? 2,
    support2SkillLevel: customSkills?.support?.[1] ?? 3,
    support3SkillLevel: customSkills?.support?.[2] ?? 2
  };

  // Main Slot 1 & 2: Leader's signature discs
  if (leader && leader.recommendedDiscs.length > 0) {
    teamDiscs.main1 = leader.recommendedDiscs[0]?.id;
    if (leader.recommendedDiscs.length > 1) {
      teamDiscs.main2 = leader.recommendedDiscs[1]?.id;
    }
    if (leader.recommendedDiscs.length > 2) {
      teamDiscs.main3 = leader.recommendedDiscs[2]?.id;
    }
  }

  // Fallback for Main 3 if not enough signature discs
  if (!teamDiscs.main3) {
    teamDiscs.main3 = 214009; // New Star Prelude
  }

  // Support Slot 1: Support 1's signature disc
  if (supp1 && supp1.recommendedDiscs.length > 0) {
    teamDiscs.support1 = supp1.recommendedDiscs[0]?.id;
  } else {
    teamDiscs.support1 = 214038; // Ripples of Nostalgia
  }

  // Support Slot 2: Support 2's signature disc
  if (supp2 && supp2.recommendedDiscs.length > 0) {
    teamDiscs.support2 = supp2.recommendedDiscs[0]?.id;
  } else {
    teamDiscs.support2 = 213014; // The Knight's Smith
  }

  // Support Slot 3: High utility support disc
  teamDiscs.support3 = 214024; // One, Two, Three, Jump!

  return teamDiscs;
}

export function buildTeamHarmonyNotes(
  element: string,
  blitzMatch?: BlitzClearMatch | null,
  customNotesOverride?: Record<string, number>,
  equippedDiscs?: (number | undefined)[],
  characterClass?: string
): Record<string, number> {
  // Initialize all 13 official Stella Sora melodies to base Lv.1
  const noteLevels: Record<string, number> = {
    '90011': 1, // Melody of Pummel
    '90012': 1, // Melody of Luck
    '90013': 1, // Melody of Burst
    '90014': 1, // Melody of Stamina
    '90015': 1, // Melody of Focus
    '90016': 1, // Melody of Skill
    '90017': 1, // Melody of Ultimate
    '90018': 1, // Melody of Aqua
    '90019': 1, // Melody of Ignis
    '90020': 1, // Melody of Ventus
    '90021': 1, // Melody of Terra
    '90022': 1, // Melody of Lux
    '90023': 1  // Melody of Umbra
  };

  // 1. If custom notes were provided in user input text, apply them directly!
  if (customNotesOverride && Object.keys(customNotesOverride).length > 0) {
    for (const [id, qty] of Object.entries(customNotesOverride)) {
      if (noteLevels[id] !== undefined) {
        noteLevels[id] = qty;
      }
    }
    return noteLevels;
  }

  // 2. If this team was explicitly chosen as a Blitz Leaderboard clear, sync exact recorded notes
  if (blitzMatch && blitzMatch.notes && blitzMatch.notes.length > 0) {
    for (const n of blitzMatch.notes) {
      if (noteLevels[String(n.id)] !== undefined) {
        noteLevels[String(n.id)] = n.qty;
      }
    }
    return noteLevels;
  }

  // 3. Universal Sync: For all players (rank 1 to rank 5000+)
  // Intelligently configure notes matching the element, character kit, and equipped discs
  const elemMap: Record<string, string> = {
    Aqua: '90018',
    Ignis: '90019',
    Ventus: '90020',
    Terra: '90021',
    Lux: '90022',
    Umbra: '90023'
  };

  const matchingElemNoteId = elemMap[element] || '90022';

  // Primary element note (endgame high level)
  noteLevels[matchingElemNoteId] = 60;

  // Primary combat skill note
  if (characterClass === 'Special' || characterClass === 'Supporter') {
    noteLevels['90016'] = 45; // Skill DMG
    noteLevels['90017'] = 30; // Ult DMG
  } else {
    noteLevels['90016'] = 60; // Skill DMG
    noteLevels['90017'] = 15; // Ult DMG
  }

  // High synergy universal offensive stats
  noteLevels['90013'] = 35; // Melody of Burst (Crit DMG +0.46%)
  noteLevels['90012'] = 30; // Melody of Luck (Crit Rate +0.1%)
  noteLevels['90011'] = 30; // Melody of Pummel (ATK +0.3%)
  noteLevels['90014'] = 15; // Melody of Stamina (Max HP +0.3%)
  noteLevels['90015'] = 1;  // Melody of Focus (Auto Attack DMG)

  // Boost any melody supported by the 6 equipped discs
  if (Array.isArray(equippedDiscs)) {
    for (const discId of equippedDiscs) {
      if (!discId) continue;
      const d = discsMap[String(discId)];
      if (d && Array.isArray(d.supportNote)) {
        for (const entry of d.supportNote) {
          const entryPair = Object.entries(entry)[0];
          const noteName = entryPair ? entryPair[0] : null;
          if (noteName) {
            const foundId = Object.keys(notesMap).find(
              (id) => notesMap[id]?.name?.toLowerCase() === noteName.toLowerCase()
            );
            if (foundId && noteLevels[foundId] !== undefined) {
              // Ensure disc supported note is at least 25
              if (noteLevels[foundId] < 25) {
                noteLevels[foundId] = 25;
              }
            }
          }
        }
      }
    }
  }

  return noteLevels;
}
