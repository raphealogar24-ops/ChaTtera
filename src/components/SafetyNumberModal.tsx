import React, { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck, X } from 'lucide-react';
import { computeSafetyNumber } from '../crypto/e2ee';
import { UserProfileDoc } from '../types';

interface SafetyNumberModalProps {
  myProfile: UserProfileDoc;
  peerProfile: UserProfileDoc | null;
  onClose: () => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  myProfile,
  peerProfile,
  onClose,
}) => {
  const [safetyNumber, setSafetyNumber] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const peerFp = peerProfile?.keyFingerprint || myProfile.keyFingerprint;
    void computeSafetyNumber(myProfile.keyFingerprint, peerFp).then((code) => {
      if (active) {
        setSafetyNumber(code);
      }
    });
    return () => {
      active = false;
    };
  }, [myProfile.keyFingerprint, peerProfile?.keyFingerprint]);

  const handleCopy = async () => {
    if (!safetyNumber) return;
    await navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const groups = safetyNumber ? safetyNumber.split(' ') : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-number-title"
    >
      <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2
              id="safety-number-title"
              className="text-base font-semibold text-slate-100 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Cryptographic Safety Number Verification
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Compare these 60 digits out-of-band with{' '}
              <span className="text-slate-200 font-medium">
                {peerProfile ? peerProfile.displayName : myProfile.displayName}
              </span>{' '}
              to verify zero man-in-the-middle key substitution.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#0b0f17] border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">
              Pairwise SHA-256 Safety Number · ECDH P-256
            </span>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Number
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center py-2">
            {groups.map((grp, idx) => (
              <div
                key={idx}
                className="font-mono tabular-nums text-sm font-semibold text-emerald-300 tracking-wider py-1.5 bg-[#111827] border border-slate-800/80 rounded"
              >
                {grp}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-[#0b0f17] border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Local Identity Key ({myProfile.displayName} · @{myProfile.handle})
              </span>
              <span>NIST P-256</span>
            </div>
            <p className="font-mono tabular-nums text-slate-300 break-all">
              {myProfile.keyFingerprint}
            </p>
            <p className="font-mono text-[11px] text-slate-500 break-all">
              X: {myProfile.publicKeyX} · Y: {myProfile.publicKeyY}
            </p>
          </div>

          {peerProfile && (
            <div className="p-3.5 bg-[#0b0f17] border border-slate-800 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Peer Identity Key ({peerProfile.displayName} · @{peerProfile.handle})
                </span>
                <span>NIST P-256</span>
              </div>
              <p className="font-mono tabular-nums text-slate-300 break-all">
                {peerProfile.keyFingerprint}
              </p>
              <p className="font-mono text-[11px] text-slate-500 break-all">
                X: {peerProfile.publicKeyX} · Y: {peerProfile.publicKeyY}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap"
          >
            Done Verifying
          </button>
        </div>
      </div>
    </div>
  );
};
