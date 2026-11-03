export interface BreakdownNavigationItem {
  label: string;
  source: string;
  charName?: string;
}

export function navigateFromBreakdown(item: BreakdownNavigationItem) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('navigate-breakdown', { detail: item }));
}

