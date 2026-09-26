import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  Code2,
  KeyRound,
  Lock,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { base64ToHex } from '../crypto/e2ee';
import {
  ConversationDoc,
  ConversationStatus,
  DecryptedMessageView,
  UserProfileDoc,
} from '../types';
import { BLUEPRINT_LIMITS } from '../validation';

interface ChatWorkspaceViewProps {
  myProfile: UserProfileDoc;
  conversations: ConversationDoc[];
  activeConversationId: string | null;
  onSelectConversation: (convId: string) => void;
  messages: DecryptedMessageView[];
  peerProfile: UserProfileDoc | null;
  sharedKeyReady: boolean;
  onSendMessage: (plaintext: string) => Promise<void>;
  onRevokeMessage: (messageId: string) => Promise<void>;
  onAcknowledgeMessage: (
    messageId: string,
    status: 'delivered' | 'verified'
  ) => Promise<void>;
  onUpdateConversationStatus: (
    conversationId: string,
    newStatus: ConversationStatus
  ) => Promise<void>;
  onOpenSafetyModal: () => void;
  onNavigateToDirectory: () => void;
  onStartSelfVault: () => Promise<void>;
}

function formatTimeShort(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Syncing…';
  const date = ts.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const ChatWorkspaceView: React.FC<ChatWorkspaceViewProps> = ({
  myProfile,
  conversations,
  activeConversationId,
  onSelectConversation,
  messages,
  peerProfile,
  sharedKeyReady,
  onSendMessage,
  onRevokeMessage,
  onAcknowledgeMessage,
  onUpdateConversationStatus,
  onOpenSafetyModal,
  onNavigateToDirectory,
  onStartSelfVault,
}) => {
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ConversationStatus>('all');
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showGlobalCiphertext, setShowGlobalCiphertext] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Record<string, boolean>>({});
  const [confirmLockConvId, setConfirmLockConvId] = useState<string | null>(null);
  const [startingVault, setStartingVault] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversationId]);

  const filteredConversations = conversations.filter((conv) => {
    if (statusFilter !== 'all' && conv.status !== statusFilter) {
      return false;
    }
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return true;
    const isSelf = conv.participantA === conv.participantB;
    const peerName = isSelf
      ? 'Personal E2EE Vault'
      : conv.participantA === myProfile.uid
      ? conv.participantBName
      : conv.participantAName;
    const peerHandle =
      conv.participantA === myProfile.uid
        ? conv.participantBHandle
        : conv.participantAHandle;
    return (
      peerName.toLowerCase().includes(q) ||
      peerHandle.toLowerCase().includes(q) ||
      conv.lastCiphertextPreview.toLowerCase().includes(q)
    );
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || !activeConversation || activeConversation.status === 'locked') {
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await onSendMessage(trimmed);
      setDraftText('');
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : 'Failed to encrypt and transmit message.'
      );
    } finally {
      setSending(false);
    }
  };

  const toggleInspectMessage = (msgId: string) => {
    setExpandedMessageIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSelfVaultClick = async () => {
    setStartingVault(true);
    setSendError(null);
    try {
      await onStartSelfVault();
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : 'Could not open Personal E2EE Vault.'
      );
    } finally {
      setStartingVault(false);
    }
  };

  const getConversationDisplay = (conv: ConversationDoc) => {
    const isSelf = conv.participantA === conv.participantB;
    if (isSelf) {
      return {
        title: 'Personal E2EE Vault',
        handle: myProfile.handle,
        isSelf: true,
      };
    }
    const isA = conv.participantA === myProfile.uid;
    return {
      title: isA ? conv.participantBName : conv.participantAName,
      handle: isA ? conv.participantBHandle : conv.participantAHandle,
      isSelf: false,
    };
  };

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-[#0b0f17]">
      {/* Left Workspace Sidebar */}
      <aside className="w-80 shrink-0 border-r border-slate-800 bg-[#111827] flex flex-col">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Encrypted Channels ({conversations.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={startingVault}
                onClick={() => void handleSelfVaultClick()}
                className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
                title="Open Personal Loopback E2EE Vault"
              >
                {startingVault ? 'Opening…' : 'Self Vault'}
              </button>
              <button
                type="button"
                onClick={onNavigateToDirectory}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>
          </div>

          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Filter sessions or @handles…"
            className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />

          {/* Interactive Segmented Filter Controls */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#0b0f17] border border-slate-800 rounded-lg">
            {(['all', 'active', 'archived', 'locked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`py-1 text-[11px] font-medium rounded capitalize transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                No encrypted sessions match the current filter.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={startingVault}
                  onClick={() => void handleSelfVaultClick()}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  {startingVault
                    ? 'Initializing Vault…'
                    : 'Start Personal E2EE Vault'}
                </button>
                <button
                  type="button"
                  onClick={onNavigateToDirectory}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Browse Public Key Directory
                </button>
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const display = getConversationDisplay(conv);
              const isSelected = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left p-3.5 transition-colors block ${
                    isSelected
                      ? 'bg-slate-800/70 border-l-2 border-l-emerald-400'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {display.title}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                      {formatTimeShort(conv.updatedAt)}
                    </span>
                  </div>

                  {/* Unboxed quiet metadata with middot separators */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    <span className="font-mono truncate">@{display.handle}</span>
                    <span aria-hidden="true">·</span>
                    <span>{conv.messageCount} pkts</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        conv.status === 'locked'
                          ? 'text-red-400'
                          : conv.status === 'archived'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {conv.status}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 truncate mt-1.5">
                    {conv.lastCiphertextPreview}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Conversation Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0b0f17]">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-slate-100">
                  End-to-End Encrypted Workspace Ready
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every message is encrypted in your browser using ECDH P-256 key agreement and
                  AES-256-GCM with a random 96-bit initialization vector before reaching
                  Firestore.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={startingVault}
                  onClick={() => void handleSelfVaultClick()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {startingVault
                    ? 'Initializing Vault…'
                    : 'Open Personal E2EE Vault'}
                </button>
                <button
                  type="button"
                  onClick={onNavigateToDirectory}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Select Peer in Key Directory
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            {(() => {
              const info = getConversationDisplay(activeConversation);
              const isLocked = activeConversation.status === 'locked';
              return (
                <div className="px-6 py-3.5 bg-[#111827] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-100 truncate">
                        {info.title}
                      </h2>
                      <span className="text-xs font-mono text-slate-400">
                        @{info.handle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 tabular-nums">
                      <span className="text-emerald-400 font-medium">
                        {sharedKeyReady
                          ? 'ECDH-P256-AES256GCM Derived'
                          : 'Deriving Shared Key…'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Peer Key:{' '}
                        <code className="font-mono text-slate-300">
                          {(peerProfile?.keyFingerprint || myProfile.keyFingerprint).slice(
                            0,
                            19
                          )}
                          …
                        </code>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Status: {activeConversation.status}</span>
                    </div>
                  </div>

                  {/* Conversation Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowGlobalCiphertext(!showGlobalCiphertext)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        showGlobalCiphertext
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                          : 'bg-[#0b0f17] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      {showGlobalCiphertext
                        ? 'Packet Frames: Visible'
                        : 'Inspect Packets'}
                    </button>

                    <button
                      type="button"
                      onClick={onOpenSafetyModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0b0f17] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      Safety Number
                    </button>

                    {!isLocked && (
                      <>
                        {activeConversation.status === 'archived' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void onUpdateConversationStatus(
                                activeConversation.id,
                                'active'
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0b0f17] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            Unarchive
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void onUpdateConversationStatus(
                                activeConversation.id,
                                'archived'
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0b0f17] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive
                          </button>
                        )}

                        {confirmLockConvId === activeConversation.id ? (
                          <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-800 px-2.5 py-1 rounded-lg">
                            <span className="text-[11px] text-red-200">
                              Lock permanently?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                void onUpdateConversationStatus(
                                  activeConversation.id,
                                  'locked'
                                );
                                setConfirmLockConvId(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-red-500 text-slate-950 rounded whitespace-nowrap"
                            >
                              Confirm Lock
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmLockConvId(null)}
                              className="px-1.5 py-0.5 text-[11px] text-slate-300 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmLockConvId(activeConversation.id)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 bg-[#0b0f17] border border-slate-800 hover:border-red-800 rounded-lg transition-colors whitespace-nowrap"
                            title="Terminal state: permanently locks this conversation against future mutations"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Lock Session
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="max-w-lg mx-auto my-12 p-6 bg-[#111827] border border-slate-800 rounded-xl text-center space-y-2">
                  <p className="text-sm font-medium text-slate-200">
                    Zero Encrypted Packets in This Session
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Send your first message below. It will be encrypted client-side with
                    AES-256-GCM before being committed atomically to Firestore.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === myProfile.uid;
                  const isRevoked = msg.deliveryStatus === 'revoked';
                  const showFrame =
                    showGlobalCiphertext || Boolean(expandedMessageIds[msg.id]);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isMine ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-2xl w-full sm:w-auto min-w-[280px] rounded-xl border p-4 space-y-2.5 ${
                          isMine
                            ? 'bg-[#111827] border-emerald-900/70'
                            : 'bg-[#111827] border-slate-800'
                        }`}
                      >
                        {/* Top Unboxed Metadata Row */}
                        <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200">
                              {isMine ? 'You' : peerProfile?.displayName || 'Peer'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">
                              {formatTimeShort(msg.createdAt)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                isRevoked
                                  ? 'text-red-400'
                                  : msg.deliveryStatus === 'verified'
                                  ? 'text-emerald-400'
                                  : 'text-slate-400'
                              }
                            >
                              {msg.deliveryStatus}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleInspectMessage(msg.id)}
                              className="text-slate-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
                            >
                              {showFrame ? 'Hide Frame' : 'Frame'}
                            </button>

                            {!isMine &&
                              !isRevoked &&
                              msg.deliveryStatus !== 'verified' &&
                              activeConversation.status !== 'locked' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onAcknowledgeMessage(msg.id, 'verified')
                                  }
                                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap"
                                  title="Verify cryptographic receipt (Tier 2 Recipient Action)"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  Verify Receipt
                                </button>
                              )}

                            {isMine &&
                              !isRevoked &&
                              activeConversation.status !== 'locked' && (
                                <button
                                  type="button"
                                  onClick={() => void onRevokeMessage(msg.id)}
                                  className="inline-flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors whitespace-nowrap"
                                  title="Cryptographically zero out ciphertext in Firestore (Tier 1 Sender Action)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Revoke
                                </button>
                              )}
                          </div>
                        </div>

                        {/* Decrypted Plaintext Content */}
                        <div
                          className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
                            isRevoked
                              ? 'text-slate-500 italic font-mono text-xs'
                              : msg.decryptionOk
                              ? 'text-slate-100'
                              : 'text-amber-300 font-mono text-xs'
                          }`}
                        >
                          {msg.plaintext}
                        </div>

                        {/* Raw Ciphertext Packet Inspector */}
                        {showFrame && (
                          <div className="pt-2 border-t border-slate-800/90 space-y-1.5 text-[11px] font-mono">
                            <div className="text-slate-400 flex items-center justify-between">
                              <span>Firestore Document ID: {msg.id}</span>
                              <span className="text-emerald-400">{msg.algorithm}</span>
                            </div>
                            <div className="p-2 bg-[#0b0f17] border border-slate-800 rounded text-slate-300 break-all">
                              <span className="text-slate-500">ciphertext (B64): </span>
                              {msg.ciphertext}
                            </div>
                            <div className="p-2 bg-[#0b0f17] border border-slate-800 rounded text-slate-300 break-all">
                              <span className="text-slate-500">iv (96-bit Hex): </span>
                              {base64ToHex(msg.iv)}{' '}
                              <span className="text-slate-500">({msg.iv})</span>
                            </div>
                            <div className="text-slate-500 truncate">
                              Sender Key SHA-256: {msg.senderKeyFingerprint}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Footer */}
            <div className="p-4 bg-[#111827] border-t border-slate-800">
              {sendError && (
                <div className="mb-3 p-2.5 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {activeConversation.status === 'locked' ? (
                <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>
                    This session is permanently locked (Terminal State Enforced by Firestore
                    Rules). No further packets can be transmitted.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => void handleSend(e)}
                  className="flex items-end gap-3"
                >
                  <div className="flex-1 space-y-1.5">
                    <textarea
                      rows={2}
                      maxLength={BLUEPRINT_LIMITS.PLAINTEXT_MAX_CHARS}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend(e);
                        }
                      }}
                      placeholder="Write a message to encrypt client-side with AES-256-GCM… (Enter to transmit)"
                      className="w-full px-3.5 py-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums px-1">
                      <span>
                        Client-Side WebCrypto · ECDH P-256 + AES-256-GCM (96-Bit Random IV)
                      </span>
                      <span className="font-mono">
                        {draftText.length} / {BLUEPRINT_LIMITS.PLAINTEXT_MAX_CHARS} chars
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !draftText.trim() || !sharedKeyReady}
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Encrypting…' : 'Encrypt & Send'}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
