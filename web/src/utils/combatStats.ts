import React from 'react';
import type { CalculatedStats, Character } from '../types';
import { getElementColor } from './assetUrl';
import {
  Heart,
  Sword,
  Shield,
  Zap,
  Flame,
  ShieldAlert,
  BatteryCharging,
  Crosshair,
  Target,
  Battery,
  Sparkles
} from 'lucide-react';

export interface StatDefinition {
  key: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  base: number;
  bonus: number;
  total: number;
  isPercent: boolean;
  color: string;
  desc: string;
}

export const DEFAULT_SLOTS: (string | null)[] = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null
];

export const STORAGE_KEY_SLOTS = 'stella_sora_combat_stats_slots_v3';
export const STORAGE_KEY_AUTOSORT = 'stella_sora_combat_stats_autosort_v2';

export function formatStatValue(val: number, isPercent?: boolean): string {
  if (isPercent) {
    return `${val % 1 === 0 ? val : val.toFixed(1)}%`;
  }
  return Math.round(val).toLocaleString('id-ID');
}

export function getAvailableStatsMap(
  stats: CalculatedStats,
  character: Character | null
): Record<string, StatDefinition> {
  const elemName = character?.element || 'Element';
  const elem = getElementColor(character?.element || 'Ignis');

  return {
    hp: {
      key: 'hp',
      label: 'HP',
      shortLabel: 'HP',
      icon: Heart,
      base: stats.base.hp,
      bonus: stats.bonus.hp,
      total: stats.total.hp,
      isPercent: false,
      color: 'text-rose-400',
      desc: 'Maximum Health of Trekker'
    },
    atk: {
      key: 'atk',
      label: 'ATK',
      shortLabel: 'ATK',
      icon: Sword,
      base: stats.base.atk,
      bonus: stats.bonus.atk,
      total: stats.total.atk,
      isPercent: false,
      color: 'text-amber-400',
      desc: 'Attack Power affecting skill and auto attack damage'
    },
    def: {
      key: 'def',
      label: 'DEF',
      shortLabel: 'DEF',
      icon: Shield,
      base: stats.base.def,
      bonus: stats.bonus.def,
      total: stats.total.def,
      isPercent: false,
      color: 'text-blue-400',
      desc: 'Defense reduction against incoming damage'
    },
    critRate: {
      key: 'critRate',
      label: 'Crit Rate',
      shortLabel: 'CRIT %',
      icon: Zap,
      base: stats.base.critRate,
      bonus: stats.bonus.critRate,
      total: stats.total.critRate,
      isPercent: true,
      color: 'text-yellow-400',
      desc: 'Chance of scoring a Critical Hit'
    },
    critDmg: {
      key: 'critDmg',
      label: 'Crit DMG',
      shortLabel: 'CDMG %',
      icon: Sparkles,
      base: stats.base.critDmg,
      bonus: stats.bonus.critDmg,
      total: stats.total.critDmg,
      isPercent: true,
      color: 'text-orange-400',
      desc: 'Damage multiplier when scoring a Critical Hit'
    },
    elemDmg: {
      key: 'elemDmg',
      label: `${elemName} DMG`,
      shortLabel: `${elemName} %`,
      icon: Flame,
      base: stats.base.elemDmg,
      bonus: stats.bonus.elemDmg,
      total: stats.total.elemDmg,
      isPercent: true,
      color: elem.text,
      desc: `Bonus damage multiplier for ${elemName} attacks`
    },
    elemPen: {
      key: 'elemPen',
      label: `${elemName} PEN`,
      shortLabel: `${elemName} PEN`,
      icon: Target,
      base: stats.base.elemPen,
      bonus: stats.bonus.elemPen,
      total: stats.total.elemPen,
      isPercent: false,
      color: elem.text,
      desc: `Penetrates enemy ${elemName} elemental resistance`
    },
    defPen: {
      key: 'defPen',
      label: 'DEF PEN',
      shortLabel: 'DEF PEN',
      icon: ShieldAlert,
      base: stats.base.defPen,
      bonus: stats.bonus.defPen,
      total: stats.total.defPen,
      isPercent: false,
      color: 'text-teal-400',
      desc: 'Direct flat penetration of enemy armor'
    },
    chargeEffMain: {
      key: 'chargeEffMain',
      label: 'Charge Eff (Main)',
      shortLabel: 'Charge (M)',
      icon: BatteryCharging,
      base: stats.base.chargeEffMain,
      bonus: stats.bonus.chargeEffMain,
      total: stats.total.chargeEffMain,
      isPercent: true,
      color: 'text-cyan-400',
      desc: 'Energy generation efficiency when controlled as Main Trekker'
    },
    chargeEffSupport: {
      key: 'chargeEffSupport',
      label: 'Charge Eff (Support)',
      shortLabel: 'Charge (S)',
      icon: Battery,
      base: stats.base.chargeEffSupport,
      bonus: stats.bonus.chargeEffSupport,
      total: stats.total.chargeEffSupport,
      isPercent: true,
      color: 'text-indigo-400',
      desc: 'Energy generation efficiency when in Support role'
    },
    vulExploit: {
      key: 'vulExploit',
      label: 'VUL Exploit',
      shortLabel: 'VUL %',
      icon: Crosshair,
      base: 0,
      bonus: 0,
      total: 0,
      isPercent: true,
      color: 'text-rose-300',
      desc: 'Damage multiplier when attacking vulnerable enemies'
    },
    maxEnergy: {
      key: 'maxEnergy',
      label: 'Max Energy',
      shortLabel: 'Energy',
      icon: Zap,
      base: 235,
      bonus: 0,
      total: 235,
      isPercent: false,
      color: 'text-amber-200',
      desc: 'Maximum Energy pool required to cast Ultimate'
    },
    ignoreDef: {
      key: 'ignoreDef',
      label: 'Ignore DEF',
      shortLabel: 'Ign DEF',
      icon: ShieldAlert,
      base: 0,
      bonus: 0,
      total: 0,
      isPercent: true,
      color: 'text-emerald-400',
      desc: 'Percentage of enemy defense bypassed'
    },
    ignoreElemRes: {
      key: 'ignoreElemRes',
      label: `Ignore ${elemName} RES`,
      shortLabel: `Ign ${elemName}`,
      icon: Flame,
      base: 0,
      bonus: 0,
      total: 0,
      isPercent: true,
      color: 'text-purple-400',
      desc: `Percentage of enemy ${elemName} resistance bypassed`
    }
  };
}

