import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { UserProfileDoc } from '../types';
import { isValidIdString } from '../validation';

interface KeyDirectoryViewProps {
  myProfile: UserProfileDoc;
  directoryProfiles: UserProfileDoc[];
  onStartConversationWithProfile: (peer: UserProfileDoc) => Promise<void>;
  onLookupPeerByUid: (targetUid: string) => Promise<UserProfileDoc | null>;
}

export const KeyDirectoryView: React.FC<KeyDirectoryViewProps> = ({
  myProfile,
  directoryProfiles,
  onStartConversationWithProfile,
  onLookupPeerByUid,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [directUidInput, setDirectUidInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [startingUid, setStartingUid] = useState<string | null>(null);

  const filteredProfiles = directoryProfiles.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.displayName.toLowerCase().includes(q) ||
      p.handle.toLowerCase().includes(q) ||
      p.keyFingerprint.toLowerCase().includes(q) ||
      p.uid.toLowerCase().includes(q)
    );
  });

  const handleStart = async (peer: UserProfileDoc) => {
    setStartingUid(peer.uid);
    setLookupError(null);
    try {
      await onStartConversationWithProfile(peer);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Unable to start encrypted session.'
      );
    } finally {
      setStartingUid(null);
    }
  };

  const handleDirectLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUid = directUidInput.trim();
    if (!isValidIdString(cleanedUid)) {
      setLookupError('Please enter a valid alphanumeric User UID (1–128 chars).');
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      const found = await onLookupPeerByUid(cleanedUid);
      if (!found) {
        setLookupError(
          'No discoverable public key profile found for that UID.'
        );
        return;
      }
      await onStartConversationWithProfile(found);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Peer UID lookup rejected.'
      );
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
            Public Key Directory & Peer Handshake
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verified ECDH P-256 public keys published to <code className="font-mono">/profiles</code>{' '}
            with zero PII exposure.
          </p>
        </div>

        <button
          type="button"
          disabled={startingUid === myProfile.uid}
          onClick={() => void handleStart(myProfile)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Lock className="w-3.5 h-3.5" />
          {startingUid === myProfile.uid
            ? 'Opening Personal E2EE Vault…'
            : 'Open Personal E2EE Vault'}
        </button>
      </div>

      {lookupError && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/70 rounded-lg text-xs text-red-300">
          {lookupError}
        </div>
      )}

      {/* Search & Direct UID Handshake */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Filter Public Key Directory by Name, @handle, or SHA-256 Fingerprint
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search handle, name, or hex fingerprint (e.g. A4F9:19C0)…"
              className="w-full pl-9 pr-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <form
          onSubmit={(e) => void handleDirectLookup(e)}
          className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2"
        >
          <label className="block text-xs font-medium text-slate-300">
            Connect by Direct Peer UID
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={directUidInput}
              onChange={(e) => setDirectUidInput(e.target.value)}
              placeholder="Paste peer UID…"
              className="w-full px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="px-3 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {lookingUp ? 'Looking up…' : 'Handshake'}
            </button>
          </div>
        </form>
      </div>

      {/* Directory Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">Discoverable Cryptographic Identities</span>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {filteredProfiles.length} {filteredProfiles.length === 1 ? 'identity' : 'identities'}
          </span>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-300 font-medium">
              No matching public key identities found.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Have a teammate sign in with Google to publish their ECDH P-256 public key, or open
              your Personal E2EE Vault to test encrypted messaging immediately.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-medium">Identity & Handle</th>
                  <th className="py-3 px-4 font-medium">Status Note</th>
                  <th className="py-3 px-4 font-medium">ECDH P-256 Key Fingerprint (SHA-256)</th>
                  <th className="py-3 px-4 font-medium text-right">Session Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredProfiles.map((peer) => {
                  const isSelf = peer.uid === myProfile.uid;
                  return (
                    <tr
                      key={peer.uid}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{peer.displayName}</span>
                          {isSelf && (
                            <span className="text-[11px] font-normal text-emerald-400">
                              · You (Loopback Vault)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono">
                          @{peer.handle} · UID {peer.uid.slice(0, 10)}…
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {peer.statusText}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-emerald-300">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{peer.keyFingerprint}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={startingUid === peer.uid}
                          onClick={() => void handleStart(peer)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 rounded-lg transition-colors whitespace-nowrap"
                        >
                          {isSelf ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Open Self Vault
                            </>
                          ) : (
                            <>
                              <MessageSquarePlus className="w-3.5 h-3.5" />
                              Start E2EE Chat
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
