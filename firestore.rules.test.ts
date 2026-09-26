/**
 * Dirty Dozen Security Specification Test Suite
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected by the Firestore security rules with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_VECTORS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Profile Creation (isAdmin: true)',
    collectionPath: '/profiles/user_alice',
    operation: 'create',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      uid: 'user_alice',
      displayName: 'Alice',
      handle: 'alice_sec',
      statusText: 'Ready',
      publicKeyX: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
      publicKeyY: '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM',
      keyFingerprint: 'A1B2:C3D4:E5F6:0011:2233:4455:6677:8899',
      discoverable: true,
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Message Creation (senderId mismatch)',
    collectionPath: '/conversations/conv_01/messages/msg_spoof_01',
    operation: 'create',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      id: 'msg_spoof_01',
      conversationId: 'conv_01',
      senderId: 'user_bob',
      recipientId: 'user_alice',
      senderKeyFingerprint: 'A1B2:C3D4:E5F6:0011:2233:4455:6677:8899',
      ciphertext: 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRlipRkwB0K1Y=',
      iv: 'a1b2c3d4e5f60102',
      algorithm: 'ECDH-P256-AES256GCM',
      deliveryStatus: 'sent',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt on /users/user_alice',
    collectionPath: '/users/user_alice',
    operation: 'create',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: false },
    payload: {
      uid: 'user_alice',
      email: 'alice@example.com',
      keyFingerprint: 'A1B2:C3D4:E5F6:0011:2233:4455:6677:8899',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User PII Scrape on /users/user_bob',
    collectionPath: '/users/user_bob',
    operation: 'get',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Blanket List Attempt on /users PII Collection',
    collectionPath: '/users',
    operation: 'list',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Message Creation Without Parent Conversation Batch Update',
    collectionPath: '/conversations/conv_01/messages/msg_orphan_01',
    operation: 'create',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      id: 'msg_orphan_01',
      conversationId: 'conv_01',
      senderId: 'user_alice',
      recipientId: 'user_bob',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Bypass on Locked Conversation',
    collectionPath: '/conversations/conv_locked',
    operation: 'update',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Terminal State Bypass on Revoked Message',
    collectionPath: '/conversations/conv_01/messages/msg_revoked',
    operation: 'update',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      deliveryStatus: 'sent',
      ciphertext: 'RestoredCiphertext==',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Tier 2 Recipient Tampering With Ciphertext',
    collectionPath: '/conversations/conv_01/messages/msg_01',
    operation: 'update',
    auth: { uid: 'user_bob', email: 'bob@example.com', email_verified: true },
    payload: {
      ciphertext: 'TamperedCiphertextByRecipient==',
      deliveryStatus: 'delivered',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immortal Field Mutation (participantB changed on update)',
    collectionPath: '/conversations/conv_01',
    operation: 'update',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      participantB: 'user_mallory',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Resource Exhaustion Poisoning (oversized ciphertext > 8192 chars)',
    collectionPath: '/conversations/conv_01/messages/msg_huge',
    operation: 'create',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      ciphertextLength: 16384,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized List Query on Messages by Non-Participant',
    collectionPath: '/conversations/conv_01/messages',
    operation: 'list',
    auth: { uid: 'user_mallory', email: 'mallory@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
