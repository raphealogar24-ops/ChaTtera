import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, LogIn, Mic, Sparkles, UserCheck } from 'lucide-react';
import { ChatteraLogo } from './ChatteraLogo';
import { ChatteraAvatar } from './ChatteraAvatar';

export interface LocalSessionUser {
  uid: string;
  displayName: string;
  handle: string;
  email: string;
  avatarUrl: string;
}

interface ChatteraAuthViewProps {
  onGoogleSignIn: () => Promise<void>;
  onQuickSignIn: (user: LocalSessionUser) => void;
  authError: string | null;
  darkMode: boolean;
}

const PRESET_PROFILES: LocalSessionUser[] = [
  {
    uid: 'user_rapheal',
    displayName: 'Rapheal Ogar',
    handle: 'rapheal_ogar',
    email: 'rapheal@chattera.app',
    avatarUrl: 'https://i.pravatar.cc/100?img=11',
  },
  {
    uid: 'contact_amara',
    displayName: 'Amara Okafor',
    handle: 'amara_okafor',
    email: 'amara@chattera.app',
    avatarUrl: 'https://i.pravatar.cc/100?img=47',
  },
  {
    uid: 'contact_daniel',
    displayName: 'Daniel Adeyemi',
    handle: 'daniel_adeyemi',
    email: 'daniel@chattera.app',
    avatarUrl: 'https://i.pravatar.cc/100?img=12',
  },
];

export const ChatteraAuthView: React.FC<ChatteraAuthViewProps> = ({
  onGoogleSignIn,
  onQuickSignIn,
  authError,
}) => {
  const [name, setName] = useState('Rapheal Ogar');
  const [handle, setHandle] = useState('rapheal_ogar');
  const [email, setEmail] = useState('rapheal@chattera.app');
  const [selectedAvatar, setSelectedAvatar] = useState('https://i.pravatar.cc/100?img=11');
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Rapheal';
    const cleanHandle =
      handle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '') || 'rapheal';

    onQuickSignIn({
      uid: `user_${cleanHandle}`,
      displayName: cleanName,
      handle: cleanHandle,
      email: email.trim() || `${cleanHandle}@chattera.app`,
      avatarUrl: selectedAvatar,
    });
  };

  const triggerGoogle = async () => {
    setLoadingGoogle(true);
    try {
      await onGoogleSignIn();
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Top Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <ChatteraLogo size={42} />
          <span className="text-xl font-bold tracking-tight">Chattera</span>
        </div>
        <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          Real-Time Messaging · Voice Notes · Instant Wallet
        </div>
      </header>

      {/* Main Sign-In Card */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Friendly Value Proposition */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            <Sparkles className="w-4 h-4" />
            <span>Fast, friendly, and real-time</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Connect, share voice notes, and chat in real time.
          </h1>

          <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            Sign in to your Chattera account to message friends live, send crystal-clear
            voice messages with interactive waveforms, share status stories, and make
            instant transfers.
          </p>

          <div className="space-y-3 pt-2 text-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#21c47b] shrink-0" />
              <span>Instant real-time message delivery & live typing indicators</span>
            </div>
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-[#5b4bdb] shrink-0" />
              <span>One-tap voice messages with interactive waveform playback</span>
            </div>
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-[#21c47b] shrink-0" />
              <span>Switch accounts or sign in with Google anytime</span>
            </div>
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div
          className="lg:col-span-6 rounded-3xl border p-6 sm:p-8 shadow-sm space-y-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3.5">
            <ChatteraLogo size={48} />
            <div>
              <h2 className="text-xl font-bold">Welcome to Chattera</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Log in to start chatting and sending voice messages
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-300">
              {authError}
            </div>
          )}

          {/* Primary Google Sign-In Button */}
          <button
            type="button"
            disabled={loadingGoogle}
            onClick={() => void triggerGoogle()}
            className="w-full h-12 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2.5 transition-transform active:scale-[0.99] hover:opacity-95"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <LogIn className="w-4 h-4 text-[#5b4bdb]" />
            <span>{loadingGoogle ? 'Connecting to Google…' : 'Continue with Google'}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t w-full" style={{ borderColor: 'var(--border)' }} />
            <span
              className="px-3 text-[11px] font-medium whitespace-nowrap"
              style={{ background: 'var(--card)', color: 'var(--muted)' }}
            >
              or sign in with your Chattera profile
            </span>
            <div className="border-t w-full" style={{ borderColor: 'var(--border)' }} />
          </div>

          {/* User-Friendly Direct Sign-In Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rapheal Ogar"
                  className="w-full h-11 px-3.5 rounded-xl border text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Username (@handle)</label>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. rapheal_ogar"
                  className="w-full h-11 px-3.5 rounded-xl border text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #6756e7, #4434bd)',
              }}
            >
              <span>Log In to Chattera</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Quick Account Switcher for Multi-Tab Real-Time Testing */}
          <div className="pt-2 border-t space-y-2.5" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              Quick Login (Open 2 tabs to chat with yourself in real time):
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_PROFILES.map((preset) => (
                <button
                  key={preset.uid}
                  type="button"
                  onClick={() => {
                    setName(preset.displayName);
                    setHandle(preset.handle);
                    setEmail(preset.email);
                    setSelectedAvatar(preset.avatarUrl);
                    onQuickSignIn(preset);
                  }}
                  className="p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-transform active:scale-95 hover:border-[#5b4bdb]"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <ChatteraAvatar name={preset.displayName} src={preset.avatarUrl} size={32} online />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {preset.displayName.split(' ')[0]}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                      @{preset.handle.split('_')[0]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs py-2" style={{ color: 'var(--muted)' }}>
        Chattera Messenger · Connect. Share. Chat.
      </footer>
    </div>
  );
};
