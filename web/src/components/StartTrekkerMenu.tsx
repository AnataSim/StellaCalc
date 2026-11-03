import React, { useState, useMemo } from 'react';
import type { Character } from '../types';
import { Plus, X } from 'lucide-react';
import { getCharacterHeadUrl, getElementIconUrl } from '../utils/assetUrl';

interface StartTrekkerMenuProps {
  characters: Record<string, Character>;
  onSelectCharacter: (charId: number) => void;
}

export const StartTrekkerMenu: React.FC<StartTrekkerMenuProps> = ({
  characters,
  onSelectCharacter,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const allCharactersList = useMemo(() => {
    return Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));
  }, [characters]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 select-none">
      {/* 1 Single Empty Vertical Card (Aspect ratio 1/1.75, matching TeamBar card) */}
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        className="w-48 sm:w-56 aspect-[1/1.75] rounded-2xl border-2 border-dashed border-zinc-700 hover:border-orange-500 bg-zinc-950/60 hover:bg-zinc-900/80 transition-all duration-200 cursor-pointer group shadow-2xl flex flex-col items-center justify-center p-4 relative"
        title="Klik untuk memilih Main Trekker"
      >
        <span className="absolute top-3 left-3 text-[11px] font-mono font-bold text-zinc-500 group-hover:text-zinc-400">
          Main Trekker
        </span>

        {/* Big Plus Icon inside Circular Badge */}
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-orange-500 group-hover:text-orange-400 transition-all text-zinc-400 mb-3 shadow-md">
          <Plus className="w-7 h-7" />
        </div>

        <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
          Pilih Trekker
        </span>
        <span className="text-[11px] text-zinc-500 mt-1">
          Klik untuk mulai
        </span>
      </button>

      {/* Clean Character Picker Modal (Opens upon clicking the single card) */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-750 rounded-2xl max-w-xl w-full p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-sm font-bold text-white tracking-wide">
                Pilih Main Trekker
              </span>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 overflow-y-auto max-h-[60vh] p-1 pr-1.5 custom-scrollbar">
              {allCharactersList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCharacter(c.id);
                    setIsPickerOpen(false);
                  }}
                  className="aspect-[1/1.4] rounded-xl border border-zinc-800 hover:border-orange-500/80 bg-zinc-950 overflow-hidden relative cursor-pointer group shadow-sm flex flex-col justify-end p-1.5 text-center transition-all hover:scale-105"
                  title={c.name}
                >
                  <img
                    src={getCharacterHeadUrl(c.id)}
                    alt={c.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-1 left-1 p-0.5 rounded bg-black/70 border border-zinc-700/80 z-10">
                    <img
                      src={getElementIconUrl(c.element)}
                      alt={c.element}
                      className="w-3 h-3 object-contain"
                    />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-4 pb-1 px-1 z-10 pointer-events-none">
                    <span className="text-[10.5px] font-bold text-white block truncate">
                      {c.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
