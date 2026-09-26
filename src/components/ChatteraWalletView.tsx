import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Plus,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { ChatteraSeedContact, WalletTransaction } from '../chatteraData';

interface ChatteraWalletViewProps {
  balanceNaira: number;
  transactions: WalletTransaction[];
  contacts: ChatteraSeedContact[];
  onTopUpWallet: (amount: number) => void;
  onSendEncryptedCash: (
    recipientName: string,
    recipientHandle: string,
    amount: number,
    note: string
  ) => Promise<void>;
}

export const ChatteraWalletView: React.FC<ChatteraWalletViewProps> = ({
  balanceNaira,
  transactions,
  contacts,
  onTopUpWallet,
  onSendEncryptedCash,
}) => {
  const [selectedHandle, setSelectedHandle] = useState(
    contacts[0]?.handle || 'amara_okafor'
  );
  const [amountInput, setAmountInput] = useState('5000');
  const [transferNote, setTransferNote] = useState('Lunch & project milestone');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountInput);
    if (!numericAmount || numericAmount <= 0 || numericAmount > balanceNaira) {
      setFeedback('Please enter a valid amount within your available Naira balance.');
      return;
    }
    const target =
      contacts.find((c) => c.handle === selectedHandle) || contacts[0];
    setSending(true);
    setFeedback(null);
    try {
      await onSendEncryptedCash(
        target.name,
        target.handle,
        numericAmount,
        transferNote.trim() || 'Chattera E2EE Transfer'
      );
      setFeedback(
        `Sent ₦${numericAmount.toLocaleString()} to ${target.name} with an AES-256-GCM encrypted chat receipt.`
      );
      setAmountInput('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 space-y-6">
      {/* Main Balance Card */}
      <div
        className="rounded-3xl p-6 text-white shadow-xl space-y-5"
        style={{
          background: 'linear-gradient(135deg, #5b4bdb 0%, #3828a8 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Chattera Smart Escrow & E2EE Wallet
          </span>
          <span className="text-xs font-mono text-white/75">NGN · ₦</span>
        </div>

        <div>
          <div className="text-xs text-white/70">Available Balance</div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums mt-1">
            ₦{balanceNaira.toLocaleString()}
            <span className="text-lg text-white/70">.00</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              onTopUpWallet(25000);
              setFeedback('Added ₦25,000.00 instant deposit to your Chattera Wallet.');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-bold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Quick Top-Up +₦25,000
          </button>

          <span className="text-[11px] text-white/75">
            Every transfer dispatches a signed E2EE receipt into your chat thread.
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className="p-3.5 rounded-2xl border text-xs font-medium"
          style={{
            background: 'var(--soft-tint)',
            borderColor: 'var(--border)',
            color: 'var(--primary)',
          }}
        >
          {feedback}
        </div>
      )}

      {/* Send Encrypted Cash Form */}
      <form
        onSubmit={(e) => void handleSendMoney(e)}
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#5b4bdb]" />
            Send Encrypted In-Chat Transfer
          </h3>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Zero Fee · Instant E2EE Voucher
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Recipient Contact
            </label>
            <select
              value={selectedHandle}
              onChange={(e) => setSelectedHandle(e.target.value)}
              className="w-full h-11 px-3 rounded-2xl border text-xs font-medium focus:outline-none"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.handle}>
                  {c.name} (@{c.handle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Amount (₦ Naira)
            </label>
            <input
              type="number"
              min={100}
              max={balanceNaira}
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="5000"
              className="w-full h-11 px-3.5 rounded-2xl border text-sm font-mono tabular-nums focus:outline-none"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Encrypted Payment Note
          </label>
          <input
            type="text"
            maxLength={80}
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            placeholder="What is this transfer for?"
            className="w-full h-11 px-3.5 rounded-2xl border text-xs focus:outline-none"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full h-11 rounded-2xl text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #6756e7, #4434bd)',
          }}
        >
          <Send className="w-3.5 h-3.5" />
          {sending
            ? 'Encrypting Payment Voucher…'
            : 'Send ₦ & Deliver E2EE Chat Receipt'}
        </button>
      </form>

      {/* Recent Transactions Ledger */}
      <div
        className="rounded-3xl p-5 border space-y-3"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Recent Encrypted Ledger</h3>
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: 'var(--muted)' }}
          >
            {transactions.length} entries
          </span>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      tx.type === 'credit'
                        ? 'rgba(33, 196, 123, 0.14)'
                        : 'var(--soft-tint)',
                    color: tx.type === 'credit' ? '#21c47b' : 'var(--primary)',
                  }}
                >
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{tx.title}</div>
                  <div
                    className="text-[11px] font-mono truncate"
                    style={{ color: 'var(--muted)' }}
                  >
                    {tx.counterparty} · {tx.timestamp} · {tx.reference}
                  </div>
                </div>
              </div>

              <div
                className={`text-xs font-bold font-mono tabular-nums shrink-0 ${
                  tx.type === 'credit' ? 'text-[#21c47b]' : ''
                }`}
              >
                {tx.type === 'credit' ? '+' : '-'}₦
                {tx.amountNaira.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
