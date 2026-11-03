import React, { useState, useEffect, useRef } from 'react';
import {
  authService,
  type UserSession
} from '../services/authService';
import {
  Lock,
  KeyRound,
  X,
  LogOut,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onSessionUpdated: (session: UserSession) => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  session,
  onSessionUpdated,
  onLogout,
  showToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Close on click outside the mini frame
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('Password minimal 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok.');
      return;
    }

    if (session.hasPassword && !oldPassword) {
      setErrorMessage('Harap masukkan password lama.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.setPassword({
        username: session.username,
        newPassword,
        oldPassword: session.hasPassword ? oldPassword : undefined
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menyimpan password.');
        setIsSubmitting(false);
        return;
      }

      const updatedSession: UserSession = {
        ...session,
        hasPassword: true
      };
      onSessionUpdated(updatedSession);
      showToast('Password berhasil disimpan!');
      setIsChangingPassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-zinc-950/95 backdrop-blur-md border border-zinc-800 p-3.5 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-3 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Mini Frame Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm shrink-0">
            {session.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-sm font-extrabold text-white truncate">
              {session.username}
            </h3>
            {session.hasPassword ? (
              <span
                className="p-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0"
                title="Password Aktif"
              >
                <Lock className="w-3 h-3 text-emerald-400" />
              </span>
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                title="Belum ada password"
              />
            )}
          </div>
        </div>

        {/* Action Buttons: Logout (left of X) and Close X */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
            title="Keluar Sesi"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-700 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Password Management Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11.5px]">Proteksi Password</span>
          </div>
          {session.hasPassword && !isChangingPassword && (
            <button
              type="button"
              onClick={() => setIsChangingPassword(true)}
              className="text-[10.5px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
            >
              Ubah Password
            </button>
          )}
        </div>

        {/* Form: Add or Change Password */}
        {(!session.hasPassword || isChangingPassword) && (
          <form onSubmit={handleSavePassword} className="space-y-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
            <div className="text-[10.5px] text-zinc-400 leading-snug">
              {session.hasPassword
                ? 'Ganti password akun Anda:'
                : 'Tambahkan password akun Anda:'}
            </div>

            {errorMessage && (
              <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {session.hasPassword && (
              <div className="space-y-0.5">
                <label className="text-[9.5px] font-bold uppercase text-zinc-400">
                  Password Lama
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Password lama..."
                  className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div className="space-y-0.5">
              <label className="text-[9.5px] font-bold uppercase text-zinc-400">
                {session.hasPassword ? 'Password Baru' : 'Buat Password'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter..."
                className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[9.5px] font-bold uppercase text-zinc-400">
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password..."
                className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>{session.hasPassword ? 'Update' : 'Simpan'}</span>
                  </>
                )}
              </button>

              {isChangingPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setErrorMessage(null);
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
