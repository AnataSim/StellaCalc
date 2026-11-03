import React, { useState, useMemo } from 'react';
import type { CalculatedStats, Character } from '../types';
import { getElementColor } from '../utils/assetUrl';
import {
  getAvailableStatsMap,
  formatStatValue
} from '../utils/combatStats';
import {
  Info,
  CheckCircle2,
  BarChart2,
  Swords,
  X,
  Plus,
  RotateCcw
} from 'lucide-react';
import { navigateFromBreakdown } from '../utils/navigation';

interface Props {
  stats: CalculatedStats;
  character: Character | null;
  activeTab?: 'stats' | 'dps';
  onTabChange?: (tab: 'stats' | 'dps') => void;
  slots: (string | null)[];
  onUpdateSlots: (newSlots: (string | null)[]) => void;
  autoSort?: boolean;
  onToggleAutoSort?: () => void;
  onResetSlots: () => void;
  pickingSlotIndex: number | null;
  onSelectSlotToPick: (idx: number | null) => void;
  selectedPaletteStat?: string | null;
  onSelectPaletteStat?: (statKey: string | null) => void;
}

export const StatSummaryCard: React.FC<Props> = ({
  stats,
  character,
  activeTab = 'stats',
  onTabChange,
  slots,
  onUpdateSlots,
  autoSort = false,
  onResetSlots,
  pickingSlotIndex,
  onSelectSlotToPick,
  selectedPaletteStat = null,
  onSelectPaletteStat,
}) => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [dragOverSlotIdx, setDragOverSlotIdx] = useState<number | null>(null);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);

  const elem = getElementColor(character?.element || 'Ignis');

  // Pool of all 14 available combat stats
  const availableStatsMap = useMemo(() => {
    return getAvailableStatsMap(stats, character);
  }, [stats, character]);

  // Remove a stat from slot at index
  const handleRemoveSlot = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedStat === slots[index]) setSelectedStat(null);

    if (autoSort) {
      const updated = slots.filter((_, idx) => idx !== index);
      while (updated.length < 10) updated.push(null);
      onUpdateSlots(updated);
    } else {
      const updated = [...slots];
      updated[index] = null;
      onUpdateSlots(updated);
    }
  };

  // Drop handler for dragging from bottom palette or reordering between slots
  const handleDrop = (targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlotIdx(null);
    setDragSourceIdx(null);

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      const updated = [...slots];

      if (data.type === 'palette' && data.statKey) {
        // Dragged from bottom palette into targetIdx
        const incomingKey = data.statKey;
        // If it was already placed somewhere else in slots, clear that old slot
        const existingIdx = updated.indexOf(incomingKey);
        if (existingIdx !== -1) {
          updated[existingIdx] = null;
        }
        updated[targetIdx] = incomingKey;
        onUpdateSlots(updated);
        onSelectPaletteStat?.(null);
        onSelectSlotToPick(null);
      } else if (data.type === 'slot' && typeof data.sourceIdx === 'number') {
        // Reordering between slots: swap sourceIdx and targetIdx!
        const src = data.sourceIdx;
        if (src !== targetIdx && src >= 0 && src < slots.length) {
          const temp = updated[targetIdx];
          updated[targetIdx] = updated[src];
          updated[src] = temp;
          onUpdateSlots(updated);
        }
      }
    } catch (err) {
      console.error('Drop error on slot:', err);
    }
  };

  return (
    <div className="bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Glow highlight */}
      <div
        className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-15 pointer-events-none rounded-full"
        style={{ backgroundColor: elem.raw }}
      />

      {/* Card Header (Clean: Title, Reset & Stats/DPS toggle only) */}
      <div className="flex flex-col gap-2 mb-3 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              Combat Stats
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Reset Defaults Button */}
            <button
              type="button"
              onClick={onResetSlots}
              title="Reset ke Combat Stats Default"
              className="p-1.5 rounded-md transition-all bg-zinc-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Tab Switcher (Stats / DPS) */}
            {onTabChange && (
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 shadow-inner ml-1">
                <button
                  type="button"
                  onClick={() => onTabChange('stats')}
                  title="Combat Stats"
                  aria-label="Combat Stats"
                  className={`p-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'stats'
                      ? 'bg-zinc-800 text-amber-300 border border-zinc-700 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('dps')}
                  title="Combat DPS"
                  aria-label="Combat DPS"
                  className={`p-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'dps'
                      ? 'bg-zinc-800 text-amber-300 border border-zinc-700 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Instruction Banner when a stat is chosen or waiting */}
        {selectedPaletteStat ? (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-[11px] text-cyan-200 animate-in fade-in duration-150">
            <span className="truncate">
              Logo <strong>{availableStatsMap[selectedPaletteStat]?.label}</strong> dipilih. Drag atau klik slot untuk menempatkan!
            </span>
            <button
              type="button"
              onClick={() => onSelectPaletteStat?.(null)}
              className="text-cyan-400 hover:underline font-mono text-[10px] cursor-pointer ml-2 shrink-0"
            >
              [Batal]
            </button>
          </div>
        ) : null}
      </div>

      {/* 10 Placement Slots List (Drag and Drop Enabled, No #1~#10 Numbers) */}
      <div className="space-y-1.5">
        {slots.map((slotKey, slotIdx) => {
          // EMPTY SLOT in Placing Mode
          if (!slotKey || !availableStatsMap[slotKey]) {
            const isTarget = pickingSlotIndex === slotIdx;
            const isDragOver = dragOverSlotIdx === slotIdx;

            return (
              <div
                key={`empty-slot-${slotIdx}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSlotIdx !== slotIdx) setDragOverSlotIdx(slotIdx);
                }}
                onDragLeave={() => {
                  if (dragOverSlotIdx === slotIdx) setDragOverSlotIdx(null);
                }}
                onDrop={(e) => handleDrop(slotIdx, e)}
                onClick={() => {
                  if (selectedPaletteStat) {
                    // Direct place selected palette stat into this slot
                    const updated = [...slots];
                    const existingIdx = updated.indexOf(selectedPaletteStat);
                    if (existingIdx !== -1) updated[existingIdx] = null;
                    updated[slotIdx] = selectedPaletteStat;
                    onUpdateSlots(updated);
                    onSelectPaletteStat?.(null);
                    onSelectSlotToPick(null);
                  } else {
                    onSelectSlotToPick(isTarget ? null : slotIdx);
                  }
                }}
                className={`group flex items-center justify-between py-2 px-3 rounded-lg border transition-all cursor-pointer shadow-xs ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400/80 scale-[1.01]'
                    : isTarget
                    ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/80 animate-pulse'
                    : selectedPaletteStat
                    ? 'border-cyan-500/70 bg-cyan-950/30 hover:bg-cyan-900/40 hover:border-cyan-400'
                    : 'border-dashed border-zinc-800 hover:border-amber-500/60 bg-zinc-950/20 hover:bg-zinc-900/50'
                }`}
                title="Tarik logo stat ke sini atau klik untuk menempatkan"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <div
                    className={`p-1.5 rounded-md border shrink-0 shadow-sm transition-colors ${
                      isDragOver
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                        : isTarget
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : selectedPaletteStat
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:text-amber-400 group-hover:border-amber-500/40'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors truncate block">
                      {isDragOver
                        ? 'Drop stat di sini!'
                        : isTarget
                        ? 'Menunggu klik logo di bawah...'
                        : selectedPaletteStat
                        ? `Klik untuk meletakkan ${availableStatsMap[selectedPaletteStat]?.label || 'Stat'}`
                        : 'Slot Kosong (Tarik atau klik stat ke sini)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
                      isDragOver
                        ? 'bg-cyan-400 text-black border-cyan-300 font-bold'
                        : isTarget
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : selectedPaletteStat
                        ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-500 group-hover:text-amber-300 group-hover:border-amber-500/40'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Drop / Isi</span>
                  </span>
                </div>
              </div>
            );
          }

          // FILLED SLOT
          const item = availableStatsMap[slotKey];
          const Icon = item.icon;
          const hasBonus = item.bonus > 0;
          const isSelected = selectedStat === item.key;
          const isTarget = pickingSlotIndex === slotIdx;
          const isDragOver = dragOverSlotIdx === slotIdx;
          const isBeingDragged = dragSourceIdx === slotIdx;

          return (
            <div key={`${slotKey}-${slotIdx}`} className="flex flex-col">
              {/* Stat Row (Draggable for Reordering) */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ type: 'slot', sourceIdx: slotIdx, statKey: item.key })
                  );
                  e.dataTransfer.effectAllowed = 'move';
                  setDragSourceIdx(slotIdx);
                }}
                onDragEnd={() => {
                  setDragSourceIdx(null);
                  setDragOverSlotIdx(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSlotIdx !== slotIdx) setDragOverSlotIdx(slotIdx);
                }}
                onDragLeave={() => {
                  if (dragOverSlotIdx === slotIdx) setDragOverSlotIdx(null);
                }}
                onDrop={(e) => handleDrop(slotIdx, e)}
                onClick={() => {
                  if (selectedPaletteStat && selectedPaletteStat !== item.key) {
                    // Replace this slot directly with the chosen palette stat
                    const updated = [...slots];
                    const existingIdx = updated.indexOf(selectedPaletteStat);
                    if (existingIdx !== -1) updated[existingIdx] = null;
                    updated[slotIdx] = selectedPaletteStat;
                    onUpdateSlots(updated);
                    onSelectPaletteStat?.(null);
                    onSelectSlotToPick(null);
                  } else {
                    setSelectedStat(isSelected ? null : item.key);
                  }
                }}
                className={`group flex items-center justify-between py-2 px-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing relative select-none ${
                  isBeingDragged
                    ? 'opacity-40 border-dashed border-zinc-600 bg-zinc-950/40'
                    : isDragOver
                    ? 'border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400/80 scale-[1.01]'
                    : isTarget
                    ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/80'
                    : isSelected
                    ? 'bg-zinc-800/90 border-zinc-600 shadow-md'
                    : selectedPaletteStat
                    ? 'bg-zinc-950/60 border-zinc-800/80 hover:border-cyan-500/60 hover:bg-zinc-800/50'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
                title="Klik untuk detail. Tarik (drag) untuk menukar urutan atau mengganti."
              >
                {/* Left: Icon & Label - constrained with flex-1 min-w-0 mr-2 to prevent any text overlap */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <div className={`p-1.5 rounded-md bg-zinc-900 border border-zinc-800 shrink-0 ${item.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate block">
                      {item.label}
                    </span>
                    {item.key === 'critRate' && item.total >= 80 && (
                      <span className="text-[9px] text-emerald-400 font-medium block truncate">★ High Reliability</span>
                    )}
                  </div>
                </div>

                {/* Right: Values, Info, Remove action */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right flex items-baseline gap-1.5 flex-wrap justify-end">
                    <span className="text-xs sm:text-sm font-bold font-mono tracking-tight text-zinc-100">
                      {formatStatValue(item.total, item.isPercent)}
                    </span>
                    {hasBonus ? (
                      <span className="text-[11px] font-mono font-semibold text-emerald-400">
                        (+{formatStatValue(item.bonus, item.isPercent)})
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">
                        (Raw)
                      </span>
                    )}
                  </div>

                  {/* Info breakdown toggle icon */}
                  <Info
                    className={`w-3.5 h-3.5 transition-colors shrink-0 ${
                      isSelected ? 'text-orange-400' : 'text-zinc-600 group-hover:text-zinc-400'
                    }`}
                  />

                  {/* Remove / Clear button on slot */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSlot(slotIdx, e)}
                    title={`Hapus ${item.label}`}
                    className="p-1 rounded-md transition-all text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer opacity-70 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Breakdown Drawer (Directly Beneath Clicked Stat Item) */}
              {isSelected && (
                <div className="mt-1 mb-1 p-3 rounded-lg bg-zinc-950 border border-zinc-700/80 shadow-inner animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-1.5">
                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Breakdown: {item.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStat(null);
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono cursor-pointer"
                    >
                      [Tutup]
                    </button>
                  </div>
                  <div className="space-y-1 text-xs max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {(stats.breakdowns[item.key] || []).length > 0 ? (
                      (stats.breakdowns[item.key] || []).map((b, idx) => {
                        const isBase =
                          b.source === 'Base Stat' ||
                          b.source.toLowerCase().includes('base') ||
                          b.label.toLowerCase().startsWith('base ');

                        if (isBase) {
                          return (
                            <div
                              key={idx}
                              className="flex justify-between items-center py-1.5 px-2 rounded-lg text-[11px] select-none text-zinc-400 bg-zinc-950/40"
                            >
                              <span className="truncate flex items-center gap-1.5">
                                <span className="truncate">{b.label}</span>
                                <span className="text-zinc-600 font-mono text-[9px] shrink-0">({b.source})</span>
                              </span>
                              <span className="font-mono font-bold text-zinc-300 ml-2 shrink-0">
                                {b.value}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              navigateFromBreakdown({
                                label: b.label,
                                source: b.source,
                                charName: character?.name
                              });
                            }}
                            title="Klik untuk langsung melihat detail & penjelasan sumber ini"
                            className="group flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-zinc-800/80 hover:border-amber-500/40 border border-transparent transition-all text-[11px] cursor-pointer select-none"
                          >
                            <span className="text-zinc-300 group-hover:text-amber-300 transition-colors truncate flex items-center gap-1.5">
                              <span className="truncate">{b.label}</span>
                              <span className="text-zinc-500 font-mono text-[9px] shrink-0">({b.source})</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                              {b.value}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-zinc-500 text-center py-1 text-[11px]">
                        Hanya base stat tanpa modifikasi tambahan.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
