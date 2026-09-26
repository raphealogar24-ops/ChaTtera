import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Moon,
  Play,
  Plus,
  Sparkles,
  Sun,
  UserPlus,
} from 'lucide-react';
import { ChatteraLogo } from './ChatteraLogo';
import { ChatteraAvatar } from './ChatteraAvatar';

export interface LocalSessionUser {
  uid: string;
  displayName: string;
  handle: string;
  email: string;
  avatarUrl: string;
  statusText?: string;
}

interface ChatteraAuthViewProps {
  onGoogleSignIn: () => Promise<void>;
  onQuickSignIn: (user: LocalSessionUser) => void;
  authError: string | null;
  darkMode: boolean;
  onToggleDarkMode?: () => void;
  initialStage?: 'intro' | 'login' | 'signup';
}

const DEFAULT_RECENT_ACCOUNTS: LocalSessionUser[] = [
  {
    uid: 'user_rapheal',
    displayName: 'Rapheal Ogar',
    handle: 'rapheal_ogar',
    email: 'rapheal@chattera.app',
    avatarUrl: 'https://i.pravatar.cc/100?img=11',
    statusText: 'Available on Chattera — send a message or voice note!',
  },
  {
    uid: 'contact_amara',
    displayName: 'Amara Okafor',
    handle: 'amara_okafor',
    email: 'amara@chattera.app',
    avatarUrl: 'https://i.pravatar.cc/100?img=47',
    statusText: 'Shipping the new design system 🚀✨',
  },
  {
    uid: 'contact_daniel',
    displayName: 'Daniel Adeyemi',
    handle: 'daniel_adeyemi',
    email: 'daniel@chattera.app',
    avatarUrl: 'https://i.pravatar.cc/100?img=12',
    statusText: 'Online and ready for voice calls 🎧',
  },
];

const AVATAR_OPTIONS = [
  'https://i.pravatar.cc/100?img=11',
  'https://i.pravatar.cc/100?img=47',
  'https://i.pravatar.cc/100?img=12',
  'https://i.pravatar.cc/100?img=32',
  'https://i.pravatar.cc/100?img=44',
  'https://i.pravatar.cc/100?img=68',
];

export const ChatteraAuthView: React.FC<ChatteraAuthViewProps> = ({
  onGoogleSignIn,
  onQuickSignIn,
  authError,
  darkMode,
  onToggleDarkMode,
  initialStage = 'intro',
}) => {
  const [stage, setStage] = useState<'intro' | 'login' | 'signup' | 'forgot'>(
    initialStage
  );
  const [introProgress, setIntroProgress] = useState(12);

  // Saved Recent Accounts (persisted in localStorage so newly signed-up accounts stay listed)
  const [recentAccounts, setRecentAccounts] = useState<LocalSessionUser[]>(
    () => {
      const saved = window.localStorage.getItem('chatteraRecentAccounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as LocalSessionUser[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // Ignore parse error
        }
      }
      return DEFAULT_RECENT_ACCOUNTS;
    }
  );

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('rapheal@chattera.app');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Sign Up Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupHandle, setSignupHandle] = useState('');
  const [signupEmailOrPhone, setSignupEmailOrPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupBio, setSignupBio] = useState(
    'Hey there! I am using Chattera.'
  );
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Forgot Password State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  // Animate the Intro Logo Splash Screen progress bar & auto-advance to Login
  useEffect(() => {
    if (stage !== 'intro') return;
    setIntroProgress(15);

    const interval = window.setInterval(() => {
      setIntroProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return prev + 17;
      });
    }, 280);

    const timer = window.setTimeout(() => {
      setStage('login');
    }, 2100);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [stage]);

  // Handle Login Form Submission -> Links directly to Home Page
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const rawId = loginIdentifier.trim().toLowerCase();
    if (!rawId) {
      setFormFeedback('Please enter your email, phone number, or @username.');
      return;
    }

    // Check if identifier matches one of the saved accounts
    const matched = recentAccounts.find(
      (acc) =>
        acc.email.toLowerCase() === rawId ||
        acc.handle.toLowerCase() === rawId.replace(/^@/, '') ||
        acc.displayName.toLowerCase() === rawId
    );

    if (matched) {
      onQuickSignIn(matched);
      return;
    }

    // Otherwise create a clean session from the entered login identifier and link to Home Page
    const baseHandle =
      rawId
        .split('@')[0]
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '') || 'chattera_user';
    const formattedName = baseHandle
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const newUser: LocalSessionUser = {
      uid: `user_${baseHandle}`,
      displayName: formattedName || 'Chattera User',
      handle: baseHandle,
      email: rawId.includes('@') ? rawId : `${baseHandle}@chattera.app`,
      avatarUrl: AVATAR_OPTIONS[0],
      statusText: 'Available on Chattera — send a message or voice note!',
    };

    const updatedAccounts = [
      newUser,
      ...recentAccounts.filter((a) => a.uid !== newUser.uid),
    ].slice(0, 6);
    setRecentAccounts(updatedAccounts);
    window.localStorage.setItem(
      'chatteraRecentAccounts',
      JSON.stringify(updatedAccounts)
    );

    onQuickSignIn(newUser);
  };

  // Handle Sign Up Form Submission -> Creates Account & Links directly to Home Page
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      setFormFeedback('Please enter your first and last name.');
      return;
    }

    const rawHandle =
      signupHandle.trim() ||
      `${firstName.trim()}_${lastName.trim()}`.toLowerCase();
    const cleanHandle =
      rawHandle
        .toLowerCase()
        .replace(/^@/, '')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '') || `user_${Date.now().toString().slice(-4)}`;

    const cleanEmail =
      signupEmailOrPhone.trim() || `${cleanHandle}@chattera.app`;

    const createdUser: LocalSessionUser = {
      uid: `user_${cleanHandle}`,
      displayName: fullName,
      handle: cleanHandle,
      email: cleanEmail,
      avatarUrl: selectedAvatar,
      statusText:
        signupBio.trim() || 'Hey there! I am using Chattera.',
    };

    const updatedAccounts = [
      createdUser,
      ...recentAccounts.filter((a) => a.uid !== createdUser.uid),
    ].slice(0, 6);
    setRecentAccounts(updatedAccounts);
    window.localStorage.setItem(
      'chatteraRecentAccounts',
      JSON.stringify(updatedAccounts)
    );

    // Log in immediately and navigate to the Home Page
    onQuickSignIn(createdUser);
  };

  const triggerGoogle = async () => {
    setLoadingGoogle(true);
    try {
      await onGoogleSignIn();
    } finally {
      setLoadingGoogle(false);
    }
  };

  // =========================================================================
  // STAGE 1: ANIMATED INTRO LOGO SPLASH SCREEN (Like WhatsApp / Facebook / Messenger)
  // =========================================================================
  if (stage === 'intro') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-between p-6 select-none transition-colors"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <div className="w-full max-w-5xl flex items-center justify-end">
          <button
            type="button"
            onClick={() => setStage('login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
          >
            Skip Intro →
          </button>
        </div>

        {/* Center Hero Animated Brand Emblem */}
        <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-6 my-auto">
          <ChatteraLogo size={108} animated />

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Chattera
            </h1>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--muted)' }}
            >
              Connect · Voice Notes · Real-Time Chat · Instant Wallet
            </p>
          </div>

          {/* Smooth Progress Indicator */}
          <div className="w-56 h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, introProgress)}%`,
                background:
                  'linear-gradient(90deg, #5b4bdb 0%, #21c47b 100%)',
              }}
            />
          </div>

          {/* Quick Action Buttons right on the Intro Screen */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStage('login')}
              className="h-11 px-6 rounded-2xl text-white text-xs font-bold inline-flex items-center gap-2 shadow-md transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #6756e7, #4434bd)',
              }}
            >
              <span>Log In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStage('signup')}
              className="h-11 px-6 rounded-2xl text-xs font-bold border inline-flex items-center gap-2 transition-transform active:scale-95"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              <UserPlus className="w-4 h-4 text-[#21c47b]" />
              <span>Sign Up</span>
            </button>
          </div>
        </div>

        {/* Footer Signature (Like Meta / WhatsApp / Facebook splash footer) */}
        <div className="text-center space-y-1 pb-2">
          <div
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            from
          </div>
          <div className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <Sparkles className="w-4 h-4 text-[#5b4bdb]" />
            <span>Chattera Social</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 2 & 3: FACEBOOK / WHATSAPP STYLE LOGIN PAGE & SIGN UP PAGE
  // =========================================================================
  return (
    <div
      className="min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 gap-3">
        <button
          type="button"
          onClick={() => setStage('intro')}
          className="flex items-center gap-3 text-left group focus:outline-none"
          title="Replay Intro Logo Splash"
        >
          <ChatteraLogo size={42} />
          <div>
            <span className="text-xl font-extrabold tracking-tight block leading-none">
              Chattera
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--muted)' }}
            >
              Connect & Chat in Real Time
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStage('intro')}
            className="h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
          >
            <Play className="w-3.5 h-3.5 text-[#5b4bdb]" />
            <span className="hidden sm:inline">Intro Logo</span>
          </button>

          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main 2-Column Split Layout (Like Facebook / Messenger Desktop & Mobile) */}
      <main className="max-w-6xl w-full mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: Brand Hero + Instant Recent Logins */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-4">
            <ChatteraLogo size={64} animated />
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Chattera
              </h1>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--muted)' }}
              >
                Real-Time Messenger · Voice Notes · Status · Wallet
              </p>
            </div>
          </div>

          <p
            className="text-lg sm:text-xl font-medium leading-relaxed max-w-xl"
            style={{ color: 'var(--text)' }}
          >
            Chattera helps you connect, send crystal-clear voice messages, and
            chat in real time with the people in your life.
          </p>

          {/* Facebook-Style "Recent Logins — Click your picture or add an account" */}
          <div className="space-y-3 pt-1">
            <div>
              <h2 className="text-base font-bold">Recent logins</h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Click your picture to go straight to your Home Page, or create a
                new account.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentAccounts.slice(0, 3).map((acc) => (
                <button
                  key={acc.uid}
                  type="button"
                  onClick={() => onQuickSignIn(acc)}
                  className="group rounded-2xl border p-3.5 text-center flex flex-col items-center gap-2.5 transition-all hover:-translate-y-0.5 hover:border-[#5b4bdb] shadow-2xs"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <ChatteraAvatar
                    name={acc.displayName}
                    src={acc.avatarUrl}
                    size={56}
                    online
                  />
                  <div className="min-w-0 w-full">
                    <div className="text-xs font-bold truncate group-hover:text-[#5b4bdb]">
                      {acc.displayName}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: 'var(--muted)' }}
                    >
                      @{acc.handle}
                    </div>
                  </div>
                  <span
                    className="w-full py-1 rounded-xl text-[10px] font-semibold"
                    style={{
                      background: 'var(--soft-tint)',
                      color: 'var(--primary)',
                    }}
                  >
                    Open Home
                  </span>
                </button>
              ))}

              {/* "+ Add Account" Card -> Switches to Sign Up Page */}
              <button
                type="button"
                onClick={() => {
                  setFormFeedback(null);
                  setStage('signup');
                }}
                className="rounded-2xl border border-dashed p-3.5 text-center flex flex-col items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 hover:border-[#5b4bdb]"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: 'var(--soft-tint)',
                    color: 'var(--primary)',
                  }}
                >
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <div
                    className="text-xs font-bold"
                    style={{ color: 'var(--primary)' }}
                  >
                    Add Account
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Create new profile
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dedicated Login Page / Sign Up Page Card */}
        <div
          className="lg:col-span-5 rounded-3xl border p-6 sm:p-8 shadow-md space-y-5"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Top Switcher Tabs: Log In | Sign Up */}
          <div
            className="grid grid-cols-2 p-1 rounded-2xl border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => {
                setFormFeedback(null);
                setStage('login');
              }}
              className="h-10 rounded-xl text-xs font-bold transition-all"
              style={{
                background: stage === 'login' ? 'var(--card)' : 'transparent',
                color: stage === 'login' ? 'var(--primary)' : 'var(--muted)',
                boxShadow:
                  stage === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setFormFeedback(null);
                setStage('signup');
              }}
              className="h-10 rounded-xl text-xs font-bold transition-all"
              style={{
                background: stage === 'signup' ? 'var(--card)' : 'transparent',
                color: stage === 'signup' ? 'var(--primary)' : 'var(--muted)',
                boxShadow:
                  stage === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Sign Up
            </button>
          </div>

          {(authError || formFeedback) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-300">
              {formFeedback || authError}
            </div>
          )}

          {/* ===============================================================
              VIEW A: LOGIN PAGE
             =============================================================== */}
          {stage === 'login' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Log in to Chattera</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Enter your details below to open your Home Page
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Email address, phone number, or @username
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--muted)' }}
                    />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Email address or @username"
                      className="w-full h-12 pl-10 pr-4 rounded-2xl border text-sm focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--muted)' }}
                    />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full h-12 pl-10 pr-11 rounded-2xl border text-sm focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--muted)' }}
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-[#5b4bdb]"
                    />
                    <span style={{ color: 'var(--muted)' }}>
                      Keep me logged in
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setRecoverySent(false);
                      setStage('forgot');
                    }}
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    Forgotten password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #6756e7, #4434bd)',
                  }}
                >
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Continue with Google */}
              <button
                type="button"
                disabled={loadingGoogle}
                onClick={() => void triggerGoogle()}
                className="w-full h-11 rounded-2xl border font-semibold text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                <LogIn className="w-4 h-4 text-[#5b4bdb]" />
                <span>
                  {loadingGoogle
                    ? 'Connecting to Google…'
                    : 'Continue with Google'}
                </span>
              </button>

              <div
                className="border-t pt-4 text-center"
                style={{ borderColor: 'var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFormFeedback(null);
                    setStage('signup');
                  }}
                  className="h-12 px-6 rounded-2xl text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #21c47b, #109e5e)',
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create New Account</span>
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              VIEW B: SIGN UP PAGE ("Create a New Account")
             =============================================================== */}
          {stage === 'signup' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Create a new account</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  It’s quick and easy — takes you straight to your Chattera Home
                  Page.
                </p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      First name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full h-11 px-3.5 rounded-xl border text-xs focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Surname
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Surname"
                      className="w-full h-11 px-3.5 rounded-xl border text-xs focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Username (@handle)
                    </label>
                    <input
                      type="text"
                      value={signupHandle}
                      onChange={(e) => setSignupHandle(e.target.value)}
                      placeholder="e.g. alex_okafor"
                      className="w-full h-11 px-3.5 rounded-xl border text-xs focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Mobile number or email
                    </label>
                    <input
                      type="text"
                      required
                      value={signupEmailOrPhone}
                      onChange={(e) => setSignupEmailOrPhone(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 px-3.5 rounded-xl border text-xs focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full h-11 px-3.5 pr-10 rounded-xl border text-xs focus:outline-none focus:border-[#5b4bdb]"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--muted)' }}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Choose Profile Picture */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5">
                    Choose your profile avatar
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {AVATAR_OPTIONS.map((url) => {
                      const selected = selectedAvatar === url;
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setSelectedAvatar(url)}
                          className={`p-0.5 rounded-full border-2 transition-transform ${
                            selected
                              ? 'border-[#21c47b] scale-105'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={url}
                            alt="Avatar option"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Status / Bio
                  </label>
                  <input
                    type="text"
                    value={signupBio}
                    onChange={(e) => setSignupBio(e.target.value)}
                    placeholder="Hey there! I am using Chattera."
                    className="w-full h-10 px-3.5 rounded-xl border text-xs focus:outline-none"
                    style={{
                      background: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #21c47b, #109e5e)',
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up & Go to Home</span>
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStage('login')}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Already have an account? Log In
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              VIEW C: FORGOT PASSWORD RECOVERY
             =============================================================== */}
          {stage === 'forgot' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Find Your Account</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Enter your email address or mobile number to reset your
                  password, or use a quick login card on the left.
                </p>
              </div>

              {recoverySent ? (
                <div className="p-4 rounded-2xl bg-[#21c47b]/15 border border-[#21c47b]/30 text-xs space-y-2">
                  <div className="font-bold text-[#21c47b] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Password recovery link sent!</span>
                  </div>
                  <p style={{ color: 'var(--text)' }}>
                    We’ve sent a recovery code to{' '}
                    <strong>{recoveryEmail || loginIdentifier}</strong>. You can
                    now log in directly below.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Email address or mobile number"
                    className="w-full h-11 px-3.5 rounded-xl border text-xs"
                    style={{
                      background: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setRecoverySent(true)}
                    className="w-full h-11 rounded-xl text-white font-bold text-xs"
                    style={{ background: 'var(--primary)' }}
                  >
                    Send Reset Link
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStage('login')}
                className="w-full h-10 rounded-xl border text-xs font-semibold"
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                Back to Log In
              </button>
            </div>
          )}
        </div>
      </main>

      <footer
        className="max-w-6xl w-full mx-auto text-center text-xs py-2 flex flex-wrap items-center justify-between gap-2 border-t"
        style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
      >
        <span>Chattera © {new Date().getFullYear()} · Real-Time Social Messenger</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStage('intro')}
            className="hover:underline"
          >
            Intro Logo
          </button>
          <button
            type="button"
            onClick={() => setStage('login')}
            className="hover:underline"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setStage('signup')}
            className="hover:underline"
          >
            Sign Up
          </button>
        </div>
      </footer>
    </div>
  );
};
