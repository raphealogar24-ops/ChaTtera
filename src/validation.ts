/**
 * Validation constants and defensive payload sanitizers synchronized verbatim
 * with firebase-blueprint.json and firestore.rules.
 */

export const BLUEPRINT_LIMITS = {
  ID_MIN: 1,
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,

  EMAIL_MIN: 3,
  EMAIL_MAX: 254,

  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 60,

  HANDLE_MIN: 2,
  HANDLE_MAX: 32,
  HANDLE_PATTERN: /^[a-zA-Z0-9_\-]+$/,

  STATUS_TEXT_MIN: 1,
  STATUS_TEXT_MAX: 160,

  PUBLIC_KEY_COORD_MIN: 20,
  PUBLIC_KEY_COORD_MAX: 128,

  FINGERPRINT_MIN: 16,
  FINGERPRINT_MAX: 128,

  PREVIEW_MIN: 1,
  PREVIEW_MAX: 160,

  CIPHERTEXT_MIN: 1,
  CIPHERTEXT_MAX: 8192,

  IV_MIN: 12,
  IV_MAX: 64,

  PLAINTEXT_MAX_CHARS: 2000,
} as const;

export function isValidIdString(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length >= BLUEPRINT_LIMITS.ID_MIN &&
    id.length <= BLUEPRINT_LIMITS.ID_MAX &&
    BLUEPRINT_LIMITS.ID_PATTERN.test(id)
  );
}

export function sanitizeHandle(raw: string, fallbackUid: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const base = cleaned.length >= 2 ? cleaned : `user_${fallbackUid.slice(0, 8).toLowerCase()}`;
  return base.slice(0, BLUEPRINT_LIMITS.HANDLE_MAX);
}

export function sanitizeDisplayName(raw: string, fallbackHandle: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallbackHandle.slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
  }
  return trimmed.slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
}

export function sanitizeStatusText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'ECDH P-256 identity key active';
  }
  return trimmed.slice(0, BLUEPRINT_LIMITS.STATUS_TEXT_MAX);
}

export function buildConversationId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  const raw = `conv_${sorted[0].slice(0, 48)}_${sorted[1].slice(0, 48)}`;
  return raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BLUEPRINT_LIMITS.ID_MAX);
}

export function generateSafeDocId(prefix: string): string {
  const randomBytes = new Uint8Array(12);
  window.crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${Date.now()}_${hex}`.slice(0, BLUEPRINT_LIMITS.ID_MAX);
}
