import type { BuildState, DiscItem } from '../types';

/**
 * Returns the official signature disc for a given character name if one exists.
 */
export function getCharacterSignatureDisc(
  characterName: string,
  discsMap: { [id: string]: DiscItem }
): DiscItem | null {
  if (!characterName || !discsMap) return null;

  const normalizedCharName = characterName.trim().toLowerCase();
  // Support aliases if any (e.g. Fnoya -> Firstlight Noya)
  const resolvedCharName =
    normalizedCharName === 'fnoya' ? 'firstlight noya' : normalizedCharName;

  for (const disc of Object.values(discsMap)) {
    if (disc.source && disc.source.includes('Signature') && disc.char) {
      if (disc.char.some((c) => c.toLowerCase() === resolvedCharName)) {
        return disc;
      }
    }
  }
  return null;
}

/**
 * Detects whether the active Trekker's signature disc is equipped in any of the
 * 6 disc slots (3 Main or 3 Support).
 * - Returns 0 (C0) if the Trekker has no signature disc equipped.
 * - Returns 1..6 (C1..C6) matching the equipped signature disc's Crescendo level.
 */
export function getActiveSignatureCrescendo(
  characterName: string,
  discsState: BuildState['discs'],
  discsMap: { [id: string]: DiscItem }
): {
  crescendo: number; // 0 for C0, 1..6 for C1..C6
  isEquipped: boolean;
  signatureDisc: DiscItem | null;
  slotKey: string | null;
} {
  const signatureDisc = getCharacterSignatureDisc(characterName, discsMap);
  if (!signatureDisc || !discsState) {
    return { crescendo: 0, isEquipped: false, signatureDisc: null, slotKey: null };
  }

  const slotKeys: (keyof BuildState['discs'])[] = [
    'main1',
    'main2',
    'main3',
    'support1',
    'support2',
    'support3',
  ];

  let highestCrescendo = 0;
  let equippedSlot: string | null = null;

  for (const key of slotKeys) {
    const slot = discsState[key];
    if (slot && slot.discId === signatureDisc.id) {
      const dupe = Math.max(1, Math.min(6, slot.dupe || 1));
      if (dupe > highestCrescendo) {
        highestCrescendo = dupe;
        equippedSlot = key;
      }
    }
  }

  if (highestCrescendo > 0) {
    return {
      crescendo: highestCrescendo,
      isEquipped: true,
      signatureDisc,
      slotKey: equippedSlot,
    };
  }

  return {
    crescendo: 0,
    isEquipped: false,
    signatureDisc,
    slotKey: null,
  };
}
