/**
 * Device & Hardware Fingerprinting Service
 * 
 * Generates a stable, multi-factor hardware & browser fingerprint:
 * - Canvas 2D rasterization fingerprint
 * - WebGL unmasked GPU renderer/vendor fingerprint
 * - AudioContext dynamics compressor buffer fingerprint
 * - Hardware environment matrix (CPU cores, memory, screen geometry, platform)
 * - Multi-storage persistence (Evercookie pattern: localStorage + sessionStorage + IndexedDB)
 * - Public IP detection with fail-safe timeout
 */

const STORAGE_KEY_DEVICE = 'stella_device_fingerprint_v1';
const DB_NAME = 'stella_security_db';
const DB_STORE = 'security_tokens';

export interface DeviceInfo {
  deviceId: string;       // SHA-256 hardware & storage composite ID
  ip: string;             // Public IP address
  browserInfo: string;    // User agent summary
  gpuRenderer: string;    // WebGL GPU info
}

// -------------------------------------------------------------
// Cryptographic Hash Helper (SHA-256 via Web Crypto)
// -------------------------------------------------------------
async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', enc.encode(text));
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// -------------------------------------------------------------
// 1. Canvas 2D Hardware Rasterization Fingerprint
// -------------------------------------------------------------
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_unsupported';

    // Text rendering with various weights, fonts and composite modes
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Helvetica', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('STELLACALC_HW_SEC', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('⚡🎮🛡️', 4, 45);

    // Bezier curves & shadows to catch anti-aliasing variations across GPUs
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.bezierCurveTo(20, 100, 200, 100, 200, 20);
    ctx.stroke();

    return canvas.toDataURL();
  } catch {
    return 'canvas_error';
  }
}

// -------------------------------------------------------------
// 2. WebGL Hardware Fingerprint
// -------------------------------------------------------------
function getWebGLFingerprint(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return { renderer: 'webgl_unavailable', vendor: 'unknown' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { renderer: 'webgl_no_debug_info', vendor: 'unknown' };
    }

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'generic_gpu';
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'generic_vendor';
    return { renderer: String(renderer), vendor: String(vendor) };
  } catch {
    return { renderer: 'webgl_error', vendor: 'error' };
  }
}

// -------------------------------------------------------------
// 3. AudioContext Hardware Fingerprint
// -------------------------------------------------------------
async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return 'audio_unsupported';

    // 44.1kHz offline audio context rendering a sine wave through dynamics compressor
    const context = new OfflineAudioContext(1, 4410, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    const audioBuffer = await context.startRendering();
    const channelData = audioBuffer.getChannelData(0);

    let sum = 0;
    for (let i = 4500; i < 5000 && i < channelData.length; i++) {
      sum += Math.abs(channelData[i]);
    }
    return sum.toString();
  } catch {
    return 'audio_error';
  }
}

// -------------------------------------------------------------
// 4. IndexedDB Evercookie Storage Helper
// -------------------------------------------------------------
function getIndexedDbToken(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const getReq = store.get('device_token');
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function setIndexedDbToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put(token, 'device_token');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// -------------------------------------------------------------
// 5. Public IP Lookup (Fast with 2s timeout)
// -------------------------------------------------------------
async function fetchPublicIp(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) return String(data.ip).trim();
    }
  } catch {}

  // Fallback to secondary IP provider if blocked
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
    const res2 = await fetch('https://api64.ipify.org?format=json', {
      signal: controller2.signal
    });
    clearTimeout(timeoutId2);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.ip) return String(data2.ip).trim();
    }
  } catch {}

  return '127.0.0.1'; // Offline / protected fallback
}

// -------------------------------------------------------------
// 6. Master Composite Device Fingerprint Generator
// -------------------------------------------------------------
export async function getDeviceFingerprint(): Promise<DeviceInfo> {
  // 1. Check existing persisted tokens across multi-storage (Evercookie)
  const localToken = localStorage.getItem(STORAGE_KEY_DEVICE);
  const sessionToken = sessionStorage.getItem(STORAGE_KEY_DEVICE);
  const idbToken = await getIndexedDbToken();

  const existingToken = localToken || sessionToken || idbToken;

  // 2. Collect hardware & environment characteristics
  const canvasHash = await sha256(getCanvasFingerprint());
  const webgl = getWebGLFingerprint();
  const audioHash = await getAudioFingerprint();

  const hwConcurrency = navigator.hardwareConcurrency || 4;
  const platform = navigator.platform || 'unknown_platform';
  const screenGeom = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}@${window.devicePixelRatio}`;
  const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const language = navigator.language || 'en';

  // 3. Create raw hardware fingerprint string
  const rawHardwareString = [
    canvasHash,
    webgl.renderer,
    webgl.vendor,
    audioHash,
    hwConcurrency,
    platform,
    screenGeom,
    timezone,
    language
  ].join('|||');

  const hardwareFingerprintHash = await sha256(rawHardwareString);

  // 4. If we had an existing token, tie it with hardware hash; otherwise use hardware hash
  const finalDeviceId = existingToken ? await sha256(existingToken + '::' + hardwareFingerprintHash) : hardwareFingerprintHash;

  // 5. Re-synchronize token across all storage layers (Evercookie resilience)
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE, finalDeviceId);
    sessionStorage.setItem(STORAGE_KEY_DEVICE, finalDeviceId);
    await setIndexedDbToken(finalDeviceId);
  } catch {}

  // 6. Fetch IP in parallel
  const ip = await fetchPublicIp();

  return {
    deviceId: finalDeviceId,
    ip,
    browserInfo: `${platform} - ${navigator.userAgent.slice(0, 80)}`,
    gpuRenderer: webgl.renderer
  };
}
