/**
 * Real End-to-End Encryption Engine powered by the Web Crypto API.
 * - Key Exchange: Elliptic Curve Diffie-Hellman (ECDH) over NIST P-256
 * - Symmetric Cipher: Authenticated AES-256-GCM with 96-bit (12-byte) random IV
 * - Key Fingerprints & Safety Numbers: SHA-256 digest over canonical coordinates
 */

import { BLUEPRINT_LIMITS } from '../validation';

export interface StoredIdentityKeyVault {
  uid: string;
  publicKeyX: string;
  publicKeyY: string;
  privateKeyD: string;
  keyFingerprint: string;
  createdAtIso: string;
}

export interface EncryptedPayloadResult {
  ciphertext: string;
  iv: string;
  ciphertextPreview: string;
  algorithm: 'ECDH-P256-AES256GCM';
}

const STORAGE_PREFIX = 'ciphergrid_e2ee_vault_v1_';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64ToHex(base64: string): string {
  try {
    const bytes = base64ToBytes(base64);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  } catch {
    return base64;
  }
}

export async function computePublicKeyFingerprint(
  publicKeyX: string,
  publicKeyY: string
): Promise<string> {
  const canonical = `ECDH-P256:${publicKeyX.trim()}:${publicKeyY.trim()}`;
  const encoded = new TextEncoder().encode(canonical);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const hashBytes = new Uint8Array(hashBuffer);
  const hexBlocks: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    const block =
      hashBytes[i].toString(16).padStart(2, '0').toUpperCase() +
      hashBytes[i + 1].toString(16).padStart(2, '0').toUpperCase();
    hexBlocks.push(block);
  }
  return hexBlocks.join(':');
}

export async function computeSafetyNumber(
  fingerprintA: string,
  fingerprintB: string
): Promise<string> {
  const sorted = [fingerprintA.trim(), fingerprintB.trim()].sort();
  const canonical = `SAFETY-NUMBER-V1:${sorted[0]}|${sorted[1]}`;
  const encoded = new TextEncoder().encode(canonical);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const view = new DataView(hashBuffer);
  const groups: string[] = [];
  for (let offset = 0; offset < 24; offset += 2) {
    const num = view.getUint16(offset, false) % 100000;
    groups.push(num.toString().padStart(5, '0'));
  }
  return groups.join(' ');
}

export async function generateIdentityKeyVault(
  uid: string
): Promise<StoredIdentityKeyVault> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const publicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
    throw new Error('WebCrypto failed to export P-256 JWK coordinates.');
  }

  const keyFingerprint = await computePublicKeyFingerprint(publicJwk.x, publicJwk.y);

  const vault: StoredIdentityKeyVault = {
    uid,
    publicKeyX: publicJwk.x,
    publicKeyY: publicJwk.y,
    privateKeyD: privateJwk.d,
    keyFingerprint,
    createdAtIso: new Date().toISOString(),
  };

  window.localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(vault));
  return vault;
}

export async function loadOrCreateIdentityKeyVault(
  uid: string
): Promise<StoredIdentityKeyVault> {
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${uid}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredIdentityKeyVault;
      if (
        parsed &&
        parsed.uid === uid &&
        typeof parsed.publicKeyX === 'string' &&
        typeof parsed.publicKeyY === 'string' &&
        typeof parsed.privateKeyD === 'string' &&
        typeof parsed.keyFingerprint === 'string'
      ) {
        return parsed;
      }
    } catch {
      // Regenerate if corrupted
    }
  }
  return generateIdentityKeyVault(uid);
}

export async function importIdentityKeyVault(
  uid: string,
  jsonString: string
): Promise<StoredIdentityKeyVault> {
  const parsed = JSON.parse(jsonString) as Partial<StoredIdentityKeyVault>;
  if (
    !parsed.publicKeyX ||
    !parsed.publicKeyY ||
    !parsed.privateKeyD ||
    parsed.publicKeyX.length < BLUEPRINT_LIMITS.PUBLIC_KEY_COORD_MIN ||
    parsed.publicKeyY.length < BLUEPRINT_LIMITS.PUBLIC_KEY_COORD_MIN
  ) {
    throw new Error('Invalid key vault JSON: missing P-256 coordinates (publicKeyX, publicKeyY, privateKeyD).');
  }

  // Test importing into WebCrypto to verify cryptographic validity
  await window.crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: parsed.publicKeyX,
      y: parsed.publicKeyY,
      d: parsed.privateKeyD,
      ext: true,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );

  const keyFingerprint = await computePublicKeyFingerprint(
    parsed.publicKeyX,
    parsed.publicKeyY
  );

  const vault: StoredIdentityKeyVault = {
    uid,
    publicKeyX: parsed.publicKeyX,
    publicKeyY: parsed.publicKeyY,
    privateKeyD: parsed.privateKeyD,
    keyFingerprint,
    createdAtIso: parsed.createdAtIso || new Date().toISOString(),
  };

  window.localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(vault));
  return vault;
}

export async function deriveSharedAesGcmKey(
  myVault: StoredIdentityKeyVault,
  peerPublicKeyX: string,
  peerPublicKeyY: string
): Promise<CryptoKey> {
  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: myVault.publicKeyX,
      y: myVault.publicKeyY,
      d: myVault.privateKeyD,
      ext: false,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );

  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: peerPublicKeyX,
      y: peerPublicKeyY,
      ext: true,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessagePlaintext(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<EncryptedPayloadResult> {
  const trimmed = plaintext.slice(0, BLUEPRINT_LIMITS.PLAINTEXT_MAX_CHARS);
  const ivBytes = new Uint8Array(12);
  window.crypto.getRandomValues(ivBytes);

  const encodedPlaintext = new TextEncoder().encode(trimmed);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128,
    },
    sharedKey,
    encodedPlaintext
  );

  const ciphertext = bytesToBase64(new Uint8Array(cipherBuffer));
  const iv = bytesToBase64(ivBytes);
  const snippet = ciphertext.slice(0, 28);
  const ciphertextPreview = `AES256GCM:${snippet}...`.slice(
    0,
    BLUEPRINT_LIMITS.PREVIEW_MAX
  );

  return {
    ciphertext: ciphertext.slice(0, BLUEPRINT_LIMITS.CIPHERTEXT_MAX),
    iv: iv.slice(0, BLUEPRINT_LIMITS.IV_MAX),
    ciphertextPreview,
    algorithm: 'ECDH-P256-AES256GCM',
  };
}

export async function decryptMessageCiphertext(
  sharedKey: CryptoKey,
  ciphertextB64: string,
  ivB64: string
): Promise<{ ok: boolean; plaintext: string }> {
  if (ciphertextB64 === '[REVOKED_CIPHERTEXT]') {
    return {
      ok: false,
      plaintext: '[Packet Cryptographically Revoked by Sender]',
    };
  }

  try {
    const cipherBytes = base64ToBytes(ciphertextB64);
    const ivBytes = base64ToBytes(ivB64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as BufferSource,
        tagLength: 128,
      },
      sharedKey,
      cipherBytes as BufferSource
    );

    const decoded = new TextDecoder().decode(decryptedBuffer);
    return { ok: true, plaintext: decoded };
  } catch {
    return {
      ok: false,
      plaintext:
        '[Unable to decrypt frame: encrypted under a previous or rotated ECDH P-256 keypair]',
    };
  }
}
