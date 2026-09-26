import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
  Save,
  Shield,
  Upload,
} from 'lucide-react';
import { StoredIdentityKeyVault } from '../crypto/e2ee';
import { UserPrivateDoc, UserProfileDoc } from '../types';
import {
  BLUEPRINT_LIMITS,
  sanitizeDisplayName,
  sanitizeHandle,
  sanitizeStatusText,
} from '../validation';

interface KeyVaultViewProps {
  myProfile: UserProfileDoc;
  myPrivateDoc: UserPrivateDoc | null;
  keyVault: StoredIdentityKeyVault;
  onUpdateProfileMetadata: (updates: {
    displayName: string;
    handle: string;
    statusText: string;
    discoverable: boolean;
  }) => Promise<void>;
  onRotateKeyPair: () => Promise<void>;
  onImportKeyVaultJson: (jsonStr: string) => Promise<void>;
}

export const KeyVaultView: React.FC<KeyVaultViewProps> = ({
  myProfile,
  myPrivateDoc,
  keyVault,
  onUpdateProfileMetadata,
  onRotateKeyPair,
  onImportKeyVaultJson,
}) => {
  const [displayName, setDisplayName] = useState(myProfile.displayName);
  const [handle, setHandle] = useState(myProfile.handle);
  const [statusText, setStatusText] = useState(myProfile.statusText);
  const [discoverable, setDiscoverable] = useState(myProfile.discoverable);

  const [savingProfile, setSavingProfile] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copiedVault, setCopiedVault] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportPanel, setShowImportPanel] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      const cleanHandle = sanitizeHandle(handle, myProfile.uid);
      const cleanName = sanitizeDisplayName(displayName, cleanHandle);
      const cleanStatus = sanitizeStatusText(statusText);

      setHandle(cleanHandle);
      setDisplayName(cleanName);
      setStatusText(cleanStatus);

      await onUpdateProfileMetadata({
        displayName: cleanName,
        handle: cleanHandle,
        statusText: cleanStatus,
        discoverable,
      });
      setFeedbackMsg('Public directory profile updated and verified by Firestore rules.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRotate = async () => {
    setRotatingKey(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      await onRotateKeyPair();
      setFeedbackMsg(
        'Generated new ECDH P-256 keypair and synchronized public coordinates to Firestore.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to rotate keypair.');
    } finally {
      setRotatingKey(false);
    }
  };

  const handleCopyBackup = async () => {
    const serialized = JSON.stringify(keyVault, null, 2);
    await navigator.clipboard.writeText(serialized);
    setCopiedVault(true);
    window.setTimeout(() => setCopiedVault(false), 2000);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      await onImportKeyVaultJson(importJsonText);
      setImportJsonText('');
      setShowImportPanel(false);
      setFeedbackMsg('Imported ECDH P-256 key vault and synchronized public directory key.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid key backup JSON.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
          Cryptographic Key Vault & Directory Identity
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your client-side ECDH P-256 private key, public key directory entry, and isolated
          private PII record.
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/70 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/70 rounded-lg text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public Identity Form */}
        <form
          onSubmit={(e) => void handleSaveProfile(e)}
          className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              01. Public Directory Profile (/profiles/{myProfile.uid.slice(0, 8)}…)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero PII stored here. Published for peer discovery and ECDH key exchange.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Display Name ({displayName.length}/{BLUEPRINT_LIMITS.DISPLAY_NAME_MAX})
            </label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Directory Handle (@handle · alphanumeric/underscore)
            </label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.HANDLE_MAX}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-lg text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Cryptographic Status Note ({statusText.length}/{BLUEPRINT_LIMITS.STATUS_TEXT_MAX})
            </label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.STATUS_TEXT_MAX}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-1 flex items-center justify-between">
            <div>
              <span className="block text-xs font-medium text-slate-200">
                Public Key Directory Listing
              </span>
              <span className="block text-[11px] text-slate-400">
                Allow verified users to discover your public key in the directory
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={discoverable}
              onClick={() => setDiscoverable(!discoverable)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                discoverable
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {discoverable ? 'Discoverable: Yes' : 'Discoverable: Hidden'}
            </button>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              {savingProfile ? 'Saving Profile…' : 'Save Directory Profile'}
            </button>
          </div>
        </form>

        {/* Active WebCrypto Keypair Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                02. Active WebCrypto ECDH P-256 Keypair
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Private scalar <code className="font-mono">d</code> never leaves your browser
                storage.
              </p>
            </div>
            <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">
                SHA-256 Public Key Fingerprint
              </span>
              <div className="p-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg font-mono tabular-nums text-emerald-300 break-all">
                {keyVault.keyFingerprint}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">
                Public Coordinate X (Base64URL · {keyVault.publicKeyX.length} chars)
              </span>
              <div className="p-2 bg-[#0b0f17] border border-slate-800 rounded-lg font-mono text-slate-300 break-all">
                {keyVault.publicKeyX}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">
                Public Coordinate Y (Base64URL · {keyVault.publicKeyY.length} chars)
              </span>
              <div className="p-2 bg-[#0b0f17] border border-slate-800 rounded-lg font-mono text-slate-300 break-all">
                {keyVault.publicKeyY}
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span>Isolated Owner PII Record (/users/{myProfile.uid.slice(0, 8)}…)</span>
              <span className="font-mono text-slate-300">
                {myPrivateDoc?.email || 'Owner-Only Access'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800">
            <button
              type="button"
              disabled={rotatingKey}
              onClick={() => void handleRotate()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rotatingKey ? 'animate-spin' : ''}`} />
              {rotatingKey ? 'Rotating Keypair…' : 'Rotate ECDH Keypair'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyBackup()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              {copiedVault ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Backup JSON Copied
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Copy Key Backup JSON
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowImportPanel(!showImportPanel)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Key Backup
            </button>
          </div>

          {showImportPanel && (
            <form
              onSubmit={(e) => void handleImportSubmit(e)}
              className="pt-3 space-y-2 border-t border-slate-800"
            >
              <label className="block text-xs text-slate-300">
                Paste exported Key Vault JSON to restore decryption across devices:
              </label>
              <textarea
                rows={4}
                required
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"uid":"...","publicKeyX":"...","publicKeyY":"...","privateKeyD":"..."}'
                className="w-full p-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportPanel(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap"
                >
                  Restore & Sync Keypair
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* UID Lookup Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Your Direct Peer UID for Out-of-Band Session Initiation</span>
          </div>
          <p className="text-xs text-slate-400">
            Share your UID with peers if you disable public directory listing.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0b0f17] border border-slate-800 px-3 py-2 rounded-lg">
          <code className="text-xs font-mono text-slate-200 select-all">{myProfile.uid}</code>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(myProfile.uid)}
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Copy UID"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
