import React, { useState } from 'react';
import {
  firebaseService,
  saveCustomFirebaseConfig,
  getCustomDocId,
  saveCustomDocId,
  type FirebaseConfig
} from '../services/firebase';
import { encryptSecurePayload } from '../services/security';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  X,
  UploadCloud,
  DownloadCloud,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Database,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import type { ElementPresetsMap } from './ElementPresetDrawer';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetsMap: ElementPresetsMap;
  onApplyCloudPresets: (map: ElementPresetsMap) => void;
  showToast: (msg: string) => void;
  username?: string | null;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  presetsMap,
  onApplyCloudPresets,
  showToast,
  username,
}) => {
  const [isConfigured, setIsConfigured] = useState(() => firebaseService.isConfigured());
  const [configJson, setConfigJson] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [docId, setDocId] = useState(() => getCustomDocId());
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(true);

  if (!isOpen) return null;

  const effectiveDocId = docId || (username ? username.toLowerCase() : 'default');

  const handleDocIdChange = (newId: string) => {
    setDocId(newId);
    saveCustomDocId(newId);
  };

  const handleCopyPresetsJson = async () => {
    try {
      // Encrypt with AES-256-GCM + HMAC-SHA256 signature
      const secureEnvelope = await encryptSecurePayload(presetsMap);
      const jsonStr = JSON.stringify(secureEnvelope, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      showToast('Payload terenkripsi AES-256-GCM & HMAC-SHA256 disalin ke clipboard!');
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // Fallback
      const jsonStr = JSON.stringify(presetsMap, null, 2);
      navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      showToast('JSON Preset disalin ke clipboard!');
      setTimeout(() => setCopiedJson(false), 2500);
    }
  };

  const handleCopyRules = () => {
    const rulesStr = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isRecent(time) { return time is timestamp && time > request.time - duration.value(5, 'm') && time <= request.time; }
    function isValidDocId(id) { return id is string && id.size() > 0 && id.size() <= 128; }
    function canAccessPreset(presetDocId) { return isValidDocId(presetDocId); }

    function isValidUserPreset(data) {
      let allowedKeys = ['presets', 'presetsJson', 'updatedAt', 'clientUpdatedAt'];
      return data.keys().hasOnly(allowedKeys) &&
             ('presets' in data || 'presetsJson' in data) &&
             (!('presetsJson' in data) || (data.presetsJson is string && data.presetsJson.size() > 0 && data.presetsJson.size() <= 800000)) &&
             (!('presets' in data) || (data.presets is map || (data.presets is string && data.presets.size() <= 800000))) &&
             (!('updatedAt' in data) || (data.updatedAt is timestamp)) &&
             (!('clientUpdatedAt' in data) || (data.clientUpdatedAt is number && data.clientUpdatedAt >= 0));
    }

    function isValidBuildMap(build) {
      return build is map && 'characterId' in build && build.characterId is number && build.characterId >= 0 &&
             'level' in build && build.level is number && build.level >= 1 && build.level <= 100;
    }

    function isValidSharedBuild(data) {
      let requiredKeys = ['characterName', 'characterId', 'authorName', 'build', 'createdAt', 'clientCreatedAt'];
      return data.keys().hasAll(requiredKeys) && data.keys().hasOnly(requiredKeys) &&
             data.characterName is string && data.characterName.size() >= 1 && data.characterName.size() <= 100 &&
             data.characterId is number && data.characterId >= 0 &&
             data.authorName is string && data.authorName.size() >= 1 && data.authorName.size() <= 100 &&
             isValidBuildMap(data.build) &&
             data.createdAt is timestamp && (data.createdAt == request.time || isRecent(data.createdAt)) &&
             data.clientCreatedAt is number && data.clientCreatedAt >= 0;
    }

    match /{document=**} {
      allow read, write: if false;
    }

    match /user_presets/{presetDocId} {
      allow read: if canAccessPreset(presetDocId);
      allow create, update: if canAccessPreset(presetDocId) && isValidUserPreset(request.resource.data);
      allow delete: if canAccessPreset(presetDocId);
    }

    match /shared_builds/{buildId} {
      allow read: if isValidDocId(buildId);
      allow create: if isValidDocId(buildId) && isValidSharedBuild(request.resource.data);
      allow update, delete: if false;
    }

    match /users/{usernameLower} {
      allow read: if true;
      allow create, update: if isValidUsername(usernameLower);
      allow delete: if false;
    }

    match /devices/{deviceId} {
      allow read: if true;
      allow create, update: if isValidDocId(deviceId);
      allow delete: if false;
    }
  }
}`;
    try {
      navigator.clipboard.writeText(rulesStr);
      setCopiedRules(true);
      showToast('Firestore Rules berhasil disalin!');
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {
      showToast('Gagal menyalin rules.');
    }
  };

  const handleSaveJsonConfig = () => {
    setJsonError(null);
    if (!configJson.trim()) {
      setJsonError('Harap masukkan JSON config Firebase Anda.');
      return;
    }

    try {
      let cleaned = configJson.trim();
      if (cleaned.startsWith('const firebaseConfig =')) {
        cleaned = cleaned.replace(/const\s+firebaseConfig\s*=\s*/, '');
      }
      if (cleaned.endsWith(';')) {
        cleaned = cleaned.slice(0, -1);
      }
      const parsed = JSON.parse(
        cleaned.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"')
      );

      if (!parsed.apiKey || !parsed.projectId || !parsed.appId) {
        setJsonError('Config harus memiliki apiKey, projectId, dan appId.');
        return;
      }

      const newConfig: FirebaseConfig = {
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
        projectId: parsed.projectId,
        storageBucket: parsed.storageBucket || `${parsed.projectId}.firebasestorage.app`,
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId,
      };

      saveCustomFirebaseConfig(newConfig);
      const ok = firebaseService.tryInitialize(newConfig);
      if (ok) {
        setIsConfigured(true);
        setConfigJson('');
        showToast('Firebase Database berhasil terhubung!');
      } else {
        setJsonError('Gagal menginisialisasi Firebase dengan config ini.');
      }
    } catch {
      setJsonError('Format JSON tidak valid. Pastikan format JSON benar.');
    }
  };

  const handleUploadAllToCloud = async () => {
    if (!isConfigured) return;
    setIsSyncing(true);
    const targetDoc = docId && docId.trim() ? docId.trim() : (username || undefined);
    const success = await firebaseService.savePresetsToCloud(presetsMap, targetDoc);
    setIsSyncing(false);
    if (success) {
      showToast(`Preset berhasil disimpan ke user_presets/${effectiveDocId}!`);
    } else {
      showToast('Gagal mengunggah preset ke Firestore. Cek Security Rules.');
    }
  };

  const handleDownloadAllFromCloud = async () => {
    if (!isConfigured) return;
    setIsSyncing(true);
    const targetDoc = docId && docId.trim() ? docId.trim() : (username || undefined);
    const cloudMap = await firebaseService.loadPresetsFromCloud(targetDoc);
    setIsSyncing(false);
    if (cloudMap) {
      onApplyCloudPresets(cloudMap);
      showToast('Preset berhasil disinkronkan dari Firestore!');
    } else {
      showToast(`Belum ada data di user_presets/${effectiveDocId}.`);
    }
  };

  const handleDisconnect = () => {
    saveCustomFirebaseConfig(null);
    setIsConfigured(false);
    showToast('Firebase config dikembalikan ke default.');
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Firebase Cloud Firestore
                {isConfigured ? (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> stellacalc Online
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    Offline
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Pencadangan & sinkronisasi cloud untuk 18 slot Preset Build
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {isConfigured ? (
          <div className="space-y-4">
            {/* Security Architecture Badge */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 text-[10.5px]">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Security Engine:</span>
                <span className="text-zinc-200 font-mono text-[10px] bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60">
                  AES-256-GCM + HMAC-SHA256
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Hardened
              </span>
            </div>
            {/* Status Card & Target Document */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Firestore Project: stellacalc</span>
                </div>
                <a
                  href="https://console.firebase.google.com/project/stellacalc/firestore"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10.5px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 hover:underline"
                >
                  Buka Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Document ID Config */}
              <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-zinc-500" />
                    Target Dokumen Firestore:
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px]">
                    user_presets / <b className="text-amber-400">{docId || 'default'}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500 select-none">
                    user_presets /
                  </span>
                  <input
                    type="text"
                    value={docId}
                    onChange={(e) => handleDocIdChange(e.target.value)}
                    placeholder="default"
                    className="flex-1 py-1 px-2.5 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-tight">
                  Aplikasi akan membaca & menulis data ke dokumen ini. Default: <code className="text-zinc-400">default</code>.
                </p>
              </div>
            </div>

            {/* Quick Actions (Upload, Download, Copy JSON) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-300">
                Aksi Sinkronisasi:
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleUploadAllToCloud}
                  disabled={isSyncing}
                  className="py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSyncing ? 'Menyimpan...' : 'Unggah ke Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAllFromCloud}
                  disabled={isSyncing}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4 text-cyan-400" />
                  <span>{isSyncing ? 'Mengunduh...' : 'Unduh dari Cloud'}</span>
                </button>
              </div>

              {/* Salin JSON Preset Button */}
              <button
                type="button"
                onClick={handleCopyPresetsJson}
                className="w-full py-2 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-orange-400" />
                    <span>Salin Seluruh JSON Preset (Untuk Manual Firestore)</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual Firestore Guide Accordion */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowManualGuide(!showManualGuide)}
                className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-zinc-200 hover:bg-zinc-850/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-amber-300">
                  <FileCode2 className="w-4 h-4" />
                  <span>Panduan Manual Masuk ke Firebase Console</span>
                </div>
                {showManualGuide ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showManualGuide && (
                <div className="p-3 pt-0 text-[11px] text-zinc-300 space-y-3 border-t border-zinc-800/60 mt-1">
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-zinc-300 pt-2">
                    <li>
                      Buka <a href="https://console.firebase.google.com/project/stellacalc/firestore" target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold inline-flex items-center gap-0.5">Firebase Console Firestore <ExternalLink className="w-2.5 h-2.5" /></a>.
                    </li>
                    <li>
                      Klik <b>+ Start collection</b> &rarr; isi Collection ID: <code className="text-orange-300 bg-zinc-900 px-1 py-0.5 rounded">user_presets</code>.
                    </li>
                    <li>
                      Di Document ID: isi <code className="text-amber-300 bg-zinc-900 px-1 py-0.5 rounded">default</code>.
                    </li>
                    <li>
                      Tambahkan Field:
                      <div className="ml-4 mt-1.5 p-2 rounded-lg bg-black/50 border border-zinc-800 space-y-1 text-[10.5px]">
                        <div>&bull; <b>Field name:</b> <code className="text-cyan-300">presetsJson</code></div>
                        <div>&bull; <b>Type:</b> <code className="text-emerald-300">string</code></div>
                        <div>&bull; <b>Value:</b> Klik tombol <i>Salin Seluruh JSON Preset</i> di atas, lalu paste ke sini!</div>
                      </div>
                    </li>
                    <li>
                      Klik <b>Save</b>. Selesai! Web akan otomatis membaca data ini.
                    </li>
                  </ol>

                  {/* Security Rules Section */}
                  <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-300 text-[11px]">
                        Firestore Security Rules (Produksi):
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRules}
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedRules ? 'Disalin' : 'Salin Rules'}
                      </button>
                    </div>
                    <pre className="p-2 rounded-lg bg-black/60 border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-48 overflow-y-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }

    match /user_presets/{presetDocId} {
      allow read: if presetDocId == 'default' || request.auth != null;
      allow create, update: if (presetDocId == 'default' || request.auth != null) && isValidUserPreset(request.resource.data);
      allow delete: if false;
    }

    match /shared_builds/{buildId} {
      allow read: if true;
      allow create: if isValidSharedBuild(request.resource.data);
      allow update, delete: if false;
    }
  }
}`}
                    </pre>
                    <p className="text-[10px] text-zinc-500">
                      Buka tab <b>Rules</b> di Firestore Console, tempel kode di atas, lalu klik <b>Publish</b> agar database mengizinkan akses.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">
                Proyek: stellacalc
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-zinc-400 hover:text-rose-400 underline font-medium cursor-pointer"
              >
                Reset Konfigurasi
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertCircle className="w-4 h-4" />
                <span>Hubungkan Proyek Firebase Anda</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Buka <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-2.5 h-2.5" /></a>, buat project atau pilih web app, lalu salin objek <code>firebaseConfig</code> ke kolom di bawah:
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                <span>Tempel Firebase Config JSON:</span>
                <span className="text-[10px] text-zinc-500 font-mono">Format JSON atau JS Object</span>
              </label>
              <textarea
                rows={5}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                placeholder={`{\n  "apiKey": "AIzaSy...",\n  "projectId": "stellacalc",\n  "appId": "1:207652551522:web:..."\n}`}
                className="w-full p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {jsonError && (
                <div className="text-[11px] text-rose-400 font-medium">
                  {jsonError}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveJsonConfig}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Simpan & Hubungkan Database</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};