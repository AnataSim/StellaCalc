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
  ChevronRight,
  Globe
} from 'lucide-react';
import { useLanguage, type SupportedLanguage } from '../contexts/LanguageContext';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChangeCategory {
  category: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}

interface ReleaseData {
  version: string;
  date: Record<SupportedLanguage, string>;
  title: Record<SupportedLanguage, string>;
  isLatest?: boolean;
  changes: Record<SupportedLanguage, ChangeCategory[]>;
}

const RELEASES: ReleaseData[] = [
  {
    version: 'v26.11.1',
    isLatest: true,
    date: {
      EN: 'November 4, 2026',
      ID: '4 November 2026',
      JP: '2026年11月4日',
      CN: '2026年11月4日',
    },
    title: {
      EN: 'Language Switcher (EN/ID/JP/CN), Emblem CDM Cap & Talent ShareCode UI',
      ID: 'Menu Ganti Bahasa (EN/ID/JP/CN), Keseimbangan Emblem CDM & UI Import ShareCode',
      JP: '言語切替機能 (EN/ID/JP/CN)、エンブレムCDM上限調整、ポテンシャル共有UI刷新',
      CN: '语言切换功能 (EN/ID/JP/CN)、徽记CDM上限调整与潜能分享码界面升级',
    },
    changes: {
      EN: [
        {
          category: 'Multi-Language Support (i18n)',
          icon: <Globe className="w-4 h-4" />,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          items: [
            'Added top navigation language switcher with support for EN (English - Default), ID (Indonesian), JP (Japanese), and CN (Simplified Chinese).',
            'Fixed Changelog modal scroll container bounds and bottom padding to eliminate text truncation across all screen sizes.',
          ],
        },
        {
          category: 'Stat & Emblem Balancing',
          icon: <Zap className="w-4 h-4" />,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          items: [
            'Corrected Emblem Crit DMG (CDM) cap: Maximum 12% at Tier 3 (Tier 1: 8%, Tier 2: 10%, Tier 3: 12%).',
            'Enforced Tier 3 (Yellow) cap on Crit DMG strictly matching Stella Sora in-game rules.',
          ],
        },
        {
          category: 'UI & User Experience (UX)',
          icon: <Sparkles className="w-4 h-4" />,
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
          items: [
            'Redesigned Potential ShareCode Import modal: Clean, modern, distraction-free interface focusing on 27-byte Base64 codes and build links.',
            'Instant decoder preview showing Leader and Support potentials, levels, and points prior to application.',
            'Integrated Disc Save & Build Recall directly into the main view with element frame switching.',
          ],
        },
        {
          category: 'Security & Authentication',
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          items: [
            'Automatic Remember-Me: Cryptographic device-binding validation allows skipping login prompts upon returning.',
            'Network IP Masking: User privacy protected via salted cryptographic hashing (sec_net_<hash>).',
          ],
        },
        {
          category: 'Database & Infrastructure',
          icon: <FolderKanban className="w-4 h-4" />,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          items: [
            'Modular database: Consolidated all game datasets, query handlers, and multi-language files into the database/ directory.',
            'Decoupled from external upstream syncs for full local autonomy and reliable Vercel deployments.',
          ],
        },
      ],
      ID: [
        {
          category: 'Dukungan Multi-Bahasa (i18n)',
          icon: <Globe className="w-4 h-4" />,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          items: [
            'Menambahkan menu ganti bahasa di navigasi atas: Mendukung EN (English - Default), ID (Bahasa Indonesia), JP (日本語), dan CN (简体中文).',
            'Perbaikan layout Changelog modal: Penyesuaian batas scroll dan padding bawah agar teks tidak terpotong pada berbagai ukuran layar.',
          ],
        },
        {
          category: 'Keseimbangan Stat & Emblem',
          icon: <Zap className="w-4 h-4" />,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          items: [
            'Koreksi Cap Crit DMG (CDM) Emblem: Maksimal 12% pada Tier 3 (Tier 1: 8%, Tier 2: 10%, Tier 3: 12%).',
            'Pembatasan Tier 3 (Kuning) pada Crit DMG agar sesuai dengan regulasi in-game Stella Sora.',
          ],
        },
        {
          category: 'Antarmuka & Pengalaman Pengguna (UI/UX)',
          icon: <Sparkles className="w-4 h-4" />,
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
          items: [
            'Desain ulang UI Import ShareCode Potensial: Tampilan lebih rapi, modern, dan bebas distraksi rekomendasi lama.',
            'Pratinjau cepat (instant decoder) untuk konfigurasi 27-byte Base64 Stella Sora beserta pembagian tim Leader & Support.',
            'Integrasi Disc Save & Build Recall ke dalam antarmuka utama yang mudah diakses kapan saja.',
          ],
        },
        {
          category: 'Keamanan & Autentikasi',
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          items: [
            'Fitur Remember-Me Otomatis: Validasi perangkat aman berbasis device-binding kriptografi tanpa perlu login berulang.',
            'Enkripsi & Masking IP Jaringan: Perlindungan privasi pengguna melalui cryptographic salted hashing (sec_net_<hash>).',
          ],
        },
        {
          category: 'Infrastruktur & Basis Data',
          icon: <FolderKanban className="w-4 h-4" />,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          items: [
            'Modularisasi database: Mengelompokkan seluruh data game, query handler, dan paket multi-bahasa ke dalam folder database/.',
            'Pemisahan dependensi repositori eksternal demi stabilitas build dan integrasi deployment Vercel.',
          ],
        },
      ],
      JP: [
        {
          category: '多言語対応 (i18n)',
          icon: <Globe className="w-4 h-4" />,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          items: [
            'トップバーに言語切り替えメニューを追加: EN (英語 - デフォルト)、ID (インドネシア語)、JP (日本語)、CN (簡体字中国語) に対応。',
            '更新履歴モーダルのレイアウト修正: スクロール領域と下部パディングを最適化し、表示が途切れる問題を解決。',
          ],
        },
        {
          category: 'ステータス・エンブレム調整',
          icon: <Zap className="w-4 h-4" />,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          items: [
            'エンブレムのクリティカルダメージ (CDM) 上限を修正: ティア3で最大 12% (Tier 1: 8%, Tier 2: 10%, Tier 3: 12%)。',
            'Stella Sora 本編の仕様に基づき、クリティカルダメージの上限をティア3 (黄) に制限。',
          ],
        },
        {
          category: 'UI / UX 改善',
          icon: <Sparkles className="w-4 h-4" />,
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
          items: [
            'ポテンシャル共有コード (ShareCode) インポート画面を刷新: 27バイト Base64 コードと配装URLに特化したシンプルなUI。',
            '適用前にリーダーおよびサポートのポテンシャル構成、レベル、ポイントを即座にプレビュー表示。',
            'ディスク保存とプリセット呼出をメイン画面に統合し、素早い切り替えが可能。',
          ],
        },
        {
          category: 'セキュリティと認証',
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          items: [
            '自動 Remember-Me 機能: 暗号化デバイスバインディングにより、次回訪問時の再ログインを安全にスキップ。',
            'IPアドレスマスキング: ソルト付き暗号化ハッシュ (sec_net_<hash>) によるプライバシー保護。',
          ],
        },
        {
          category: 'データベース・インフラ',
          icon: <FolderKanban className="w-4 h-4" />,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          items: [
            'データベースのモジュール化: 全ゲームデータと多言語ファイルを database/ ディレクトリに集約。',
            '外部リポジトリ依存を解消し、Vercel デプロイメントの安定性を向上。',
          ],
        },
      ],
      CN: [
        {
          category: '多语言支持 (i18n)',
          icon: <Globe className="w-4 h-4" />,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          items: [
            '顶部导航栏添加语言切换菜单: 支持 EN (英语 - 默认)、ID (印尼语)、JP (日语)、CN (简体中文)。',
            '修复更新日志弹窗排版: 调整滚动区域与底部边距，杜绝内容在各类屏幕上被遮挡截断的问题。',
          ],
        },
        {
          category: '数值与徽记平衡',
          icon: <Zap className="w-4 h-4" />,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          items: [
            '修正徽记暴击伤害 (CDM) 上限: 3阶上限调整为 12% (1阶: 8%, 2阶: 10%, 3阶: 12%)。',
            '严格按照 Stella Sora 游戏内规则将暴击伤害限制在3阶(黄色)。',
          ],
        },
        {
          category: '界面与用户体验 (UI/UX)',
          icon: <Sparkles className="w-4 h-4" />,
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
          items: [
            '重新设计潜能分享码 (ShareCode) 导入弹窗: 精简界面，聚焦 27字节 Base64 与配装链接。',
            '导入前即时预览队长与支援者的潜能分布、等级与点数。',
            '将星盘保存与预设读取直接整合进主界面，支持属性框架一键切换。',
          ],
        },
        {
          category: '安全与身份验证',
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          items: [
            '自动记住设备 (Remember-Me): 基于密码学设备指纹绑定，重新进入无需重复登录。',
            '网络 IP 脱敏: 通过加盐加密哈希 (sec_net_<hash>) 深度保护用户隐私。',
          ],
        },
        {
          category: '数据库与基础设施',
          icon: <FolderKanban className="w-4 h-4" />,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          items: [
            '数据库模块化整合: 将全部游戏数据、查询模块及多语言包收拢至 database/ 目录。',
            '解耦上游外部同步工作流，保障 Vercel 部署稳定自主。',
          ],
        },
      ],
    },
  },
];

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header - Fixed Height, Never Shrinks */}
        <div className="px-5 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {t('changelogTitle')}
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  v26.11.1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {t('changelogSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Properly Bounded Scroll Container with Generous Bottom Padding */}
        <div className="p-4 sm:p-6 pb-12 overflow-y-auto space-y-6 flex-1 min-h-0 scrollbar-thin">
          {RELEASES.map((rel) => {
            const currentChanges = rel.changes[language] || rel.changes.EN;
            const currentTitle = rel.title[language] || rel.title.EN;
            const currentDate = rel.date[language] || rel.date.EN;

            return (
              <div key={rel.version} className="space-y-4">
                {/* Release Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-850">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                      {rel.version}
                    </span>
                    {rel.isLatest && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {t('latestVersionBadge')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{currentDate}</span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-xs sm:text-sm font-semibold text-zinc-200">
                  {currentTitle}
                </div>

                {/* Change Categories */}
                <div className="space-y-3">
                  {currentChanges.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2.5 shadow-xs"
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
            );
          })}
        </div>

        {/* Footer - Fixed Height, Never Overlaps Content */}
        <div className="px-5 py-3.5 border-t border-zinc-850 bg-zinc-900/80 backdrop-blur flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium">{t('systemStatus')}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer shadow-xs"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
