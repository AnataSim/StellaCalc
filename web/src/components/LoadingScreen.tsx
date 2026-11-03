import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { authService, type UserSession, type AuthResult } from '../services/authService';
import { getDeviceFingerprint, type DeviceInfo } from '../services/deviceFingerprint';

interface LoadingScreenProps {
  userSession?: UserSession | null;
  onSuccess: (session: UserSession) => void;
  showToast?: (msg: string) => void;
  onFinish?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  userSession,
  onSuccess,
  showToast,
  onFinish,
}) => {
  const [progress, setProgress] = useState(userSession ? 0 : 0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isReadyForInput, setIsReadyForInput] = useState(false);

  // Authentication states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch hardware fingerprint in the background
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const info = await getDeviceFingerprint();
        if (!isMounted) return;
        setDeviceInfo(info);

        const check = await authService.checkDeviceAccount(info.deviceId);
        if (check.hasAccount && check.existingUsername) {
          setUsername(check.existingUsername);
        }
      } catch (err) {
        console.warn('Device fingerprinting background warning:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Loading bar progress animation
  useEffect(() => {
    const t1 = setTimeout(() => setProgress(30), 80);
    const t2 = setTimeout(() => setProgress(65), 260);
    const t3 = setTimeout(() => setProgress(90), 500);
    const t4 = setTimeout(() => {
      setProgress(100);

      // If user already has an active session, fade out into app directly!
      if (userSession) {
        const tFade = setTimeout(() => setIsFadingOut(true), 250);
        const tDone = setTimeout(() => onFinish?.(), 650);
        return () => {
          clearTimeout(tFade);
          clearTimeout(tDone);
        };
      } else {
        // If no active session, reveal the Text + Input text directly above the bar
        setIsReadyForInput(true);
      }
    }, 720);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [userSession, onFinish]);

  // Auto-focus input when ready
  useEffect(() => {
    if (isReadyForInput) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isReadyForInput, requiresPassword]);

  // Handle Login / Registration submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requiresPassword && !username.trim()) {
      setErrorMessage('Masukkan username');
      return;
    }

    if (requiresPassword && !password.trim()) {
      setErrorMessage('Masukkan password');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // Ensure deviceInfo is available or generate a quick one
      const currentDevice = deviceInfo || (await getDeviceFingerprint());
      if (!deviceInfo) setDeviceInfo(currentDevice);

      const result: AuthResult = await authService.authenticate({
        username: username.trim(),
        password: requiresPassword ? password : (password || undefined),
        device: currentDevice
      });

      if (!result.success) {
        if (result.requiresPassword) {
          setRequiresPassword(true);
          setPassword('');
          setErrorMessage(null);
        } else {
          setErrorMessage(result.error || 'Autentikasi gagal');
          if (result.existingUsername) {
            setUsername(result.existingUsername);
          }
        }
        setIsSubmitting(false);
        return;
      }

      if (result.user) {
        if (result.isNewUser) {
          showToast?.(`Selamat datang, ${result.user.username}!`);
        } else {
          showToast?.(`Selamat datang kembali, ${result.user.username}!`);
        }
        onSuccess(result.user);

        // Smooth fadeout into STELLACALC
        setIsFadingOut(true);
        setTimeout(() => {
          onFinish?.();
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi gangguan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex flex-col justify-end items-center pb-12 sm:pb-16 select-none pointer-events-auto transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Container: Text + Input text directly above the Loading Bar */}
      <div className="flex flex-col items-center gap-2.5 w-60 sm:w-72 max-w-[85vw]">
        {/* Simple Text & Input Text (Appears when 100% and not logged in) */}
        {isReadyForInput && !userSession && (
          <div className="flex flex-col items-center gap-1.5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 1. Simple Text Label */}
            <span
              className={`text-xs font-semibold tracking-wide text-center transition-colors truncate max-w-full px-1 ${
                errorMessage
                  ? 'text-amber-400'
                  : requiresPassword
                  ? 'text-amber-300'
                  : 'text-zinc-400'
              }`}
            >
              {errorMessage || (requiresPassword ? 'This Username Contain Password' : 'Enter Username')}
            </span>

            {/* 2. Simple Input Text */}
            <form onSubmit={handleSubmit} className="w-full relative flex items-center">
              <input
                ref={inputRef}
                type={requiresPassword ? 'password' : 'text'}
                value={requiresPassword ? password : username}
                onChange={(e) => {
                  setErrorMessage(null);
                  if (requiresPassword) {
                    setPassword(e.target.value);
                  } else {
                    setUsername(e.target.value);
                  }
                }}
                placeholder={requiresPassword ? 'Password...' : 'Username...'}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 pr-9 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all shadow-inner disabled:opacity-50 text-left"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={isSubmitting || (requiresPassword ? !password.trim() : !username.trim())}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                title="Masuk"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        )}

        {/* Horizontal Loading Bar */}
        <div className="w-full h-1.5 sm:h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80 shadow-lg relative">
          <div
            className="h-full bg-gradient-to-r from-orange-600 via-amber-400 to-orange-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(251,146,60,0.65)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
