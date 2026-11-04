import React, { createContext, useContext, useState, useMemo } from 'react';

export type SupportedLanguage = 'EN' | 'ID' | 'JP' | 'CN';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'EN', label: 'English', nativeName: 'English (Default)' },
  { code: 'ID', label: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'JP', label: 'Japanese', nativeName: '日本語' },
  { code: 'CN', label: 'Chinese', nativeName: '简体中文' },
];

export interface TranslationDict {
  [key: string]: {
    EN: string;
    ID: string;
    JP: string;
    CN: string;
  };
}

export const TRANSLATIONS: TranslationDict = {
  // Navigation & Header
  appTitle: {
    EN: 'STELLACALC',
    ID: 'STELLACALC',
    JP: 'STELLACALC',
    CN: 'STELLACALC',
  },
  langSelectorTitle: {
    EN: 'Change Language',
    ID: 'Ganti Bahasa',
    JP: '言語を変更',
    CN: '切换语言',
  },
  versionTitle: {
    EN: 'Website Version v26.11.1 (Click for Changelog)',
    ID: 'Versi Website v26.11.1 (Klik untuk Changelog)',
    JP: 'ウェブサイトバージョン v26.11.1 (更新履歴を表示)',
    CN: '网站版本 v26.11.1 (点击查看更新日志)',
  },
  profileTitle: {
    EN: 'Profile & Security',
    ID: 'Profil & Keamanan',
    JP: 'プロフィールとセキュリティ',
    CN: '个人资料与安全',
  },
  presetDrawerTitle: {
    EN: 'Build Presets (Disc Save & Recall)',
    ID: 'Preset Build (Simpan & Panggil Disc)',
    JP: 'ビルドプリセット (保存・呼出)',
    CN: '配装预设 (星盘保存与读取)',
  },
  undo: {
    EN: 'Undo',
    ID: 'Urungkan',
    JP: '元に戻す',
    CN: '撤销',
  },
  redo: {
    EN: 'Redo',
    ID: 'Ulangi',
    JP: 'やり直す',
    CN: '重做',
  },

  // Common Actions
  close: {
    EN: 'Close',
    ID: 'Tutup',
    JP: '閉じる',
    CN: '关闭',
  },
  cancel: {
    EN: 'Cancel',
    ID: 'Batal',
    JP: 'キャンセル',
    CN: '取消',
  },
  save: {
    EN: 'Save',
    ID: 'Simpan',
    JP: '保存',
    CN: '保存',
  },
  paste: {
    EN: 'Paste',
    ID: 'Paste',
    JP: '貼り付け',
    CN: '粘贴',
  },
  clear: {
    EN: 'Clear',
    ID: 'Hapus',
    JP: 'クリア',
    CN: '清空',
  },
  apply: {
    EN: 'Apply',
    ID: 'Terapkan',
    JP: '適用',
    CN: '应用',
  },

  // Talent & Presets
  presetModalTitle: {
    EN: 'Potential Presets',
    ID: 'Preset Potensial',
    JP: 'ポテンシャルプリセット',
    CN: '潜能预设',
  },
  presetModalSubtitle: {
    EN: 'Import game preset code (27-byte Base64) or build URL',
    ID: 'Impor kode preset game (27-byte Base64) atau URL build',
    JP: 'ゲームのプリセットコード (27バイト Base64) または配装URLをインポート',
    CN: '导入游戏预设代码 (27字节 Base64) 或配装链接',
  },
  presetCodeLabel: {
    EN: 'Preset Code / URL:',
    ID: 'Kode Preset / URL:',
    JP: 'プリセットコード / URL:',
    CN: '预设代码 / URL:',
  },
  presetFormatHint: {
    EN: 'Format: Stella Sora (27-byte Base64)',
    ID: 'Format: Stella Sora (27-byte Base64)',
    JP: '形式: Stella Sora (27バイト Base64)',
    CN: '格式: Stella Sora (27字节 Base64)',
  },
  presetPlaceholder: {
    EN: 'Paste ShareCode (e.g. AAAAogAAAJs... or #build=...)',
    ID: 'Paste ShareCode (contoh: AAAAogAAAJs... atau #build=...)',
    JP: 'ShareCodeを貼り付け (例: AAAAogAAAJs... または #build=...)',
    CN: '粘贴分享码 (例如: AAAAogAAAJs... 或 #build=...)',
  },
  presetGuideTitle: {
    EN: 'ShareCode Guide:',
    ID: 'Petunjuk ShareCode:',
    JP: 'ShareCode の使い方:',
    CN: '分享码使用指南:',
  },
  presetGuideItem1: {
    EN: 'Copy ShareCode from Stella Sora in-game preset menu or a calculator URL.',
    ID: 'Salin ShareCode dari menu preset game Stella Sora atau dari URL build.',
    JP: 'Stella Sora ゲーム内のプリセットメニューまたは配装URLからShareCodeをコピーします。',
    CN: '从 Stella Sora 游戏内预设菜单或计算器链接复制分享码。',
  },
  presetGuideItem2: {
    EN: 'Click Paste above to auto-scan team configuration.',
    ID: 'Klik tombol Paste di atas untuk memindai otomatis susunan potensi.',
    JP: '上の「貼り付け」をクリックしてチーム構成を自動読み込みします。',
    CN: '点击上方「粘贴」按钮自动扫描团队潜能配置。',
  },
  presetGuideItem3: {
    EN: 'Preview potentials for Leader and Support before applying.',
    ID: 'Pratinjau level potensi Leader dan Support akan langsung ditampilkan secara transparan sebelum diterapkan.',
    JP: '適用前にリーダーとサポートのポテンシャル詳細をプレビュー確認できます。',
    CN: '应用前可即时预览队长与支援者的潜能等级及点数。',
  },
  applyExact: {
    EN: 'Apply Potentials (Original Level)',
    ID: 'Terapkan Potensi (Level Asli)',
    JP: 'ポテンシャル適用 (元レベル)',
    CN: '应用潜能 (原始等级)',
  },
  applyMax: {
    EN: 'All Max (Lv.6)',
    ID: 'Semua Max (Lv.6)',
    JP: '全て最大 (Lv.6)',
    CN: '全部升满 (Lv.6)',
  },

  // Changelog Modal
  changelogTitle: {
    EN: 'Release Notes & Changelog',
    ID: 'Changelog & Catatan Versi',
    JP: 'リリースノート・更新履歴',
    CN: '版本更新日志',
  },
  changelogSubtitle: {
    EN: 'Version Format: v(year).(month).(update_count)',
    ID: 'Format Versi: v(tahun).(bulan).(urutan_update)',
    JP: 'バージョン形式: v(年).(月).(更新回数)',
    CN: '版本格式: v(年).(月).(更新次数)',
  },
  latestVersionBadge: {
    EN: 'Latest Version',
    ID: 'Versi Terbaru',
    JP: '最新バージョン',
    CN: '最新版本',
  },
  systemStatus: {
    EN: 'All StellaCalc Systems Operational',
    ID: 'Sistem StellaCalc Berjalan Normal',
    JP: '全システム正常稼働中',
    CN: 'StellaCalc 系统运行正常',
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  getLocalizedName: (item: { name: string; nameCN?: string; nameJP?: string }) => string;
  getLocalizedDesc: (item: { desc: string; descCN?: string; descJP?: string }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'stella_calc_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (saved && (saved === 'EN' || saved === 'ID' || saved === 'JP' || saved === 'CN')) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'EN'; // EN is default as requested
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    if (TRANSLATIONS[key] && TRANSLATIONS[key][language]) {
      return TRANSLATIONS[key][language];
    }
    return fallback || (TRANSLATIONS[key]?.EN ?? key);
  };

  const getLocalizedName = (item: { name: string; nameCN?: string; nameJP?: string }): string => {
    if (!item) return '';
    if (language === 'CN' && item.nameCN) return item.nameCN;
    if (language === 'JP' && item.nameJP) return item.nameJP;
    return item.name;
  };

  const getLocalizedDesc = (item: { desc: string; descCN?: string; descJP?: string }): string => {
    if (!item) return '';
    if (language === 'CN' && item.descCN) return item.descCN;
    if (language === 'JP' && item.descJP) return item.descJP;
    return item.desc;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      getLocalizedName,
      getLocalizedDesc,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
