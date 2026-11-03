import React, { useState } from 'react';
import { RotateCcw, RotateCw, Save, Lock } from 'lucide-react';
import type { UserSession } from '../services/authService';
import { UserProfileModal } from './UserProfileModal';

interface Props {
  onUndo: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  countdown?: number;
  onSavePreset?: () => void;
  hasSavedPreset?: boolean;
  onTogglePresetDrawer?: () => void;
  isPresetDrawerOpen?: boolean;
  userSession?: UserSession | null;
  onSessionUpdated?: (session: UserSession) => void;
  onLogout?: () => void;
  showToast?: (msg: string) => void;
}

export const Header: React.FC<Props> = ({
  onUndo,
  canRedo = false,
  onRedo,
  countdown = 0,
  onTogglePresetDrawer,
  isPresetDrawerOpen = false,
  userSession,
  onSessionUpdated,
  onLogout,
  showToast,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40 px-3 sm:px-4 lg:px-8 py-2 sm:py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
            STELLA<span className="text-orange-400">CALC</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User Profile & Security Badge with anchored Mini Frame Popover */}
          {userSession && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className={`h-8 sm:h-9 px-2 sm:px-2.5 flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer shadow-sm group select-none ${
                  isProfileOpen
                    ? 'bg-zinc-800 border-orange-500/80 text-white shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                    : 'bg-zinc-900 border-zinc-700/80 hover:border-orange-500/60 hover:bg-zinc-850 text-zinc-200'
                }`}
                title="Profile & Keamanan"
              >
                <div className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-black group-hover:bg-orange-500 group-hover:text-black transition-colors">
                  {userSession.username.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-bold max-w-[70px] sm:max-w-[120px] truncate text-white">
                  {userSession.username}
                </span>
                {userSession.hasPassword ? (
                  <span title="Password Aktif" className="flex items-center">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Belum ada password" />
                )}
              </button>

              {/* Anchored Mini Frame Dropdown */}
              <UserProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                session={userSession}
                onSessionUpdated={(updated) => {
                  onSessionUpdated?.(updated);
                }}
                onLogout={() => {
                  setIsProfileOpen(false);
                  onLogout?.();
                }}
                showToast={showToast || (() => {})}
              />
            </div>
          )}

          {/* Preset Save & Recall Drawer Button (Floppy Disk Save Icon) */}
          <button
            type="button"
            onClick={onTogglePresetDrawer}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
              isPresetDrawerOpen
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] ring-2 ring-amber-400/50'
                : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800'
            }`}
            title="Preset Save & Recall (Disc Save)"
          >
            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Undo button (icon only) */}
          <button
            type="button"
            onClick={onUndo}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-800/50 hover:bg-amber-950/30 transition-all cursor-pointer"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Redo button + Countdown (when Undo was pressed) */}
          {canRedo && countdown > 0 && onRedo && (
            <div className="flex items-center gap-1 sm:gap-1.5 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={onRedo}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-zinc-900/80 border border-orange-500/50 text-orange-400 hover:text-orange-300 hover:bg-orange-950/40 hover:border-orange-400 transition-all shadow-sm cursor-pointer"
                title="Redo"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span
                onClick={onRedo}
                className="cursor-pointer font-mono text-xs sm:text-sm font-bold tabular-nums text-orange-400 hover:text-orange-300 transition-colors select-none px-0.5"
                title="Redo"
              >
                {countdown}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
