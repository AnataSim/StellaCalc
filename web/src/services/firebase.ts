import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import type { BuildState } from '../types';
import type { ElementPresetsMap } from '../components/ElementPresetDrawer';
import {
  encryptSecurePayload,
  decryptSecurePayload,
  deepSanitizeObject,
  secureJsonParse,
  sanitizeString,
  sanitizeBuildState,
  type SecureEnvelope
} from './security';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY_CUSTOM_CONFIG = 'stella_firebase_custom_config';
const STORAGE_KEY_CLOUD_UID = 'stella_firebase_cached_uid';
const STORAGE_KEY_CUSTOM_DOC_ID = 'stella_firebase_custom_doc_id';

export function getCustomDocId(): string {
  return localStorage.getItem(STORAGE_KEY_CUSTOM_DOC_ID) || '';
}

export function saveCustomDocId(docId: string) {
  const trimmed = docId.trim();
  if (!trimmed || trimmed === 'default') {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_DOC_ID);
  } else {
    localStorage.setItem(STORAGE_KEY_CUSTOM_DOC_ID, trimmed);
  }
}

// Default project config (stellacalc)
const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyCUcwCZSGg9YCZGQjpGNFXdcUagPKeoymw",
  authDomain: "stellacalc.firebaseapp.com",
  projectId: "stellacalc",
  storageBucket: "stellacalc.firebasestorage.app",
  messagingSenderId: "207652551522",
  appId: "1:207652551522:web:ea1d952a58e3fc0fdf4a3b"
};

// Load default config from Vite env if present or use project default
export function getEnvFirebaseConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId;

  if (apiKey && projectId && appId) {
    return {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId,
    };
  }

  // Check custom config in localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId && parsed.appId) {
        return parsed;
      }
    }
  } catch {}

  return null;
}

export function saveCustomFirebaseConfig(config: FirebaseConfig | null) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_CONFIG);
  } else {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CONFIG, JSON.stringify(config));
  }
}

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private currentUser: User | null = null;
  private unsubscribePresets: Unsubscribe | null = null;

  constructor() {
    this.tryInitialize();
  }

  public tryInitialize(customConfig?: FirebaseConfig): boolean {
    const config = customConfig || getEnvFirebaseConfig();
    if (!config) return false;

    try {
      if (getApps().length === 0) {
        this.app = initializeApp(config);
      } else {
        this.app = getApps()[0];
      }

      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      // Listen to auth state
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        if (user) {
          localStorage.setItem(STORAGE_KEY_CLOUD_UID, user.uid);
        }
      });

      // Auto sign in anonymously so user has a unique cloud space
      signInAnonymously(this.auth).catch((err) => {
        console.warn('Firebase Anonymous Auth warning:', err);
      });

      return true;
    } catch (err) {
      console.error('Failed to initialize Firebase:', err);
      return false;
    }
  }

  public isConfigured(): boolean {
    return this.app !== null && this.db !== null;
  }

  public getUserId(): string {
    if (this.currentUser?.uid) return this.currentUser.uid;
    const cached = localStorage.getItem(STORAGE_KEY_CLOUD_UID);
    if (cached) return cached;
    // Fallback anonymous browser ID
    const fallback = 'anon_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(STORAGE_KEY_CLOUD_UID, fallback);
    return fallback;
  }

  /**
   * Get target Document ID in user_presets collection.
   * Priority: username param (lowercase) -> Custom ID -> Auth UID
   */
  public getDocId(username?: string): string {
    if (username && username.trim()) {
      return username.trim().toLowerCase();
    }
    const custom = getCustomDocId();
    if (custom && custom.trim() && custom.trim() !== 'default') return custom.trim();
    return this.getUserId();
  }

  /**
   * Save Element Presets Map to Firestore for a specific user.
   * Stores both structured map (`presets`) and AES-256-GCM + HMAC-SHA256 encrypted envelope (`presetsJson`)
   * for state-of-the-art security against data interception and tampering.
   */
  public async savePresetsToCloud(presetsMap: ElementPresetsMap, username?: string): Promise<boolean> {
    if (!this.db) return false;
    try {
      const docId = this.getDocId(username);
      const docRef = doc(this.db, 'user_presets', docId);

      // Deep sanitize to prevent prototype pollution before encryption
      const sanitizedMap = deepSanitizeObject(presetsMap);

      // Encrypt payload with AES-256-GCM and generate HMAC-SHA256 signature
      const secureEnvelope: SecureEnvelope = await encryptSecurePayload(sanitizedMap);

      await setDoc(
        docRef,
        {
          presets: JSON.parse(JSON.stringify(sanitizedMap)),
          presetsJson: JSON.stringify(secureEnvelope),
          updatedAt: serverTimestamp(),
          clientUpdatedAt: Date.now(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error('Failed to save presets to Firebase Firestore:', err);
      return false;
    }
  }

  /**
   * Helper to parse and decrypt incoming cloud presets safely
   */
  private async parseCloudPresetsPayload(rawData: unknown): Promise<ElementPresetsMap | null> {
    if (!rawData) return null;

    // Check if rawData is an encrypted envelope string
    if (typeof rawData === 'string') {
      try {
        const parsed = secureJsonParse<Record<string, unknown>>(rawData);
        if (parsed && parsed.encrypted === true && parsed.version === 1) {
          // Decrypt AES-256-GCM + verify HMAC-SHA256 signature
          const decrypted = await decryptSecurePayload<ElementPresetsMap>(parsed, undefined, { checkTimestamp: false });
          return deepSanitizeObject(decrypted);
        }
        // Fallback for unencrypted JSON
        return deepSanitizeObject(parsed as unknown as ElementPresetsMap);
      } catch (err) {
        console.warn('Encrypted envelope decrypt warning, trying fallback:', err);
      }
    }

    if (typeof rawData === 'object') {
      return deepSanitizeObject(rawData as ElementPresetsMap);
    }

    return null;
  }

  /**
   * Load Element Presets Map from Firestore for a specific user.
   * Reads strictly from the user's specific doc without leaking or falling back to 'default'.
   */
  public async loadPresetsFromCloud(username?: string): Promise<ElementPresetsMap | null> {
    if (!this.db) return null;
    try {
      const docId = this.getDocId(username);
      const snap = await getDoc(doc(this.db, 'user_presets', docId));

      if (snap.exists()) {
        const data = snap.data();
        if (data.presetsJson) {
          const decrypted = await this.parseCloudPresetsPayload(data.presetsJson);
          if (decrypted) return decrypted;
        }
        if (data.presets) {
          return await this.parseCloudPresetsPayload(data.presets);
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to load presets from Firebase Firestore:', err);
      return null;
    }
  }

  /**
   * Realtime Listener for Presets with automatic AES-256-GCM decryption & HMAC verification
   * Scoped to the specific username
   */
  public subscribeToPresets(onUpdate: (presets: ElementPresetsMap) => void, username?: string): () => void {
    if (!this.db) return () => {};
    const docId = this.getDocId(username);
    const docRef = doc(this.db, 'user_presets', docId);

    if (this.unsubscribePresets) {
      this.unsubscribePresets();
    }

    this.unsubscribePresets = onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.presetsJson) {
            const decrypted = await this.parseCloudPresetsPayload(data.presetsJson);
            if (decrypted) {
              onUpdate(decrypted);
              return;
            }
          }
          if (data.presets) {
            const parsed = await this.parseCloudPresetsPayload(data.presets);
            if (parsed) {
              onUpdate(parsed);
            }
          }
        }
      },
      (err) => {
        console.warn('Presets snapshot listener warning:', err);
      }
    );

    return () => {
      if (this.unsubscribePresets) {
        this.unsubscribePresets();
        this.unsubscribePresets = null;
      }
    };
  }

  /**
   * Wipe presets from cloud for a specific user.
   */
  public async wipePresetsFromCloud(username?: string): Promise<boolean> {
    if (!this.db) return false;
    try {
      const emptyPresets: ElementPresetsMap = {
        Ignis: { 1: null, 2: null, 3: null },
        Aqua: { 1: null, 2: null, 3: null },
        Ventus: { 1: null, 2: null, 3: null },
        Terra: { 1: null, 2: null, 3: null },
        Lux: { 1: null, 2: null, 3: null },
        Umbra: { 1: null, 2: null, 3: null },
      };
      return await this.savePresetsToCloud(emptyPresets, username);
    } catch (err) {
      console.error('Failed to wipe presets from cloud:', err);
      return false;
    }
  }

  /**
   * Clean legacy shared 'default' preset document in Firestore
   */
  public async cleanLegacyDefaultPresets(): Promise<void> {
    if (!this.db) return;
    try {
      const emptyPresets: ElementPresetsMap = {
        Ignis: { 1: null, 2: null, 3: null },
        Aqua: { 1: null, 2: null, 3: null },
        Ventus: { 1: null, 2: null, 3: null },
        Terra: { 1: null, 2: null, 3: null },
        Lux: { 1: null, 2: null, 3: null },
        Umbra: { 1: null, 2: null, 3: null },
      };
      await setDoc(
        doc(this.db, 'user_presets', 'default'),
        {
          presets: emptyPresets,
          presetsJson: '',
          updatedAt: serverTimestamp(),
          clientUpdatedAt: Date.now(),
          cleared: true,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not reset legacy default doc:', err);
    }
  }

  /**
   * Publish a Build to Cloud Community Library / Share Link
   * Sanitizes all user-provided strings and validates math bounds to prevent injection
   */
  public async publishBuild(
    build: BuildState,
    characterName: string,
    authorName: string = 'Anonymous'
  ): Promise<string | null> {
    if (!this.db) return null;
    try {
      const sanitizedBuild = sanitizeBuildState(build);
      if (!sanitizedBuild) throw new Error("Invalid build state provided");

      const colRef = collection(this.db, 'shared_builds');
      const docRef = await addDoc(colRef, {
        characterName: sanitizeString(characterName, 100),
        characterId: sanitizedBuild.characterId,
        authorName: sanitizeString(authorName, 100),
        build: JSON.parse(JSON.stringify(sanitizedBuild)),
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Failed to publish build to Firestore:', err);
      return null;
    }
  }

  /**
   * Fetch a Published Build by ID
   */
  public async fetchSharedBuild(buildId: string): Promise<{ build: BuildState; characterName: string } | null> {
    if (!this.db) return null;
    try {
      const cleanBuildId = sanitizeString(buildId, 128);
      const docRef = doc(this.db, 'shared_builds', cleanBuildId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const cleanBuild = sanitizeBuildState(data.build);
        if (!cleanBuild) return null;

        return {
          build: cleanBuild,
          characterName: sanitizeString(data.characterName, 100),
        };
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch build from Firestore:', err);
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();

