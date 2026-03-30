import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useWallet } from '../context/WalletContext';
import SendModal from '../components/SendModal';
import Toast from '../components/Toast';

// ── Helper: shorten address ──────────────────────────────────
const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

// ── Helper: format date ──────────────────────────────────────
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Animated Counter ─────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const target = parseFloat(value);
    const start = 0;
    const duration = 1500;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed((start + (target - start) * eased).toFixed(4));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return <span>{prefix}{displayed}{suffix}</span>;
}

// ── QR Modal ─────────────────────────────────────────────────
function ReceiveModal({ address, onClose }) {
  const canvasRef = useRef();
  useEffect(() => {
    if (canvasRef.current && address) {
      QRCode.toCanvas(canvasRef.current, address, {
        width: 200,
        margin: 2,
        color: { dark: '#00d4ff', light: '#0d1117' },
      });
    }
  }, [address]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4"
        style={{ background: 'rgba(13,17,23,0.95)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-space font-bold text-xl" style={{ color: '#f0f6fc' }}>Receive Rs</h2>
        <p className="text-xs text-center" style={{ color: '#8b949e' }}>
          Scan QR code or copy address below
        </p>
        <div
          className="p-4 rounded-xl"
          style={{ background: '#0d1117', border: '1px solid rgba(0,212,255,0.2)' }}
        >
          <canvas ref={canvasRef} />
        </div>
        <div
          className="w-full px-4 py-3 rounded-xl font-mono text-xs text-center cursor-pointer transition-all hover:bg-opacity-10"
          style={{
            background: 'rgba(0,212,255,0.05)',
            border: '1px solid rgba(0,212,255,0.2)',
            color: '#00d4ff',
            wordBreak: 'break-all',
          }}
          onClick={() => { navigator.clipboard.writeText(address); }}
        >
          {address}
          <div className="text-xs mt-1" style={{ color: '#4a5568' }}>Click to copy</div>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{
            background: 'rgba(6,255,180,0.08)',
            border: '1px solid rgba(6,255,180,0.2)',
            color: '#06ffb4',
          }}
        >
          ✔ Wallet linked to this device securely
        </div>
        <button onClick={onClose} className="btn-ghost w-full py-2 text-sm">Close</button>
      </div>
    </div>
  );
}

// ── Transaction Row ──────────────────────────────────────────
function TxRow({ tx }) {
  const isSent = tx.type === 'sent';
  return (
    <div
      className="tx-card flex items-center gap-4 px-5 py-4 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 42, height: 42,
          background: isSent ? 'rgba(255,71,87,0.1)' : 'rgba(6,255,180,0.1)',
          border: `1px solid ${isSent ? 'rgba(255,71,87,0.3)' : 'rgba(6,255,180,0.3)'}`,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d={isSent ? 'M7 17L17 7M17 7H7M17 7V17' : 'M17 7L7 17M7 17H17M7 17V7'}
            stroke={isSent ? '#ff4757' : '#06ffb4'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: '#f0f6fc' }}>
          {tx.label}
        </p>
        <p className="text-xs mt-0.5 font-mono truncate" style={{ color: '#4a5568' }}>
          {shortAddr(tx.hash)}
        </p>
      </div>

      {/* Amount & Date */}
      <div className="text-right flex-shrink-0">
        <p
          className="font-semibold text-sm"
          style={{ color: isSent ? '#ff6b7a' : '#06ffb4' }}
        >
          {isSent ? '-' : '+'}₹{tx.amount}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#4a5568' }}>
          {fmtDate(tx.timestamp)}
        </p>
      </div>

      {/* Status */}
      <div
        className="flex-shrink-0 px-2 py-1 rounded-full text-xs"
        style={{
          background: 'rgba(6,255,180,0.08)',
          color: '#06ffb4',
        }}
      >
        ✓
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div
      className="stat-card glass-card p-5 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8b949e' }}>
          {label}
        </span>
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 36, height: 36, background: `${color}15`, border: `1px solid ${color}30` }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="font-space font-bold text-2xl" style={{ color }}>
          {value}
        </p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { wallet, balance, transactions, logout, authMethod, isAuthenticated } = useWallet();

  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  if (!wallet) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSuccess = (hash) => {
    setShowSend(false);
    setToast({ type: 'success', message: 'Transaction Successful!', hash });
    setTimeout(() => setToast(null), 6000);
  };

  const handleFraudAlert = (amount) => {
    setToast({
      type: 'warning',
      message: `⚠ Suspicious transaction detected — Amount ${amount} ETH exceeds threshold`,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sentTotal = transactions
    .filter(t => t.type === 'sent')
    .reduce((acc, t) => acc + parseFloat(t.amount), 0)
    .toFixed(4);



  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(124,58,237,0.08) 0%, rgba(0,212,255,0.03) 40%, #030712 70%)' }}
    >
      {/* ── Top Nav ── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(3,7,18,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #00d4ff20, #7c3aed20)',
              border: '1px solid rgba(0,212,255,0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#00d4ff" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#06ffb4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-space font-bold text-lg">
            Bio<span className="shimmer-text">Vault</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Auth Badge */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: 'rgba(6,255,180,0.08)',
              border: '1px solid rgba(6,255,180,0.2)',
              color: '#06ffb4',
            }}
          >
            <div className="status-dot" style={{ background: '#06ffb4', boxShadow: '0 0 8px #06ffb4' }} />
            {authMethod === 'webauthn' ? '🔐 WebAuthn Verified' : '🧬 Biometric Active'}
          </div>

          {/* Logout */}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Hero Balance Card ── */}
        <div
          className="relative rounded-2xl overflow-hidden p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(124,58,237,0.12) 50%, rgba(6,255,180,0.05) 100%)',
            border: '1px solid rgba(0,212,255,0.2)',
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 animate-float"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(30%, -30%)' }}
          />

          <div className="relative z-10">
            <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>
              Total Balance
            </p>
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="font-space font-bold text-5xl" style={{ color: '#f0f6fc' }}>
                <AnimatedNumber value={balance} />
              </h2>
              <span className="text-xl font-semibold" style={{ color: '#00d4ff' }}>Rs</span>
            </div>

            {/* Address Row */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-80"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onClick={handleCopyAddress}
              >
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    boxShadow: '0 0 12px rgba(0,212,255,0.4)',
                  }}
                />
                <span className="font-mono text-sm" style={{ color: '#8b949e' }}>
                  {shortAddr(wallet.address)}
                </span>
                <span className="text-xs" style={{ color: copied ? '#06ffb4' : '#4a5568' }}>
                  {copied ? '✓ Copied!' : '📋'}
                </span>
              </div>

              {/* Key Privacy Badge */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  color: '#a78bfa',
                }}
              >
                🔐 Private key secured in background
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                id="send-btn"
                onClick={() => setShowSend(true)}
                className="btn-primary px-6 py-3 text-sm flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Send Rs
              </button>
              <button
                id="receive-btn"
                onClick={() => setShowReceive(true)}
                className="btn-ghost px-6 py-3 text-sm flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v14M5 9l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Receive
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#00d4ff" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round"/></svg>}
            label="Transactions"
            value={transactions.length}
            color="#00d4ff"
            sub="Total activity"
          />
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="#ff4757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="Total Sent"
            value={`₹${sentTotal}`}
            color="#ff6b7a"
            sub="Outgoing"
          />
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#06ffb4" strokeWidth="2" strokeLinejoin="round"/></svg>}
            label="Security"
            value="Excellent"
            color="#06ffb4"
            sub="Biometric bound"
          />
        </div>

        {/* ── Key Info Panel ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(124,58,237,0.05)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#7c3aed' }}>
            🔐 Security Information
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: '#8b949e' }}>Wallet Address</p>
              <p className="font-mono text-sm break-all" style={{ color: '#00d4ff' }}>{wallet.address}</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: '#8b949e' }}>Private Key</p>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-xs" style={{ color: '#4a5568' }}>
                    ████████████████████████████████████
                  </span>
                  <span className="text-xs ml-auto" style={{ color: '#7c3aed' }}>Hidden</span>
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: '#8b949e' }}>Auth Method</p>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{
                    background: 'rgba(6,255,180,0.08)',
                    border: '1px solid rgba(6,255,180,0.2)',
                    color: '#06ffb4',
                  }}
                >
                  <div className="status-dot" style={{ background: '#06ffb4', boxShadow: '0 0 6px #06ffb4', width: 6, height: 6 }} />
                  {authMethod === 'webauthn' ? 'WebAuthn (Platform Authenticator)' : 'Biometric Simulation'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Transaction History ── */}
        <div className="glass-card p-6" style={{ background: 'rgba(13,17,23,0.5)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-space font-semibold text-lg" style={{ color: '#f0f6fc' }}>
              Transaction History
            </h3>
            <div
              className="px-3 py-1 rounded-full text-xs"
              style={{
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.2)',
                color: '#00d4ff',
              }}
            >
              {transactions.length} records
            </div>
          </div>

          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#4a5568' }}>
                <p className="text-4xl mb-3">📭</p>
                <p>No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <div key={tx.hash} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fadeInUp">
                  <TxRow tx={tx} />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Modals ── */}
      {showSend && (
        <SendModal
          onClose={() => setShowSend(false)}
          onSuccess={handleSendSuccess}
          onFraudAlert={handleFraudAlert}
        />
      )}
      {showReceive && (
        <ReceiveModal
          address={wallet.address}
          onClose={() => setShowReceive(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          hash={toast.hash}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
