const ASSET_BASE = 'https://raw.githubusercontent.com/AutumnVN/ssassets/refs/heads/main/export/assets/assetbundles/icon';

export function getCharacterHeadUrl(charId: number, defaultSkin = '01'): string {
  return `${ASSET_BASE}/head/head_${charId}${defaultSkin}_XL.webp`;
}

export function getSkillIconUrl(iconName?: string): string | null {
  if (!iconName) return null;
  return `${ASSET_BASE}/skill/${iconName}.webp`;
}

export function getDiscSkillIconUrl(iconName?: string): string | null {
  if (!iconName) return null;
  return `${ASSET_BASE}/discskill/${iconName}.webp`;
}

export function getDiscCoverUrl(iconName?: string | null): string | null {
  if (!iconName) return null;
  return `${ASSET_BASE}/outfit/${iconName}.webp`;
}

export function getBuffIconUrl(buffIcon?: string): string | null {
  if (!buffIcon) return null;
  return `${ASSET_BASE}/buff/${buffIcon}.webp`;
}

export function getPotentialIconUrl(iconName?: string): string | null {
  if (!iconName) return null;
  return `${ASSET_BASE}/potential/${iconName}_A.webp`;
}

export function getHarmonyNoteIconUrl(noteId: string | number, variant: 'norm' | 'small' | 'item' = 'norm'): string {
  const numId = String(noteId);
  if (variant === 'small') {
    return `/notes/note_${numId}_S.webp`;
  }
  if (variant === 'item') {
    return `/notes/item_${numId}.webp`;
  }
  return `/notes/note_${numId}.webp`;
}

export function getHarmonyNoteCdnUrl(noteId: string | number, variant: 'norm' | 'small' | 'item' = 'norm'): string {
  const numId = String(noteId);
  if (variant === 'small') {
    return `${ASSET_BASE}/note/note_${numId}_S.webp`;
  }
  if (variant === 'item') {
    return `${ASSET_BASE}/item/item_${numId}.webp`;
  }
  return `${ASSET_BASE}/note/note_${numId}.webp`;
}

export function getElementColor(element: string): {
  bg: string;
  text: string;
  border: string;
  glow: string;
  raw: string;
} {
  switch (element?.toLowerCase()) {
    case 'ignis':
      return {
        bg: 'bg-orange-950/40',
        text: 'text-orange-400',
        border: 'border-orange-500/40',
        glow: 'shadow-orange-500/20',
        raw: '#f97316'
      };
    case 'aqua':
      return {
        bg: 'bg-sky-950/40',
        text: 'text-sky-400',
        border: 'border-sky-500/40',
        glow: 'shadow-sky-500/20',
        raw: '#0ea5e9'
      };
    case 'lux':
      return {
        bg: 'bg-yellow-950/40',
        text: 'text-yellow-400',
        border: 'border-yellow-500/40',
        glow: 'shadow-yellow-500/20',
        raw: '#eab308'
      };
    case 'umbra':
      return {
        bg: 'bg-purple-950/40',
        text: 'text-purple-400',
        border: 'border-purple-500/40',
        glow: 'shadow-purple-500/20',
        raw: '#a855f7'
      };
    case 'ventus':
      return {
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        glow: 'shadow-emerald-500/20',
        raw: '#10b981'
      };
    case 'terra':
      return {
        bg: 'bg-amber-950/40',
        text: 'text-amber-500',
        border: 'border-amber-600/40',
        glow: 'shadow-amber-600/20',
        raw: '#d97706'
      };
    default:
      return {
        bg: 'bg-zinc-900',
        text: 'text-zinc-400',
        border: 'border-zinc-700',
        glow: 'shadow-zinc-700/20',
        raw: '#71717a'
      };
  }
}

export function getEmblemImageUrl(gemIdOrSlot: number | 'lv70' | 'lv80' | 'lv90', maybeGemId?: number): string {
  let gemId: number;
  if (typeof gemIdOrSlot === 'number') {
    gemId = gemIdOrSlot;
  } else if (maybeGemId) {
    gemId = maybeGemId;
  } else {
    // Fallback based on slot
    gemId = gemIdOrSlot === 'lv70' ? 101 : gemIdOrSlot === 'lv80' ? 102 : 103;
  }

  const typeNum = Math.floor(gemId / 100); // 1, 2, 3
  const shapeNum = gemId % 10; // 1, 2, 3
  const typeCode = String(typeNum).padStart(2, '0'); // '01', '02', '03'
  const shapeCode = shapeNum === 1 ? 'a' : shapeNum === 2 ? 'b' : 'c';

  return `/emblems/chargem_${shapeCode}_${typeCode}.webp`;
}

export function getEmblemCdnUrl(gemId: number): string {
  const typeNum = Math.floor(gemId / 100);
  const shapeNum = gemId % 10;
  const typeCode = String(typeNum).padStart(2, '0');
  const shapeCode = shapeNum === 1 ? 'a' : shapeNum === 2 ? 'b' : 'c';
  return `https://raw.githubusercontent.com/AutumnVN/ssassets/refs/heads/main/export/assets/assetbundles/icon/equipment/chargem_${shapeCode}_${typeCode}.webp`;
}

export function getEmblemBgImageUrl(typeNum: number = 1): string {
  const typeCode = String(typeNum).padStart(2, '0');
  return `/emblems/chargem_d_${typeCode}.webp`;
}

export function getElementIconUrl(element?: string | null): string {
  if (!element) return '/icons/elem_all.webp';
  const el = element.toLowerCase();
  switch (el) {
    case 'ignis':
    case 'aqua':
    case 'lux':
    case 'umbra':
    case 'ventus':
    case 'terra':
      return `/icons/elem_${el}.webp`;
    default:
      return '/icons/elem_all.webp';
  }
}

export function getRoleIconUrl(role?: string | null): string {
  if (!role) return '/icons/role_all.webp';
  const r = role.toLowerCase();
  switch (r) {
    case 'vanguard':
    case 'versatile':
    case 'support':
      return `/icons/role_${r}.webp`;
    default:
      return '/icons/role_all.webp';
  }
}


