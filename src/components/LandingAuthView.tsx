import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  base64ToHex,
  computePublicKeyFingerprint,
} from '../crypto/e2ee';

interface LandingAuthViewProps {
  onSignInWithGoogle: () => Promise<void>;
  signingIn: boolean;
  authError: string | null;
}

export const LandingAuthView: React.FC<LandingAuthViewProps> = ({
  onSignInWithGoogle,
  signingIn,
  authError,
}) => {
  const [demoPlaintext, setDemoPlaintext] = useState(
    'Initiate zero-knowledge handshake at 08:30 UTC.'
  );
  const [demoState, setDemoState] = useState<{
    fingerprint: string;
    ivHex: string;
    ciphertextB64: string;
    decrypted: string;
  } | null>(null);

  const runBrowserCryptoPreview = async (input: string) => {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
    const pubJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const fp = await computePublicKeyFingerprint(pubJwk.x || '', pubJwk.y || '');

    const aesKey = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: keyPair.publicKey },
      keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);
    const encoded = new TextEncoder().encode(input || 'Empty payload');
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      encoded
    );

    const cipherBytes = new Uint8Array(cipherBuf);
    let binary = '';
    for (let i = 0; i < cipherBytes.byteLength; i++) {
      binary += String.fromCharCode(cipherBytes[i]);
    }
    const cipherB64 = window.btoa(binary);

    let ivBinary = '';
    for (let i = 0; i < iv.byteLength; i++) {
      ivBinary += String.fromCharCode(iv[i]);
    }
    const ivB64 = window.btoa(ivBinary);

    const decBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      cipherBuf
    );
    const decStr = new TextDecoder().decode(decBuf);

    setDemoState({
      fingerprint: fp,
      ivHex: base64ToHex(ivB64),
      ciphertextB64: cipherB64,
      decrypted: decStr,
    });
  };

  useEffect(() => {
    void runBrowserCryptoPreview(demoPlaintext);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111827]">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap"
        >
          CipherGrid
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <a
            href="#architecture"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Architecture
          </a>
          <a
            href="#sandbox"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Encryption Bench
          </a>
          <a
            href="#invariants"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Zero-Trust Rules
          </a>
          <a
            href="#verification"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Safety Numbers
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void onSignInWithGoogle()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5" />
            {signingIn ? 'Authenticating…' : 'Sign In with Google'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <section id="top" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs text-emerald-400 font-medium tracking-wide">
              WebCrypto ECDH P-256 · Authenticated AES-256-GCM · Real-Time Firestore Sync
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight leading-tight max-w-2xl"
              style={{ textWrap: 'balance' }}
            >
              Real-time messaging where plaintext never leaves your browser.
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-xl">
              CipherGrid generates an Elliptic Curve Diffie-Hellman (NIST P-256) keypair locally
              in your browser via the Web Crypto API. Messages are encrypted with 256-bit
              AES-GCM and a fresh 96-bit initialization vector before touching the network.
            </p>

            {authError && (
              <div className="p-3.5 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300 max-w-xl">
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void onSignInWithGoogle()}
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <KeyRound className="w-4 h-4" />
                {signingIn
                  ? 'Provisioning Identity Key…'
                  : 'Authenticate & Provision E2EE Keypair'}
              </button>

              <div className="text-xs text-slate-400 tabular-nums">
                <span>256-bit AES-GCM</span>
                <span aria-hidden="true"> · </span>
                <span>96-bit Random IV</span>
                <span aria-hidden="true"> · </span>
                <span>128-bit Auth Tag</span>
              </div>
            </div>
          </div>

          {/* Interactive Ephemeral WebCrypto Sandbox Card */}
          <div
            id="sandbox"
            className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Live Browser WebCrypto Inspector
                </h2>
                <p className="text-xs text-slate-400">
                  Type below to inspect real-time AES-256-GCM packet output.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runBrowserCryptoPreview(demoPlaintext)}
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Generate new 96-bit IV and re-encrypt"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Sample Plaintext Frame
              </label>
              <input
                type="text"
                value={demoPlaintext}
                onChange={(e) => {
                  setDemoPlaintext(e.target.value);
                  void runBrowserCryptoPreview(e.target.value);
                }}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {demoState && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[11px]">
                    Ephemeral ECDH P-256 SHA-256 Fingerprint
                  </span>
                  <span className="text-emerald-300 tabular-nums break-all">
                    {demoState.fingerprint}
                  </span>
                </div>

                <div className="p-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[11px]">
                    96-Bit Initialization Vector (Hex)
                  </span>
                  <span className="text-slate-200 tabular-nums break-all">
                    {demoState.ivHex}
                  </span>
                </div>

                <div className="p-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block text-[11px]">
                    Firestore Payload (Base64 Ciphertext + 128-Bit GCM Tag)
                  </span>
                  <span className="text-slate-300 break-all">
                    {demoState.ciphertextB64}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Architecture & Security Section */}
        <section
          id="architecture"
          className="border-t border-slate-800 pt-12 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>01. ECDH P-256 Key Agreement</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each user publishes only their public elliptic curve coordinates (
              <code className="font-mono text-slate-300">publicKeyX</code>,{' '}
              <code className="font-mono text-slate-300">publicKeyY</code>) to the public
              directory. Shared 256-bit conversation keys are derived locally via Diffie-Hellman
              key exchange.
            </p>
          </div>

          <div id="invariants" className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>02. Split-Collection PII Isolation</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Account email addresses are isolated in <code className="font-mono text-slate-300">/users/&#123;uid&#125;</code>{' '}
              with owner-only read rules and listing disabled. Public key profiles in{' '}
              <code className="font-mono text-slate-300">/profiles/&#123;uid&#125;</code> contain zero
              personally identifiable information.
            </p>
          </div>

          <div id="verification" className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>03. 60-Digit Safety Number Verification</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every session generates a deterministic 12-block pairwise SHA-256 Safety Number over
              both participants&apos; public key fingerprints, enabling out-of-band verification
              against key substitution.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
