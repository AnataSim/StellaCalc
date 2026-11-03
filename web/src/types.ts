export interface StatItem {
  Level: number;
  HP: number;
  ATK: number;
  DEF: number;
  'Crit Rate': string;
  'Crit DMG': string;
  'Resilience Break Efficiency'?: string;
  'VUL Exploit'?: string;
}

export interface SkillData {
  name: string;
  icon?: string;
  desc?: string;
  cooldown?: string | number;
  energyLimit?: number;
  params?: any[];
}

export interface TalentBoost {
  name: string;
  desc: string;
  effectType?: string[];
  params?: any[];
}

export interface TalentGroup {
  name: string;
  boost: TalentBoost[];
}

export interface PotentialData {
  id: number;
  name: string;
  nameCN?: string;
  nameJP?: string;
  nameKR?: string;
  desc: string;
  descCN?: string;
  descJP?: string;
  descKR?: string;
  damageType?: string[];
  effectType?: string[];
  addAttrType?: string[];
  buffIcon?: string[];
  buffs?: any[];
  params?: (string | number)[];
  paramsTooltips?: any[];
  hiddenParams?: any[];
  hiddenParamsTooltips?: any[];
  icon?: string;
  corner?: string;
  rarity?: string;
}

export interface CharacterPotentials {
  mainCore: PotentialData[];
  mainNormal: PotentialData[];
  common: PotentialData[];
  supportCore: PotentialData[];
  supportNormal: PotentialData[];
}

export interface Character {
  id: number;
  name: string;
  star: number;
  element: string;
  class: string;
  attackType: string;
  affinityTemplate?: number; // 2 = ATK boost, 3 = HP boost
  gemSlots?: [number, number, number]; // [Lv.70, Lv.80, Lv.90] CharGem IDs (e.g. [301, 102, 203])
  style?: string;
  force?: string;
  cnCv?: string;
  jpCv?: string;
  birthday?: string;
  loveGift?: string | string[];
  hateGift?: string | string[];
  fixedStat?: {
    'Attack Range'?: number;
    'Walk Speed'?: number;
    'Run Speed'?: number;
    'Bullet Type'?: string;
    Ammo?: number;
    'Charge Rate'?: string;
    'Energy Cost'?: string;
  };
  normalAtk?: SkillData | null;
  skill?: SkillData | null;
  supportSkill?: SkillData | null;
  ultimate?: SkillData | null;
  talent?: TalentGroup[];
  potential?: CharacterPotentials;
  stat?: StatItem[];
}

export interface DiscSecondarySkill {
  id: number;
  name: string;
  nameCN?: string;
  nameJP?: string;
  nameKR?: string;
  desc: string;
  descCN?: string;
  descJP?: string;
  descKR?: string;
  effectType?: string[];
  addAttrType?: string[];
  buffIcon?: string[];
  params?: string;
  requirements?: { [melodyName: string]: number }[];
  icon?: string;
  iconBg?: string;
}

export interface DiscItem {
  id: number;
  name: string;
  icon?: string | null;
  star: number;
  element: string;
  char?: string[];
  tag?: string[];
  source?: string[];
  mainSkill?: {
    name: string;
    desc: string;
    params?: string;
    effectType?: string[];
    icon?: string;
  } | null;
  secondarySkill1?: DiscSecondarySkill | null;
  secondarySkill2?: DiscSecondarySkill | null;
  stat?: any[];
  dupe?: any[];
  supportNote?: any[];
}

export interface EmblemTier {
  attrGroup: {
    weight: string;
    attr: string[];
  }[];
  uniqueAttrGroup?: {
    attr: string[];
    uniqueAttrGroupProb?: string;
  };
}

export interface EmblemConfig {
  lv70: EmblemTier;
  lv80: EmblemTier;
  lv90: EmblemTier;
}

export type EmblemTierLevel = 1 | 2 | 3 | 4;

export interface EmblemStatLine {
  statId: string;
  tier: EmblemTierLevel;
  targetPotentialId?: number; // Selected potential ID for unique_talent (non-maincore)
}

export interface EmblemSlotState {
  lines?: EmblemStatLine[];
  mainStat?: string;
  uniqueSkill?: string;
  uniqueVal?: number;
  uniquePotential?: number;
}

export interface DiscSlotState {
  discId: number | null;
  level: number;
  dupe: number; // 1 to 6 (C1 to C6)
  harmonySkillLevel?: number; // 1 to 6 (Legacy / fallback)
  harmonySkill1Level?: number; // 0 to 5 (0 = off, 1-5 = tier for Harmony Skill 1)
  harmonySkill2Level?: number; // 0 to 5 (0 = off, 1-5 = tier for Harmony Skill 2)
}

export interface TeamMemberSlot {
  characterId: number;
  level: number;
  skillLevels: {
    normal: number;
    main: number;
    support: number;
    ult: number;
  };
  potentials: number[]; // Character dupe T1..T5
  potentialLevels?: { [potentialId: number]: number }; // Active potential levels 1-9 (or 0/undefined if inactive)
  activeTalents: { [talentIdx: number]: boolean };
  affinityLevel: number;
  emblems: {
    lv70: EmblemSlotState;
    lv80: EmblemSlotState;
    lv90: EmblemSlotState;
  };
}

export interface BuildState {
  characterId: number;
  level: number;
  skillLevels: {
    normal: number;
    main: number;
    support: number;
    ult: number;
  };
  potentials: number[]; // Character dupe T1..T5
  potentialLevels?: { [potentialId: number]: number }; // Active potential levels 1-9 (or 0/undefined if inactive)
  activeTalents: { [talentIdx: number]: boolean };
  affinityLevel: number;
  emblems: {
    lv70: EmblemSlotState;
    lv80: EmblemSlotState;
    lv90: EmblemSlotState;
  };
  // Team composition (1 Main + 2 Supports)
  support1?: TeamMemberSlot;
  support2?: TeamMemberSlot;
  activeTeamSlot?: 0 | 1 | 2; // 0 = Main (Leader), 1 = Support 1, 2 = Support 2
  discs: {
    main1: DiscSlotState;
    main2: DiscSlotState;
    main3: DiscSlotState;
    support1: DiscSlotState;
    support2: DiscSlotState;
    support3: DiscSlotState;
  };
  harmonyNoteLevels?: { [noteId: string]: number }; // Custom levels 1-99 for 13 Harmony Notes
  combatToggles?: {
    markActive: boolean;
    ultBuffActive: boolean;
    skillBuffActive: boolean;
  };
}

export interface CalculatedStats {
  base: {
    hp: number;
    atk: number;
    def: number;
    critRate: number;
    critDmg: number;
    chargeEffMain: number;
    chargeEffSupport: number;
    elemDmg: number;
    elemPen: number;
    defPen: number;
    vulnDmgTaken?: number;
  };
  bonus: {
    hp: number;
    atk: number;
    def: number;
    critRate: number;
    critDmg: number;
    chargeEffMain: number;
    chargeEffSupport: number;
    elemDmg: number;
    elemPen: number;
    defPen: number;
    vulnDmgTaken?: number;
  };
  total: {
    hp: number;
    atk: number;
    def: number;
    critRate: number;
    critDmg: number;
    chargeEffMain: number;
    chargeEffSupport: number;
    elemDmg: number;
    elemPen: number;
    defPen: number;
    vulnDmgTaken?: number;
  };
  effectiveSkillLevels: {
    normal: number;
    main: number;
    support: number;
    ult: number;
  };
  emblemBonuses: {
    normalBonus: number;
    mainBonus: number;
    supportBonus: number;
    ultBonus: number;
    talentBonus: number;
  };
  breakdowns: {
    [statKey: string]: { label: string; value: string; source: string }[];
  };
}
