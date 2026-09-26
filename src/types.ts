import { Timestamp } from 'firebase/firestore';

export interface UserPrivateDoc {
  uid: string;
  email: string;
  keyFingerprint: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserProfileDoc {
  uid: string;
  displayName: string;
  handle: string;
  statusText: string;
  publicKeyX: string;
  publicKeyY: string;
  keyFingerprint: string;
  discoverable: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ConversationStatus = 'active' | 'archived' | 'locked';

export interface ConversationDoc {
  id: string;
  participantA: string;
  participantB: string;
  participantAName: string;
  participantBName: string;
  participantAHandle: string;
  participantBHandle: string;
  status: ConversationStatus;
  lastCiphertextPreview: string;
  messageCount: number;
  lastSenderId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type DeliveryStatus = 'sent' | 'delivered' | 'verified' | 'revoked';

export interface EncryptedMessageDoc {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  senderKeyFingerprint: string;
  ciphertext: string;
  iv: string;
  algorithm: 'ECDH-P256-AES256GCM';
  deliveryStatus: DeliveryStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface DecryptedMessageView extends EncryptedMessageDoc {
  plaintext: string;
  decryptionOk: boolean;
}
