/**
 * User Authentication & Anti-Exploit Security Service
 * 
 * Features:
 * - 1 Device = 1 Username strict anti-exploit enforcement.
 * - Hardware Fingerprint + IP Device Association.
 * - PBKDF2-SHA256 (100,000 rounds) Password Hashing.
 * - Brute-force rate-limiting and temporary account lockout.
 * - Resilient offline & local persistence with automatic cloud synchronization.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseService } from './firebase';
import type { DeviceInfo } from './deviceFingerprint';
import { sanitizeString } from './security';

const STORAGE_KEY_SESSION = 'stella_user_session_v1';
const STORAGE_KEY_LOCAL_DEVICE_USER = 'stella_device_registered_username';
const STORAGE_KEY_PASSWORDS = 'stella_local_passwords_v1';
const STORAGE_KEY_REMEMBER_TOKEN = 'stella_device_remember_token_v1';
const REMEMBER_SALT = 'STELLACALC_DEVICE_REMEMBER_SECRET_SALT_2026';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface UserSession {
  username: string;
  hasPassword: boolean;
  deviceId: string;
  loggedInAt: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserSession;
  isNewUser?: boolean;
  requiresPassword?: boolean;
  existingUsername?: string;
}

interface LocalPasswordRecord {
  passwordHash: string;
  passwordSalt: string;
}

async function generateRememberSignature(username: string, deviceId: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(`${REMEMBER_SALT}::${username.toLowerCase()}::${deviceId}`)
  );
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getLocalPasswordMap(): Record<string, LocalPasswordRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PASSWORDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPassword(usernameLower: string, record: LocalPasswordRecord): void {
  try {
    const map = getLocalPasswordMap();
    map[usernameLower] = record;
    localStorage.setItem(STORAGE_KEY_PASSWORDS, JSON.stringify(map));
  } catch {}
}

// -------------------------------------------------------------
// Password Hashing (PBKDF2-SHA256 + 100,000 iterations + Salt)
// -------------------------------------------------------------
async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );
  return Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

class AuthService {
  /**
   * Get currently active session from localStorage
   */
  public getCurrentSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username && parsed.deviceId) {
        return parsed as UserSession;
      }
    } catch {}
    return null;
  }

  /**
   * Save active session and automatically store persistent Remember Me credentials
   * bound cryptographically to this physical hardware device.
   */
  public saveSession(user: UserSession): void {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_LOCAL_DEVICE_USER, user.username);

      // Async write remember token
      generateRememberSignature(user.username, user.deviceId).then((tokenSignature) => {
        try {
          const rememberPayload = {
            username: user.username,
            hasPassword: user.hasPassword,
            deviceId: user.deviceId,
            tokenSignature,
            savedAt: Date.now()
          };
          localStorage.setItem(STORAGE_KEY_REMEMBER_TOKEN, JSON.stringify(rememberPayload));
        } catch {}
      }).catch(() => {});
    } catch {}
  }

  /**
   * Logout user. Optionally preserve or clear device remember token.
   */
  public logout(clearRememberToken: boolean = false): void {
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      if (clearRememberToken) {
        localStorage.removeItem(STORAGE_KEY_REMEMBER_TOKEN);
      }
    } catch {}
  }

  /**
   * Automatic login / session restoration checking the physical hardware device.
   * Enables users returning after days/weeks of being offline to skip login automatically.
   */
  public async tryAutoLoginWithDevice(device: DeviceInfo): Promise<UserSession | null> {
    // 1. Check if an active session is already present and matches this device
    const current = this.getCurrentSession();
    if (current && current.deviceId === device.deviceId && current.username) {
      return current;
    }

    // 2. Check cryptographic Remember Me token stored on this device
    try {
      const rawRemember = localStorage.getItem(STORAGE_KEY_REMEMBER_TOKEN);
      if (rawRemember) {
        const parsed = JSON.parse(rawRemember);
        if (parsed && parsed.username && parsed.deviceId === device.deviceId && parsed.tokenSignature) {
          const expectedSig = await generateRememberSignature(parsed.username, device.deviceId);
          if (parsed.tokenSignature === expectedSig) {
            const restored: UserSession = {
              username: parsed.username,
              hasPassword: Boolean(parsed.hasPassword),
              deviceId: device.deviceId,
              loggedInAt: Date.now()
            };
            this.saveSession(restored);
            return restored;
          }
        }
      }
    } catch {}

    // 3. Check locally registered device username fallback
    try {
      const registeredUsername = localStorage.getItem(STORAGE_KEY_LOCAL_DEVICE_USER);
      if (registeredUsername) {
        const check = await this.checkDeviceAccount(device.deviceId);
        if (check.hasAccount && check.existingUsername) {
          const localPasswords = getLocalPasswordMap();
          const hasPwd = Boolean(localPasswords[check.existingUsername.toLowerCase()]);
          const restored: UserSession = {
            username: check.existingUsername,
            hasPassword: hasPwd,
            deviceId: device.deviceId,
            loggedInAt: Date.now()
          };
          this.saveSession(restored);
          return restored;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Check if this device is already linked to an existing username
   */
  public async checkDeviceAccount(deviceId: string): Promise<{ hasAccount: boolean; existingUsername?: string }> {
    const cached = localStorage.getItem(STORAGE_KEY_LOCAL_DEVICE_USER);

    const db = (firebaseService as unknown as { db?: any }).db;
    if (!db) {
      if (cached) return { hasAccount: true, existingUsername: cached };
      return { hasAccount: false };
    }

    try {
      const deviceRef = doc(db, 'devices', deviceId);
      const snap = await getDoc(deviceRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.username) {
          localStorage.setItem(STORAGE_KEY_LOCAL_DEVICE_USER, data.username);
          return { hasAccount: true, existingUsername: data.username };
        }
      }
    } catch (err) {
      // Permission-denied or offline: silently rely on local device storage
      console.warn('Check device account fallback to local storage:', err);
    }

    if (cached) {
      return { hasAccount: true, existingUsername: cached };
    }

    return { hasAccount: false };
  }

  /**
   * Authenticate or Register with strict 1 Device = 1 Username rule
   */
  public async authenticate(params: {
    username: string;
    password?: string;
    device: DeviceInfo;
  }): Promise<AuthResult> {
    const rawUsername = params.username.trim();

    // 1. Validate username format: 3-20 chars, alphanumeric and underscore only
    const validUsernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!validUsernameRegex.test(rawUsername)) {
      return {
        success: false,
        error: 'Username harus terdiri dari 3-20 karakter (huruf, angka, atau underscore).'
      };
    }

    const usernameLower = rawUsername.toLowerCase();
    const db = (firebaseService as unknown as { db?: any }).db;

    // Check device binding against existing registered account
    const deviceCheck = await this.checkDeviceAccount(params.device.deviceId);
    if (deviceCheck.hasAccount && deviceCheck.existingUsername) {
      if (deviceCheck.existingUsername.toLowerCase() !== usernameLower) {
        return {
          success: false,
          error: `You already had an Username: ${deviceCheck.existingUsername}`,
          existingUsername: deviceCheck.existingUsername
        };
      }
    }

    // Check local password storage for fallback
    const localPasswords = getLocalPasswordMap();
    const localPwdRecord = localPasswords[usernameLower];

    // Try Firestore lookup if db is initialized
    if (db) {
      try {
        const userRef = doc(db, 'users', usernameLower);
        const userSnap = await getDoc(userRef);

        // Case A: User exists in Firestore
        if (userSnap.exists()) {
          const userData = userSnap.data();

          // Check brute-force lockout
          if (userData.lockoutUntil && userData.lockoutUntil > Date.now()) {
            const remainingSec = Math.ceil((userData.lockoutUntil - Date.now()) / 1000);
            return {
              success: false,
              error: `Akun terkunci sementara karena terlalu banyak percobaan salah. Silakan coba lagi dalam ${remainingSec} detik.`
            };
          }

          // Check if password protection is active
          const hasPassword = Boolean((userData.hasPassword && userData.passwordHash) || localPwdRecord);

          if (hasPassword) {
            if (!params.password) {
              return {
                success: false,
                requiresPassword: true,
                error: 'This Username Contain Password'
              };
            }

            // Verify with cloud hash or local hash
            const hashToVerify = userData.passwordHash || localPwdRecord?.passwordHash;
            const saltToVerify = userData.passwordSalt
              ? base64ToBuffer(userData.passwordSalt)
              : (localPwdRecord ? base64ToBuffer(localPwdRecord.passwordSalt) : null);

            let isPasswordValid = false;
            if (hashToVerify && saltToVerify) {
              const computedHash = await hashPassword(params.password, saltToVerify);
              isPasswordValid = (computedHash === hashToVerify);
            }

            if (!isPasswordValid) {
              const newFailedAttempts = (userData.failedAttempts || 0) + 1;
              const isLockout = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
              const lockoutUntil = isLockout ? Date.now() + LOCKOUT_DURATION_MS : 0;

              try {
                await updateDoc(userRef, {
                  failedAttempts: isLockout ? 0 : newFailedAttempts,
                  lockoutUntil
                });
              } catch {}

              if (isLockout) {
                return {
                  success: false,
                  error: 'Terlalu banyak password salah. Akun dikunci selama 5 menit.'
                };
              }

              return {
                success: false,
                requiresPassword: true,
                error: `Password salah. Sisa percobaan: ${MAX_FAILED_ATTEMPTS - newFailedAttempts}`
              };
            }

            // Password is correct
            try {
              await updateDoc(userRef, {
                failedAttempts: 0,
                lockoutUntil: 0,
                lastSeenAt: serverTimestamp(),
                lastIp: params.device.ip
              });
            } catch {}

            const session: UserSession = {
              username: userData.username || rawUsername,
              hasPassword: true,
              deviceId: params.device.deviceId,
              loggedInAt: Date.now()
            };
            this.saveSession(session);
            return { success: true, user: session, isNewUser: false };
          }

          // User exists without password
          try {
            await updateDoc(userRef, {
              lastSeenAt: serverTimestamp(),
              lastIp: params.device.ip
            });
          } catch {}

          const session: UserSession = {
            username: userData.username || rawUsername,
            hasPassword: false,
            deviceId: params.device.deviceId,
            loggedInAt: Date.now()
          };
          this.saveSession(session);
          return { success: true, user: session, isNewUser: false };
        }

        // Case B: User does not exist in Firestore -> Register New User
        try {
          await setDoc(userRef, {
            username: sanitizeString(rawUsername, 20),
            usernameLower,
            deviceId: params.device.deviceId,
            ip: params.device.ip,
            hasPassword: false,
            passwordHash: null,
            passwordSalt: null,
            failedAttempts: 0,
            lockoutUntil: 0,
            createdAt: serverTimestamp(),
            lastSeenAt: serverTimestamp()
          });

          const deviceRef = doc(db, 'devices', params.device.deviceId);
          await setDoc(deviceRef, {
            username: sanitizeString(rawUsername, 20),
            usernameLower,
            ip: params.device.ip,
            registeredAt: serverTimestamp(),
            lastSeenAt: serverTimestamp()
          });
        } catch (writeErr) {
          console.warn('Firestore user registration write warning (saved locally):', writeErr);
        }

        const session: UserSession = {
          username: rawUsername,
          hasPassword: false,
          deviceId: params.device.deviceId,
          loggedInAt: Date.now()
        };
        this.saveSession(session);
        return { success: true, user: session, isNewUser: true };

      } catch (firestoreErr) {
        console.warn('Firestore check failed (using verified local authentication):', firestoreErr);
      }
    }

    // Local / Offline / Permission-Safe Mode
    if (localPwdRecord) {
      if (!params.password) {
        return {
          success: false,
          requiresPassword: true,
          error: 'This Username Contain Password'
        };
      }
      const salt = base64ToBuffer(localPwdRecord.passwordSalt);
      const computedHash = await hashPassword(params.password, salt);
      if (computedHash !== localPwdRecord.passwordHash) {
        return {
          success: false,
          requiresPassword: true,
          error: 'Password salah. Harap periksa kembali.'
        };
      }
    }

    const session: UserSession = {
      username: rawUsername,
      hasPassword: Boolean(localPwdRecord),
      deviceId: params.device.deviceId,
      loggedInAt: Date.now()
    };
    this.saveSession(session);
    return {
      success: true,
      user: session,
      isNewUser: !deviceCheck.hasAccount
    };
  }

  /**
   * Set or update password for user (resilient across local & cloud)
   */
  public async setPassword(params: {
    username: string;
    newPassword: string;
    oldPassword?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { username, newPassword, oldPassword } = params;

    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Password minimal 4 karakter.' };
    }

    const usernameLower = username.toLowerCase();
    const localPasswords = getLocalPasswordMap();
    const localPwdRecord = localPasswords[usernameLower];

    // If already has password, verify old password
    if (localPwdRecord) {
      if (!oldPassword) {
        return { success: false, error: 'Harap masukkan password lama Anda.' };
      }
      const oldSalt = base64ToBuffer(localPwdRecord.passwordSalt);
      const computedOld = await hashPassword(oldPassword, oldSalt);
      if (computedOld !== localPwdRecord.passwordHash) {
        return { success: false, error: 'Password lama salah.' };
      }
    }

    // Generate fresh 16-byte cryptographically secure random salt
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newHash = await hashPassword(newPassword, newSalt);

    // Save locally first so it is immediately protected
    saveLocalPassword(usernameLower, {
      passwordHash: newHash,
      passwordSalt: bufferToBase64(newSalt)
    });

    // Update active session
    const session = this.getCurrentSession();
    if (session) {
      session.hasPassword = true;
      this.saveSession(session);
    }

    // Sync to Firestore if available (silently handle permission/network differences)
    const db = (firebaseService as unknown as { db?: any }).db;
    if (db) {
      try {
        const userRef = doc(db, 'users', usernameLower);
        await setDoc(userRef, {
          username,
          usernameLower,
          hasPassword: true,
          passwordHash: newHash,
          passwordSalt: bufferToBase64(newSalt),
          passwordUpdatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore password sync warning (protected locally):', err);
      }
    }

    return { success: true };
  }
}

export const authService = Object.freeze(new AuthService());
