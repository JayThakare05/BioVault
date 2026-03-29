import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

function ParticleField() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full" style={{
          left: `${Math.random() * 100}%`,
          background: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#7c3aed' : '#06ffb4',
          opacity: Math.random() * 0.6 + 0.2,
          animation: `particle-float ${Math.random() * 10 + 8}s linear ${Math.random() * 5}s infinite`,
        }} />
      ))}
    </div>
  );
}

function FingerprintScanner({ scanning, success, error }) {
  return (
    <div className="relative flex items-center justify-center scale-75 sm:scale-100" style={{ width: 180, height: 180 }}>
      <div className="absolute fingerprint-ring fingerprint-ring-1" style={{ width: 180, height: 180 }} />
      <div className="absolute fingerprint-ring fingerprint-ring-2" style={{ width: 150, height: 150 }} />

      <div
        className="relative flex items-center justify-center rounded-full transition-all duration-500"
        style={{
          width: 120, height: 120,
          background: error ? 'radial-gradient(circle, rgba(255,71,87,0.2) 0%, rgba(255,71,87,0.05) 100%)'
            : success ? 'radial-gradient(circle, rgba(6,255,180,0.2) 0%, rgba(6,255,180,0.05) 100%)'
            : scanning ? 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, rgba(124,58,237,0.1) 100%)'
            : 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 100%)',
          border: `2px solid ${error ? '#ff4757' : success ? '#06ffb4' : scanning ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: scanning ? '0 0 40px rgba(0,212,255,0.5), inset 0 0 30px rgba(0,212,255,0.1)'
            : success ? '0 0 40px rgba(6,255,180,0.5)'
            : error ? '0 0 40px rgba(255,71,87,0.5)' : '0 0 20px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M30 8C18.4 8 9 17.4 9 29" stroke={error ? '#ff4757' : success ? '#06ffb4' : '#00d4ff'} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
          <path d="M30 8C41.6 8 51 17.4 51 29" stroke={error ? '#ff4757' : success ? '#06ffb4' : '#7c3aed'} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
          <path d="M15 29C15 21.3 21.7 15 29.5 15C37.3 15 44 21 44 29" stroke={error ? '#ff4757' : success ? '#06ffb4' : '#00d4ff'} strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
          <path d="M20 34C20 27.4 24.5 22 30 22C35.5 22 40 27.4 40 34" stroke={error ? '#ff4757' : success ? '#06ffb4' : '#7c3aed'} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          <path d="M24 38C24 33.6 26.7 30 30 30C33.3 30 36 33.6 36 38" stroke={error ? '#ff4757' : success ? '#06ffb4' : '#00d4ff'} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
          <circle cx="30" cy="42" r="2" fill={error ? '#ff4757' : success ? '#06ffb4' : '#7c3aed'} opacity="0.6"/>
        </svg>

        {scanning && (
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{ pointerEvents: 'none' }}>
            <div className="absolute w-full" style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)', animation: 'scan-line 1.5s linear infinite' }} />
          </div>
        )}
      </div>

      {success && (
        <div className="absolute inset-0 flex items-center justify-center animate-fadeIn">
          <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: 'rgba(6,255,180,0.2)', border: '2px solid #06ffb4', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L19 7" stroke="#06ffb4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { registerAccount, loginAccount, isAuthenticated } = useWallet();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | scanning | success | error
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Check if a profile exists to default to login mode
  useEffect(() => {
    const saved = localStorage.getItem('biovault_username');
    if (!saved) setMode('register');
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleAuth = async () => {
    if (phase === 'scanning') return;
    if (mode === 'register' && !username.trim()) {
      setErrorMsg("Please enter a username");
      setPhase('error');
      setTimeout(() => setPhase('idle'), 3000);
      return;
    }

    setPhase('scanning');
    setErrorMsg('');
    setStatusMsg('Scanning biometrics...');

    try {
      setStatusMsg('Verifying identity...');
      if (mode === 'register') {
        await registerAccount(username);
      } else {
        await loginAccount();
      }
      setPhase('success');
      setStatusMsg('Identity verified! Accessing vault...');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      console.warn('Auth Error:', err);
      setPhase('error');
      setErrorMsg(err.message || 'Authentication failed');
      setStatusMsg('');
      setTimeout(() => { setPhase('idle'); setErrorMsg(''); }, 4000);
    }
  };

  return (
    <div className="min-h-screen cyber-grid relative flex flex-col items-center justify-center px-4 overflow-y-auto py-10" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, rgba(0,212,255,0.05) 40%, #030712 70%)' }}>
      <ParticleField />

      {/* Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #00d4ff20, #7c3aed20)', border: '1px solid rgba(0,212,255,0.3)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#00d4ff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M2 17l10 5 10-5" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" stroke="#06ffb4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span className="font-space font-bold text-lg hidden sm:block" style={{ color: '#f0f6fc' }}>Bio<span className="shimmer-text">Vault</span></span>
      </div>

      <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full animate-fadeInUp" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', animationDelay: '0.1s', opacity: 0 }}>
        <div className="status-dot" />
        <span className="text-xs font-medium" style={{ color: '#00d4ff' }}>Network Secure</span>
      </div>

      {/* Main Card */}
      <div className="glass-card w-full max-w-sm p-6 sm:p-8 flex flex-col items-center gap-6 animate-fadeInUp" style={{ background: 'rgba(13,17,23,0.9)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '0.2s', opacity: 0 }}>
        
        {/* Toggle Register/Login */}
        <div className="flex w-full rounded-lg p-1" style={{ background: '#030712', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => { setMode('login'); setPhase('idle'); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white/10 text-white' : 'text-[#8b949e] hover:text-white'}`}>
            Login
          </button>
          <button onClick={() => { setMode('register'); setPhase('idle'); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-white/10 text-white' : 'text-[#8b949e] hover:text-white'}`}>
            Register
          </button>
        </div>

        <div className="text-center w-full">
          <h1 className="font-space font-bold text-2xl mb-2" style={{ color: '#f0f6fc' }}>
            {mode === 'register' ? 'Create BioVault' : 'Welcome Back'}
          </h1>
          <p className="text-sm" style={{ color: '#8b949e' }}>
            {mode === 'register' ? 'Link your biometrics to a new wallet' : 'Scan your biometrics to unlock'}
          </p>
        </div>

        {mode === 'register' && (
          <div className="w-full space-y-2 animate-fadeIn">
            <label className="text-xs font-medium" style={{ color: '#8b949e' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Satoshi"
              className="input-field w-full px-4 py-3 text-sm"
              disabled={phase !== 'idle' && phase !== 'error'}
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <FingerprintScanner scanning={phase === 'scanning'} success={phase === 'success'} error={phase === 'error'} />
          
          <div className="h-6 flex items-center justify-center">
            {phase === 'scanning' && <p className="text-sm animate-pulse" style={{ color: '#00d4ff' }}>{statusMsg}</p>}
            {phase === 'success' && <p className="text-sm animate-fadeIn" style={{ color: '#06ffb4' }}>{statusMsg}</p>}
            {phase === 'error' && <p className="text-xs text-center animate-fadeIn" style={{ color: '#ff4757' }}>{errorMsg}</p>}
          </div>
        </div>

        <button
          onClick={handleAuth}
          disabled={phase === 'scanning' || phase === 'success'}
          className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
          style={{ opacity: (phase === 'scanning' || phase === 'success') ? 0.7 : 1, cursor: (phase === 'scanning' || phase === 'success') ? 'not-allowed' : 'pointer' }}
        >
          {phase === 'scanning' ? (
            <><span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Processing…</>
          ) : phase === 'success' ? (
            <>✓ Approved</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" stroke="white" strokeWidth="2"/><path d="M9 21h6M10 17v4M14 17v4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              {mode === 'register' ? 'Register Biometrics' : 'Login with Biometrics'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
