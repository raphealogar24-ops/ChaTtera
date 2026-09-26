import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Code2,
  Flame,
  KeyRound,
  Mic,
  Pause,
  Phone,
  Play,
  Send,
  ShieldCheck,
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
  peerActivity?: 'typing' | 'recording' | 'idle';
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
}

interface ParsedMessagePayload {
  kind: 'standard' | 'stealth' | 'payment' | 'voice';
  burnSeconds?: number;
  amountNaira?: number;
  paymentRef?: string;
  voiceId?: string;
  voiceDurationSec?: number;
  voicePeaks?: number[];
  body: string;
}

export function parseSpecialPayload(plaintext: string): ParsedMessagePayload {
  if (plaintext.startsWith('[VOICE:')) {
    const match = plaintext.match(/^\[VOICE:([^:]+):(\d+):([0-9,]+)\]([\s\S]*)$/);
    if (match) {
      const peaks = match[3]
        .split(',')
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n));
      return {
        kind: 'voice',
        voiceId: match[1],
        voiceDurationSec: Math.max(1, Number(match[2]) || 3),
        voicePeaks: peaks.length > 0 ? peaks : [35, 65, 80, 45, 90, 70, 50, 85, 60, 40],
        body: match[4].trim() || 'Voice message',
      };
    }
  }
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
    <div className="flex items-center gap-3 min-w-[230px] sm:min-w-[275px] py-1">
      <button
        type="button"
        onClick={() => void togglePlay()}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
          isMine
            ? 'bg-white text-[#5b4bdb]'
            : 'bg-[#5b4bdb] text-white'
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
            const isPlayed = playing || currentTime > 0 ? barRatio <= progressRatio : false;
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
          <span className={isMine ? 'text-white/85' : ''} style={!isMine ? { color: 'var(--muted)' } : undefined}>
            {playing || currentTime > 0
              ? `${formatAudioSeconds(currentTime)} / ${formatAudioSeconds(totalDuration)}`
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
  peerActivity = 'idle',
  onBackMobile,
  onSendMessage,
  onRevokeMessage,
  onAcknowledgeMessage,
  onStartCall,
  onOpenSafetyNumber,
  onQuickSendCashInChat,
  onTypingActivity,
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [stealthSeconds, setStealthSeconds] = useState<number | null>(null);
  const [xrayMode, setXrayMode] = useState(false);
  const [expandedFrames, setExpandedFrames] = useState<Record<string, boolean>>({});
  const [showCashBar, setShowCashBar] = useState(false);
  const [cashAmount, setCashAmount] = useState('5000');
  const [cashNote, setCashNote] = useState('Lunch & coffee');

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

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, target.id, peerActivity]);

  // Clean up any active recording on unmount
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
      // Fallback for environments without physical microphone hardware
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
        nextPeak = Math.max(24, Math.min(98, Math.round((avg / 160) * 100) + 20));
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

    // Normalize to 24 waveform bars for compact display
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
      const voiceId = `vn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
              className="text-xs flex items-center gap-1.5 truncate"
              style={{
                color:
                  peerActivity !== 'idle' ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              {peerActivity === 'typing' ? (
                <span className="font-semibold animate-pulse">typing a message…</span>
              ) : peerActivity === 'recording' ? (
                <span className="font-semibold animate-pulse">
                  recording a voice message…
                </span>
              ) : (
                <>
                  <span>@{target.handle}</span>
                  <span aria-hidden="true">·</span>
                  <span className={target.online ? 'text-[#21c47b] font-medium' : ''}>
                    {target.online ? 'Active now' : 'Offline'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Call & Security Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
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
            onClick={onOpenSafetyNumber}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--icon-bg)', color: 'var(--primary)' }}
            title="Verify Safety Number"
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
            title="Inspect Encrypted Packet Details"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
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
                      Disappearing Message ({parsed.burnSeconds}s timer)
                    </span>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => void onRevokeMessage(msg.id)}
                        className="underline font-bold"
                      >
                        Unsend Now
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

                {/* Message Metadata Footer */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] pt-1 ${
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

      {/* Composer Bar with Voice Recorder, Disappearing Timer & Money Transfer */}
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors whitespace-nowrap"
              style={{
                background: stealthSeconds ? '#f59e0b22' : 'var(--icon-bg)',
                color: stealthSeconds ? '#d97706' : 'var(--muted)',
              }}
              title="Toggle Disappearing Message Timer"
            >
              <Timer className="w-3.5 h-3.5" />
              {stealthSeconds
                ? `Disappearing: ${stealthSeconds}s`
                : 'Disappearing: Off'}
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
            className="text-[11px] tabular-nums"
            style={{ color: 'var(--muted)' }}
          >
            {isRecordingVoice
              ? 'Recording voice note…'
              : 'Real-time sync active'}
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
                  : `Message ${target.name}…`
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
