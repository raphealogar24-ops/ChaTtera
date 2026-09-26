import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
   Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Bell,
  Home,
  KeyRound,
  Lock,
  MessageCircle,
  Moon,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  decryptMessageCiphertext,
  deriveSharedAesGcmKey,
  encryptMessagePlaintext,
  generateIdentityKeyVault,
  importIdentityKeyVault,
  loadOrCreateIdentityKeyVault,
  StoredIdentityKeyVault,
} from './crypto/e2ee';
import {
  ConversationDoc,
  DecryptedMessageView,
  EncryptedMessageDoc,
  UserPrivateDoc,
  UserProfileDoc,
} from './types';
import {
  buildConversationId,
  generateSafeDocId,
  sanitizeDisplayName,
  sanitizeHandle,
  sanitizeStatusText,
} from './validation';
import {
  CallLogEntry,
  ChatteraSeedContact,
  INITIAL_CALL_LOGS,
  INITIAL_WALLET_TRANSACTIONS,
  SEED_CONTACTS,
  WalletTransaction,
} from './chatteraData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatteraAvatar } from './components/ChatteraAvatar';
import {
  ActiveCallSession,
  EncryptedCallModal,
  PostStatusModal,
  ProfileKeyVaultModal,
  StoryItem,
  StoryViewerModal,
} from './components/ChatteraModals';
import { ChatteraWalletView } from './components/ChatteraWalletView';
import {
  ActiveChatTarget,
  ChatteraChatThread,
} from './components/ChatteraChatThread';
import { SafetyNumberModal } from './components/SafetyNumberModal';
import { SecurityAuditView } from './components/SecurityAuditView';

type ChatteraNavTab = 'home' | 'chats' | 'status' | 'calls' | 'wallet' | 'bench';

function MainChatteraApp() {
  // 1. Theme State (persisted to localStorage under 'chatteraTheme')
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = window.localStorage.getItem('chatteraTheme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      window.localStorage.setItem('chatteraTheme', 'dark');
    } else {
      document.body.classList.remove('dark');
      window.localStorage.setItem('chatteraTheme', 'light');
    }
  }, [darkMode]);

  // 2. Navigation & Responsive Stage State
  const [navTab, setNavTab] = useState<ChatteraNavTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // 3. Modals State
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [postStatusOpen, setPostStatusOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [newChatPickerOpen, setNewChatPickerOpen] = useState(false);

  // 4. Local Interactive State (Contacts, Calls, Wallet, Local Encrypted Threads)
  const [contacts, setContacts] = useState<ChatteraSeedContact[]>(SEED_CONTACTS);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(INITIAL_CALL_LOGS);
  const [walletBalance, setWalletBalance] = useState<number>(285000);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(
    INITIAL_WALLET_TRANSACTIONS
  );
  const [myCustomStatus, setMyCustomStatus] = useState<string>(
    'Building end-to-end encrypted experiences on Chattera ✨🔒'
  );

  // Local WebCrypto keypair even before Google Sign-In so encryption works immediately
  const [guestKeyVault, setGuestKeyVault] =
    useState<StoredIdentityKeyVault | null>(null);
  const [guestSharedKey, setGuestSharedKey] = useState<CryptoKey | null>(null);
  const [localThreadMessages, setLocalThreadMessages] = useState<
    Record<string, DecryptedMessageView[]>
  >({});

  // 5. Firebase Auth & Firestore Real-Time State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [keyVault, setKeyVault] = useState<StoredIdentityKeyVault | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfileDoc | null>(null);
  const [myPrivateDoc, setMyPrivateDoc] = useState<UserPrivateDoc | null>(null);
  const [bootstrappingProfile, setBootstrappingProfile] = useState(false);

  const [directoryProfiles, setDirectoryProfiles] = useState<UserProfileDoc[]>([]);
  const [convMapA, setConvMapA] = useState<Record<string, ConversationDoc>>({});
  const [convMapB, setConvMapB] = useState<Record<string, ConversationDoc>>({});

  const [selectedTarget, setSelectedTarget] = useState<ActiveChatTarget>(() => {
    const first = SEED_CONTACTS[0];
    return {
      id: first.id,
      name: first.name,
      handle: first.handle,
      avatarUrl: first.avatarUrl,
      online: first.online,
      keyFingerprint: first.keyFingerprint,
      isFirestoreBacked: false,
    };
  });

  const [rawMsgMapSent, setRawMsgMapSent] = useState<
    Record<string, EncryptedMessageDoc>
  >({});
  const [rawMsgMapReceived, setRawMsgMapReceived] = useState<
    Record<string, EncryptedMessageDoc>
  >({});
  const [peerProfile, setPeerProfile] = useState<UserProfileDoc | null>(null);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [firestoreDecryptedMessages, setFirestoreDecryptedMessages] = useState<
    DecryptedMessageView[]
  >([]);

  // Initialize local WebCrypto keypair + seed encrypted messages for the 5 contacts
  useEffect(() => {
    let active = true;
    const initLocalCrypto = async () => {
      const vault = await loadOrCreateIdentityKeyVault('local_rapheal_vault');
      if (!active) return;
      setGuestKeyVault(vault);
      const aesKey = await deriveSharedAesGcmKey(
        vault,
        vault.publicKeyX,
        vault.publicKeyY
      );
      if (!active) return;
      setGuestSharedKey(aesKey);

      const seededMap: Record<string, DecryptedMessageView[]> = {};
      for (const c of SEED_CONTACTS) {
        const enc = await encryptMessagePlaintext(aesKey, c.initialMessage);
        seededMap[c.id] = [
          {
            id: `seed_msg_${c.id}`,
            conversationId: c.id,
            senderId: c.id,
            recipientId: 'local_rapheal_vault',
            senderKeyFingerprint: c.keyFingerprint,
            ciphertext: enc.ciphertext,
            iv: enc.iv,
            algorithm: 'ECDH-P256-AES256GCM',
            deliveryStatus: 'verified',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            plaintext: c.initialMessage,
            decryptionOk: true,
          },
        ];
      }
      if (active) {
        setLocalThreadMessages(seededMap);
      }
    };
    void initLocalCrypto();
    return () => {
      active = false;
    };
  }, []);

  // Track Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthReady(true);
      if (!u) {
        setKeyVault(null);
        setMyProfile(null);
        setMyPrivateDoc(null);
        setConvMapA({});
        setConvMapB({});
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap Firestore Identity when authenticated
  useEffect(() => {
    if (!authReady || !currentUser) return;
    let cancelled = false;

    const bootstrap = async () => {
      setBootstrappingProfile(true);
      try {
        const localVault = await loadOrCreateIdentityKeyVault(currentUser.uid);
        if (cancelled) return;
        setKeyVault(localVault);

        const userDocRef = doc(db, 'users', currentUser.uid);
        const profileDocRef = doc(db, 'profiles', currentUser.uid);

        let existingProfileSnap;
        let existingUserSnap;
        try {
          [existingProfileSnap, existingUserSnap] = await Promise.all([
            getDoc(profileDocRef),
            getDoc(userDocRef),
          ]);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `profiles/${currentUser.uid}`);
        }

        if (!existingProfileSnap.exists() || !existingUserSnap.exists()) {
          const email = currentUser.email || `${currentUser.uid}@verified.user`;
          const handle = sanitizeHandle(
            currentUser.displayName || email.split('@')[0] || 'rapheal',
            currentUser.uid
          );
          const displayName = sanitizeDisplayName(
            currentUser.displayName || 'Rapheal',
            handle
          );
          const statusText = sanitizeStatusText(myCustomStatus);

          const batch = writeBatch(db);
          batch.set(userDocRef, {
            uid: currentUser.uid,
            email,
            keyFingerprint: localVault.keyFingerprint,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.set(profileDocRef, {
            uid: currentUser.uid,
            displayName,
            handle,
            statusText,
            publicKeyX: localVault.publicKeyX,
            publicKeyY: localVault.publicKeyY,
            keyFingerprint: localVault.keyFingerprint,
            discoverable: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.CREATE,
              `profiles/${currentUser.uid}`
            );
          }
        } else {
          const profData = existingProfileSnap.data() as UserProfileDoc;
          if (
            profData.publicKeyX !== localVault.publicKeyX ||
            profData.publicKeyY !== localVault.publicKeyY ||
            profData.keyFingerprint !== localVault.keyFingerprint
          ) {
            try {
              await Promise.all([
                updateDoc(profileDocRef, {
                  publicKeyX: localVault.publicKeyX,
                  publicKeyY: localVault.publicKeyY,
                  keyFingerprint: localVault.keyFingerprint,
                  updatedAt: serverTimestamp(),
                }),
                updateDoc(userDocRef, {
                  keyFingerprint: localVault.keyFingerprint,
                  updatedAt: serverTimestamp(),
                }),
              ]);
            } catch (err) {
              handleFirestoreError(
                err,
                OperationType.UPDATE,
                `profiles/${currentUser.uid}`
              );
            }
          }
        }
      } finally {
        if (!cancelled) {
          setBootstrappingProfile(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [authReady, currentUser]);

  // Firestore Real-Time Listeners
  useEffect(() => {
    if (!authReady || !currentUser || bootstrappingProfile) return;

    const unsubMyProfile = onSnapshot(
      doc(db, 'profiles', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfileDoc;
          setMyProfile(data);
          setMyCustomStatus(data.statusText);
        }
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `profiles/${currentUser.uid}`)
    );

    const unsubMyPrivate = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setMyPrivateDoc(snap.data() as UserPrivateDoc);
        }
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`)
    );

    const unsubDir = onSnapshot(
      query(collection(db, 'profiles'), where('discoverable', '==', true)),
      (snap) => {
        const list: UserProfileDoc[] = [];
        snap.forEach((d) => list.push(d.data() as UserProfileDoc));
        setDirectoryProfiles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'profiles')
    );

    const unsubConvA = onSnapshot(
      query(
        collection(db, 'conversations'),
        where('participantA', '==', currentUser.uid)
      ),
      (snap) => {
        const next: Record<string, ConversationDoc> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as ConversationDoc;
        });
        setConvMapA(next);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    const unsubConvB = onSnapshot(
      query(
        collection(db, 'conversations'),
        where('participantB', '==', currentUser.uid)
      ),
      (snap) => {
        const next: Record<string, ConversationDoc> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as ConversationDoc;
        });
        setConvMapB(next);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    return () => {
      unsubMyProfile();
      unsubMyPrivate();
      unsubDir();
      unsubConvA();
      unsubConvB();
    };
  }, [authReady, currentUser, bootstrappingProfile]);

  const firestoreConversations = useMemo(() => {
    const merged = { ...convMapA, ...convMapB };
    return Object.values(merged).sort((a, b) => {
      const tA = a.updatedAt?.toMillis?.() ?? 0;
      const tB = b.updatedAt?.toMillis?.() ?? 0;
      return tB - tA;
    });
  }, [convMapA, convMapB]);

  // Observe Peer Profile & Derive Key for Firestore-Backed Conversations
  useEffect(() => {
    if (
      !currentUser ||
      !keyVault ||
      !selectedTarget.isFirestoreBacked ||
      !selectedTarget.conversationId
    ) {
      setPeerProfile(null);
      setSharedKey(null);
      return;
    }

    const conv = firestoreConversations.find(
      (c) => c.id === selectedTarget.conversationId
    );
    const peerUid = conv
      ? conv.participantA === currentUser.uid
        ? conv.participantB
        : conv.participantA
      : currentUser.uid;

    const unsubPeer = onSnapshot(
      doc(db, 'profiles', peerUid),
      (snap) => {
        if (snap.exists()) {
          const pData = snap.data() as UserProfileDoc;
          setPeerProfile(pData);
          void deriveSharedAesGcmKey(
            keyVault,
            pData.publicKeyX,
            pData.publicKeyY
          ).then(setSharedKey);
        }
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `profiles/${peerUid}`)
    );

    return () => unsubPeer();
  }, [currentUser, keyVault, selectedTarget, firestoreConversations]);

  // Listen to Firestore Messages for Active Firestore Conversation
  useEffect(() => {
    if (
      !currentUser ||
      !selectedTarget.isFirestoreBacked ||
      !selectedTarget.conversationId
    ) {
      setRawMsgMapSent({});
      setRawMsgMapReceived({});
      return;
    }

    const convId = selectedTarget.conversationId;
    const msgCol = collection(db, 'conversations', convId, 'messages');

    const unsubSent = onSnapshot(
      query(msgCol, where('senderId', '==', currentUser.uid)),
      (snap) => {
        const next: Record<string, EncryptedMessageDoc> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as EncryptedMessageDoc;
        });
        setRawMsgMapSent(next);
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `conversations/${convId}/messages`
        )
    );

    const unsubRec = onSnapshot(
      query(msgCol, where('recipientId', '==', currentUser.uid)),
      (snap) => {
        const next: Record<string, EncryptedMessageDoc> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as EncryptedMessageDoc;
        });
        setRawMsgMapReceived(next);
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `conversations/${convId}/messages`
        )
    );

    return () => {
      unsubSent();
      unsubRec();
    };
  }, [currentUser, selectedTarget]);

  // Decrypt Firestore Messages
  useEffect(() => {
    if (!selectedTarget.isFirestoreBacked) return;
    const merged = { ...rawMsgMapSent, ...rawMsgMapReceived };
    const sorted = Object.values(merged).sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() ?? 0;
      const tB = b.createdAt?.toMillis?.() ?? 0;
      return tA - tB;
    });

    if (!sharedKey) {
      setFirestoreDecryptedMessages(
        sorted.map((m) => ({
          ...m,
          plaintext: 'Deriving ECDH P-256 session key…',
          decryptionOk: false,
        }))
      );
      return;
    }

    let cancelled = false;
    void Promise.all(
      sorted.map(async (m) => {
        const dec = await decryptMessageCiphertext(sharedKey, m.ciphertext, m.iv);
        return { ...m, plaintext: dec.plaintext, decryptionOk: dec.ok };
      })
    ).then((res) => {
      if (!cancelled) setFirestoreDecryptedMessages(res);
    });

    return () => {
      cancelled = true;
    };
  }, [rawMsgMapSent, rawMsgMapReceived, sharedKey, selectedTarget.isFirestoreBacked]);

  // Greeting Name
  const displayFirstName = useMemo(() => {
    if (myProfile?.displayName) {
      return myProfile.displayName.split(' ')[0];
    }
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    return 'Rapheal';
  }, [myProfile, currentUser]);

  // Combined Stories List
  const stories = useMemo<StoryItem[]>(() => {
    const baseStories: StoryItem[] = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      avatarUrl: c.avatarUrl,
      text: c.statusStoryText,
      timeAgo: c.statusTimeAgo,
      bgGradient: c.statusBgGradient,
      keyFingerprint: c.keyFingerprint,
    }));

    const extraPeerStories: StoryItem[] = directoryProfiles
      .filter((p) => p.uid !== currentUser?.uid)
      .map((p) => ({
        id: `peer_${p.uid}`,
        name: p.displayName,
        handle: p.handle,
        text: p.statusText,
        timeAgo: 'Live Directory',
        bgGradient: 'linear-gradient(135deg, #5b4bdb 0%, #00b894 100%)',
        keyFingerprint: p.keyFingerprint,
      }));

    return [...baseStories, ...extraPeerStories];
  }, [contacts, directoryProfiles, currentUser]);

  // Select a seed contact or start a Firestore conversation
  const handleSelectSeedContact = (contact: ChatteraSeedContact) => {
    // Clear unread badge
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
    );
    setSelectedTarget({
      id: contact.id,
      name: contact.name,
      handle: contact.handle,
      avatarUrl: contact.avatarUrl,
      online: contact.online,
      keyFingerprint: contact.keyFingerprint,
      isFirestoreBacked: false,
    });
    setMobileChatOpen(true);
  };

  const handleStartFirestorePeerSession = useCallback(
    async (peer: UserProfileDoc) => {
      if (!currentUser || !myProfile) return;
      const convId = buildConversationId(myProfile.uid, peer.uid);
      const convRef = doc(db, 'conversations', convId);
      const snap = await getDoc(convRef).catch(() => null);

      if (!snap || !snap.exists()) {
        const sortedUids = [myProfile.uid, peer.uid].sort();
        const isFirstMe = sortedUids[0] === myProfile.uid;
        const pA = isFirstMe ? myProfile : peer;
        const pB = isFirstMe ? peer : myProfile;

        const batch = writeBatch(db);
        batch.set(convRef, {
          id: convId,
          participantA: pA.uid,
          participantB: pB.uid,
          participantAName: pA.displayName,
          participantBName: pB.displayName,
          participantAHandle: pA.handle,
          participantBHandle: pB.handle,
          status: 'active',
          lastCiphertextPreview: 'ECDH-P256 Handshake Initialized',
          messageCount: 0,
          lastSenderId: myProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `conversations/${convId}`
          );
        }
      }

      setSelectedTarget({
        id: peer.uid,
        name:
          peer.uid === myProfile.uid
            ? 'Personal E2EE Cloud Vault'
            : peer.displayName,
        handle: peer.handle,
        online: true,
        keyFingerprint: peer.keyFingerprint,
        isFirestoreBacked: true,
        conversationId: convId,
      });
      setNewChatPickerOpen(false);
      setMobileChatOpen(true);
    },
    [currentUser, myProfile]
  );

  // Send Encrypted Message (Works in both Local WebCrypto Mode and Cloud Firestore E2EE Mode)
  const handleSendMessage = async (plaintext: string) => {
    if (selectedTarget.isFirestoreBacked && selectedTarget.conversationId) {
      if (!currentUser || !myProfile || !sharedKey) return;
      const conv = firestoreConversations.find(
        (c) => c.id === selectedTarget.conversationId
      );
      if (!conv) return;

      const encrypted = await encryptMessagePlaintext(sharedKey, plaintext);
      const messageId = generateSafeDocId('pkt');
      const recipientId =
        conv.participantA === myProfile.uid
          ? conv.participantB
          : conv.participantA;

      const msgRef = doc(
        db,
        'conversations',
        conv.id,
        'messages',
        messageId
      );
      const convRef = doc(db, 'conversations', conv.id);

      const batch = writeBatch(db);
      batch.set(msgRef, {
        id: messageId,
        conversationId: conv.id,
        senderId: myProfile.uid,
        recipientId,
        senderKeyFingerprint: myProfile.keyFingerprint,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm,
        deliveryStatus: 'sent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(convRef, {
        status: 'active',
        lastCiphertextPreview: encrypted.ciphertextPreview,
        messageCount: conv.messageCount + 1,
        lastSenderId: myProfile.uid,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `conversations/${conv.id}/messages/${messageId}`
        );
      }
      return;
    }

    // Local WebCrypto Encrypted Session for Seed Contacts
    const activeAesKey = sharedKey || guestSharedKey;
    const activeVault = keyVault || guestKeyVault;
    if (!activeAesKey || !activeVault) return;

    const encrypted = await encryptMessagePlaintext(activeAesKey, plaintext);
    const mySenderUid = currentUser?.uid || 'local_rapheal_vault';
    const newMsg: DecryptedMessageView = {
      id: generateSafeDocId('pkt'),
      conversationId: selectedTarget.id,
      senderId: mySenderUid,
      recipientId: selectedTarget.id,
      senderKeyFingerprint: activeVault.keyFingerprint,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      algorithm: 'ECDH-P256-AES256GCM',
      deliveryStatus: 'verified',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      plaintext,
      decryptionOk: true,
    };

    setLocalThreadMessages((prev) => ({
      ...prev,
      [selectedTarget.id]: [...(prev[selectedTarget.id] || []), newMsg],
    }));

    const cleanPreview = plaintext.startsWith('[CHT-PAY:')
      ? '💸 Sent Encrypted ₦ Transfer'
      : plaintext.startsWith('[STEALTH:')
      ? '⏱️ Stealth Time-Capsule Message'
      : plaintext;

    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedTarget.id
          ? { ...c, initialMessage: cleanPreview, timeLabel: 'Just now' }
          : c
      )
    );
  };

  const handleRevokeMessage = async (messageId: string) => {
    if (selectedTarget.isFirestoreBacked && selectedTarget.conversationId) {
      const msgRef = doc(
        db,
        'conversations',
        selectedTarget.conversationId,
        'messages',
        messageId
      );
      try {
        await updateDoc(msgRef, {
          ciphertext: '[REVOKED_CIPHERTEXT]',
          deliveryStatus: 'revoked',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `conversations/${selectedTarget.conversationId}/messages/${messageId}`
        );
      }
      return;
    }

    setLocalThreadMessages((prev) => ({
      ...prev,
      [selectedTarget.id]: (prev[selectedTarget.id] || []).map((m) =>
        m.id === messageId
          ? {
              ...m,
              ciphertext: '[REVOKED_CIPHERTEXT]',
              deliveryStatus: 'revoked',
              plaintext: '[Packet Cryptographically Revoked by Sender]',
              decryptionOk: false,
            }
          : m
      ),
    }));
  };

  const handleAcknowledgeMessage = async (
    messageId: string,
    status: 'delivered' | 'verified'
  ) => {
    if (selectedTarget.isFirestoreBacked && selectedTarget.conversationId) {
      const msgRef = doc(
        db,
        'conversations',
        selectedTarget.conversationId,
        'messages',
        messageId
      );
      try {
        await updateDoc(msgRef, {
          deliveryStatus: status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `conversations/${selectedTarget.conversationId}/messages/${messageId}`
        );
      }
    }
  };

  // Send Encrypted Naira Transfer in Chat & Update Wallet Ledger
  const handleSendEncryptedCash = async (
    recipientName: string,
    recipientHandle: string,
    amount: number,
    note: string
  ) => {
    const refCode = `CHT-${Math.floor(10000 + Math.random() * 90000)}`;
    setWalletBalance((prev) => Math.max(0, prev - amount));
    setWalletTransactions((prev) => [
      {
        id: `tx_${Date.now()}`,
        title: `Transfer to ${recipientName}`,
        counterparty: `@${recipientHandle}`,
        amountNaira: amount,
        type: 'debit',
        timestamp: 'Just now',
        reference: refCode,
      },
      ...prev,
    ]);

    const matchingContact = contacts.find((c) => c.handle === recipientHandle);
    if (matchingContact) {
      handleSelectSeedContact(matchingContact);
    }
    await handleSendMessage(`[CHT-PAY:${amount}:${refCode}:${note}] ${note}`);
  };

  // Publish Status Story
  const handlePublishStatus = async (newStatusText: string) => {
    const clean = sanitizeStatusText(newStatusText);
    setMyCustomStatus(clean);
    if (currentUser && myProfile) {
      try {
        await updateDoc(doc(db, 'profiles', myProfile.uid), {
          statusText: clean,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `profiles/${myProfile.uid}`
        );
      }
    }
  };

  // Start Voice / Video Call (openCalls / Test Calls)
  const openCallsStudio = (
    name = selectedTarget.name,
    handle = selectedTarget.handle,
    avatarUrl = selectedTarget.avatarUrl,
    callType: 'audio' | 'video' = 'audio',
    keyFp = selectedTarget.keyFingerprint
  ) => {
    setActiveCall({
      contactName: name,
      contactHandle: handle,
      avatarUrl,
      callType,
      keyFingerprint: keyFp,
    });
  };

  const handleEndCall = (durationFormatted: string) => {
    if (activeCall) {
      setCallLogs((prev) => [
        {
          id: `call_${Date.now()}`,
          contactName: activeCall.contactName,
          contactHandle: activeCall.contactHandle,
          avatarUrl: activeCall.avatarUrl || 'https://i.pravatar.cc/100?img=47',
          type: activeCall.callType,
          direction: 'outgoing',
          timestamp: 'Just now',
          duration: durationFormatted,
          encrypted: true,
        },
        ...prev,
      ]);
    }
    setActiveCall(null);
  };

  // Auth & Profile Handlers
  const handleGoogleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setProfileModalOpen(false);
  };

  const handleUpdateProfileMetadata = async (updates: {
    displayName: string;
    handle: string;
    statusText: string;
    discoverable: boolean;
  }) => {
    setMyCustomStatus(updates.statusText);
    if (!myProfile) return;
    try {
      await updateDoc(doc(db, 'profiles', myProfile.uid), {
        displayName: updates.displayName,
        handle: updates.handle,
        statusText: updates.statusText,
        discoverable: updates.discoverable,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `profiles/${myProfile.uid}`
      );
    }
  };

  const handleRotateKeyPair = async () => {
    if (!myProfile) return;
    const newVault = await generateIdentityKeyVault(myProfile.uid);
    setKeyVault(newVault);
    try {
      await Promise.all([
        updateDoc(doc(db, 'profiles', myProfile.uid), {
          publicKeyX: newVault.publicKeyX,
          publicKeyY: newVault.publicKeyY,
          keyFingerprint: newVault.keyFingerprint,
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'users', myProfile.uid), {
          keyFingerprint: newVault.keyFingerprint,
          updatedAt: serverTimestamp(),
        }),
      ]);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `profiles/${myProfile.uid}`
      );
    }
  };

  const handleImportKeyVaultJson = async (jsonStr: string) => {
    if (!myProfile) return;
    const restored = await importIdentityKeyVault(myProfile.uid, jsonStr);
    setKeyVault(restored);
    try {
      await Promise.all([
        updateDoc(doc(db, 'profiles', myProfile.uid), {
          publicKeyX: restored.publicKeyX,
          publicKeyY: restored.publicKeyY,
          keyFingerprint: restored.keyFingerprint,
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'users', myProfile.uid), {
          keyFingerprint: restored.keyFingerprint,
          updatedAt: serverTimestamp(),
        }),
      ]);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `profiles/${myProfile.uid}`
      );
    }
  };

  // Filtered Contacts / Chats by Search Input
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.initialMessage.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const activeMessages = selectedTarget.isFirestoreBacked
    ? firestoreDecryptedMessages
    : localThreadMessages[selectedTarget.id] || [];

  const activeMyUid = currentUser?.uid || 'local_rapheal_vault';
  const activeVaultForBench = keyVault || guestKeyVault;

  return (
    <div className="min-h-screen pb-24 lg:pb-6 flex flex-col">
      {/* ===================================================================
          STICKY PROFESSIONAL HEADER (3-Zone Top Bar)
         =================================================================== */}
      <header
        className="sticky top-0 z-30 border-b px-4 sm:px-6 py-3.5 transition-colors"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setNavTab('home');
                setMobileChatOpen(false);
              }}
              className="w-10 h-10 rounded-2xl text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6c5ce7, #4936c8)',
                boxShadow: '0 7px 18px rgba(91,75,219,.25)',
              }}
            >
              C
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight leading-none">
                  Chattera
                </h1>
                <span
                  className="hidden sm:inline text-[11px] font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  · Connect. Share. Chat.
                </span>
              </div>
              <small
                className="block text-[11px] mt-0.5"
                style={{ color: 'var(--muted)' }}
              >
                End-to-End Encrypted · ECDH P-256 + AES-256-GCM
              </small>
            </div>
          </div>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'chats', label: 'Chats' },
                { id: 'status', label: 'Status' },
                { id: 'calls', label: 'Calls' },
                { id: 'wallet', label: '₦ Wallet' },
                { id: 'bench', label: 'E2EE Lab' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setNavTab(item.id);
                  setMobileChatOpen(false);
                }}
                className="py-1 transition-colors hover:underline underline-offset-4 whitespace-nowrap"
                style={{
                  color:
                    navTab === item.id ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Header Actions (Test Calls, Dark Mode, Notifications, Profile) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCallsStudio()}
              className="px-3 h-10 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
              style={{
                background: 'var(--soft-tint)',
                color: 'var(--primary)',
              }}
              title="Launch Encrypted Voice/Video Call Studio"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Test Calls</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
              style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
              aria-label="Toggle dark mode"
              title="Toggle Dark / Light Theme"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors relative"
                style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-[#21c47b] absolute top-2.5 right-2.5" />
              </button>

              {notificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-2xl border p-4 shadow-xl z-40 space-y-2.5 text-xs"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Security & Activity</span>
                    <ShieldCheck className="w-4 h-4 text-[#21c47b]" />
                  </div>
                  <p style={{ color: 'var(--muted)' }}>
                    • Local WebCrypto ECDH P-256 identity keypair active and verified.
                  </p>
                  <p style={{ color: 'var(--muted)' }}>
                    • {currentUser ? 'Cloud Firestore E2EE Sync Connected.' : 'Tap your profile icon to link Google Auth for cloud sync.'}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="rounded-full p-0.5 border-2 transition-transform active:scale-95"
              style={{ borderColor: 'var(--soft-tint)' }}
              title="Open Profile & E2EE Key Vault"
            >
              <ChatteraAvatar
                name={displayFirstName}
                src="https://i.pravatar.cc/100?img=11"
                size={36}
              />
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================
          MAIN WORKSPACE CONTAINER (Responsive Dual-Pane on Desktop)
         =================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-4 lg:px-6 pt-2 lg:pt-6">
        {navTab === 'bench' && activeVaultForBench ? (
          <div className="rounded-3xl border overflow-hidden" style={{ background: '#0b0f17', borderColor: 'var(--border)' }}>
            <SecurityAuditView keyVault={activeVaultForBench} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANE: Chattera Mobile-First Feed / Navigation Column */}
            <div
              className={`lg:col-span-5 space-y-5 ${
                mobileChatOpen ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* Welcome Banner */}
              <section className="px-4 sm:px-2 pt-3 flex items-center justify-between gap-3">
                <div>
                  <p
                    className="text-xs font-medium mb-0.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    Welcome back 👋
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Good afternoon, {displayFirstName}
                  </h2>
                </div>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignIn()}
                    className="px-3.5 py-2 rounded-2xl text-xs font-bold text-white shadow-sm whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #6756e7, #4434bd)',
                    }}
                  >
                    Cloud Sync
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (myProfile) void handleStartFirestorePeerSession(myProfile);
                    }}
                    className="px-3 py-2 rounded-2xl text-xs font-semibold border whitespace-nowrap inline-flex items-center gap-1.5"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <Lock className="w-3.5 h-3.5 text-[#5b4bdb]" />
                    <span>Self Vault</span>
                  </button>
                )}
              </section>

              {/* Search Box */}
              <div
                className="mx-4 sm:mx-2 h-12 rounded-2xl border px-4 flex items-center gap-2.5 shadow-2xs"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                }}
              >
                <Search
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats, people and groups..."
                  className="w-full text-sm bg-transparent focus:outline-none"
                  style={{ color: 'var(--text)' }}
                />
              </div>

              {/* 4 Quick Actions Grid (Matches Chattera Prototype) */}
              {navTab === 'home' && (
                <div className="grid grid-cols-4 gap-2.5 px-4 sm:px-2">
                  <button
                    type="button"
                    onClick={() => setNewChatPickerOpen(true)}
                    className="rounded-2xl border p-3 text-center transition-transform active:scale-95"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center"
                      style={{
                        background: 'var(--soft-tint)',
                        color: 'var(--primary)',
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="block text-[11px] font-semibold mt-2">
                      New Chat
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChatPickerOpen(true)}
                    className="rounded-2xl border p-3 text-center transition-transform active:scale-95"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center"
                      style={{
                        background: 'var(--soft-tint)',
                        color: 'var(--primary)',
                      }}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="block text-[11px] font-semibold mt-2">
                      Contacts
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNavTab('status')}
                    className="rounded-2xl border p-3 text-center transition-transform active:scale-95"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center"
                      style={{
                        background: 'var(--soft-tint)',
                        color: 'var(--primary)',
                      }}
                    >
                      <Radio className="w-4 h-4" />
                    </div>
                    <span className="block text-[11px] font-semibold mt-2">
                      Status
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNavTab('calls')}
                    className="rounded-2xl border p-3 text-center transition-transform active:scale-95"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center"
                      style={{
                        background: 'var(--soft-tint)',
                        color: 'var(--primary)',
                      }}
                    >
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="block text-[11px] font-semibold mt-2">
                      Calls
                    </span>
                  </button>
                </div>
              )}

              {/* STATUS / STORIES CAROUSEL (Shown on Home & Status tabs) */}
              {(navTab === 'home' || navTab === 'status') && (
                <section className="space-y-2.5">
                  <div className="px-4 sm:px-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Status</h3>
                    <button
                      type="button"
                      onClick={() => setPostStatusOpen(true)}
                      className="text-xs font-bold"
                      style={{ color: 'var(--primary)' }}
                    >
                      + Post Status
                    </button>
                  </div>

                  <div className="flex overflow-x-auto no-scrollbar gap-3.5 px-4 sm:px-2 pb-1">
                    {/* My Status */}
                    <button
                      type="button"
                      onClick={() => setPostStatusOpen(true)}
                      className="min-w-[66px] text-center shrink-0 group"
                    >
                      <div
                        className="w-[60px] h-[60px] rounded-full border-2 border-dashed flex items-center justify-center mx-auto text-xl font-bold transition-transform group-active:scale-95"
                        style={{
                          background: 'var(--card)',
                          borderColor: 'var(--primary)',
                          color: 'var(--primary)',
                        }}
                      >
                        ＋
                      </div>
                      <div
                        className="text-[11px] mt-1.5 truncate font-medium"
                        style={{ color: 'var(--muted)' }}
                      >
                        My Status
                      </div>
                    </button>

                    {/* Contact Stories */}
                    {stories.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setActiveStory(st)}
                        className="min-w-[66px] text-center shrink-0 group"
                      >
                        <ChatteraAvatar
                          name={st.name}
                          src={st.avatarUrl}
                          size={60}
                          storyRing
                          className="mx-auto transition-transform group-active:scale-95"
                        />
                        <div
                          className="text-[11px] mt-1.5 truncate font-medium"
                          style={{ color: 'var(--text)' }}
                        >
                          {st.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {navTab === 'status' && (
                    <div className="px-4 sm:px-2 pt-2 space-y-2.5">
                      <div
                        className="p-4 rounded-2xl border flex items-center justify-between gap-3"
                        style={{
                          background: 'var(--card)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold">
                            Your Active Status Note
                          </div>
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--muted)' }}
                          >
                            “{myCustomStatus}”
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPostStatusOpen(true)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0"
                          style={{ background: 'var(--primary)' }}
                        >
                          Update
                        </button>
                      </div>

                      {stories.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setActiveStory(st)}
                          className="w-full text-left p-3.5 rounded-2xl border flex items-center gap-3 transition-colors"
                          style={{
                            background: 'var(--card)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <ChatteraAvatar
                            name={st.name}
                            src={st.avatarUrl}
                            size={48}
                            storyRing
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">{st.name}</span>
                              <span
                                className="text-[11px]"
                                style={{ color: 'var(--muted)' }}
                              >
                                {st.timeAgo}
                              </span>
                            </div>
                            <p
                              className="text-xs truncate mt-0.5"
                              style={{ color: 'var(--muted)' }}
                            >
                              {st.text}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* RECENT CHATS SECTION (Shown on Home & Chats tabs) */}
              {(navTab === 'home' || navTab === 'chats') && (
                <section className="space-y-2">
                  <div className="px-4 sm:px-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Recent Chats</h3>
                    <button
                      type="button"
                      onClick={() => setNewChatPickerOpen(true)}
                      className="text-xs font-bold"
                      style={{ color: 'var(--primary)' }}
                    >
                      + New E2EE Session
                    </button>
                  </div>

                  <div className="px-2 sm:px-0 space-y-1">
                    {/* Active Firestore Cloud Sessions (if signed in) */}
                    {currentUser &&
                      firestoreConversations.map((conv) => {
                        const isSelf = conv.participantA === conv.participantB;
                        const title = isSelf
                          ? 'Personal E2EE Cloud Vault'
                          : conv.participantA === currentUser.uid
                          ? conv.participantBName
                          : conv.participantAName;
                        const handle =
                          conv.participantA === currentUser.uid
                            ? conv.participantBHandle
                            : conv.participantAHandle;
                        const isSelected =
                          selectedTarget.isFirestoreBacked &&
                          selectedTarget.conversationId === conv.id;

                        return (
                          <button
                            key={conv.id}
                            type="button"
                            onClick={() => {
                              setSelectedTarget({
                                id: conv.id,
                                name: title,
                                handle,
                                online: true,
                                keyFingerprint:
                                  myProfile?.keyFingerprint ||
                                  'A4F9:19C0:8B2E:771D',
                                isFirestoreBacked: true,
                                conversationId: conv.id,
                              });
                              setMobileChatOpen(true);
                            }}
                            className="w-full text-left flex items-center p-3 rounded-2xl transition-colors border"
                            style={{
                              background: isSelected
                                ? 'var(--card)'
                                : 'transparent',
                              borderColor: isSelected
                                ? 'var(--primary)'
                                : 'transparent',
                            }}
                          >
                            <ChatteraAvatar
                              name={title}
                              size={52}
                              online
                              className="mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold truncate flex items-center gap-1.5">
                                  <span>{title}</span>
                                  <Sparkles className="w-3.5 h-3.5 text-[#5b4bdb]" />
                                </span>
                                <span
                                  className="text-[10px] font-mono"
                                  style={{ color: 'var(--muted)' }}
                                >
                                  Cloud E2EE
                                </span>
                              </div>
                              <div
                                className="text-xs font-mono truncate mt-1"
                                style={{ color: 'var(--muted)' }}
                              >
                                {conv.lastCiphertextPreview}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                    {/* Chattera Contacts List */}
                    {filteredContacts.map((chat) => {
                      const isSelected =
                        !selectedTarget.isFirestoreBacked &&
                        selectedTarget.id === chat.id;
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => handleSelectSeedContact(chat)}
                          className="w-full text-left flex items-center p-3 rounded-2xl transition-all border hover:shadow-2xs"
                          style={{
                            background: isSelected
                              ? 'var(--card)'
                              : 'transparent',
                            borderColor: isSelected
                              ? 'var(--border)'
                              : 'transparent',
                          }}
                        >
                          <ChatteraAvatar
                            name={chat.name}
                            src={chat.avatarUrl}
                            size={54}
                            online={chat.online}
                            className="mr-3"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold truncate">
                                {chat.name}
                              </span>
                              <span
                                className="text-[11px] tabular-nums shrink-0"
                                style={{ color: 'var(--muted)' }}
                              >
                                {chat.timeLabel}
                              </span>
                            </div>

                            <div
                              className="text-xs truncate mt-1"
                              style={{ color: 'var(--muted)' }}
                            >
                              {chat.initialMessage}
                            </div>
                          </div>

                          {chat.unreadCount > 0 && (
                            <span
                              className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center tabular-nums"
                              style={{ background: 'var(--primary)' }}
                            >
                              {chat.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* CALLS TAB VIEW */}
              {navTab === 'calls' && (
                <section className="px-4 sm:px-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      Encrypted Voice & Video Calls
                    </h3>
                    <button
                      type="button"
                      onClick={() => openCallsStudio()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'var(--primary)' }}
                    >
                      + Test Call Studio
                    </button>
                  </div>

                  <div className="space-y-2">
                    {callLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                        style={{
                          background: 'var(--card)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ChatteraAvatar
                            name={log.contactName}
                            src={log.avatarUrl}
                            size={46}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold truncate">
                              {log.contactName}
                            </div>
                            <div
                              className="text-xs flex items-center gap-1.5 mt-0.5"
                              style={{ color: 'var(--muted)' }}
                            >
                              {log.direction === 'incoming' && (
                                <PhoneIncoming className="w-3.5 h-3.5 text-[#21c47b]" />
                              )}
                              {log.direction === 'outgoing' && (
                                <PhoneOutgoing className="w-3.5 h-3.5 text-[#5b4bdb]" />
                              )}
                              {log.direction === 'missed' && (
                                <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <span>
                                {log.timestamp} · {log.duration}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openCallsStudio(
                                log.contactName,
                                log.contactHandle,
                                log.avatarUrl,
                                'audio'
                              )
                            }
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'var(--soft-tint)',
                              color: 'var(--primary)',
                            }}
                            title="Audio Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openCallsStudio(
                                log.contactName,
                                log.contactHandle,
                                log.avatarUrl,
                                'video'
                              )
                            }
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'var(--soft-tint)',
                              color: 'var(--primary)',
                            }}
                            title="Video Call"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* WALLET TAB VIEW */}
              {navTab === 'wallet' && (
                <ChatteraWalletView
                  balanceNaira={walletBalance}
                  transactions={walletTransactions}
                  contacts={contacts}
                  onTopUpWallet={(amt) => {
                    setWalletBalance((b) => b + amt);
                    setWalletTransactions((prev) => [
                      {
                        id: `tx_${Date.now()}`,
                        title: 'Instant Wallet Top-Up',
                        counterparty: 'Chattera Reserve',
                        amountNaira: amt,
                        type: 'credit',
                        timestamp: 'Just now',
                        reference: `CHT-TOP-${Math.floor(1000 + Math.random() * 9000)}`,
                      },
                      ...prev,
                    ]);
                  }}
                  onSendEncryptedCash={handleSendEncryptedCash}
                />
              )}
            </div>

            {/* RIGHT PANE: Active End-to-End Encrypted Chat & Stealth Capsule Stage */}
            <div
              className={`lg:col-span-7 lg:sticky lg:top-20 h-[calc(100vh-120px)] ${
                mobileChatOpen ? 'block px-2' : 'hidden lg:block'
              }`}
            >
              <ChatteraChatThread
                target={selectedTarget}
                myUid={activeMyUid}
                messages={activeMessages}
                onBackMobile={() => setMobileChatOpen(false)}
                onSendMessage={handleSendMessage}
                onRevokeMessage={handleRevokeMessage}
                onAcknowledgeMessage={handleAcknowledgeMessage}
                onStartCall={(type) =>
                  openCallsStudio(
                    selectedTarget.name,
                    selectedTarget.handle,
                    selectedTarget.avatarUrl,
                    type,
                    selectedTarget.keyFingerprint
                  )
                }
                onOpenSafetyNumber={() => setSafetyModalOpen(true)}
                onQuickSendCashInChat={(amount, note) =>
                  handleSendEncryptedCash(
                    selectedTarget.name,
                    selectedTarget.handle,
                    amount,
                    note
                  )
                }
              />
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================
          FLOATING NEW CHAT BUTTON (.fab)
         =================================================================== */}
      {!mobileChatOpen && (
        <button
          type="button"
          onClick={() => setNewChatPickerOpen(true)}
          className="fixed right-5 bottom-22 z-30 w-14 h-14 rounded-2xl text-white text-2xl font-bold flex items-center justify-center shadow-xl transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #6756e7, #4434bd)',
            boxShadow: '0 10px 25px rgba(69,53,189,.35)',
          }}
          title="Start New Encrypted Chat"
        >
          ＋
        </button>
      )}

      {/* ===================================================================
          BOTTOM NAVIGATION BAR (.bottom-nav for Mobile / Tablet)
         =================================================================== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 h-18 border-t backdrop-blur-md z-30 flex items-center justify-around px-2"
        style={{
          background: darkMode
            ? 'rgba(25, 25, 37, 0.96)'
            : 'rgba(255, 255, 255, 0.96)',
          borderColor: 'var(--border)',
        }}
      >
        {(
          [
            { id: 'home', label: 'Home', icon: Home },
            { id: 'chats', label: 'Chats', icon: MessageCircle },
            { id: 'status', label: 'Status', icon: Radio },
            { id: 'calls', label: 'Calls', icon: Phone },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = navTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setNavTab(item.id);
                setMobileChatOpen(false);
              }}
              className="flex flex-col items-center justify-center min-w-[58px] py-1 transition-colors"
              style={{ color: active ? 'var(--primary)' : 'var(--muted)' }}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ===================================================================
          MODALS (Story Viewer, Post Status, Call Studio, Profile, New Chat, Safety Number)
         =================================================================== */}
      {activeStory && (
        <StoryViewerModal
          story={activeStory}
          onClose={() => setActiveStory(null)}
          onReplyToStory={async (st, replyText) => {
            const found = contacts.find((c) => c.id === st.id);
            if (found) {
              handleSelectSeedContact(found);
            }
            await handleSendMessage(`Replying to status "${st.text}": ${replyText}`);
          }}
        />
      )}

      {postStatusOpen && (
        <PostStatusModal
          currentStatus={myCustomStatus}
          onClose={() => setPostStatusOpen(false)}
          onPublishStatus={handlePublishStatus}
        />
      )}

      {activeCall && (
        <EncryptedCallModal
          session={activeCall}
          onEndCall={handleEndCall}
        />
      )}

      {profileModalOpen && (
        <ProfileKeyVaultModal
          myProfile={myProfile}
          myPrivateDoc={myPrivateDoc}
          keyVault={keyVault || guestKeyVault}
          isAuthenticated={Boolean(currentUser)}
          onClose={() => setProfileModalOpen(false)}
          onSignInWithGoogle={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onUpdateProfileMetadata={handleUpdateProfileMetadata}
          onRotateKeyPair={handleRotateKeyPair}
          onImportKeyVaultJson={handleImportKeyVaultJson}
        />
      )}

      {safetyModalOpen && (
        <SafetyNumberModal
          myProfile={
            myProfile || {
              uid: 'local_rapheal_vault',
              displayName: displayFirstName,
              handle: 'rapheal_ogar',
              statusText: myCustomStatus,
              publicKeyX:
                guestKeyVault?.publicKeyX ||
                'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
              publicKeyY:
                guestKeyVault?.publicKeyY ||
                '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM',
              keyFingerprint:
                guestKeyVault?.keyFingerprint ||
                'A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8',
              discoverable: true,
              createdAt: null,
              updatedAt: null,
            }
          }
          peerProfile={
            peerProfile || {
              uid: selectedTarget.id,
              displayName: selectedTarget.name,
              handle: selectedTarget.handle,
              statusText: 'Verified Chattera Contact',
              publicKeyX: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
              publicKeyY: '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM',
              keyFingerprint: selectedTarget.keyFingerprint,
              discoverable: true,
              createdAt: null,
              updatedAt: null,
            }
          }
          onClose={() => setSafetyModalOpen(false)}
        />
      )}

      {/* New Chat / Contacts & Public Key Directory Picker Modal */}
      {newChatPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 space-y-4 border shadow-2xl max-h-[85vh] flex flex-col"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#5b4bdb]" />
                  Start Encrypted Session
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Select a verified contact or cloud directory peer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewChatPickerOpen(false)}
                className="px-3 py-1 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--icon-bg)' }}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {currentUser && myProfile && (
                <button
                  type="button"
                  onClick={() => void handleStartFirestorePeerSession(myProfile)}
                  className="w-full text-left p-3 rounded-2xl border flex items-center justify-between"
                  style={{
                    background: 'var(--soft-tint)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div>
                    <div className="text-xs font-bold text-[#5b4bdb]">
                      Personal E2EE Cloud Vault (Loopback)
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      Test Firestore E2EE rules & packet sync
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-[#5b4bdb]" />
                </button>
              )}

              {directoryProfiles
                .filter((p) => p.uid !== currentUser?.uid)
                .map((peer) => (
                  <button
                    key={peer.uid}
                    type="button"
                    onClick={() => void handleStartFirestorePeerSession(peer)}
                    className="w-full text-left p-3 rounded-2xl border flex items-center gap-3"
                    style={{
                      background: 'var(--bg)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <ChatteraAvatar name={peer.displayName} size={42} online />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">
                        {peer.displayName} (Cloud Peer)
                      </div>
                      <div
                        className="text-[11px] font-mono truncate"
                        style={{ color: 'var(--muted)' }}
                      >
                        @{peer.handle} · {peer.keyFingerprint.slice(0, 14)}…
                      </div>
                    </div>
                  </button>
                ))}

              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    handleSelectSeedContact(c);
                    setNewChatPickerOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-2xl border flex items-center gap-3"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <ChatteraAvatar
                    name={c.name}
                    src={c.avatarUrl}
                    size={42}
                    online={c.online}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{c.name}</div>
                    <div
                      className="text-[11px] font-mono truncate"
                      style={{ color: 'var(--muted)' }}
                    >
                      @{c.handle} · {c.keyFingerprint.slice(0, 14)}…
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainChatteraApp />
    </ErrorBoundary>
  );
}
