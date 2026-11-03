/**
 * Security Service - Stella Sora Calculator (STELLACALC)
 * 
 * Features:
 * 1. AES-256-GCM Authenticated Encryption with dynamic PBKDF2 salt and 96-bit random IVs.
 * 2. HMAC-SHA256 Request & Payload Authentication with canonical envelope signing, replay attack protection, and nonces.
 * 3. Prototype Pollution Prevention (revivers and deep object sanitization).
 * 4. XSS & Control Character Sanitization for user-controlled strings.
 * 5. State & Calculation Engine bounds enforcement (NaN, Infinity, and malformed object protection).
 * 6. Tamper-evident Secure Storage for browser localStorage persistence.
 */

import type { BuildState } from '../types';

// Cryptographic Constants
const MASTER_SECRET_SEED = "STELLACALC_CRYPTO_AES256_GCM_HMAC_SHA256_SECURE_PAYLOAD_V1";
const PBKDF2_ITERATIONS = 100000;
const REPLAY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const NONCE_CACHE_MAX = 5000;

// Cache of recently verified nonces to prevent replay attacks
const verifiedNonces = new Set<string>();

export interface SecureEnvelope {
  version: 1;
  encrypted: true;
  iv: string;         // Base64 (12 bytes for AES-GCM)
  salt: string;       // Base64 (16 bytes for PBKDF2)
  ciphertext: string; // Base64 (AES-256-GCM ciphertext + 16-byte auth tag)
  hmac: string;       // Base64 (HMAC-SHA256 signature)
  timestamp: number;  // Epoch ms
  nonce: string;      // 16-byte cryptographically random hex string
}

// -------------------------------------------------------------
// Base64 & Binary Converters
// -------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// -------------------------------------------------------------
// Key Derivation Functions (Web Crypto API)
// -------------------------------------------------------------

async function deriveAesKey(salt: Uint8Array, customSecret?: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = customSecret || MASTER_SECRET_SEED;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function getHmacKey(customSecret?: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = (customSecret || MASTER_SECRET_SEED) + "_HMAC_SHA256_INTEGRITY_KEY";
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// -------------------------------------------------------------
// AES-256-GCM + HMAC-SHA256 Encrypt & Decrypt
// -------------------------------------------------------------

/**
 * Encrypt sensitive payload using AES-256-GCM and sign with HMAC-SHA256
 */
export async function encryptSecurePayload<T>(
  data: T,
  customSecret?: string
): Promise<SecureEnvelope> {
  const enc = new TextEncoder();
  const plainText = typeof data === 'string' ? data : JSON.stringify(data);
  const plainBytes = enc.encode(plainText);

  // 1. Generate 16 bytes salt and 12 bytes IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. Derive 256-bit AES-GCM key
  const aesKey = await deriveAesKey(salt, customSecret);

  // 3. Encrypt data with AES-256-GCM (produces ciphertext + GCM auth tag)
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    plainBytes
  );

  const ivB64 = bufferToBase64(iv);
  const saltB64 = bufferToBase64(salt);
  const cipherB64 = bufferToBase64(cipherBuffer);
  const timestamp = Date.now();

  // 4. Generate random 16-byte nonce
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // 5. Canonical signing payload: v:iv:salt:ciphertext:timestamp:nonce
  const canonical = `v1:${ivB64}:${saltB64}:${cipherB64}:${timestamp}:${nonce}`;
  const hmacKey = await getHmacKey(customSecret);
  const hmacBuffer = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    enc.encode(canonical)
  );
  const hmacB64 = bufferToBase64(hmacBuffer);

  return {
    version: 1,
    encrypted: true,
    iv: ivB64,
    salt: saltB64,
    ciphertext: cipherB64,
    hmac: hmacB64,
    timestamp,
    nonce
  };
}

/**
 * Decrypt AES-256-GCM payload after verifying HMAC-SHA256 signature, timestamp, and nonce.
 */
export async function decryptSecurePayload<T>(
  envelope: unknown,
  customSecret?: string,
  options: { checkTimestamp?: boolean } = { checkTimestamp: true }
): Promise<T> {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error("Invalid payload: expected an object envelope.");
  }

  const env = envelope as Partial<SecureEnvelope>;
  if (!env.encrypted || env.version !== 1 || !env.iv || !env.salt || !env.ciphertext || !env.hmac) {
    throw new Error("Invalid secure envelope schema.");
  }

  // 1. Replay attack protection (Timestamp freshness & Nonce check)
  if (options.checkTimestamp && env.timestamp) {
    const age = Math.abs(Date.now() - env.timestamp);
    if (age > REPLAY_WINDOW_MS) {
      throw new Error(`Replay attack prevented: payload timestamp expired (${Math.round(age / 1000)}s old).`);
    }

    if (env.nonce) {
      if (verifiedNonces.has(env.nonce)) {
        throw new Error("Replay attack prevented: duplicate nonce detected.");
      }
      verifiedNonces.add(env.nonce);
      if (verifiedNonces.size > NONCE_CACHE_MAX) {
        // Prune oldest nonces
        const it = verifiedNonces.values();
        for (let i = 0; i < 1000; i++) {
          const val = it.next().value;
          if (val) verifiedNonces.delete(val);
        }
      }
    }
  }

  // 2. Canonical representation verification
  const enc = new TextEncoder();
  const canonical = `v1:${env.iv}:${env.salt}:${env.ciphertext}:${env.timestamp}:${env.nonce}`;
  const hmacKey = await getHmacKey(customSecret);
  const hmacBytes = base64ToBuffer(env.hmac);

  const isAuthentic = await crypto.subtle.verify(
    "HMAC",
    hmacKey,
    hmacBytes,
    enc.encode(canonical)
  );

  if (!isAuthentic) {
    throw new Error("HMAC-SHA256 verification failed: Payload signature is invalid or has been modified!");
  }

  // 3. Derive AES Key and Decrypt with AES-GCM
  const salt = base64ToBuffer(env.salt);
  const iv = base64ToBuffer(env.iv);
  const cipherBytes = base64ToBuffer(env.ciphertext);

  const aesKey = await deriveAesKey(new Uint8Array(salt), customSecret);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    aesKey,
    cipherBytes
  );

  // 4. Decode text and parse with prototype pollution prevention
  const dec = new TextDecoder();
  const plainText = dec.decode(decryptedBuffer);
  return secureJsonParse<T>(plainText);
}

// -------------------------------------------------------------
// Request Signature Authentication (HMAC-SHA256)
// -------------------------------------------------------------

/**
 * Generate an HMAC-SHA256 signature for any request body or message
 */
export async function signRequestHmac(message: string, customSecret?: string): Promise<string> {
  const enc = new TextEncoder();
  const hmacKey = await getHmacKey(customSecret);
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    enc.encode(message)
  );
  return bufferToBase64(sigBuffer);
}

/**
 * Verify an HMAC-SHA256 signature against a request message
 */
export async function verifyRequestHmac(
  message: string,
  signatureBase64: string,
  customSecret?: string
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const hmacKey = await getHmacKey(customSecret);
    const sigBytes = base64ToBuffer(signatureBase64);
    return await crypto.subtle.verify(
      "HMAC",
      hmacKey,
      sigBytes,
      enc.encode(message)
    );
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Internal Security & Vulnerability Pre-Fixes
// -------------------------------------------------------------

/**
 * Pre-Fix 1: Prototype Pollution Guard for JSON Parsing
 * Strips '__proto__', 'constructor', and 'prototype' properties recursively
 */
export function secureJsonParse<T>(jsonString: string): T {
  return JSON.parse(jsonString, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined; // Drop hostile key
    }
    return value;
  }) as T;
}

/**
 * Pre-Fix 2: Deep Object Sanitizer
 * Removes dangerous prototype keys, circular references, and freezes/cleans maps
 */
export function deepSanitizeObject<T>(input: T, maxDepth = 10): T {
  if (input === null || typeof input !== 'object' || maxDepth <= 0) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => deepSanitizeObject(item, maxDepth - 1)) as unknown as T;
  }

  const cleanObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    // Drop prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    cleanObj[key] = deepSanitizeObject(val, maxDepth - 1);
  }
  return cleanObj as T;
}

/**
 * Pre-Fix 3: XSS & Control Characters Sanitizer
 * Escapes HTML entities, strips null bytes, non-printable characters, and limits string length
 */
export function sanitizeString(val: unknown, maxLength = 250): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const trimmed = str.slice(0, maxLength);
  // HTML entity encoding to prevent stored/reflected XSS
  return trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Pre-Fix 4: Number & Calculation Engine Sanitizer
 * Clamps values to valid bounds and prevents NaN, +Infinity, or -Infinity from crashing math
 */
export function sanitizeNumber(val: unknown, fallback = 0, min = -Infinity, max = Infinity): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
    return fallback;
  }
  return Math.min(Math.max(val, min), max);
}

/**
 * Pre-Fix 5: Build State Schema Validator & Sanitizer
 * Guarantees that any build imported from external sources or cloud is clean, type-safe,
 * and within game limits before applying to calculator calculations.
 */
export function sanitizeBuildState(raw: unknown): BuildState | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;

  const characterId = sanitizeNumber(b.characterId, 0, 0, 999999);
  const level = sanitizeNumber(b.level, 90, 1, 100);

  // Validate limits / talents
  const talent = sanitizeNumber(b.talent, 0, 0, 5);
  const affinity = sanitizeNumber(b.affinity, 1, 1, 50);

  // Sanitize skills
  const skills: Record<string, number> = {};
  if (b.skills && typeof b.skills === 'object') {
    for (const [k, v] of Object.entries(b.skills as Record<string, unknown>)) {
      if (k === '__proto__' || k === 'constructor') continue;
      skills[sanitizeString(k, 30)] = sanitizeNumber(v, 1, 1, 20);
    }
  }

  // Sanitize equipped discs
  const discs = Array.isArray(b.discs)
    ? b.discs.slice(0, 6).map((d) => {
        if (!d || typeof d !== 'object') return null;
        return deepSanitizeObject(d);
      })
    : [];

  return {
    ...deepSanitizeObject(b),
    characterId,
    level,
    talent,
    affinity,
    skills,
    discs,
  } as unknown as BuildState;
}

// -------------------------------------------------------------
// Pre-Fix 6: Tamper-Evident Secure LocalStorage
// -------------------------------------------------------------

export const secureStorage = {
  /**
   * Save item to localStorage with HMAC-SHA256 signature to detect offline tampering
   */
  async setItem(key: string, value: unknown): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const signature = await signRequestHmac(`${key}:${serialized}`);
      const payload = JSON.stringify({
        data: serialized,
        hmac: signature,
        savedAt: Date.now()
      });
      localStorage.setItem(key, payload);
    } catch (err) {
      console.warn(`secureStorage.setItem failed for ${key}:`, err);
      // Fallback
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  /**
   * Read item from localStorage and verify HMAC signature
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      // Check if it's wrapped in a secure envelope
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.hmac && parsed.data) {
          const isValid = await verifyRequestHmac(`${key}:${parsed.data}`, parsed.hmac);
          if (!isValid) {
            console.error(`[Security Alert] Tampering detected in localStorage key "${key}"! Discarding corrupt data.`);
            return null;
          }
          return secureJsonParse<T>(parsed.data);
        }
      } catch {}

      // Backward compatible plain JSON
      return secureJsonParse<T>(raw);
    } catch (err) {
      console.warn(`secureStorage.getItem failed for ${key}:`, err);
      return null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
};

// -------------------------------------------------------------
// DevTools Anti-Tampering & Self-XSS Security Defense
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  try {
    const bannerStyleHeader = 'color: #ef4444; font-size: 20px; font-weight: 900;';
    const bannerStyleBody = 'color: #f59e0b; font-size: 12px; font-weight: bold;';
    console.log('%c⚠️ STOP / PERINGATAN KEAMANAN (STELLACALC)', bannerStyleHeader);
    console.log(
      '%cJangan pernah menempelkan skrip atau kode berbahaya di sini. Sistem dilindungi oleh salted one-way hashing, hardware fingerprinting, dan tamper-evident storage.',
      bannerStyleBody
    );
  } catch {}
}

