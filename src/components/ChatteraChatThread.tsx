import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Code2,
  CornerUpLeft,
  Flame,
  Image as ImageIcon,
  Info,
  KeyRound,
  Mic,
  Pause,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Square,
  Timer,
  Trash2,
  Video,
  Wallet,
  X,
} from 'lucide-react';
import { ChatteraAvatar } from './ChatteraAvatar';
import { base64ToHex } from '../crypto/e2ee';
import { DecryptedMessageView } from '../types';
import { BLUEPRINT_LIMITS } from '../validation';
import {
  resolveVoiceAudioDataUrl,
  storeVoiceAudioBlob,
  synthesizeVoiceNoteWavDataUrl,
} from '../utils/voiceAudio';
import { ChatteraSeedContact } from '../chatteraData';

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
  contacts?: ChatteraSeedContact[];
  peerActivity?: 'typing' | 'recording' | 'idle';
  peerActivitiesMap?: Record<string, 'typing' | 'recording' | 'idle'>;
  onSelectContact?: (contact: ChatteraSeedContact) => void;
  onOpenNewChatModal?: () => void;
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
  onTypingActivity?: (mode: 'typing' | 'recording' | 'idle') => void;
  fullPageMode?: boolean;
}

interface ParsedMessagePayload {
  kind: 'standard' | 'stealth' | 'payment' | 'voice' | 'image';
  burnSeconds?: number;
  amountNaira?: number;
  paymentRef?: string;
  voiceId?: string;
  voiceDurationSec?: number;
  voicePeaks?: number[];
  imageUrl?: string;
  replyQuote?: { senderName: string; snippet: string };
  body: string;
}

const QUICK_EMOJIS = ['😀', '😂', '❤️', '🔥', '🎉', '👏', '🙌', '✨', '👍', '🙏', '💯', '🚀'];
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍', '🎉'];

const SAMPLE_SHARED_PHOTOS = [
  {
    label: 'Workspace Setup',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Design Mockup',
    url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'City Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  },
];

export function parseSpecialPayload(plaintext: string): ParsedMessagePayload {
  let working = plaintext;
  let replyQuote: { senderName: string; snippet: string } | undefined;

  if (working.startsWith('[REPLY:')) {
    const replyMatch = working.match(/^\[REPLY:([^:]+):([^\]]+)\]\s*([\s\S]*)$/);
    if (replyMatch) {
      replyQuote = {
        senderName: replyMatch[1],
        snippet: replyMatch[2],
      };
      working = replyMatch[3];
    }
  }

  if (working.startsWith('[VOICE:')) {
    const match = working.match(/^\[VOICE:([^:]+):(\d+):([0-9,]+)\]([\s\S]*)$/);
    if (match) {
      const peaks = match[3]
        .split(',')
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n));
      return {
        kind: 'voice',
        voiceId: match[1],
        voiceDurationSec: Math.max(1, Number(match[2]) || 3),
        voicePeaks:
          peaks.length > 0
            ? peaks
            : [35, 65, 80, 45, 90, 70, 50, 85, 60, 40],
        body: match[4].trim() || 'Voice message',
        replyQuote,
      };
    }
  }

  if (working.startsWith('[IMG:')) {
    const match = working.match(/^\[IMG:([^\]]+)\]([\s\S]*)$/);
    if (match) {
      return {
        kind: 'image',
        imageUrl: match[1].trim(),
        body: match[2].trim() || 'Shared a photo',
        replyQuote,
      };
    }
  }

  if (working.startsWith('[STEALTH:')) {
    const match = working.match(/^\[STEALTH:(\d+)s\]([\s\S]*)$/);
    if (match) {
      return {
        kind: 'stealth',
        burnSeconds: Number(match[1]),
        body: match[2].trim(),
        replyQuote,
      };
    }
  }

  if (working.startsWith('[CHT-PAY:')) {
    const match = working.match(
      /^\[CHT-PAY:(\d+):([^:]+):([^\]]+)\]([\s\S]*)$/
    );
    if (match) {
      return {
        kind: 'payment',
        amountNaira: Number(match[1]),
        paymentRef: match[2],
        body: match[3].trim() || match[4].trim(),
        replyQuote,
      };
    }
  }

  return { kind: 'standard', body: working, replyQuote };
}

function formatAudioSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const mins = Math.floor(s / 60);
  const rem = String(s % 60).padStart(2, '0');
  return `${mins}:${rem}`;
}

interface VoiceNoteBubblePlayerProps {
  voiceId: string;
  durationSec: number;
  peaks: number[];
  isMine: boolean;
}

const VoiceNoteBubblePlayer: React.FC<VoiceNoteBubblePlayerProps> = ({
  voiceId,
  durationSec,
  peaks,
  isMine,
}) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSec);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const ensureAudioLoaded = async (): Promise<HTMLAudioElement> => {
    if (audioRef.current) return audioRef.current;
    const dataUrl = await resolveVoiceAudioDataUrl(voiceId, durationSec, peaks);
    const audio = new Audio(dataUrl);
    audio.playbackRate = playbackRate;

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setTotalDuration(Math.max(1, Math.round(audio.duration)));
      }
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setPlaying(false);
      setCurrentTime(0);
    });

    audioRef.current = audio;
    return audio;
  };

  const togglePlay = async () => {
    const audio = await ensureAudioLoaded();
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const handleSeekBarClick = async (index: number) => {
    const audio = await ensureAudioLoaded();
    const ratio = index / Math.max(1, peaks.length);
    const targetDur =
      audio.duration && Number.isFinite(audio.duration)
        ? audio.duration
        : totalDuration;
    audio.currentTime = ratio * targetDur;
    setCurrentTime(audio.currentTime);
    if (!playing) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        // Ignore play interruption
      }
    }
  };

  const cycleRate = () => {
    const nextRate: 1 | 1.5 | 2 =
      playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progressRatio =
    totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  return (
    <div className="flex items-center gap-3 min-w-[220px] sm:min-w-[270px] py-1">
      <button
        type="button"
        onClick={() => void togglePlay()}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
          isMine ? 'bg-white text-[#5b4bdb]' : 'bg-[#5b4bdb] text-white'
        }`}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
      >
        {playing ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 space-y-1.5 min-w-0">
        {/* Interactive Waveform Scrubber */}
        <div className="flex items-center gap-1 h-7">
          {peaks.map((peak, idx) => {
            const barRatio = idx / peaks.length;
            const isPlayed =
              playing || currentTime > 0 ? barRatio <= progressRatio : false;
            const heightPct = Math.max(22, Math.min(100, peak));
            return (
              <button
                key={idx}
                type="button"
                onClick={() => void handleSeekBarClick(idx)}
                className="flex-1 h-full flex items-center justify-center group"
                title="Seek voice note"
              >
                <span
                  className="w-1 rounded-full transition-all duration-150"
                  style={{
                    height: `${heightPct}%`,
                    background: isMine
                      ? isPlayed
                        ? '#ffffff'
                        : 'rgba(255,255,255,0.4)'
                      : isPlayed
                      ? 'var(--primary)'
                      : 'var(--muted)',
                    opacity: isMine ? 1 : isPlayed ? 1 : 0.45,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
          <span
            className={isMine ? 'text-white/85' : ''}
            style={!isMine ? { color: 'var(--muted)' } : undefined}
          >
            {playing || currentTime > 0
              ? `${formatAudioSeconds(currentTime)} / ${formatAudioSeconds(
                  totalDuration
                )}`
              : `${formatAudioSeconds(totalDuration)} · Voice Note`}
          </span>

          <button
            type="button"
            onClick={cycleRate}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
              isMine
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-black/5 dark:bg-white/10'
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChatteraChatThread: React.FC<ChatteraChatThreadProps> = ({
  target,
  myUid,
  messages,
  contacts = [],
  peerActivity = 'idle',
  peerActivitiesMap = {},
  onSelectContact,
  onOpenNewChatModal,
  onBackMobile,
  onSendMessage,
  onRevokeMessage,
  onAcknowledgeMessage,
  onStartCall,
  onOpenSafetyNumber,
  onQuickSendCashInChat,
  onTypingActivity,
  fullPageMode = false,
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [stealthSeconds, setStealthSeconds] = useState<number | null>(null);
  const [xrayMode, setXrayMode] = useState(false);
  const [expandedFrames, setExpandedFrames] = useState<Record<string, boolean>>(
    {}
  );
  const [showCashBar, setShowCashBar] = useState(false);
  const [cashAmount, setCashAmount] = useState('5000');
  const [cashNote, setCashNote] = useState('Lunch & coffee');

  // Rich Chatting Page UI State (Emojis, Reactions, Replies, Photo Attach, Search, Contact Info)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    senderName: string;
    snippet: string;
  } | null>(null);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, string[]>
  >({});
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [contactInfoOpen, setContactInfoOpen] = useState(false);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWavePeaks, setLiveWavePeaks] = useState<number[]>(
    Array.from({ length: 20 }, () => 30)
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const collectedPeaksRef = useRef<number[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, target.id, peerActivity]);

  useEffect(() => {
    return () => {
      stopRecordingResources();
    };
  }, []);

  const stopRecordingResources = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    collectedPeaksRef.current = [];
    recordedChunksRef.current = [];
    onTypingActivity?.('recording');

    let analyser: AnalyserNode | null = null;
    let freqData: Uint8Array<ArrayBuffer> | null = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };
      recorder.start(200);
    } catch {
      mediaRecorderRef.current = null;
    }

    const startedAt = Date.now();
    recordingTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRecordingSeconds(elapsed);

      let nextPeak = 40 + Math.floor(Math.random() * 52);
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const avg = sum / freqData.length;
        nextPeak = Math.max(
          24,
          Math.min(98, Math.round((avg / 160) * 100) + 20)
        );
      }

      collectedPeaksRef.current.push(nextPeak);
      setLiveWavePeaks((prev) => [...prev.slice(1), nextPeak]);
    }, 180);
  };

  const cancelVoiceRecording = () => {
    stopRecordingResources();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    onTypingActivity?.('idle');
  };

  const finishAndSendVoiceRecording = async () => {
    const finalDuration = Math.max(1, recordingSeconds || 2);
    const rawPeaks =
      collectedPeaksRef.current.length >= 6
        ? collectedPeaksRef.current
        : [38, 68, 84, 52, 90, 76, 62, 88, 55, 72, 48, 66];

    const normalizedPeaks: number[] = [];
    for (let i = 0; i < 24; i++) {
      const idx = Math.min(
        rawPeaks.length - 1,
        Math.floor((i / 24) * rawPeaks.length)
      );
      normalizedPeaks.push(rawPeaks[idx]);
    }

    stopRecordingResources();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    onTypingActivity?.('idle');

    setSending(true);
    try {
      const voiceId = `vn_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      let audioDataUrl = '';

      if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'audio/webm',
        });
        audioDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.readAsDataURL(blob);
        });
      }

      if (!audioDataUrl) {
        audioDataUrl = synthesizeVoiceNoteWavDataUrl(
          finalDuration,
          normalizedPeaks
        );
      }

      await storeVoiceAudioBlob(voiceId, audioDataUrl, finalDuration);
      const peaksCsv = normalizedPeaks.join(',');
      await onSendMessage(
        `[VOICE:${voiceId}:${finalDuration}:${peaksCsv}] Voice message (${formatAudioSeconds(
          finalDuration
        )})`
      );
    } finally {
      setSending(false);
    }
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (onTypingActivity) {
      onTypingActivity(val.trim().length > 0 ? 'typing' : 'idle');
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        onTypingActivity('idle');
      }, 2200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSending(true);
    onTypingActivity?.('idle');
    setShowEmojiPicker(false);
    try {
      let payload = stealthSeconds
        ? `[STEALTH:${stealthSeconds}s] ${trimmed}`
        : trimmed;

      if (replyingTo) {
        const cleanSender = replyingTo.senderName.replace(/[:[\]]/g, '');
        const cleanSnippet = replyingTo.snippet
          .slice(0, 50)
          .replace(/[:[\]]/g, '');
        payload = `[REPLY:${cleanSender}:${cleanSnippet}] ${payload}`;
      }

      await onSendMessage(payload);
      setDraft('');
      setReplyingTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleSendPhotoUrl = async (url: string, caption: string) => {
    setSending(true);
    setShowPhotoPicker(false);
    try {
      await onSendMessage(`[IMG:${url}] ${caption}`);
    } finally {
      setSending(false);
    }
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        void handleSendPhotoUrl(reader.result, file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  const toggleReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const existing = prev[msgId] || [];
      const exists = existing.includes(emoji);
      const next = exists
        ? existing.filter((e) => e !== emoji)
        : [...existing, emoji];
      return { ...prev, [msgId]: next };
    });
  };

  const displayedMessages = inChatSearchQuery.trim()
    ? messages.filter((m) =>
        m.plaintext
          .toLowerCase()
          .includes(inChatSearchQuery.trim().toLowerCase())
      )
    : messages;

  return (
    <div
      className="flex flex-col h-full min-h-[560px] rounded-3xl border overflow-hidden shadow-sm relative"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Quick Contact Switcher Strip (Visible on Mobile / Full-Page Chat Mode) */}
      {contacts.length > 0 && (
        <div
          className={`${
            fullPageMode ? 'flex' : 'flex lg:hidden'
          } items-center gap-2 px-3.5 py-2.5 border-b overflow-x-auto no-scrollbar`}
          style={{
            background: 'var(--bg)',
            borderColor: 'var(--border)',
          }}
        >
          {contacts.map((c) => {
            const isCurrent = !target.isFirestoreBacked && target.id === c.id;
            const act = peerActivitiesMap[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectContact?.(c)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border shrink-0 transition-all active:scale-95"
                style={{
                  background: isCurrent ? 'var(--primary)' : 'var(--card)',
                  color: isCurrent ? '#ffffff' : 'var(--text)',
                  borderColor: isCurrent ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <ChatteraAvatar
                  name={c.name}
                  src={c.avatarUrl}
                  size={24}
                  online={c.online}
                />
                <span className="text-xs font-bold whitespace-nowrap">
                  {c.name.split(' ')[0]}
                </span>
                {act && act !== 'idle' && (
                  <span className="w-2 h-2 rounded-full bg-[#21c47b] animate-ping" />
                )}
                {c.unreadCount > 0 && !isCurrent && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#5b4bdb] text-white">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          {onOpenNewChatModal && (
            <button
              type="button"
              onClick={onOpenNewChatModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-2xl border shrink-0 text-xs font-semibold"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>More</span>
            </button>
          )}
        </div>
      )}

      {/* Conversation Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-2 sticky top-0 z-10"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackMobile}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--icon-bg)' }}
            aria-label="Back to chats list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setContactInfoOpen(!contactInfoOpen)}
            className="flex items-center gap-3 min-w-0 text-left group"
          >
            <ChatteraAvatar
              name={target.name}
              src={target.avatarUrl}
              size={44}
              online={target.online}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold truncate group-hover:underline">
                  {target.name}
                </h3>
                <ShieldCheck className="w-3.5 h-3.5 text-[#21c47b] shrink-0" />
              </div>
              <div
                className="text-xs flex items-center gap-1.5 truncate"
                style={{
                  color:
                    peerActivity !== 'idle' ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                {peerActivity === 'typing' ? (
                  <span className="font-semibold animate-pulse">
                    typing a message…
                  </span>
                ) : peerActivity === 'recording' ? (
                  <span className="font-semibold animate-pulse">
                    🎤 recording a voice message…
                  </span>
                ) : (
                  <>
                    <span>@{target.handle}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        target.online ? 'text-[#21c47b] font-medium' : ''
                      }
                    >
                      {target.online ? 'Active now' : 'Offline'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Call, Search & Info Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setInChatSearchOpen(!inChatSearchOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: inChatSearchOpen
                ? 'var(--soft-tint)'
                : 'var(--icon-bg)',
              color: inChatSearchOpen ? 'var(--primary)' : 'var(--text)',
            }}
            title="Search in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartCall('audio')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
            title="Start Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartCall('video')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setContactInfoOpen(!contactInfoOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: contactInfoOpen
                ? 'var(--soft-tint)'
                : 'var(--icon-bg)',
              color: contactInfoOpen ? 'var(--primary)' : 'var(--text)',
            }}
            title="Contact Info & Shared Media"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setXrayMode(!xrayMode)}
            className="hidden sm:inline-flex px-2.5 h-9 rounded-xl items-center gap-1 text-[11px] font-semibold transition-colors whitespace-nowrap"
            style={{
              background: xrayMode ? 'var(--primary)' : 'var(--icon-bg)',
              color: xrayMode ? '#ffffff' : 'var(--text)',
            }}
            title="Inspect Packet Details"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      </div>

      {/* In-Conversation Search Bar */}
      {inChatSearchOpen && (
        <div
          className="px-4 py-2 border-b flex items-center gap-2"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={inChatSearchQuery}
            onChange={(e) => setInChatSearchQuery(e.target.value)}
            placeholder={`Search messages with ${target.name}…`}
            className="flex-1 text-xs bg-transparent focus:outline-none"
            style={{ color: 'var(--text)' }}
          />
          {inChatSearchQuery && (
            <button
              type="button"
              onClick={() => setInChatSearchQuery('')}
              className="text-xs font-semibold"
              style={{ color: 'var(--muted)' }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Main Chat Body + Optional Contact Info Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Message Stream */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3.5"
          style={{ background: 'var(--bg)' }}
        >
          {/* Date Header Chip */}
          <div className="flex justify-center">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-medium border"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--muted)',
              }}
            >
              Today · Real-Time Chat with {target.name}
            </span>
          </div>

          {displayedMessages.map((msg) => {
            const isMine = msg.senderId === myUid;
            const isRevoked = msg.deliveryStatus === 'revoked';
            const parsed = parseSpecialPayload(msg.plaintext);
            const showPacket = xrayMode || Boolean(expandedFrames[msg.id]);
            const reactions = messageReactions[msg.id] || [];

            const timeLabel =
              msg.createdAt && typeof msg.createdAt.toDate === 'function'
                ? msg.createdAt
                    .toDate()
                    .toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                : 'Just now';

            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${
                  isMine ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[76%]">
                  {!isMine && (
                    <ChatteraAvatar
                      name={target.name}
                      src={target.avatarUrl}
                      size={28}
                      className="mb-1 shrink-0 hidden sm:inline-flex"
                    />
                  )}

                  <div
                    className="rounded-2xl p-3.5 space-y-2 shadow-xs border relative"
                    style={{
                      background: isMine
                        ? 'linear-gradient(135deg, #5b4bdb, #4737c6)'
                        : 'var(--card)',
                      color: isMine ? '#ffffff' : 'var(--text)',
                      borderColor: isMine ? 'transparent' : 'var(--border)',
                    }}
                  >
                    {/* Reply Quote Header if this message is a reply */}
                    {parsed.replyQuote && !isRevoked && (
                      <div
                        className={`p-2 rounded-xl border-l-4 text-xs ${
                          isMine
                            ? 'bg-black/20 border-white/70 text-white/90'
                            : 'bg-black/5 dark:bg-white/5 border-[#5b4bdb]'
                        }`}
                      >
                        <div className="font-bold text-[10px]">
                          {parsed.replyQuote.senderName}
                        </div>
                        <div className="truncate opacity-85 text-[11px]">
                          {parsed.replyQuote.snippet}
                        </div>
                      </div>
                    )}

                    {/* Disappearing Message Header */}
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
                          Disappearing ({parsed.burnSeconds}s timer)
                        </span>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => void onRevokeMessage(msg.id)}
                            className="underline font-bold"
                          >
                            Unsend
                          </button>
                        )}
                      </div>
                    )}

                    {/* Voice Message Player */}
                    {parsed.kind === 'voice' && !isRevoked ? (
                      <VoiceNoteBubblePlayer
                        voiceId={parsed.voiceId || msg.id}
                        durationSec={parsed.voiceDurationSec || 4}
                        peaks={
                          parsed.voicePeaks || [
                            35, 65, 80, 45, 90, 70, 50, 85, 60, 40,
                          ]
                        }
                        isMine={isMine}
                      />
                    ) : parsed.kind === 'image' &&
                      parsed.imageUrl &&
                      !isRevoked ? (
                      /* Shared Photo Bubble */
                      <div className="space-y-1.5">
                        <img
                          src={parsed.imageUrl}
                          alt={parsed.body}
                          className="rounded-xl max-h-60 w-full object-cover border border-white/10"
                        />
                        {parsed.body && (
                          <div className="text-xs opacity-90">{parsed.body}</div>
                        )}
                      </div>
                    ) : parsed.kind === 'payment' && !isRevoked ? (
                      /* In-Chat Naira Transfer Bubble */
                      <div className="p-3 rounded-xl bg-black/20 border border-white/15 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] opacity-85">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Wallet className="w-3.5 h-3.5" />
                            Chattera Instant Transfer
                          </span>
                          <span className="font-mono">{parsed.paymentRef}</span>
                        </div>
                        <div className="text-xl font-bold font-mono tabular-nums">
                          ₦{(parsed.amountNaira || 0).toLocaleString()}.00
                        </div>
                        <div className="text-xs opacity-90">{parsed.body}</div>
                      </div>
                    ) : (
                      /* Standard Text Bubble */
                      <div
                        className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
                          isRevoked ? 'italic opacity-70 text-xs' : ''
                        }`}
                      >
                        {parsed.body}
                      </div>
                    )}

                    {/* Quick Reaction Bar + Reply Action */}
                    {!isRevoked && (
                      <div
                        className={`flex items-center justify-between gap-2 pt-1 border-t ${
                          isMine
                            ? 'border-white/15'
                            : 'border-black/5 dark:border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {REACTION_EMOJIS.map((emoji) => {
                            const active = reactions.includes(emoji);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className={`text-xs px-1.5 py-0.5 rounded-lg transition-transform active:scale-90 ${
                                  active
                                    ? 'bg-white/25 scale-105 font-bold'
                                    : 'opacity-65 hover:opacity-100'
                                }`}
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setReplyingTo({
                              id: msg.id,
                              senderName: isMine ? 'You' : target.name,
                              snippet:
                                parsed.kind === 'voice'
                                  ? '🎤 Voice message'
                                  : parsed.kind === 'image'
                                  ? '📷 Photo'
                                  : parsed.body,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-80 hover:opacity-100"
                          title="Reply to this message"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      </div>
                    )}

                    {/* Selected Reactions Display */}
                    {reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {reactions.map((em) => (
                          <span
                            key={em}
                            className="px-2 py-0.5 rounded-full text-xs bg-black/20 border border-white/20"
                          >
                            {em} 1
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Message Metadata Footer */}
                    <div
                      className={`flex items-center justify-between gap-3 text-[10px] pt-0.5 ${
                        isMine ? 'text-white/75' : ''
                      }`}
                      style={!isMine ? { color: 'var(--muted)' } : undefined}
                    >
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span>{timeLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">
                          {msg.deliveryStatus === 'verified'
                            ? 'Read'
                            : msg.deliveryStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {xrayMode && (
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
                            {showPacket ? 'Hide Info' : 'Info'}
                          </button>
                        )}

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
                              Mark Read
                            </button>
                          )}

                        {isMine && !isRevoked && (
                          <button
                            type="button"
                            onClick={() => void onRevokeMessage(msg.id)}
                            className="inline-flex items-center gap-0.5 hover:underline opacity-80 hover:opacity-100"
                            title="Unsend message"
                          >
                            <Trash2 className="w-3 h-3" />
                            Unsend
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional Packet Inspector Drawer */}
                    {showPacket && (
                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/15 text-[10px] font-mono space-y-1 break-all">
                        <div className="flex items-center justify-between opacity-80">
                          <span>Suite: {msg.algorithm}</span>
                          <span>IV: {base64ToHex(msg.iv)}</span>
                        </div>
                        <div className="opacity-90">
                          Ciphertext: {msg.ciphertext.slice(0, 96)}…
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Live Peer Typing / Recording Bubble */}
          {peerActivity !== 'idle' && (
            <div className="flex items-start">
              <div
                className="px-4 py-2.5 rounded-2xl border text-xs font-medium flex items-center gap-2 shadow-2xs"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--muted)',
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[#21c47b] animate-ping" />
                <span>
                  {target.name} is{' '}
                  {peerActivity === 'recording'
                    ? 'recording a voice message…'
                    : 'typing…'}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Contact Info Slide-Over Drawer */}
        {contactInfoOpen && (
          <aside
            className="w-72 border-l p-4 overflow-y-auto space-y-4 shrink-0"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Contact Details
              </h4>
              <button
                type="button"
                onClick={() => setContactInfoOpen(false)}
                className="p-1 rounded-lg"
                style={{ background: 'var(--icon-bg)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-center space-y-2 pt-2">
              <ChatteraAvatar
                name={target.name}
                src={target.avatarUrl}
                size={68}
                online={target.online}
                className="mx-auto"
              />
              <div>
                <div className="text-base font-bold">{target.name}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  @{target.handle}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onStartCall('audio')}
                className="p-2.5 rounded-2xl border text-center space-y-1"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              >
                <Phone className="w-4 h-4 mx-auto text-[#5b4bdb]" />
                <span className="block text-[10px] font-semibold">Audio</span>
              </button>
              <button
                type="button"
                onClick={() => onStartCall('video')}
                className="p-2.5 rounded-2xl border text-center space-y-1"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              >
                <Video className="w-4 h-4 mx-auto text-[#5b4bdb]" />
                <span className="block text-[10px] font-semibold">Video</span>
              </button>
              <button
                type="button"
                onClick={onOpenSafetyNumber}
                className="p-2.5 rounded-2xl border text-center space-y-1"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              >
                <KeyRound className="w-4 h-4 mx-auto text-[#21c47b]" />
                <span className="block text-[10px] font-semibold">Verify</span>
              </button>
            </div>

            <div
              className="p-3 rounded-2xl border space-y-1 text-xs"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="font-semibold">Chat Statistics</div>
              <div style={{ color: 'var(--muted)' }}>
                Total messages: {messages.length}
              </div>
              <div style={{ color: 'var(--muted)' }}>
                Voice notes:{' '}
                {
                  messages.filter((m) => m.plaintext.startsWith('[VOICE:'))
                    .length
                }
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Reply Banner if quoting a message */}
      {replyingTo && (
        <div
          className="px-4 py-2 border-t flex items-center justify-between gap-2 text-xs"
          style={{
            background: 'var(--soft-tint)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="min-w-0">
            <span className="font-bold text-[#5b4bdb]">
              Replying to {replyingTo.senderName}:{' '}
            </span>
            <span className="truncate" style={{ color: 'var(--muted)' }}>
              {replyingTo.snippet}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Photo Attachment Picker Drawer */}
      {showPhotoPicker && (
        <div
          className="px-4 py-3 border-t space-y-2.5"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Share a Photo in Chat</span>
            <button
              type="button"
              onClick={() => setShowPhotoPicker(false)}
              className="text-xs"
              style={{ color: 'var(--muted)' }}
            >
              Close
            </button>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 px-4 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-1 text-xs font-semibold shrink-0"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
              }}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLocalImageUpload}
              className="hidden"
            />
            {SAMPLE_SHARED_PHOTOS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => void handleSendPhotoUrl(item.url, item.label)}
                className="relative h-20 w-28 rounded-2xl overflow-hidden border shrink-0 group"
                style={{ borderColor: 'var(--border)' }}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] py-0.5 px-1.5 truncate">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Picker Bar */}
      {showEmojiPicker && (
        <div
          className="px-4 py-2.5 border-t flex items-center gap-2 overflow-x-auto no-scrollbar"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setDraft((prev) => `${prev}${em}`)}
              className="text-lg hover:scale-125 transition-transform px-1"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Optional Quick In-Chat Cash Transfer Bar */}
      {showCashBar && (
        <form
          onSubmit={(e) => void handleCashSubmit(e)}
          className="px-4 py-3 border-t flex flex-wrap items-center gap-2"
          style={{
            background: 'var(--soft-tint)',
            borderColor: 'var(--border)',
          }}
        >
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--primary)' }}
          >
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
            placeholder="Add a note..."
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

      {/* Composer Bar with Voice Recorder, Emojis, Photo Attach, Disappearing Timer & Money Transfer */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="p-3 border-t space-y-2"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowPhotoPicker(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{
                background: showEmojiPicker
                  ? 'var(--soft-tint)'
                  : 'var(--icon-bg)',
                color: showEmojiPicker ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emoji</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPhotoPicker(!showPhotoPicker);
                setShowEmojiPicker(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{
                background: showPhotoPicker
                  ? 'var(--soft-tint)'
                  : 'var(--icon-bg)',
                color: showPhotoPicker ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setStealthSeconds((prev) =>
                  prev === null ? 30 : prev === 30 ? 60 : null
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{
                background: stealthSeconds ? '#f59e0b22' : 'var(--icon-bg)',
                color: stealthSeconds ? '#d97706' : 'var(--muted)',
              }}
              title="Toggle Disappearing Message Timer"
            >
              <Timer className="w-3.5 h-3.5" />
              {stealthSeconds ? `${stealthSeconds}s Timer` : 'Timer'}
            </button>

            <button
              type="button"
              onClick={() => setShowCashBar(!showCashBar)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{
                background: showCashBar ? 'var(--soft-tint)' : 'var(--icon-bg)',
                color: showCashBar ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Send ₦</span>
            </button>
          </div>

          <span
            className="text-[11px] tabular-nums hidden sm:inline"
            style={{ color: 'var(--muted)' }}
          >
            {isRecordingVoice
              ? 'Recording voice note…'
              : 'Real-time chat active'}
          </span>
        </div>

        {isRecordingVoice ? (
          /* Live Voice Recording Controls */
          <div
            className="flex items-center justify-between gap-3 h-12 px-3.5 rounded-2xl border"
            style={{
              background: 'var(--soft-tint)',
              borderColor: 'var(--primary)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-xs font-bold font-mono tabular-nums text-red-500 shrink-0">
                {formatAudioSeconds(recordingSeconds)}
              </span>

              {/* Animated Live Microphone Waveform */}
              <div className="flex items-center gap-1 h-6 overflow-hidden">
                {liveWavePeaks.map((p, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full transition-all duration-150"
                    style={{
                      height: `${Math.max(20, p)}%`,
                      background: 'var(--primary)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                style={{ background: 'var(--card)', color: 'var(--muted)' }}
                title="Cancel voice note"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => void finishAndSendVoiceRecording()}
                className="h-9 px-4 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #6756e7, #4434bd)',
                }}
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Send Voice</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Message Input + Voice Note Button + Send Button */
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void startVoiceRecording()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95"
              style={{
                background: 'var(--soft-tint)',
                color: 'var(--primary)',
              }}
              title="Record Voice Message"
              aria-label="Record Voice Message"
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              type="text"
              maxLength={BLUEPRINT_LIMITS.PLAINTEXT_MAX_CHARS}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder={
                stealthSeconds
                  ? `Write a ${stealthSeconds}s disappearing message…`
                  : `Write a message to ${target.name}…`
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
        )}
      </form>
    </div>
  );
};
