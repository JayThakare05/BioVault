import { useEffect } from 'react';

// ── Toast Notification ──────────────────────────────────────
export default function Toast({ type, message, hash, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: { bg: 'rgba(6,255,180,0.08)', border: 'rgba(6,255,180,0.3)', color: '#06ffb4', icon: '✓' },
    warning: { bg: 'rgba(255,165,2,0.08)', border: 'rgba(255,165,2,0.3)', color: '#ffa502', icon: '⚠' },
    error: { bg: 'rgba(255,71,87,0.08)', border: 'rgba(255,71,87,0.3)', color: '#ff4757', icon: '✕' },
  };

  const s = styles[type] || styles.success;

  return (
    <div
      className="toast fixed bottom-6 right-6 z-50 max-w-sm w-full rounded-2xl p-4 shadow-2xl"
      style={{ background: 'rgba(13,17,23,0.95)', border: `1px solid ${s.border}`, backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
          {s.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#f0f6fc' }}>{message}</p>
          {hash && <p className="font-mono text-xs mt-1 truncate" style={{ color: '#4a5568' }}>TX: {hash}</p>}
        </div>
        <button onClick={onClose} className="flex-shrink-0 text-sm transition-opacity hover:opacity-60" style={{ color: '#4a5568' }} aria-label="Dismiss">✕</button>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full"
        style={{ background: s.color, width: '100%', animation: 'shrink 6s linear forwards', transformOrigin: 'left' }}
      />
      <style>{`@keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  );
}
