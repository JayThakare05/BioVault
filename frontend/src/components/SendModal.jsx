import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { Html5QrcodeScanner } from 'html5-qrcode';

// ── Send ETH Modal ─────────────────────────────────────────────
export default function SendModal({ onClose, onSuccess }) {
  const { sendTransaction, balance, performBiometricVerify } = useWallet();

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | fraud-warn | sending | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const scannerRef = useRef(null);

  const validateForm = () => {
    if (!to.trim()) return 'Recipient username is required';
    if (!amount || parseFloat(amount) <= 0) return 'Enter a valid amount';
    if (parseFloat(amount) > parseFloat(balance)) return 'Insufficient balance';
    return null;
  };

  const handleSend = async () => {
    const err = validateForm();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');

    setPhase('sending');
    try {
      await performBiometricVerify(); // Biometric Check before transaction!
      const hash = await sendTransaction({ to, amount, label });
      setTxHash(hash);
      setPhase('done');
      setTimeout(() => onSuccess(hash), 1200);
    } catch (e) {
      setErrorMsg(e.response?.data?.error || e.message || "Biometric Check Failed");
      setPhase('error');
    }
  };

  useEffect(() => {
    if (showQRScanner) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      });

      scanner.render((decodedText) => {
        setTo(decodedText);
        setShowQRScanner(false);
        scanner.clear();
      }, (err) => {
        // console.warn(err);
      });

      return () => scanner.clear();
    }
  }, [showQRScanner]);

  const shortHash = (h) => h ? `${h.slice(0, 10)}...${h.slice(-8)}` : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md mx-4 overflow-hidden"
        style={{ background: 'rgba(13,17,23,0.98)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="font-space font-bold text-xl" style={{ color: '#f0f6fc' }}>
            Send Rs
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full transition-all hover:bg-white/10"
            style={{ width: 32, height: 32, color: '#8b949e' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Success State ── */}
          {phase === 'done' && (
            <div className="flex flex-col items-center gap-5 py-6 animate-fadeIn">
              <div
                className="flex items-center justify-center rounded-full animate-pulse-glow"
                style={{
                  width: 80, height: 80,
                  background: 'rgba(6,255,180,0.1)',
                  border: '2px solid #06ffb4',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L19 7" stroke="#06ffb4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-center">
                <h3 className="font-space font-bold text-xl mb-1" style={{ color: '#06ffb4' }}>
                  Transaction Successful!
                </h3>
                <p className="text-sm" style={{ color: '#8b949e' }}>
                  ₹{amount} sent successfully
                </p>
              </div>
              <div
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(6,255,180,0.05)',
                  border: '1px solid rgba(6,255,180,0.2)',
                }}
              >
                <p className="text-xs mb-1" style={{ color: '#4a5568' }}>TX Hash</p>
                <p className="font-mono text-xs break-all" style={{ color: '#06ffb4' }}>{txHash}</p>
              </div>
            </div>
          )}



          {/* ── Form ── */}
          {(phase === 'idle' || phase === 'error') && (
            <>
              {/* Available balance */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(0,212,255,0.05)',
                  border: '1px solid rgba(0,212,255,0.15)',
                }}
              >
                <span className="text-xs" style={{ color: '#8b949e' }}>Available</span>
                <span className="font-mono text-sm font-semibold" style={{ color: '#00d4ff' }}>
                  ₹{balance}
                </span>
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: '#8b949e' }}>
                    Recipient Username
                  </label>
                  <button 
                    onClick={() => setShowQRScanner(!showQRScanner)}
                    className="text-[10px] uppercase tracking-wider font-bold py-1 px-2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-all"
                  >
                    {showQRScanner ? '✕ Close Scanner' : '📷 Scan QR'}
                  </button>
                </div>

                {showQRScanner && (
                  <div id="reader" className="w-full overflow-hidden rounded-xl border border-white/10 mt-2 bg-black" />
                )}

                <input
                  id="send-to-input"
                  type="text"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="e.g. Satoshi"
                  className="input-field w-full px-4 py-3 text-sm font-mono"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: '#8b949e' }}>
                  Amount (Rs)
                </label>
                <div className="relative">
                  <input
                    id="send-amount-input"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.001"
                    min="0"
                    className="input-field w-full px-4 py-3 text-sm pr-20"
                  />
                  <button
                    onClick={() => setAmount(balance)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
                    style={{
                      background: 'rgba(0,212,255,0.1)',
                      color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,0.2)',
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Label (optional) */}
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: '#8b949e' }}>
                  Label (optional)
                </label>
                <input
                  id="send-label-input"
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Payment to Alice"
                  className="input-field w-full px-4 py-3 text-sm"
                />
              </div>

              {/* Error */}
              {(phase === 'error' || errorMsg) && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fadeIn"
                  style={{
                    background: 'rgba(255,71,87,0.08)',
                    border: '1px solid rgba(255,71,87,0.3)',
                    color: '#ff4757',
                  }}
                >
                  ✕ {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                id="send-confirm-btn"
                onClick={handleSend}
                className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2 mt-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Review & Send
              </button>
            </>
          )}

          {/* ── Sending State ── */}
          {phase === 'sending' && (
            <div className="flex flex-col items-center gap-6 py-8 animate-fadeIn">
              <div
                className="relative flex items-center justify-center"
                style={{ width: 80, height: 80 }}
              >
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
                  style={{ borderTopColor: '#00d4ff', borderLeftColor: '#7c3aed' }}
                />
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: '#f0f6fc' }}>Broadcasting Transaction</p>
                <p className="text-sm mt-1 animate-pulse" style={{ color: '#00d4ff' }}>
                  Signing with biometric key...
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
