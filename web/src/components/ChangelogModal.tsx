import React, { useEffect } from 'react';
import {
  X,
  History,
  Sparkles,
  ShieldCheck,
  Zap,
  FolderKanban,
  CheckCircle2,
  Calendar,
  ChevronRight
} from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  changes: {
    category: string;
    icon: React.ReactNode;
    color: string;
    items: string[];
  }[];
}

const RELEASES: ReleaseEntry[] = [
  {
    version: 'v26.11.1',
    date: '4 November 2026',
    title: 'Keseimbangan Emblem CDM & Pembaruan UI Import ShareCode',
    isLatest: true,
    changes: [
      {
        category: 'Keseimbangan Stat & Emblem',
        icon: <Zap className="w-4 h-4" />,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        items: [
          'Koreksi Cap Crit DMG (CDM) Emblem: Maksimal 12% pada Tier 3 (Tier 1: 8%, Tier 2: 10%, Tier 3: 12%).',
          'Pembatasan Tier 3 (Kuning) pada Crit DMG agar sesuai dengan regulasi in-game Stella Sora.'
        ]
      },
      {
        category: 'Antarmuka & Pengalaman Pengguna (UI/UX)',
        icon: <Sparkles className="w-4 h-4" />,
        color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
        items: [
          'Desain ulang UI Import ShareCode Potensial: Tampilan lebih rapi, modern, dan bebas distraksi rekomendasi lama.',
          'Pratinjau cepat (instant decoder) untuk konfigurasi 27-byte Base64 Stella Sora beserta pembagian tim Leader & Support.',
          'Integrasi Disc Save & Build Recall ke dalam antarmuka utama yang mudah diakses kapan saja.'
        ]
      },
      {
        category: 'Keamanan & Autentikasi',
        icon: <ShieldCheck className="w-4 h-4" />,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        items: [
          'Fitur Remember-Me Otomatis: Validasi perangkat aman berbasis device-binding kriptografi tanpa perlu login berulang.',
          'Enkripsi & Masking IP Jaringan: Perlindungan privasi pengguna melalui cryptographic salted hashing (sec_net_<hash>).'
        ]
      },
      {
        category: 'Infrastruktur & Basis Data',
        icon: <FolderKanban className="w-4 h-4" />,
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        items: [
          'Modularisasi database: Mengelompokkan seluruh data game, query handler, dan paket multi-bahasa ke dalam folder database/.',
          'Pemisahan dependensi repositori eksternal demi stabilitas build dan integrasi deployment Vercel.'
        ]
      }
    ]
  }
];

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Changelog & Catatan Versi
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  v26.11.1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Format Versi: <span className="font-mono text-zinc-300">v(tahun).(bulan).(urutan_update)</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {RELEASES.map((rel) => (
            <div key={rel.version} className="space-y-4">
              {/* Release Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-850">
                <div className="flex items-center gap-2.5">
                  <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                    {rel.version}
                  </span>
                  {rel.isLatest && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Versi Terbaru
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{rel.date}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="text-xs sm:text-sm font-semibold text-zinc-200">
                {rel.title}
              </div>

              {/* Change Categories */}
              <div className="space-y-3">
                {rel.changes.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    className="p-3 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${group.color} flex items-center justify-center`}>
                        {group.icon}
                      </div>
                      <span className="text-xs font-bold text-zinc-100">
                        {group.category}
                      </span>
                    </div>

                    <ul className="space-y-1.5 pl-2 sm:pl-7">
                      {group.items.map((item, iIdx) => (
                        <li
                          key={iIdx}
                          className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed"
                        >
                          <ChevronRight className="w-3 h-3 text-zinc-500 mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-850 bg-zinc-900/70 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistem StellaCalc Berjalan Normal</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-750 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
