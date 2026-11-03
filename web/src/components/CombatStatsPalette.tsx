import React, { useState, useMemo } from 'react';
import type { CalculatedStats, Character } from '../types';
import {
  getAvailableStatsMap,
  formatStatValue,
  type StatDefinition
} from '../utils/combatStats';
import {
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  GripHorizontal
} from 'lucide-react';

interface CombatStatsPaletteProps {
  character: Character | null;
  stats: CalculatedStats;
  slots: (string | null)[];
  onUpdateSlots: (newSlots: (string | null)[]) => void;
  onResetSlots: () => void;
  pickingSlotIndex: number | null;
  onSelectSlotToPick: (idx: number | null) => void;
  selectedPaletteStat: string | null;
  onSelectPaletteStat: (statKey: string | null) => void;
}

export const CombatStatsPalette: React.FC<CombatStatsPaletteProps> = ({
  character,
  stats,
  slots,
  onUpdateSlots,
  onResetSlots,
  pickingSlotIndex,
  onSelectSlotToPick,
  selectedPaletteStat,
  onSelectPaletteStat,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [draggedStatKey, setDraggedStatKey] = useState<string | null>(null);
  const [isDragOverPalette, setIsDragOverPalette] = useState(false);

  const availableStatsMap = useMemo(() => {
    return getAvailableStatsMap(stats, character);
  }, [stats, character]);

  const allStatsList = useMemo(() => {
    return Object.values(availableStatsMap);
  }, [availableStatsMap]);

  // "untuk bagian bawah tampilin yang belum ditambahin aja, kalo udah ditambahin gausah ditampilin"
  const unaddedStats = useMemo(() => {
    return allStatsList.filter((stat) => !slots.includes(stat.key));
  }, [allStatsList, slots]);

  const handleLogoClick = (statKey: string) => {
    // If a slot was waiting above (e.g. user clicked an empty slot)
    if (pickingSlotIndex !== null) {
      const updated = [...slots];
      const existingIdx = updated.indexOf(statKey);
      if (existingIdx !== -1) updated[existingIdx] = null;
      updated[pickingSlotIndex] = statKey;
      onUpdateSlots(updated);
      onSelectSlotToPick(null);
      onSelectPaletteStat(null);
      return;
    }

    // Toggle selected state
    if (selectedPaletteStat === statKey) {
      onSelectPaletteStat(null);
      return;
    }

    onSelectPaletteStat(statKey);
  };

  // Drop zone: Dragging a stat from top slots back into the palette removes it from the slot!
  const handleDropOnPalette = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPalette(false);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (data.type === 'slot' && typeof data.sourceIdx === 'number') {
        const updated = [...slots];
        updated[data.sourceIdx] = null;
        onUpdateSlots(updated);
      }
    } catch (err) {
      console.error('Palette drop error:', err);
    }
  };

  const activeStatDef: StatDefinition | null = useMemo(() => {
    const key = selectedPaletteStat || hoveredKey;
    if (!key || !availableStatsMap[key]) return null;
    return availableStatsMap[key];
  }, [selectedPaletteStat, hoveredKey, availableStatsMap]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOverPalette) setIsDragOverPalette(true);
      }}
      onDragLeave={() => setIsDragOverPalette(false)}
      onDrop={handleDropOnPalette}
      className={`bg-zinc-900/75 border rounded-xl p-3 sm:p-3.5 shadow-xl backdrop-blur-md transition-all ${
        isDragOverPalette
          ? 'border-rose-500/80 bg-rose-950/20 ring-2 ring-rose-500/50'
          : 'border-zinc-800/80'
      }`}
    >
      {/* Header: Clean title & Reset button */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] block truncate">
            Pilih Combat Stats
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            ({unaddedStats.length} tersedia)
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reset Defaults Button */}
          <button
            type="button"
            onClick={onResetSlots}
            title="Reset ke Combat Stats Default"
            className="p-1 rounded-md bg-zinc-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unadded Stat Logos ("hanya yang belum ditambahin", Drag & Drop Enabled) */}
      {unaddedStats.length > 0 ? (
        <div className="flex flex-wrap gap-2 items-center">
          {unaddedStats.map((stat) => {
            const Icon = stat.icon;
            const isSelected = selectedPaletteStat === stat.key;
            const isDragging = draggedStatKey === stat.key;

            return (
              <button
                key={stat.key}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ type: 'palette', statKey: stat.key })
                  );
                  e.dataTransfer.effectAllowed = 'copyMove';
                  setDraggedStatKey(stat.key);
                }}
                onDragEnd={() => {
                  setDraggedStatKey(null);
                }}
                onClick={() => handleLogoClick(stat.key)}
                onMouseEnter={() => setHoveredKey(stat.key)}
                onMouseLeave={() => setHoveredKey(null)}
                title={`Tarik (drag) ke slot di atas atau klik: ${stat.label} (${formatStatValue(
                  stat.total,
                  stat.isPercent
                )})`}
                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center transition-all cursor-grab active:cursor-grabbing select-none group ${
                  isDragging
                    ? 'opacity-40 scale-95 border-amber-400 bg-amber-500/20'
                    : isSelected
                    ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] ring-2 ring-amber-400 scale-105 z-10'
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 hover:scale-105 shadow-sm'
                }`}
              >
                {/* Stat Icon Logo */}
                <div
                  className={`transition-transform duration-150 group-hover:scale-110 ${
                    isSelected ? 'text-amber-300' : stat.color
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Selected Ring Dot */}
                {isSelected && (
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-3 text-center text-xs text-zinc-500">
          Semua Combat Stats telah terpasang di atas. Klik tanda silang (✕) pada baris stat di atas untuk mengembalikannya ke sini.
        </div>
      )}

      {/* Dynamic Guidance & Hover Preview Footer */}
      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 text-xs">
        {isDragOverPalette ? (
          <div className="text-center py-1 text-rose-400 text-[11px] font-medium animate-pulse">
            Lepas di sini untuk menghapus stat dari slot di atas
          </div>
        ) : selectedPaletteStat && availableStatsMap[selectedPaletteStat] ? (
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-[11px] animate-in fade-in duration-150">
            <span className="truncate">
              Logo <strong>{availableStatsMap[selectedPaletteStat].label}</strong> dipilih. Drag atau klik slot di atas!
            </span>
            <button
              type="button"
              onClick={() => onSelectPaletteStat(null)}
              className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer font-mono shrink-0 ml-2"
            >
              [Batal]
            </button>
          </div>
        ) : activeStatDef ? (
          <div className="flex items-center justify-between text-[11px] text-zinc-300 truncate">
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <span className={`font-bold ${activeStatDef.color}`}>{activeStatDef.label}:</span>
              <span className="font-mono font-semibold text-zinc-100">
                {formatStatValue(activeStatDef.total, activeStatDef.isPercent)}
              </span>
              <span className="text-zinc-500 text-[10.5px] truncate">({activeStatDef.desc})</span>
            </div>
            <span className="text-[10px] text-zinc-500 ml-2 shrink-0 font-mono flex items-center gap-1">
              <GripHorizontal className="w-3 h-3 text-zinc-600" /> Drag to Slot
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400/80 shrink-0" />
              <span>Tarik (drag) logo ke slot yang diinginkan di atas.</span>
            </span>
            <span className="text-zinc-600 font-mono text-[10px] shrink-0 ml-2">
              Drag & Drop
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
