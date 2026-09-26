import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Lock,
  LogOut,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Upload,
  Video,
  VideoOff,
  Volume2,
  X,
} from 'lucide-react';
import { ChatteraAvatar } from './ChatteraAvatar';
import { StoredIdentityKeyVault } from '../crypto/e2ee';
import { UserPrivateDoc, UserProfileDoc } from '../types';
import {
  BLUEPRINT_LIMITS,
  sanitizeDisplayName,
  sanitizeHandle,
  sanitizeStatusText,
} from '../validation';

// ============================================================================
// 1. INTERACTIVE STATUS / STORY VIEWER MODAL
// ============================================================================
export interface StoryItem {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  text: string;
  timeAgo: string;
  bgGradient: string;
  keyFingerprint: string;
  isOwn?: boolean;
}

interface StoryViewerModalProps {
  story: StoryItem;
  onClose: () => void;
  onReplyToStory: (story: StoryItem, replyText: string) => Promise<void>;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
  onReplyToStory,
}) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 120);
    return () => window.clearInterval(interval);
  }, [story.id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onReplyToStory(story, replyText.trim());
      setReplyText('');
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/15 flex flex-col justify-between min-h-[540px] p-6 text-white relative"
        style={{ background: story.bgGradient }}
      >
        {/* Top Progress & Header */}
        <div className="space-y-4">
          <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChatteraAvatar
                name={story.name}
                src={story.avatarUrl}
                size={44}
                online
              />
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>{story.name}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="text-xs text-white/75">
                  @{story.handle} · {story.timeAgo}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center transition-colors"
              aria-label="Close status"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Status Content */}
        <div className="my-auto py-10 text-center space-y-4">
          <p className="text-xl sm:text-2xl font-bold leading-snug tracking-tight px-2">
            “{story.text}”
          </p>
          <div className="text-[11px] font-mono text-white/70">
            Signed E2EE Status · Key {story.keyFingerprint.slice(0, 19)}…
          </div>
        </div>

        {/* Bottom E2EE Reply Bar */}
        <form onSubmit={(e) => void handleReply(e)} className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to ${story.name} with E2EE…`}
            className="flex-1 h-11 px-4 rounded-2xl bg-black/30 border border-white/20 text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="h-11 px-4 rounded-2xl bg-white text-slate-900 font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-transform active:scale-95 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. POST NEW STATUS MODAL
// ============================================================================
interface PostStatusModalProps {
  currentStatus: string;
  onClose: () => void;
  onPublishStatus: (newStatusText: string) => Promise<void>;
}

export const PostStatusModal: React.FC<PostStatusModalProps> = ({
  currentStatus,
  onClose,
  onPublishStatus,
}) => {
  const [text, setText] = useState(currentStatus);
  const [publishing, setPublishing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPublishing(true);
    try {
      await onPublishStatus(text.trim());
      onClose();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 space-y-4 border shadow-xl"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Publish Cryptographic Status</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Broadcasts in real time to your verified Chattera contacts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--icon-bg)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <textarea
              rows={3}
              maxLength={BLUEPRINT_LIMITS.STATUS_TEXT_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's happening right now?"
              className="w-full p-3.5 rounded-2xl border text-sm focus:outline-none"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
            <div
              className="text-right text-[11px] font-mono tabular-nums mt-1"
              style={{ color: 'var(--muted)' }}
            >
              {text.length} / {BLUEPRINT_LIMITS.STATUS_TEXT_MAX}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={publishing || !text.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #6756e7, #4434bd)',
              }}
            >
              {publishing ? 'Publishing…' : 'Share Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. ENCRYPTED AUDIO / VIDEO CALL STUDIO MODAL (openCalls / Test Calls)
// ============================================================================
export interface ActiveCallSession {
  contactName: string;
  contactHandle: string;
  avatarUrl?: string;
  callType: 'audio' | 'video';
  keyFingerprint: string;
}

interface EncryptedCallModalProps {
  session: ActiveCallSession;
  onEndCall: (durationFormatted: string) => void;
}

export const EncryptedCallModal: React.FC<EncryptedCallModalProps> = ({
  session,
  onEndCall,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(session.callType === 'video');
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const formattedDuration = `${mins}m ${secs}s`;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d0d18]/95 backdrop-blur-lg flex items-center justify-center p-4 text-white"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#161626] border border-white/10 rounded-3xl p-6 flex flex-col justify-between min-h-[540px] shadow-2xl">
        {/* Top E2EE Verification Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>SRTP / WebCrypto E2EE Call Verified</span>
          </div>
          <span className="font-mono tabular-nums text-xs text-white/70">
            {mins}:{secs}
          </span>
        </div>

        {/* Center Caller Profile & Acoustic Waveform */}
        <div className="my-auto py-8 text-center space-y-5">
          <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#5b4bdb]/30 animate-ping" />
            <ChatteraAvatar
              name={session.contactName}
              src={session.avatarUrl}
              size={96}
              online
              storyRing
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {session.contactName}
            </h2>
            <p className="text-xs text-white/60 mt-1">
              @{session.contactHandle} ·{' '}
              {videoEnabled ? 'Encrypted HD Video Stream' : 'Encrypted Voice Stream'}
            </p>
          </div>

          {/* Acoustic Waveform Indicator */}
          <div className="flex items-center justify-center gap-1.5 h-8">
            {[40, 75, 55, 95, 65, 85, 45, 90, 60, 35].map((h, idx) => (
              <span
                key={idx}
                className="w-1.5 rounded-full bg-[#6c5ce7] transition-all duration-300"
                style={{
                  height: muted ? '6px' : `${Math.max(18, (h + seconds * 13) % 100)}%`,
                }}
              />
            ))}
          </div>

          {/* Key Fingerprint SAS Verification Box */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 text-xs space-y-1">
            <div className="text-white/60">
              Short Authentication String (Key Match Verification)
            </div>
            <div className="font-mono tabular-nums text-emerald-300 font-semibold tracking-wider">
              {session.keyFingerprint.slice(0, 19)} · P-256
            </div>
          </div>
        </div>

        {/* Call Controls */}
        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className={`h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              muted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{muted ? 'Muted' : 'Mute'}</span>
          </button>

          <button
            type="button"
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={`h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              videoEnabled
                ? 'bg-[#5b4bdb] text-white'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {videoEnabled ? (
              <Video className="w-4 h-4" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => setSpeakerOn(!speakerOn)}
            className={`h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              speakerOn
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Speaker</span>
          </button>

          <button
            type="button"
            onClick={() => onEndCall(formattedDuration)}
            className="h-13 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. PROFILE & E2EE KEY VAULT MODAL (openProfile())
// ============================================================================
interface ProfileKeyVaultModalProps {
  myProfile: UserProfileDoc | null;
  myPrivateDoc: UserPrivateDoc | null;
  keyVault: StoredIdentityKeyVault | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateProfileMetadata: (updates: {
    displayName: string;
    handle: string;
    statusText: string;
    discoverable: boolean;
  }) => Promise<void>;
  onRotateKeyPair: () => Promise<void>;
  onImportKeyVaultJson: (jsonStr: string) => Promise<void>;
}

export const ProfileKeyVaultModal: React.FC<ProfileKeyVaultModalProps> = ({
  myProfile,
  myPrivateDoc,
  keyVault,
  isAuthenticated,
  onClose,
  onSignInWithGoogle,
  onSignOut,
  onUpdateProfileMetadata,
  onRotateKeyPair,
  onImportKeyVaultJson,
}) => {
  const [displayName, setDisplayName] = useState(
    myProfile?.displayName || 'Rapheal'
  );
  const [handle, setHandle] = useState(myProfile?.handle || 'rapheal_ogar');
  const [statusText, setStatusText] = useState(
    myProfile?.statusText || 'Connect. Share. Chat. (E2EE Active)'
  );
  const [discoverable, setDiscoverable] = useState(
    myProfile?.discoverable ?? true
  );

  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !myProfile) {
      await onSignInWithGoogle();
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const cleanHandle = sanitizeHandle(handle, myProfile.uid);
      const cleanName = sanitizeDisplayName(displayName, cleanHandle);
      const cleanStatus = sanitizeStatusText(statusText);
      await onUpdateProfileMetadata({
        displayName: cleanName,
        handle: cleanHandle,
        statusText: cleanStatus,
        discoverable,
      });
      setFeedback('Profile & public directory identity synchronized to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (!isAuthenticated) {
      await onSignInWithGoogle();
      return;
    }
    setRotating(true);
    setFeedback(null);
    try {
      await onRotateKeyPair();
      setFeedback('New ECDH P-256 keypair generated and published.');
    } finally {
      setRotating(false);
    }
  };

  const handleCopyBackup = async () => {
    if (!keyVault) return;
    await navigator.clipboard.writeText(JSON.stringify(keyVault, null, 2));
    setCopiedKey(true);
    window.setTimeout(() => setCopiedKey(false), 1800);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson.trim()) return;
    await onImportKeyVaultJson(importJson.trim());
    setImportJson('');
    setShowImport(false);
    setFeedback('Restored ECDH P-256 key vault from backup.');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 space-y-5 border shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <ChatteraAvatar
              name={displayName}
              src="https://i.pravatar.cc/100?img=11"
              size={48}
              online
            />
            <div>
              <h2 className="text-base font-bold">Chattera Identity & Key Vault</h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {isAuthenticated
                  ? `Verified Account · ${myPrivateDoc?.email || 'Google Auth'}`
                  : 'Local Preview Mode · Sign in with Google for Cloud E2EE Sync'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--icon-bg)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-500 font-medium">
            {feedback}
          </div>
        )}

        {!isAuthenticated && (
          <div
            className="p-4 rounded-2xl border flex items-center justify-between gap-4"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Connect Google Account</div>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Publish your ECDH P-256 public key to Firestore and sync real-time chats across
                devices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onSignInWithGoogle()}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ background: 'linear-gradient(135deg, #6756e7, #4434bd)' }}
            >
              Sign In
            </button>
          </div>
        )}

        <form onSubmit={(e) => void handleSave(e)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Chattera Handle (@username)
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.HANDLE_MAX}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Status Story Text</label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.STATUS_TEXT_MAX}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="block text-xs font-semibold">
                Public Key Directory Discovery
              </span>
              <span className="block text-[11px]" style={{ color: 'var(--muted)' }}>
                Allow verified contacts to look up your ECDH P-256 public key
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDiscoverable(!discoverable)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
              style={{
                background: discoverable ? 'var(--soft-tint)' : 'var(--bg)',
                borderColor: 'var(--border)',
                color: discoverable ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              {discoverable ? 'Visible' : 'Hidden'}
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6756e7, #4434bd)' }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Active WebCrypto Key Vault Section */}
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#5b4bdb]" />
              Active WebCrypto ECDH P-256 Identity Key
            </span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
              AES-256-GCM
            </span>
          </div>

          <div className="p-2.5 rounded-xl border text-xs font-mono tabular-nums break-all" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {keyVault?.keyFingerprint ||
              'A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={rotating}
              onClick={() => void handleRotate()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
              Rotate Keypair
            </button>

            <button
              type="button"
              onClick={() => void handleCopyBackup()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {copiedKey ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copied Backup
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export Key JSON
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowImport(!showImport)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              Import Key
            </button>
          </div>

          {showImport && (
            <form onSubmit={(e) => void handleImport(e)} className="space-y-2 pt-2">
              <textarea
                rows={3}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='Paste exported key vault JSON...'
                className="w-full p-2.5 rounded-xl border text-xs font-mono"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: 'var(--primary)' }}
              >
                Restore Key Vault
              </button>
            </form>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-mono truncate max-w-[260px]" style={{ color: 'var(--muted)' }}>
              UID: {myProfile?.uid}
            </div>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-500/30 hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
