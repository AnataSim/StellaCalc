import React, { useEffect, useState } from 'react';
import {
  IdCard,
  User,
  Zap,
  GitBranch,
  Disc3,
  Award,
  ChevronUp,
} from 'lucide-react';

interface NavItem {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'section-passionate-card',
    name: 'Passionate Trekker Card',
    subtitle: 'Showcase & Overview',
    icon: IdCard,
  },
  {
    id: 'section-character',
    name: 'Trekker Details',
    subtitle: 'Level · Affinity · Limit Break',
    icon: User,
  },
  {
    id: 'section-skills',
    name: 'Skill & Multipliers',
    subtitle: 'Normal · Main · Support · Ult',
    icon: Zap,
  },
  {
    id: 'section-potentials',
    name: 'Trekker Potentials',
    subtitle: 'Core & Normal Potentials Tree',
    icon: GitBranch,
  },
  {
    id: 'section-discs',
    name: 'Discs & Harmony',
    subtitle: 'Main & Support Discs · Notes',
    icon: Disc3,
  },
  {
    id: 'section-emblems',
    name: 'Emblem System',
    subtitle: 'Lv.70 · Lv.80 · Lv.90 Emblems',
    icon: Award,
  },
];

export const QuickNavDock: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('section-passionate-card');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 100) {
        setActiveId(NAV_ITEMS[0].id);
        return;
      }

      let current = NAV_ITEMS[0].id;
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Check if top of section has scrolled near the top offset
          if (rect.top <= 260) {
            current = item.id;
          }
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // offset for sticky navbar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <aside
      aria-label="Quick Navigation"
      className="fixed z-40 select-none transition-all duration-300
        /* Hidden on mobile phones (< sm) so it doesn't obstruct inputs / clutter the screen */
        hidden sm:flex
        /* Tablet/Laptop screens (< 2xl): Horizontally centered at bottom */
        bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex-row items-center p-1 sm:p-1.5 rounded-full
        /* Ultra-wide screens (>= 2xl): Left gutter vertical dock */
        2xl:bottom-auto 2xl:top-1/2 2xl:-translate-y-1/2 2xl:left-4 2xl:translate-x-0 2xl:flex-col 2xl:p-2 2xl:rounded-[30px]
        bg-[#0c0d12]/92 backdrop-blur-md border border-amber-900/40 shadow-2xl shadow-black/80 ring-1 ring-amber-500/15"
    >
      {/* Top / Left "SC" Badge (Scroll to Top · No red background) */}
      <button
        type="button"
        onClick={scrollToTop}
        title="Scroll to Top · Stella Calc"
        className="w-8 h-8 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10 rounded-xl 2xl:rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-750 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-black text-[11px] sm:text-xs flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all group relative cursor-pointer shrink-0"
      >
        <span className="tracking-tight uppercase font-black group-hover:hidden">SC</span>
        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 hidden group-hover:block transition-all" />

        {/* Floating Tooltip */}
        <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 2xl:bottom-auto 2xl:mb-0 2xl:left-full 2xl:ml-3 2xl:translate-x-0 px-2.5 py-1 rounded-xl bg-zinc-950/95 border border-zinc-700/90 shadow-2xl text-center 2xl:text-left pointer-events-none opacity-0 translate-y-1 2xl:translate-y-0 2xl:translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 2xl:group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
          <span className="text-xs font-bold text-zinc-100 block">Stella Calc</span>
          <span className="text-[10px] text-amber-400 font-mono">Scroll to Top</span>
        </div>
      </button>

      {/* Thin Gold Accent Divider (Vertical on bottom dock, Horizontal on 2xl left dock) */}
      <div className="w-[1px] 2xl:w-6 h-5 sm:h-6 2xl:h-[1px] bg-gradient-to-b 2xl:bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-1 2xl:mx-0 2xl:my-2 shrink-0" />

      {/* 6 In-Game Navigation Buttons */}
      <div className="flex flex-row 2xl:flex-col gap-1 sm:gap-1.5 2xl:gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`w-8 h-8 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10 rounded-xl 2xl:rounded-2xl flex items-center justify-center transition-all duration-200 relative group cursor-pointer ${
                isActive
                  ? 'border-2 border-amber-400 bg-amber-500/20 text-amber-400 shadow-md shadow-amber-500/25 scale-105 ring-2 ring-amber-400/20'
                  : 'border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 hover:border-zinc-700/60'
              }`}
              title={item.name}
            >
              <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 2xl:w-5 2xl:h-5 transition-transform duration-200 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8] group-hover:scale-110'}`} />

              {/* Floating Tooltip on Hover */}
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 2xl:bottom-auto 2xl:mb-0 2xl:left-full 2xl:ml-3 2xl:translate-x-0 px-2.5 py-1 rounded-xl bg-zinc-950/95 border border-zinc-700/90 shadow-2xl text-center 2xl:text-left pointer-events-none opacity-0 translate-y-1 2xl:translate-y-0 2xl:translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 2xl:group-hover:translate-x-0 transition-all duration-150 z-50 whitespace-nowrap">
                <span className="text-xs font-bold text-zinc-100 block">{item.name}</span>
                <span className="text-[10px] text-amber-400 font-mono">{item.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

