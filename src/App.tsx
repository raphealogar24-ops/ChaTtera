import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  LogIn,
  LogOut,
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
import { ChatteraLogo } from './components/ChatteraLogo';
import {
  ChatteraAuthView,
  LocalSessionUser,
} from './components/ChatteraAuthView';
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

interface WsRealtimeMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  recipientId: string;
  senderKeyFingerprint: string;
  ciphertext: string;
  iv: string;
  algorithm: 'ECDH-P256-AES256GCM';
  deliveryStatus: 'sent' | 'delivered' | 'verified' | 'revoked';
  plaintext: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface WsPresenceUser {
  uid: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  online: boolean;
}

function MainChatteraApp() {
  // 1. Theme State
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

  // 2. User-Friendly Login / Logout Session State
  const [localUser, setLocalUser] = useState<LocalSessionUser | null>(() => {
    const saved = window.localStorage.getItem('chatteraSessionUser');
    if (saved) {
      try {
        return JSON.parse(saved) as LocalSessionUser;
      } catch {
        // Ignore parse error
      }
    }
    return {
      uid: 'user_rapheal',
      displayName: 'Rapheal Ogar',
      handle: 'rapheal_ogar',
      email: 'rapheal@chattera.app',
      avatarUrl: 'https://i.pravatar.cc/100?img=11',
    };
  });
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    return window.sessionStorage.getItem('chatteraActiveSession') !== 'true';
  });
  const [authInitialStage, setAuthInitialStage] = useState<
    'intro' | 'login' | 'signup'
  >('intro');
  const [authError, setAuthError] = useState<string | null>(null);

  // 3. Navigation & Responsive Stage State
  const [navTab, setNavTab] = useState<ChatteraNavTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // 4. Modals State
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [postStatusOpen, setPostStatusOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [newChatPickerOpen, setNewChatPickerOpen] = useState(false);

  // 5. Contacts, Calls, Wallet, & Real-Time State
  const [contacts, setContacts] = useState<ChatteraSeedContact[]>(SEED_CONTACTS);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(INITIAL_CALL_LOGS);
  const [walletBalance, setWalletBalance] = useState<number>(285000);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(
    INITIAL_WALLET_TRANSACTIONS
  );
  const [myCustomStatus, setMyCustomStatus] = useState<string>(
    'Available on Chattera — send a message or voice note!'
  );

  // Local WebCrypto keypair
  const [guestKeyVault, setGuestKeyVault] =
    useState<StoredIdentityKeyVault | null>(null);
  const [guestSharedKey, setGuestSharedKey] = useState<CryptoKey | null>(null);
  const [localThreadMessages, setLocalThreadMessages] = useState<
    Record<string, DecryptedMessageView[]>
  >({});

  // Real-Time WebSocket State
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [onlinePeers, setOnlinePeers] = useState<WsPresenceUser[]>([]);
  const [peerActivities, setPeerActivities] = useState<
    Record<string, 'typing' | 'recording' | 'idle'>
  >({});
  const [liveStatuses, setLiveStatuses] = useState<StoryItem[]>([]);

  // 6. Firebase Auth & Firestore Real-Time State
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

  const activeMyUid =
    currentUser?.uid || localUser?.uid || 'user_rapheal';
  const activeDisplayName = useMemo(() => {
    if (myProfile?.displayName) return myProfile.displayName;
    if (currentUser?.displayName) return currentUser.displayName;
    if (localUser?.displayName) return localUser.displayName;
    return 'Rapheal';
  }, [myProfile, currentUser, localUser]);

  const activeHandle = useMemo(() => {
    if (myProfile?.handle) return myProfile.handle;
    if (localUser?.handle) return localUser.handle;
    return 'rapheal_ogar';
  }, [myProfile, localUser]);

  const activeAvatarUrl = useMemo(() => {
    if (currentUser?.photoURL) return currentUser.photoURL;
    if (localUser?.avatarUrl) return localUser.avatarUrl;
    return 'https://i.pravatar.cc/100?img=11';
  }, [currentUser, localUser]);

  const displayFirstName = useMemo(() => {
    return activeDisplayName.split(' ')[0] || 'Rapheal';
  }, [activeDisplayName]);

  // Initialize local WebCrypto keypair + seed messages (including a playable Voice Note!)
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
        const list: DecryptedMessageView[] = [
          {
            id: `seed_msg_${c.id}`,
            conversationId: c.id,
            senderId: c.id,
            recipientId: 'user_rapheal',
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

        // Add a sample playable Voice Message in Amara's thread
        if (c.id === 'contact_amara') {
          const voicePayload =
            '[VOICE:seed_amara_voice:5:35,68,85,52,90,74,60,88,94,70,48,78,82,64,50,86,72,58,42,66,75,54,40,32] Voice message (0:05)';
          const encVoice = await encryptMessagePlaintext(aesKey, voicePayload);
          list.push({
            id: 'seed_voice_amara',
            conversationId: c.id,
            senderId: c.id,
            recipientId: 'user_rapheal',
            senderKeyFingerprint: c.keyFingerprint,
            ciphertext: encVoice.ciphertext,
            iv: encVoice.iv,
            algorithm: 'ECDH-P256-AES256GCM',
            deliveryStatus: 'verified',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            plaintext: voicePayload,
            decryptionOk: true,
          });
        }

        seededMap[c.id] = list;
      }

      if (active) {
        setLocalThreadMessages((prev) => {
          const merged: Record<string, DecryptedMessageView[]> = { ...seededMap };
          for (const [k, existingList] of Object.entries(prev)) {
            const base = merged[k] || [];
            const combined = [...base];
            for (const item of existingList) {
              if (!combined.some((m) => m.id === item.id)) {
                combined.push(item);
              }
            }
            merged[k] = combined;
          }
          return merged;
        });
      }
    };
    void initLocalCrypto();
    return () => {
      active = false;
    };
  }, []);

  // Connect to Real-Time WebSocket Server (/ws) with Auto-Reconnect
  useEffect(() => {
    if (isLoggedOut) return;
    let unmounted = false;
    let reconnectTimer: number | null = null;

    const connectWs = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (unmounted) return;
        setWsConnected(true);
        socket.send(
          JSON.stringify({
            type: 'user:join',
            uid: activeMyUid,
            name: activeDisplayName,
            handle: activeHandle,
            avatarUrl: activeAvatarUrl,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || typeof payload.type !== 'string') return;

          if (payload.type === 'init:state') {
            const rooms = payload.rooms as Record<string, WsRealtimeMessage[]>;
            if (rooms) {
              setLocalThreadMessages((prev) => {
                const next = { ...prev };
                for (const [roomId, msgs] of Object.entries(rooms)) {
                  const existing = next[roomId] || [];
                  const merged = [...existing];
                  for (const m of msgs) {
                    if (!merged.some((x) => x.id === m.id)) {
                      merged.push({
                        ...m,
                        createdAt: Timestamp.fromMillis(m.createdAtMs || Date.now()),
                        updatedAt: Timestamp.fromMillis(m.updatedAtMs || Date.now()),
                        decryptionOk: true,
                      });
                    }
                  }
                  next[roomId] = merged;
                }
                return next;
              });
            }
            if (Array.isArray(payload.statuses)) {
              setLiveStatuses(payload.statuses);
            }
          } else if (payload.type === 'presence:list') {
            if (Array.isArray(payload.users)) {
              setOnlinePeers(payload.users);
            }
          } else if (payload.type === 'typing:update') {
            const { conversationId, uid, mode } = payload;
            if (uid !== activeMyUid && conversationId) {
              setPeerActivities((prev) => ({
                ...prev,
                [conversationId]: mode || 'idle',
              }));
            }
          } else if (payload.type === 'message:created') {
            const m: WsRealtimeMessage = payload.message;
            if (!m || !m.id || !m.conversationId) return;

            const viewMsg: DecryptedMessageView = {
              id: m.id,
              conversationId: m.conversationId,
              senderId: m.senderId,
              recipientId: m.recipientId,
              senderKeyFingerprint: m.senderKeyFingerprint,
              ciphertext: m.ciphertext,
              iv: m.iv,
              algorithm: m.algorithm,
              deliveryStatus: m.deliveryStatus,
              createdAt: Timestamp.fromMillis(m.createdAtMs || Date.now()),
              updatedAt: Timestamp.fromMillis(m.updatedAtMs || Date.now()),
              plaintext: m.plaintext,
              decryptionOk: true,
            };

            setLocalThreadMessages((prev) => {
              const existing = prev[m.conversationId] || [];
              if (existing.some((x) => x.id === m.id)) return prev;
              return {
                ...prev,
                [m.conversationId]: [...existing, viewMsg],
              };
            });

            const cleanPreview = m.plaintext.startsWith('[VOICE:')
              ? '🎤 Voice message'
              : m.plaintext.startsWith('[CHT-PAY:')
              ? '💸 Sent ₦ Transfer'
              : m.plaintext.startsWith('[STEALTH:')
              ? '⏱️ Disappearing message'
              : m.plaintext;

            setContacts((prev) =>
              prev.map((c) =>
                c.id === m.conversationId
                  ? {
                      ...c,
                      initialMessage: cleanPreview,
                      timeLabel: 'Just now',
                      unreadCount:
                        selectedTarget.id === m.conversationId
                          ? 0
                          : m.senderId !== activeMyUid
                          ? c.unreadCount + 1
                          : c.unreadCount,
                    }
                  : c
              )
            );
          } else if (payload.type === 'message:revoked') {
            const { conversationId, messageId } = payload;
            setLocalThreadMessages((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || []).map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      ciphertext: '[REVOKED_CIPHERTEXT]',
                      deliveryStatus: 'revoked',
                      plaintext: 'This message was unsent',
                      decryptionOk: false,
                    }
                  : m
              ),
            }));
          } else if (payload.type === 'message:ack') {
            const { conversationId, messageId, status } = payload;
            setLocalThreadMessages((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || []).map((m) =>
                m.id === messageId ? { ...m, deliveryStatus: status } : m
              ),
            }));
          } else if (payload.type === 'status:published') {
            const st = payload.status as StoryItem;
            if (st && st.id) {
              setLiveStatuses((prev) =>
                prev.some((s) => s.id === st.id) ? prev : [st, ...prev]
              );
            }
          }
        } catch {
          // Ignore malformed WS events
        }
      };

      socket.onclose = () => {
        if (unmounted) return;
        setWsConnected(false);
        reconnectTimer = window.setTimeout(connectWs, 2000);
      };
    };

    connectWs();

    return () => {
      unmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [
    isLoggedOut,
    activeMyUid,
    activeDisplayName,
    activeHandle,
    activeAvatarUrl,
    selectedTarget.id,
  ]);

  // Track Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthReady(true);
      if (u) {
        setIsLoggedOut(false);
        window.localStorage.removeItem('chatteraLoggedOut');
      } else {
        setKeyVault(null);
        setMyProfile(null);
        setMyPrivateDoc(null);
        setConvMapA({});
        setConvMapB({});
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap Firestore Identity when authenticated with Firebase
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

        if (!existingProfileSnap?.exists() || !existingUserSnap?.exists()) {
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
          plaintext: 'Syncing session key…',
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
        timeAgo: 'Live',
        bgGradient: 'linear-gradient(135deg, #5b4bdb 0%, #00b894 100%)',
        keyFingerprint: p.keyFingerprint,
      }));

    return [...liveStatuses, ...baseStories, ...extraPeerStories];
  }, [liveStatuses, contacts, directoryProfiles, currentUser]);

  // Select a seed contact or start a Firestore conversation
  const handleSelectSeedContact = (contact: ChatteraSeedContact) => {
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
    setNavTab('chats');
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
          lastCiphertextPreview: 'Conversation started',
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
            ? 'Personal Cloud Notes'
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

  // Broadcast live typing / recording indicator over WebSocket
  const handleTypingActivity = useCallback(
    (mode: 'typing' | 'recording' | 'idle') => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'typing:update',
            conversationId: selectedTarget.conversationId || selectedTarget.id,
            uid: activeMyUid,
            name: activeDisplayName,
            mode,
          })
        );
      }
    },
    [selectedTarget, activeMyUid, activeDisplayName]
  );

  // Send Message (Real-Time over WebSocket + Cloud Firestore)
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

    // Real-Time WebSocket + Local WebCrypto Session
    const activeAesKey = sharedKey || guestSharedKey;
    const activeVault = keyVault || guestKeyVault;
    if (!activeAesKey || !activeVault) return;

    const encrypted = await encryptMessagePlaintext(activeAesKey, plaintext);
    const msgId = generateSafeDocId('pkt');
    const nowMs = Date.now();

    const newMsg: DecryptedMessageView = {
      id: msgId,
      conversationId: selectedTarget.id,
      senderId: activeMyUid,
      recipientId: selectedTarget.id,
      senderKeyFingerprint: activeVault.keyFingerprint,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      algorithm: 'ECDH-P256-AES256GCM',
      deliveryStatus: 'verified',
      createdAt: Timestamp.fromMillis(nowMs),
      updatedAt: Timestamp.fromMillis(nowMs),
      plaintext,
      decryptionOk: true,
    };

    // Optimistic local state update
    setLocalThreadMessages((prev) => {
      const existing = prev[selectedTarget.id] || [];
      if (existing.some((m) => m.id === msgId)) return prev;
      return {
        ...prev,
        [selectedTarget.id]: [...existing, newMsg],
      };
    });

    // Broadcast to all connected clients in real time via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const wsPayload: WsRealtimeMessage = {
        id: msgId,
        conversationId: selectedTarget.id,
        senderId: activeMyUid,
        senderName: activeDisplayName,
        senderHandle: activeHandle,
        recipientId: selectedTarget.id,
        senderKeyFingerprint: activeVault.keyFingerprint,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        algorithm: 'ECDH-P256-AES256GCM',
        deliveryStatus: 'verified',
        plaintext,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      };
      wsRef.current.send(
        JSON.stringify({
          type: 'message:create',
          message: wsPayload,
        })
      );
    }

    const cleanPreview = plaintext.startsWith('[VOICE:')
      ? '🎤 Voice message'
      : plaintext.startsWith('[IMG:')
      ? '📷 Shared a photo'
      : plaintext.startsWith('[CHT-PAY:')
      ? '💸 Sent ₦ Transfer'
      : plaintext.startsWith('[STEALTH:')
      ? '⏱️ Disappearing message'
      : plaintext;

    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedTarget.id
          ? { ...c, initialMessage: cleanPreview, timeLabel: 'Just now' }
          : c
      )
    );

    // If chatting with a seeded contact who isn't currently logged in on another tab,
    // trigger a realistic real-time typing/recording indicator & reply
    const targetId = selectedTarget.id;
    const targetName = selectedTarget.name;
    const targetFp = selectedTarget.keyFingerprint;
    const isPeerLiveHuman = onlinePeers.some((p) => p.uid === targetId);

    if (!isPeerLiveHuman && targetId.startsWith('contact_')) {
      const isIncomingVoice = plaintext.startsWith('[VOICE:');
      window.setTimeout(() => {
        setPeerActivities((prev) => ({
          ...prev,
          [targetId]: isIncomingVoice ? 'recording' : 'typing',
        }));
      }, 450);

      window.setTimeout(async () => {
        setPeerActivities((prev) => ({
          ...prev,
          [targetId]: 'idle',
        }));

        let replyText = '';
        if (isIncomingVoice) {
          const replyVoiceId = `vn_reply_${Date.now()}`;
          replyText = `[VOICE:${replyVoiceId}:4:42,74,88,60,92,78,54,84,90,68,46,72,80,62,48,82,70,56,44,64,76,52,38,34] Voice message (0:04)`;
        } else if (plaintext.startsWith('[CHT-PAY:')) {
          replyText = `Thank you so much! I just received the transfer alert 🎉🙏`;
        } else if (plaintext.startsWith('[IMG:')) {
          replyText = `This photo looks awesome! Thanks for sharing 🔥✨`;
        } else {
          const contextualReplies: Record<string, string[]> = {
            contact_amara: [
              'Love how smooth the new Chattera chatting page feels! 🚀✨',
              'Got your message loud and clear! Should we hop on a quick voice call?',
              'That sounds great! Send me a voice note when you have a moment 🎤',
            ],
            contact_daniel: [
              'Awesome! Everything is syncing in real time on my end 👍',
              'Just checked it out — super clean and fast!',
              'Let’s catch up later today, I’ll send over the details.',
            ],
            contact_tunde: [
              'Confirmed! Ready whenever you are 💯',
              'Sounds like a solid plan, let’s do it!',
            ],
            contact_zainab: [
              'Yay! Thanks for the update 😊✨',
              'Let me know when you’re free for a quick call!',
            ],
            contact_chinedu: [
              '100% agreed! Real-time delivery is super snappy ⚡',
              'Got it! I’ll review and reply shortly.',
            ],
          };
          const pool = contextualReplies[targetId] || [
            `Got your message! Great chatting with you on Chattera ✨`,
          ];
          replyText = pool[Math.floor(Math.random() * pool.length)];
        }

        const encReply = await encryptMessagePlaintext(activeAesKey, replyText);
        const replyId = generateSafeDocId('pkt');
        const replyTs = Date.now();

        const replyMsg: DecryptedMessageView = {
          id: replyId,
          conversationId: targetId,
          senderId: targetId,
          recipientId: activeMyUid,
          senderKeyFingerprint: targetFp,
          ciphertext: encReply.ciphertext,
          iv: encReply.iv,
          algorithm: 'ECDH-P256-AES256GCM',
          deliveryStatus: 'verified',
          createdAt: Timestamp.fromMillis(replyTs),
          updatedAt: Timestamp.fromMillis(replyTs),
          plaintext: replyText,
          decryptionOk: true,
        };

        setLocalThreadMessages((prev) => {
          const list = prev[targetId] || [];
          if (list.some((m) => m.id === replyId)) return prev;
          return { ...prev, [targetId]: [...list, replyMsg] };
        });

        const preview = replyText.startsWith('[VOICE:')
          ? '🎤 Voice message'
          : replyText;
        setContacts((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? { ...c, initialMessage: preview, timeLabel: 'Just now' }
              : c
          )
        );
      }, 1900);
    }
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
              plaintext: 'This message was unsent',
              decryptionOk: false,
            }
          : m
      ),
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:revoke',
          conversationId: selectedTarget.id,
          messageId,
        })
      );
    }
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
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:ack',
          conversationId: selectedTarget.id,
          messageId,
          status,
        })
      );
    }
  };

  // Send Naira Transfer in Chat & Update Wallet Ledger
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

  // Publish Status Story (Real-time via WebSocket & Firestore)
  const handlePublishStatus = async (newStatusText: string) => {
    const clean = sanitizeStatusText(newStatusText);
    setMyCustomStatus(clean);

    const statusObj: StoryItem = {
      id: `st_${Date.now()}`,
      name: activeDisplayName,
      handle: activeHandle,
      avatarUrl: activeAvatarUrl,
      text: clean,
      timeAgo: 'Just now',
      bgGradient: 'linear-gradient(135deg, #6c5ce7 0%, #00b894 100%)',
      keyFingerprint:
        (keyVault || guestKeyVault)?.keyFingerprint ||
        'A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8',
    };

    setLiveStatuses((prev) => [statusObj, ...prev]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'status:publish',
          status: { ...statusObj, uid: activeMyUid, createdAtMs: Date.now() },
        })
      );
    }

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

  // Start Voice / Video Call
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
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsLoggedOut(false);
      setNavTab('home');
      setMobileChatOpen(false);
      window.sessionStorage.setItem('chatteraActiveSession', 'true');
      window.localStorage.removeItem('chatteraLoggedOut');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in popup was closed or blocked. You can also log in directly below.';
      setAuthError(msg);
    }
  };

  const handleQuickSignIn = (user: LocalSessionUser) => {
    setAuthError(null);
    setLocalUser(user);
    if (user.statusText) {
      setMyCustomStatus(user.statusText);
    }
    setIsLoggedOut(false);
    setNavTab('home');
    setMobileChatOpen(false);
    window.sessionStorage.setItem('chatteraActiveSession', 'true');
    window.localStorage.setItem('chatteraSessionUser', JSON.stringify(user));
    window.localStorage.removeItem('chatteraLoggedOut');
  };

  const handleSignOut = async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'user:leave' }));
      wsRef.current.close();
    }
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors
    }
    setProfileModalOpen(false);
    setNotificationsOpen(false);
    setAuthInitialStage('login');
    setIsLoggedOut(true);
    window.sessionStorage.removeItem('chatteraActiveSession');
    window.localStorage.setItem('chatteraLoggedOut', 'true');
  };

  const handleUpdateProfileMetadata = async (updates: {
    displayName: string;
    handle: string;
    statusText: string;
    discoverable: boolean;
  }) => {
    setMyCustomStatus(updates.statusText);
    if (localUser) {
      const nextLocal: LocalSessionUser = {
        ...localUser,
        displayName: updates.displayName,
        handle: updates.handle,
      };
      setLocalUser(nextLocal);
      window.localStorage.setItem('chatteraSessionUser', JSON.stringify(nextLocal));
    }
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

  // If the user logged out or is on the entry flow, show the Intro Logo, Login Page & Sign Up Page
  if (isLoggedOut) {
    return (
      <ChatteraAuthView
        onGoogleSignIn={handleGoogleSignIn}
        onQuickSignIn={handleQuickSignIn}
        authError={authError}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        initialStage={authInitialStage}
      />
    );
  }

  const activeMessages = selectedTarget.isFirestoreBacked
    ? firestoreDecryptedMessages
    : localThreadMessages[selectedTarget.id] || [];

  const activeVaultForBench = keyVault || guestKeyVault;
  const activeConvKey = selectedTarget.conversationId || selectedTarget.id;
  const currentPeerActivity = peerActivities[activeConvKey] || 'idle';

  return (
    <div className="min-h-screen pb-24 lg:pb-6 flex flex-col">
      {/* ===================================================================
          STICKY PROFESSIONAL HEADER (Clean 3-Zone Top Bar with Custom Logo)
         =================================================================== */}
      <header
        className="sticky top-0 z-30 border-b px-4 sm:px-6 py-3 transition-colors"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Custom Chattera Brand Logo & Wordmark (No E2EE subtext underneath) */}
          <button
            type="button"
            onClick={() => {
              setNavTab('home');
              setMobileChatOpen(false);
            }}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <ChatteraLogo
              size={40}
              className="transition-transform group-active:scale-95"
            />
            <span className="text-xl font-bold tracking-tight leading-none">
              Chattera
            </span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'chats', label: 'Chats' },
                { id: 'status', label: 'Status' },
                { id: 'calls', label: 'Calls' },
                { id: 'wallet', label: '₦ Wallet' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setNavTab(item.id);
                  if (item.id === 'chats') {
                    setMobileChatOpen(true);
                  } else {
                    setMobileChatOpen(false);
                  }
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

          {/* Zone 3: User-Friendly Header Actions (Dark Mode, Notifications, Profile, Log Out) */}
          <div className="flex items-center gap-2">
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
                title="Activity & Real-Time Status"
              >
                <Bell className="w-4 h-4" />
                <span
                  className={`w-2 h-2 rounded-full absolute top-2.5 right-2.5 ${
                    wsConnected ? 'bg-[#21c47b]' : 'bg-amber-400'
                  }`}
                />
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
                    <span>Real-Time Activity</span>
                    <ShieldCheck className="w-4 h-4 text-[#21c47b]" />
                  </div>
                  <p style={{ color: 'var(--muted)' }}>
                    • Live Server Connection:{' '}
                    <strong className="text-[#21c47b]">
                      {wsConnected ? 'Connected (Real-Time)' : 'Reconnecting…'}
                    </strong>
                  </p>
                  <p style={{ color: 'var(--muted)' }}>
                    • Active Online Sessions: {Math.max(1, onlinePeers.length)}
                  </p>
                  <p style={{ color: 'var(--muted)' }}>
                    • Signed in as <strong>{activeDisplayName}</strong> (@
                    {activeHandle})
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="rounded-full p-0.5 border-2 transition-transform active:scale-95"
              style={{ borderColor: 'var(--soft-tint)' }}
              title="Account Settings & Profile"
            >
              <ChatteraAvatar
                name={displayFirstName}
                src={activeAvatarUrl}
                size={36}
                online
              />
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="h-10 px-3.5 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 whitespace-nowrap"
              style={{
                background: 'var(--icon-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              title="Log out or switch account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================
          MAIN WORKSPACE CONTAINER (Responsive Dual-Pane on Desktop)
         =================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-4 lg:px-6 pt-2 lg:pt-6">
        {navTab === 'bench' && activeVaultForBench ? (
          <div
            className="rounded-3xl border overflow-hidden"
            style={{ background: '#0b0f17', borderColor: 'var(--border)' }}
          >
            <SecurityAuditView keyVault={activeVaultForBench} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANE: Chattera Feed / Navigation Column */}
            <div
              className={`lg:col-span-5 space-y-5 ${
                mobileChatOpen ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* Welcome Banner */}
              <section className="px-4 sm:px-2 pt-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#21c47b]" />
                    <p
                      className="text-xs font-medium"
                      style={{ color: 'var(--muted)' }}
                    >
                      Online · @{activeHandle}
                    </p>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Hello, {displayFirstName} 👋
                  </h2>
                </div>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignIn()}
                    className="px-3.5 py-2 rounded-2xl text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap transition-transform active:scale-95"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                      color: 'var(--primary)',
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Link Google</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (myProfile)
                        void handleStartFirestorePeerSession(myProfile);
                    }}
                    className="px-3 py-2 rounded-2xl text-xs font-semibold border whitespace-nowrap inline-flex items-center gap-1.5"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#5b4bdb]" />
                    <span>Personal Notes</span>
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
                  placeholder="Search chats, friends, or messages..."
                  className="w-full text-sm bg-transparent focus:outline-none"
                  style={{ color: 'var(--text)' }}
                />
              </div>

              {/* 4 Quick Actions Grid */}
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
                    <span className="block text-[11px] font-semibold mt-2 whitespace-nowrap">
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
                    <span className="block text-[11px] font-semibold mt-2 whitespace-nowrap">
                      People
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
                    <span className="block text-[11px] font-semibold mt-2 whitespace-nowrap">
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
                    <span className="block text-[11px] font-semibold mt-2 whitespace-nowrap">
                      Calls
                    </span>
                  </button>
                </div>
              )}

              {/* STATUS / STORIES CAROUSEL */}
              {(navTab === 'home' || navTab === 'status') && (
                <section className="space-y-2.5">
                  <div className="px-4 sm:px-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Status Stories</h3>
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
                          {st.name.split(' ')[0]}
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
                            Your Current Status
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

              {/* RECENT CHATS SECTION */}
              {(navTab === 'home' || navTab === 'chats') && (
                <section className="space-y-2">
                  <div className="px-4 sm:px-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Messages</h3>
                    <button
                      type="button"
                      onClick={() => setNewChatPickerOpen(true)}
                      className="text-xs font-bold"
                      style={{ color: 'var(--primary)' }}
                    >
                      + New Chat
                    </button>
                  </div>

                  <div className="px-2 sm:px-0 space-y-1">
                    {/* Active Firestore Cloud Sessions (if signed in with Google) */}
                    {currentUser &&
                      firestoreConversations.map((conv) => {
                        const isSelf = conv.participantA === conv.participantB;
                        const title = isSelf
                          ? 'Personal Cloud Notes'
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
                                  className="text-[10px]"
                                  style={{ color: 'var(--muted)' }}
                                >
                                  Cloud Sync
                                </span>
                              </div>
                              <div
                                className="text-xs truncate mt-1"
                                style={{ color: 'var(--muted)' }}
                              >
                                @{handle}
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
                      const activity = peerActivities[chat.id];

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
                              style={{
                                color:
                                  activity && activity !== 'idle'
                                    ? 'var(--primary)'
                                    : 'var(--muted)',
                              }}
                            >
                              {activity === 'recording'
                                ? '🎤 recording voice message…'
                                : activity === 'typing'
                                ? 'typing…'
                                : chat.initialMessage}
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
                    <h3 className="text-sm font-bold">Voice & Video Calls</h3>
                    <button
                      type="button"
                      onClick={() => openCallsStudio()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'var(--primary)' }}
                    >
                      + Start Call
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

            {/* RIGHT PANE: Active Real-Time Chat & Voice Message Stage */}
            <div
              className={`lg:col-span-7 lg:sticky lg:top-20 h-[calc(100vh-120px)] ${
                mobileChatOpen || navTab === 'chats'
                  ? 'block px-2 sm:px-0'
                  : 'hidden lg:block'
              }`}
            >
              <ChatteraChatThread
                target={selectedTarget}
                myUid={activeMyUid}
                messages={activeMessages}
                contacts={contacts}
                peerActivity={currentPeerActivity}
                peerActivitiesMap={peerActivities}
                onSelectContact={handleSelectSeedContact}
                onOpenNewChatModal={() => setNewChatPickerOpen(true)}
                onBackMobile={() => {
                  setMobileChatOpen(false);
                  if (navTab === 'chats') {
                    setNavTab('home');
                  }
                }}
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
                onTypingActivity={handleTypingActivity}
                fullPageMode={navTab === 'chats'}
              />
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================
          FLOATING NEW CHAT BUTTON
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
          title="Start New Chat"
        >
          ＋
        </button>
      )}

      {/* ===================================================================
          BOTTOM NAVIGATION BAR (Mobile / Tablet)
         =================================================================== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t backdrop-blur-md z-30 flex items-center justify-around px-2"
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
                if (item.id === 'chats') {
                  setMobileChatOpen(true);
                } else {
                  setMobileChatOpen(false);
                }
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
          MODALS
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
            await handleSendMessage(
              `Replying to status "${st.text}": ${replyText}`
            );
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
          myProfile={
            myProfile || {
              uid: activeMyUid,
              displayName: activeDisplayName,
              handle: activeHandle,
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
          myPrivateDoc={
            myPrivateDoc || {
              uid: activeMyUid,
              email: localUser?.email || 'rapheal@chattera.app',
              keyFingerprint:
                guestKeyVault?.keyFingerprint ||
                'A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8',
              createdAt: null,
              updatedAt: null,
            }
          }
          keyVault={keyVault || guestKeyVault}
          isAuthenticated={Boolean(currentUser || localUser)}
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
              uid: activeMyUid,
              displayName: activeDisplayName,
              handle: activeHandle,
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
              statusText: 'Chattera Contact',
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

      {/* New Chat / Contacts Directory Picker Modal */}
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
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#5b4bdb]" />
                  Start a Conversation
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Choose a contact or online user to message in real time.
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
                      Personal Cloud Notes
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      Save notes and voice messages to your cloud account
                    </div>
                  </div>
                  <KeyRound className="w-4 h-4 text-[#5b4bdb]" />
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
                        {peer.displayName}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: 'var(--muted)' }}
                      >
                        @{peer.handle} · Online
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
                      className="text-[11px] truncate"
                      style={{ color: 'var(--muted)' }}
                    >
                      @{c.handle} · {c.online ? 'Active now' : 'Offline'}
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
