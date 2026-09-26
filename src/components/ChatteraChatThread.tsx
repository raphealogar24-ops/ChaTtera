import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Code2,
  Flame,
  KeyRound,
  Lock,
  Phone,
  Send,
  ShieldCheck,
  Timer,
  Trash2,
  Video,
  Wallet,
} from 'lucide-react';
import { ChatteraAvatar } from './ChatteraAvatar';
import { base64ToHex } from '../crypto/e2ee';
import { DecryptedMessageView } from '../types';
import { BLUEPRINT_LIMITS } from '../validation';

export interface ActiveChatTarget {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  online: boolean;
  keyFingerprint: string;
  isFirestoreBacked: boolean;
  conversationId?: string;
  status?: 'active' | 'archived' | 'locked';
}

interface ChatteraChatThreadProps {
  target: ActiveChatTarget;
  myUid: string;
  messages: DecryptedMessageView[];
  onBackMobile: () => void;
  onSendMessage: (plaintext: string) => Promise<void>;
  onRevokeMessage: (messageId: string) => Promise<void>;
  onAcknowledgeMessage: (
    messageId: string,
    status: 'delivered' | 'verified'
  ) => Promise<void>;
  onStartCall: (type: 'audio' | 'video') => void;
  onOpenSafetyNumber: () => void;
  onQuickSendCashInChat: (amount: number, note: string) => Promise<void>;
}

function parseSpecialPayload(plaintext: string): {
  kind: 'standard' | 'stealth' | 'payment';
  burnSeconds?: number;
  amountNaira?: number;
  paymentRef?: string;
  body: string;
} {
  if (plaintext.startsWith('[STEALTH:')) {
    const match = plaintext.match(/^\[STEALTH:(\d+)s\]([\s\S]*)$/);
    if (match) {
      return {
        kind: 'stealth',
        burnSeconds: Number(match[1]),
        body: match[2].trim(),
      };
    }
  }
  if (plaintext.startsWith('[CHT-PAY:')) {
    const match = plaintext.match(/^\[CHT-PAY:(\d+):([^:]+):([^\]]+)\]([\s\S]*)$/);
    if (match) {
      return {
        kind: 'payment',
        amountNaira: Number(match[1]),
        paymentRef: match[2],
        body: match[3].trim() || match[4].trim(),
      };
    }
  }
  return { kind: 'standard', body: plaintext };
}

export const ChatteraChatThread: React.FC<ChatteraChatThreadProps> = ({
  target,
  myUid,
  messages,
  onBackMobile,
  onSendMessage,
  onRevokeMessage,
  onAcknowledgeMessage,
  onStartCall,
  onOpenSafetyNumber,
  onQuickSendCashInChat,
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [stealthSeconds, setStealthSeconds] = useState<number | null>(null);
  const [xrayMode, setXrayMode] = useState(false);
  const [expandedFrames, setExpandedFrames] = useState<Record<string, boolean>>({});
  const [showCashBar, setShowCashBar] = useState(false);
  const [cashAmount, setCashAmount] = useState('5000');
  const [cashNote, setCashNote] = useState('Instant E2EE Transfer');

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, target.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const payload = stealthSeconds
        ? `[STEALTH:${stealthSeconds}s] ${trimmed}`
        : trimmed;
      await onSendMessage(payload);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(cashAmount);
    if (!amt || amt <= 0) return;
    setSending(true);
    try {
      await onQuickSendCashInChat(amt, cashNote.trim() || 'Transfer');
      setShowCashBar(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full min-h-[540px] rounded-3xl border overflow-hidden shadow-sm"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Conversation Header */}
      <div
        className="px-4 py-3.5 border-b flex items-center justify-between gap-2 sticky top-0 z-10"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackMobile}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--icon-bg)' }}
            aria-label="Back to chats"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <ChatteraAvatar
            name={target.name}
            src={target.avatarUrl}
            size={44}
            online={target.online}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold truncate">{target.name}</h3>
              <ShieldCheck className="w-3.5 h-3.5 text-[#21c47b] shrink-0" />
            </div>
            <div
              className="text-[11px] flex items-center gap-1.5 truncate"
              style={{ color: 'var(--muted)' }}
            >
              <span>@{target.handle}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">ECDH P-256 E2EE</span>
            </div>
          </div>
        </div>

        {/* Call & Cryptographic Inspector Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onStartCall('audio')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
            title="Start Encrypted Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartCall('video')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
            title="Start Encrypted Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSafetyNumber}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--icon-bg)', color: 'var(--primary)' }}
            title="Verify 60-Digit Safety Number"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setXrayMode(!xrayMode)}
            className="px-2.5 h-9 rounded-xl flex items-center gap-1 text-[11px] font-semibold transition-colors whitespace-nowrap"
            style={{
              background: xrayMode ? 'var(--primary)' : 'var(--icon-bg)',
              color: xrayMode ? '#ffffff' : 'var(--text)',
            }}
            title="Toggle Live AES-256-GCM Ciphertext Packet X-Ray"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">X-Ray</span>
          </button>
        </div>
      </div>

      {/* E2EE Verification Banner */}
      <div
        className="px-4 py-2 text-[11px] flex items-center justify-between border-b"
        style={{
          background: 'var(--soft-tint)',
          borderColor: 'var(--border)',
          color: 'var(--primary)',
        }}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Lock className="w-3 h-3 shrink-0" />
          <span className="truncate">
            Zero-Trust E2EE Session · Key {target.keyFingerprint.slice(0, 19)}…
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSafetyNumber}
          className="font-bold underline underline-offset-2 shrink-0 ml-2"
        >
          Verify Key
        </button>
      </div>

      {/* Message Stream */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3.5"
        style={{ background: 'var(--bg)' }}
      >
        {messages.map((msg) => {
          const isMine = msg.senderId === myUid;
          const isRevoked = msg.deliveryStatus === 'revoked';
          const parsed = parseSpecialPayload(msg.plaintext);
          const showPacket = xrayMode || Boolean(expandedFrames[msg.id]);

          const timeLabel =
            msg.createdAt && typeof msg.createdAt.toDate === 'function'
              ? msg.createdAt
                  .toDate()
                  .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div
                className="max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-2 shadow-xs border"
                style={{
                  background: isMine
                    ? 'linear-gradient(135deg, #5b4bdb, #4737c6)'
                    : 'var(--card)',
                  color: isMine ? '#ffffff' : 'var(--text)',
                  borderColor: isMine ? 'transparent' : 'var(--border)',
                }}
              >
                {/* Special Header for Stealth Time-Capsule Messages */}
                {parsed.kind === 'stealth' && !isRevoked && (
                  <div
                    className={`flex items-center justify-between gap-3 text-[11px] pb-1.5 border-b ${
                      isMine
                        ? 'border-white/20 text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 text-amber-500'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      Stealth Time-Capsule ({parsed.burnSeconds}s Burn Window)
                    </span>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => void onRevokeMessage(msg.id)}
                        className="underline font-bold"
                      >
                        Burn Now
                      </button>
                    )}
                  </div>
                )}

                {/* Special Rendering for In-Chat Naira Smart Escrow Transfers */}
                {parsed.kind === 'payment' && !isRevoked ? (
                  <div className="p-3 rounded-xl bg-black/20 border border-white/15 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] opacity-85">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Wallet className="w-3.5 h-3.5" />
                        Chattera E2EE Instant Transfer
                      </span>
                      <span className="font-mono">{parsed.paymentRef}</span>
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums">
                      ₦{(parsed.amountNaira || 0).toLocaleString()}.00
                    </div>
                    <div className="text-xs opacity-90">{parsed.body}</div>
                  </div>
                ) : (
                  <div
                    className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
                      isRevoked ? 'italic opacity-70 font-mono text-xs' : ''
                    }`}
                  >
                    {parsed.body}
                  </div>
                )}

                {/* Message Metadata Footer */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] pt-1 ${
                    isMine ? 'text-white/75' : ''
                  }`}
                  style={!isMine ? { color: 'var(--muted)' } : undefined}
                >
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <span>{timeLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.deliveryStatus}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFrames((prev) => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                      className="hover:underline font-medium"
                    >
                      {showPacket ? 'Hide Cipher' : 'Cipher'}
                    </button>

                    {!isMine &&
                      !isRevoked &&
                      msg.deliveryStatus !== 'verified' && (
                        <button
                          type="button"
                          onClick={() =>
                            void onAcknowledgeMessage(msg.id, 'verified')
                          }
                          className="inline-flex items-center gap-0.5 font-semibold hover:underline"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Verify
                        </button>
                      )}

                    {isMine && !isRevoked && (
                      <button
                        type="button"
                        onClick={() => void onRevokeMessage(msg.id)}
                        className="inline-flex items-center gap-0.5 hover:underline"
                        title="Cryptographically zeroize packet"
                      >
                        <Trash2 className="w-3 h-3" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Packet X-Ray Drawer */}
                {showPacket && (
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/15 text-[10px] font-mono space-y-1 break-all">
                    <div className="flex items-center justify-between opacity-80">
                      <span>Suite: {msg.algorithm}</span>
                      <span>IV (96-bit): {base64ToHex(msg.iv)}</span>
                    </div>
                    <div className="opacity-90">
                      Ciphertext (B64): {msg.ciphertext}
                    </div>
                    <div className="opacity-75 truncate">
                      Key SHA-256: {msg.senderKeyFingerprint}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Optional Quick In-Chat Cash Transfer Bar */}
      {showCashBar && (
        <form
          onSubmit={(e) => void handleCashSubmit(e)}
          className="px-4 py-3 border-t flex flex-wrap items-center gap-2"
          style={{ background: 'var(--soft-tint)', borderColor: 'var(--border)' }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
            Send ₦ in Chat:
          </span>
          <input
            type="number"
            min={100}
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            className="w-24 h-8 px-2.5 rounded-xl border text-xs font-mono"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          />
          <input
            type="text"
            value={cashNote}
            onChange={(e) => setCashNote(e.target.value)}
            placeholder="Note..."
            className="flex-1 min-w-[120px] h-8 px-2.5 rounded-xl border text-xs"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          />
          <button
            type="submit"
            disabled={sending}
            className="h-8 px-3 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--primary)' }}
          >
            Send ₦
          </button>
          <button
            type="button"
            onClick={() => setShowCashBar(false)}
            className="text-xs px-2"
            style={{ color: 'var(--muted)' }}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Composer Bar with Stealth Capsule Mode & Wallet Trigger */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="p-3 border-t space-y-2"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setStealthSeconds((prev) =>
                  prev === null ? 30 : prev === 30 ? 60 : null
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors"
              style={{
                background: stealthSeconds ? '#f59e0b22' : 'var(--icon-bg)',
                color: stealthSeconds ? '#d97706' : 'var(--muted)',
              }}
              title="Toggle Stealth Time-Capsule Self-Destruct Mode"
            >
              <Timer className="w-3.5 h-3.5" />
              {stealthSeconds
                ? `Stealth Capsule: ${stealthSeconds}s Burn`
                : 'Stealth Mode: Off'}
            </button>

            <button
              type="button"
              onClick={() => setShowCashBar(!showCashBar)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors"
              style={{
                background: showCashBar ? 'var(--soft-tint)' : 'var(--icon-bg)',
                color: showCashBar ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>₦ Transfer</span>
            </button>
          </div>

          <span
            className="text-[10px] font-mono tabular-nums"
            style={{ color: 'var(--muted)' }}
          >
            {draft.length}/{BLUEPRINT_LIMITS.PLAINTEXT_MAX_CHARS} · AES-256-GCM
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            maxLength={BLUEPRINT_LIMITS.PLAINTEXT_MAX_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              stealthSeconds
                ? `Write ${stealthSeconds}s Stealth Time-Capsule message…`
                : `Encrypt message to ${target.name}…`
            }
            className="flex-1 h-11 px-4 rounded-2xl border text-sm focus:outline-none"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />

          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="h-11 px-5 rounded-2xl text-white font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-40 shadow-md active:scale-95 transition-transform whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #6756e7, #4434bd)',
            }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
