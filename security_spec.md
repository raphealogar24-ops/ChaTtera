# CipherGrid Zero-Trust Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **PII Isolation Invariant (`/users/{userId}` vs `/profiles/{userId}`)**:
   - Email addresses (`email`) are stored strictly in `/users/{userId}` and can ONLY be read (`get`) or written by `request.auth.uid == userId` with a verified email (`request.auth.token.email_verified == true`). `/users` cannot be listed (`allow list: if false`).
   - `/profiles/{userId}` contains zero PII (only public ECDH P-256 coordinates `publicKeyX`, `publicKeyY`, `keyFingerprint`, `displayName`, `handle`, `statusText`, and `discoverable`).
2. **Atomic Registration Invariant (`existsAfter`)**:
   - Creating `/users/{userId}` requires `/profiles/{userId}` to exist after the transaction (`existsAfter`), and creating `/profiles/{userId}` requires `/users/{userId}` to exist after the transaction.
3. **Global Consistency & Relational Parent Invariant (`/conversations/{conversationId}`)**:
   - A conversation can only be created if both `participantA` and `participantB` have existing documents in `/profiles/{uid}` (`exists()`), `lastSenderId == request.auth.uid`, and the caller is either `participantA` or `participantB`.
   - Terminal State Lock: Once a conversation reaches `status == 'locked'`, all further updates are rejected.
4. **Master Gate & Atomic Message Sync (`/conversations/{conversationId}/messages/{messageId}`)**:
   - Every single-document operation (`get`, `create`, `update`) on `/conversations/{conversationId}/messages/{messageId}` fetches the parent `/conversations/{conversationId}` via `get()` to verify the caller is an active participant (`participantA` or `participantB`) and, for writes, that the parent conversation is not `'locked'`.
   - Creating a message requires an atomic batch update to the parent `/conversations/{conversationId}` (`getAfter(...).data.updatedAt == request.time && getAfter(...).data.lastSenderId == request.auth.uid`).
   - List queries on `/conversations` and `/conversations/{conversationId}/messages` strictly enforce `resource.data` checks (`existing().participantA == request.auth.uid || existing().participantB == request.auth.uid` and `existing().senderId == request.auth.uid || existing().recipientId == request.auth.uid`) with zero `get()` calls inside `allow list`.

---

## 2. The "Dirty Dozen" Payloads (Adversarial Test Vectors)

1. **Payload 1 — Shadow Field Injection on Profile Creation (`isAdmin: true`)**:
   ```json
   {
     "uid": "user_alice",
     "displayName": "Alice",
     "handle": "alice_sec",
     "statusText": "Ready",
     "publicKeyX": "MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4",
     "publicKeyY": "4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM",
     "keyFingerprint": "A1B2:C3D4:E5F6:0011:2233:4455:6677:8899",
     "discoverable": true,
     "isAdmin": true,
     "createdAt": "SERVER_TIMESTAMP",
     "updatedAt": "SERVER_TIMESTAMP"
   }
   ```
   *Expected*: `PERMISSION_DENIED` (`hasOnly` rejects `isAdmin`).

2. **Payload 2 — Identity Spoofing on Message Creation (`senderId` mismatch)**:
   ```json
   {
     "id": "msg_spoof_01",
     "conversationId": "conv_01",
     "senderId": "user_bob",
     "recipientId": "user_alice",
     "senderKeyFingerprint": "A1B2:C3D4:E5F6:0011:2233:4455:6677:8899",
     "ciphertext": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRlipRkwB0K1Y=",
     "iv": "a1b2c3d4e5f60102",
     "algorithm": "ECDH-P256-AES256GCM",
     "deliveryStatus": "sent",
     "createdAt": "SERVER_TIMESTAMP",
     "updatedAt": "SERVER_TIMESTAMP"
   }
   ```
   *Expected*: `PERMISSION_DENIED` when authenticated as `user_alice` (`incoming().senderId == request.auth.uid` fails).

3. **Payload 3 — Unverified Email Write Attempt**:
   - Auth token with `email_verified: false` attempting `create` on `/users/user_alice`.
   *Expected*: `PERMISSION_DENIED` (`isVerified()` fails).

4. **Payload 4 — Cross-User PII Scrape on `/users/user_bob`**:
   - Authenticated as `user_alice`, attempting `get` on `/users/user_bob`.
   *Expected*: `PERMISSION_DENIED` (`request.auth.uid == userId` fails).

5. **Payload 5 — Blanket List on `/users` Collection**:
   - Authenticated as `user_alice`, attempting `list` on `/users`.
   *Expected*: `PERMISSION_DENIED` (`allow list: if false`).

6. **Payload 6 — Orphaned Message Creation Without Parent Conversation Batch Update**:
   - Authenticated as `user_alice`, creating `/conversations/conv_01/messages/msg_01` without updating `/conversations/conv_01.updatedAt = request.time` in the same batch.
   *Expected*: `PERMISSION_DENIED` (`getAfter` check fails).

7. **Payload 7 — Terminal State Bypass on Locked Conversation**:
   - Updating `/conversations/conv_locked` where `existing().status == 'locked'` to `status: 'active'`.
   *Expected*: `PERMISSION_DENIED` (`existing().status != 'locked'` fails).

8. **Payload 8 — Terminal State Bypass on Revoked Message**:
   - Updating `/conversations/conv_01/messages/msg_revoked` where `existing().deliveryStatus == 'revoked'` to restore ciphertext.
   *Expected*: `PERMISSION_DENIED` (`existing().deliveryStatus != 'revoked'` fails).

9. **Payload 9 — Tier 2 Recipient Tampering With Ciphertext**:
   - Authenticated as `user_bob` (`recipientId`), attempting to modify `ciphertext` on `user_alice`'s message instead of `deliveryStatus`.
   *Expected*: `PERMISSION_DENIED` (`affectedKeys().hasOnly(['deliveryStatus', 'updatedAt'])` fails).

10. **Payload 10 — Immortal Field Mutation (`createdAt` or `participantA` changed on update)**:
    - Authenticated as `user_alice`, updating `/conversations/conv_01` with a modified `participantB` or `createdAt`.
    *Expected*: `PERMISSION_DENIED` (`incoming().participantB == existing().participantB` and `incoming().createdAt == existing().createdAt` fail).

11. **Payload 11 — Path Variable / Resource Exhaustion Poisoning**:
    - Creating a document with an invalid ID containing spaces/slashes or `ciphertext` > 8192 chars.
    *Expected*: `PERMISSION_DENIED` (`isValidId` and `.size() <= 8192` fail).

12. **Payload 12 — Unauthorized List Query on Messages Without Participant Filter**:
    - Authenticated as `user_mallory` (not `senderId` or `recipientId`), attempting `list` on `/conversations/conv_01/messages`.
    *Expected*: `PERMISSION_DENIED` (`existing().senderId == request.auth.uid || existing().recipientId == request.auth.uid` fails).
