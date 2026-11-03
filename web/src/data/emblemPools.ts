import type { Character } from '../types';

export type EmblemTier = 1 | 2 | 3 | 4;

export interface EmblemStatDef {
  id: string;
  name: string;
  category: 'primary' | 'crit' | 'dmg' | 'special' | 'unique';
  unit: '%' | '' | '+Lv';
  values: [number, number, number, number]; // [Tier 1 (Green), Tier 2 (Blue), Tier 3 (Yellow), Tier 4 (Rainbow)]
  maxTier?: EmblemTier; // Max allowed tier (e.g. Crit DMG caps at Tier 3 / Yellow 15%)
  isUnique?: boolean;
  uniqueTarget?: 'normal' | 'main' | 'support' | 'ult' | 'talent';
}

export interface EmblemStatLine {
  statId: string; // id or 'none'
  tier: EmblemTier;
  targetPotentialId?: number; // Target potential ID for unique_talent (non-maincore)
}

export const ALL_EMBLEM_STATS: { [id: string]: EmblemStatDef } = {
  // Primary (Weight 30% Lv70/80, 51.17% Lv90)
  hp: {
    id: 'hp',
    name: 'HP',
    category: 'primary',
    unit: '',
    values: [680, 850, 1020, 2040],
  },
  atk: {
    id: 'atk',
    name: 'ATK',
    category: 'primary',
    unit: '',
    values: [70, 88, 105, 210],
  },
  def: {
    id: 'def',
    name: 'DEF',
    category: 'primary',
    unit: '',
    values: [35, 44, 53, 105],
  },
  hp_pct: {
    id: 'hp_pct',
    name: 'HP%',
    category: 'primary',
    unit: '%',
    values: [4, 5, 6, 12],
  },
  atk_pct: {
    id: 'atk_pct',
    name: 'ATK%',
    category: 'primary',
    unit: '%',
    values: [4, 5, 6, 12],
  },
  def_pct: {
    id: 'def_pct',
    name: 'DEF%',
    category: 'primary',
    unit: '%',
    values: [10, 12.5, 15, 30],
  },

  // Crit Rate Attributes (Weight 27.65% Lv70/80)
  aa_crit_rate: {
    id: 'aa_crit_rate',
    name: 'Auto Attack Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },
  skill_crit_rate: {
    id: 'skill_crit_rate',
    name: 'Skill Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },
  ult_crit_rate: {
    id: 'ult_crit_rate',
    name: 'Ultimate Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },
  mark_crit_rate: {
    id: 'mark_crit_rate',
    name: 'Mark Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },
  minion_crit_rate: {
    id: 'minion_crit_rate',
    name: 'Minion Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },
  deriv_crit_rate: {
    id: 'deriv_crit_rate',
    name: 'Derivative Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },

  // Damage Amplification (Weight 34.35% Lv70/80, 48.83% Lv90)
  crit_dmg: {
    id: 'crit_dmg',
    name: 'Crit DMG',
    category: 'crit',
    unit: '%',
    values: [8, 10, 15, 15],
    maxTier: 3, // Mentok Kuning 15% (Rainbow tier tidak ada di game asli)
  },
  elem_dmg: {
    id: 'elem_dmg',
    name: 'Elemental DMG',
    category: 'dmg',
    unit: '%',
    values: [4, 5, 6, 12],
  },
  aa_dmg: {
    id: 'aa_dmg',
    name: 'Auto Attack DMG',
    category: 'dmg',
    unit: '%',
    values: [10, 12.5, 15, 30],
  },
  skill_dmg: {
    id: 'skill_dmg',
    name: 'Skill DMG',
    category: 'dmg',
    unit: '%',
    values: [7, 8, 10, 20],
  },
  ult_dmg: {
    id: 'ult_dmg',
    name: 'Ultimate DMG',
    category: 'dmg',
    unit: '%',
    values: [10, 13, 15, 30],
  },
  mark_dmg: {
    id: 'mark_dmg',
    name: 'Mark DMG',
    category: 'dmg',
    unit: '%',
    values: [27, 33, 40, 80],
  },
  minion_dmg: {
    id: 'minion_dmg',
    name: 'Minion DMG',
    category: 'dmg',
    unit: '%',
    values: [7, 8, 10, 20],
  },
  deriv_dmg: {
    id: 'deriv_dmg',
    name: 'Derivative DMG',
    category: 'dmg',
    unit: '%',
    values: [7, 8, 10, 20],
  },

  // Special Attributes (Weight 8% Lv70/80)
  crit_rate: {
    id: 'crit_rate',
    name: 'Crit Rate',
    category: 'crit',
    unit: '%',
    values: [5, 6.3, 7.5, 15],
  },
  elem_pen: {
    id: 'elem_pen',
    name: 'Elemental PEN',
    category: 'special',
    unit: '',
    values: [35, 40, 53, 110],
  },
  charge_main: {
    id: 'charge_main',
    name: 'Charge Efficiency (Main)',
    category: 'special',
    unit: '%',
    values: [10, 12.5, 15, 30],
  },
  charge_support: {
    id: 'charge_support',
    name: 'Charge Efficiency (Support)',
    category: 'special',
    unit: '%',
    values: [13.5, 17, 20.3, 40],
  },

  // Unique Attributes for Lv.80 (Auto Attack, Main Skill, Support Skill, Ultimate)
  // Values: Level 1 = +1 (Kuning / Legendary), Level 2 = +2 (Rainbow), Level 3 = +3 (Rainbow)
  unique_aa: {
    id: 'unique_aa',
    name: 'Auto Attack (+Lv)',
    category: 'unique',
    unit: '+Lv',
    values: [1, 2, 3, 3],
    isUnique: true,
    uniqueTarget: 'normal',
  },
  unique_main: {
    id: 'unique_main',
    name: 'Main Skill (+Lv)',
    category: 'unique',
    unit: '+Lv',
    values: [1, 2, 3, 3],
    isUnique: true,
    uniqueTarget: 'main',
  },
  unique_support: {
    id: 'unique_support',
    name: 'Support Skill (+Lv)',
    category: 'unique',
    unit: '+Lv',
    values: [1, 2, 3, 3],
    isUnique: true,
    uniqueTarget: 'support',
  },
  unique_ult: {
    id: 'unique_ult',
    name: 'Ultimate (+Lv)',
    category: 'unique',
    unit: '+Lv',
    values: [1, 2, 3, 3],
    isUnique: true,
    uniqueTarget: 'ult',
  },

  // Unique Attributes for Lv.90 (Talent / Potential)
  // Values: Level 1 = +1 (Kuning / Legendary), Level 2 = +2 (Rainbow), Level 3 = +3 (Rainbow)
  unique_talent: {
    id: 'unique_talent',
    name: 'Talent / Potential (+Lv)',
    category: 'unique',
    unit: '+Lv',
    values: [1, 2, 3, 3],
    isUnique: true,
    uniqueTarget: 'talent',
  },
};

// Available pools per Emblem level
export const LV70_STAT_IDS = [
  'hp', 'atk', 'def', 'hp_pct', 'atk_pct', 'def_pct',
  'crit_rate', 'crit_dmg', 'elem_dmg', 'elem_pen',
  'aa_crit_rate', 'skill_crit_rate', 'ult_crit_rate', 'mark_crit_rate', 'minion_crit_rate', 'deriv_crit_rate',
  'aa_dmg', 'skill_dmg', 'ult_dmg', 'mark_dmg', 'minion_dmg', 'deriv_dmg',
  'charge_main', 'charge_support'
];

export const LV80_STAT_IDS = [
  // Unique Attributes first for convenience
  'unique_main', 'unique_ult', 'unique_aa', 'unique_support',
  // All normal attributes
  ...LV70_STAT_IDS
];

export const LV90_STAT_IDS = [
  // Unique Potential/Talent
  'unique_talent',
  // Lv90 Pool Normal Attributes
  'hp', 'atk', 'def', 'hp_pct', 'atk_pct', 'def_pct',
  'crit_dmg', 'elem_dmg',
  'aa_dmg', 'skill_dmg', 'ult_dmg', 'mark_dmg', 'minion_dmg', 'deriv_dmg'
];

export function getEmblemStatsForLevel(level: 'lv70' | 'lv80' | 'lv90'): EmblemStatDef[] {
  const ids = level === 'lv70' ? LV70_STAT_IDS : level === 'lv80' ? LV80_STAT_IDS : LV90_STAT_IDS;
  return ids.map((id) => ALL_EMBLEM_STATS[id]).filter(Boolean);
}

export const TIER_CONFIG = {
  1: {
    tier: 1 as EmblemTier,
    name: 'Tier 1',
    colorName: 'Green',
    badgeClass: 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-sm',
    badgeChevron: 'text-emerald-200',
    cardBorder: 'border-emerald-500/70',
    cardBg: 'bg-emerald-950/20',
    cardText: 'text-emerald-400',
    lightBorder: 'border-emerald-500',
    accentDot: 'bg-emerald-500',
  },
  2: {
    tier: 2 as EmblemTier,
    name: 'Tier 2',
    colorName: 'Blue',
    badgeClass: 'bg-gradient-to-r from-sky-600 to-blue-500 text-white shadow-sm',
    badgeChevron: 'text-sky-200',
    cardBorder: 'border-sky-500/70',
    cardBg: 'bg-sky-950/20',
    cardText: 'text-sky-400',
    lightBorder: 'border-sky-500',
    accentDot: 'bg-sky-500',
  },
  3: {
    tier: 3 as EmblemTier,
    name: 'Tier 3',
    colorName: 'Yellow',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-bold shadow-sm',
    badgeChevron: 'text-amber-800',
    cardBorder: 'border-amber-400/70',
    cardBg: 'bg-amber-950/20',
    cardText: 'text-amber-400',
    lightBorder: 'border-amber-400',
    accentDot: 'bg-amber-400',
  },
  4: {
    tier: 4 as EmblemTier,
    name: 'Tier 4',
    colorName: 'Rainbow',
    badgeClass: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-extrabold shadow-md shadow-purple-900/40',
    badgeChevron: 'text-cyan-200',
    cardBorder: 'border-fuchsia-500/80',
    cardBg: 'bg-gradient-to-r from-fuchsia-950/25 via-cyan-950/20 to-purple-950/25',
    cardText: 'text-fuchsia-300',
    lightBorder: 'border-fuchsia-400',
    accentDot: 'bg-gradient-to-r from-pink-500 to-cyan-400',
  },
};

export function formatEmblemLine(
  line: EmblemStatLine,
  elementName?: string,
  character?: Character | null
): {
  statDef: EmblemStatDef | null;
  displayName: string;
  displayValue: string;
  tierConfig: typeof TIER_CONFIG[1];
} {
  const statDef = ALL_EMBLEM_STATS[line.statId] || null;
  const maxTier = statDef?.maxTier || 4;
  const effectiveTier = Math.min(line.tier || 4, maxTier) as EmblemTier;
  let tierConfig = TIER_CONFIG[effectiveTier] || TIER_CONFIG[4];

  if (!statDef) {
    return {
      statDef: null,
      displayName: 'Empty Stat Slot',
      displayValue: '-',
      tierConfig,
    };
  }

  let displayName = statDef.name;
  if (elementName && elementName !== 'None') {
    if (statDef.id === 'elem_pen') {
      displayName = `${elementName} PEN`;
    } else if (statDef.id === 'elem_dmg') {
      displayName = `${elementName} DMG`;
    }
  }

  // Display specific Potential name for Lv.90 Unique Talent Affix
  if (statDef.id === 'unique_talent' && character?.potential) {
    let potName = '';
    if (line.targetPotentialId) {
      const nonCoreCats: ('mainNormal' | 'common' | 'supportCore' | 'supportNormal')[] = [
        'mainNormal',
        'common',
        'supportCore',
        'supportNormal'
      ];
      for (const cat of nonCoreCats) {
        const found = (character.potential[cat] || []).find((p) => p.id === line.targetPotentialId);
        if (found) {
          potName = found.name;
          break;
        }
      }
    }
    if (potName) {
      displayName = `${potName} (+Lv)`;
    } else {
      const defaultPot = character.potential.mainNormal?.[0];
      if (defaultPot) {
        displayName = `${defaultPot.name} (+Lv)`;
      }
    }
  }

  const rawVal = statDef.values[effectiveTier - 1] ?? statDef.values[statDef.values.length - 1];
  let displayValue = '';

  if (statDef.unit === '+Lv') {
    displayValue = `+${rawVal}`;
  } else if (statDef.unit === '%') {
    displayValue = `${rawVal}%`;
  } else {
    displayValue = `${rawVal.toLocaleString()}`;
  }

  // Override tierConfig for Unique skill/potential level up attributes:
  // Level 1 (+1) is Kuning (Legendary / Tier 3)
  // Level 2 (+2) is Rainbow (Tier 4)
  // Level 3 (+3) is Rainbow (Tier 4)
  if (statDef.isUnique) {
    if (rawVal === 1) {
      tierConfig = TIER_CONFIG[3]; // Kuning (Legendary)
    } else {
      tierConfig = TIER_CONFIG[4]; // Rainbow
    }
  }

  return {
    statDef,
    displayName,
    displayValue,
    tierConfig,
  };
}

export interface CharGemMetadata {
  id: number;
  name: string;
  type: 1 | 2 | 3;
  typeName: string;
  faction: string;
  slot: 'lv70' | 'lv80' | 'lv90';
  shape: 'spike' | 'rhombus' | 'starlight';
  shapeLabel: string;
  levelLabel: string;
  image: string;
  theme: {
    textColor: string;
    bgColor: string;
    borderColor: string;
    glow: string;
    accentDot: string;
    badgeClass: string;
    cardBorder: string;
    gradient: string;
  };
}

export const CHAR_GEMS: { [gemId: number]: CharGemMetadata } = {
  // Devotee Series (Type 1 - Blue / Grace Imperium)
  101: {
    id: 101,
    name: "Devotee's Spike Emblem",
    type: 1,
    typeName: 'Devotee',
    faction: 'Grace Imperium',
    slot: 'lv70',
    shape: 'spike',
    shapeLabel: 'Spike',
    levelLabel: 'Lv.70',
    image: '/emblems/chargem_a_01.webp',
    theme: {
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40',
      borderColor: 'border-cyan-500/40',
      glow: 'rgba(6, 182, 212, 0.3)',
      accentDot: 'bg-cyan-400',
      badgeClass: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60',
      cardBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
      gradient: 'from-cyan-950/30 to-blue-950/20',
    },
  },
  102: {
    id: 102,
    name: "Devotee's Rhombus Emblem",
    type: 1,
    typeName: 'Devotee',
    faction: 'Grace Imperium',
    slot: 'lv80',
    shape: 'rhombus',
    shapeLabel: 'Rhombus',
    levelLabel: 'Lv.80',
    image: '/emblems/chargem_b_01.webp',
    theme: {
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40',
      borderColor: 'border-cyan-500/40',
      glow: 'rgba(6, 182, 212, 0.3)',
      accentDot: 'bg-cyan-400',
      badgeClass: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60',
      cardBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
      gradient: 'from-cyan-950/30 to-blue-950/20',
    },
  },
  103: {
    id: 103,
    name: "Devotee's Starlight Emblem",
    type: 1,
    typeName: 'Devotee',
    faction: 'Grace Imperium',
    slot: 'lv90',
    shape: 'starlight',
    shapeLabel: 'Starlight',
    levelLabel: 'Lv.90',
    image: '/emblems/chargem_c_01.webp',
    theme: {
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40',
      borderColor: 'border-cyan-500/40',
      glow: 'rgba(6, 182, 212, 0.3)',
      accentDot: 'bg-cyan-400',
      badgeClass: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60',
      cardBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
      gradient: 'from-cyan-950/30 to-blue-950/20',
    },
  },

  // Pathfinder Series (Type 2 - Red / Trekker Association)
  201: {
    id: 201,
    name: "Pathfinder's Spike Emblem",
    type: 2,
    typeName: 'Pathfinder',
    faction: 'Trekker Association',
    slot: 'lv70',
    shape: 'spike',
    shapeLabel: 'Spike',
    levelLabel: 'Lv.70',
    image: '/emblems/chargem_a_02.webp',
    theme: {
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-950/40',
      borderColor: 'border-rose-500/40',
      glow: 'rgba(244, 63, 94, 0.3)',
      accentDot: 'bg-rose-400',
      badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-800/60',
      cardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      gradient: 'from-rose-950/30 to-red-950/20',
    },
  },
  202: {
    id: 202,
    name: "Pathfinder's Rhombus Emblem",
    type: 2,
    typeName: 'Pathfinder',
    faction: 'Trekker Association',
    slot: 'lv80',
    shape: 'rhombus',
    shapeLabel: 'Rhombus',
    levelLabel: 'Lv.80',
    image: '/emblems/chargem_b_02.webp',
    theme: {
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-950/40',
      borderColor: 'border-rose-500/40',
      glow: 'rgba(244, 63, 94, 0.3)',
      accentDot: 'bg-rose-400',
      badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-800/60',
      cardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      gradient: 'from-rose-950/30 to-red-950/20',
    },
  },
  203: {
    id: 203,
    name: "Pathfinder's Starlight Emblem",
    type: 2,
    typeName: 'Pathfinder',
    faction: 'Trekker Association',
    slot: 'lv90',
    shape: 'starlight',
    shapeLabel: 'Starlight',
    levelLabel: 'Lv.90',
    image: '/emblems/chargem_c_02.webp',
    theme: {
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-950/40',
      borderColor: 'border-rose-500/40',
      glow: 'rgba(244, 63, 94, 0.3)',
      accentDot: 'bg-rose-400',
      badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-800/60',
      cardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      gradient: 'from-rose-950/30 to-red-950/20',
    },
  },

  // Defender Series (Type 3 - Gold / Imperial Guard)
  301: {
    id: 301,
    name: "Defender's Spike Emblem",
    type: 3,
    typeName: 'Defender',
    faction: 'Imperial Guard',
    slot: 'lv70',
    shape: 'spike',
    shapeLabel: 'Spike',
    levelLabel: 'Lv.70',
    image: '/emblems/chargem_a_03.webp',
    theme: {
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-500/40',
      glow: 'rgba(245, 158, 11, 0.3)',
      accentDot: 'bg-amber-400',
      badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
      cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
      gradient: 'from-amber-950/30 to-yellow-950/20',
    },
  },
  302: {
    id: 302,
    name: "Defender's Rhombus Emblem",
    type: 3,
    typeName: 'Defender',
    faction: 'Imperial Guard',
    slot: 'lv80',
    shape: 'rhombus',
    shapeLabel: 'Rhombus',
    levelLabel: 'Lv.80',
    image: '/emblems/chargem_b_03.webp',
    theme: {
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-500/40',
      glow: 'rgba(245, 158, 11, 0.3)',
      accentDot: 'bg-amber-400',
      badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
      cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
      gradient: 'from-amber-950/30 to-yellow-950/20',
    },
  },
  303: {
    id: 303,
    name: "Defender's Starlight Emblem",
    type: 3,
    typeName: 'Defender',
    faction: 'Imperial Guard',
    slot: 'lv90',
    shape: 'starlight',
    shapeLabel: 'Starlight',
    levelLabel: 'Lv.90',
    image: '/emblems/chargem_c_03.webp',
    theme: {
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-500/40',
      glow: 'rgba(245, 158, 11, 0.3)',
      accentDot: 'bg-amber-400',
      badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
      cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
      gradient: 'from-amber-950/30 to-yellow-950/20',
    },
  },
};

export function getCharacterEmblems(character?: Character | null): {
  lv70: CharGemMetadata;
  lv80: CharGemMetadata;
  lv90: CharGemMetadata;
} {
  const gemSlots = character?.gemSlots || [101, 202, 303];
  return {
    lv70: CHAR_GEMS[gemSlots[0]] || CHAR_GEMS[101],
    lv80: CHAR_GEMS[gemSlots[1]] || CHAR_GEMS[202],
    lv90: CHAR_GEMS[gemSlots[2]] || CHAR_GEMS[303],
  };
}
