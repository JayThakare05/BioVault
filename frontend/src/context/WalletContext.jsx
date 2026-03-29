import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
};

// ── Safe Random (For mobile HTTP where window.crypto may fail) ──
const safeRandom = (len) => {
  const arr = new Uint8Array(len);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
};

// ── Fake Transaction History ──────────────────────────────
const INITIAL_TX = [
  {
    hash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    type: 'received',
    amount: '1.5',
    from: '0xAbCd1234EfGh5678IjKl9012MnOp3456QrSt7890',
    to: null,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'confirmed',
    label: 'Received from Exchange',
  },
  {
    hash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
    type: 'sent',
    amount: '0.25',
    from: null,
    to: '0x9876FeDcBa5432109876FeDcBa5432109876FeDc',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: 'confirmed',
    label: 'Sent to Alice',
  },
  {
    hash: '0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    type: 'received',
    amount: '0.75',
    from: '0x1234AbCd5678EfGh9012IjKl3456MnOp7890QrSt',
    to: null,
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'confirmed',
    label: 'DeFi Yield',
  },
];

export function WalletProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [biometricId, setBiometricId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState('2.5000');
  const [transactions, setTransactions] = useState(INITIAL_TX);
  const [authMethod, setAuthMethod] = useState(null); // 'webauthn' | 'simulated'

  // Load existing profile if any
  useEffect(() => {
    const savedName = localStorage.getItem('biovault_username');
    if (savedName) setUserProfile({ name: savedName });
  }, []);

  const generateWallet = useCallback((credentialId) => {
    const newWallet = ethers.Wallet.createRandom();
    setWallet({
      address: newWallet.address,
      privateKey: newWallet.privateKey,
      mnemonic: newWallet.mnemonic?.phrase,
      publicKey: newWallet.signingKey?.publicKey,
    });
    return newWallet.address;
  }, []);

  // ── WebAuthn Register ───────────────────────────────────────
  const registerWebAuthn = useCallback(async (username) => {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');

    const challenge = safeRandom(32);
    const userId = safeRandom(16);

    const creationOptions = {
      challenge,
      rp: { name: 'BioVault', id: window.location.hostname || 'localhost' },
      user: { id: userId, name: username, displayName: username },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = await navigator.credentials.create({ publicKey: creationOptions });
    const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem('biovault_credential_id', credId);
    return credId;
  }, []);

  // ── WebAuthn Login ──────────────────────────────────────────
  const loginWebAuthn = useCallback(async () => {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
    const stored = localStorage.getItem('biovault_credential_id');
    if (!stored) throw new Error('No biometric profile found on this device');

    const challenge = safeRandom(32);
    const assertionOptions = {
      challenge,
      timeout: 60000,
      rpId: window.location.hostname || 'localhost',
      allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob(stored), c => c.charCodeAt(0)) }],
      userVerification: 'required',
    };
    
    const assertion = await navigator.credentials.get({ publicKey: assertionOptions });
    return btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
  }, []);

  // ── Simulated Registration / Login ──────────────────────────
  const simulateBiometric = useCallback(async () => {
    await new Promise(r => setTimeout(r, 2500));
    return 'simulated_' + Math.random().toString(36).substring(2);
  }, []);

  // ── Full Register Flow ──────────────────────────────────────
  const registerAccount = useCallback(async (username) => {
    let credId;
    try {
      // 🚨 Will fail on mobile HTTP because WebAuthn requires HTTPS
      credId = await registerWebAuthn(username);
      setAuthMethod('webauthn');
    } catch (err) {
      console.warn('WebAuthn failed (likely mobile HTTP), falling back to simulation:', err);
      credId = await simulateBiometric();
      setAuthMethod('simulated');
      localStorage.setItem('biovault_credential_id', credId); // save fake ID
    }

    localStorage.setItem('biovault_username', username);
    setUserProfile({ name: username });
    setBiometricId(credId);
    generateWallet(credId);
    setIsAuthenticated(true);
  }, [registerWebAuthn, simulateBiometric, generateWallet]);

  // ── Full Login Flow ─────────────────────────────────────────
  const loginAccount = useCallback(async () => {
    let credId;
    const stored = localStorage.getItem('biovault_credential_id');
    if (!stored) throw new Error("Please register an account first.");

    try {
      if (stored.startsWith('simulated_')) throw new Error("Simulation profile");
      credId = await loginWebAuthn();
      setAuthMethod('webauthn');
    } catch (err) {
      console.warn('Falling back to simulated login:', err);
      credId = await simulateBiometric();
      if (!stored.startsWith('simulated_') && err.message !== "Simulation profile") {
         // It used to be real WebAuthn, but failed. We still let them in for demo.
      }
      setAuthMethod('simulated');
    }

    setBiometricId(credId);
    generateWallet(credId);
    setIsAuthenticated(true);
  }, [loginWebAuthn, simulateBiometric, generateWallet]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setWallet(null);
    setBiometricId(null);
    setAuthMethod(null);
    setBalance('2.5000');
    setTransactions(INITIAL_TX);
  }, []);

  const sendTransaction = useCallback(async ({ to, amount, label }) => {
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(balance);
    if (amountNum > balanceNum) throw new Error('Insufficient balance');
    if (amountNum <= 0) throw new Error('Invalid amount');
    if (!ethers.isAddress(to)) throw new Error('Invalid ETH address');

    await new Promise(r => setTimeout(r, 2000));

    const hashArr = Array.from(safeRandom(32));
    const hash = '0x' + hashArr.map(b => b.toString(16).padStart(2, '0')).join('');

    const newTx = {
      hash, type: 'sent', amount: amountNum.toFixed(4), from: null, to,
      timestamp: new Date().toISOString(), status: 'confirmed', label: label || `Sent to ${to.slice(0, 8)}...`,
    };

    setTransactions(prev => [newTx, ...prev]);
    setBalance(prev => (parseFloat(prev) - amountNum).toFixed(4));
    return hash;
  }, [balance]);

  const checkFraud = useCallback((amount) => parseFloat(amount) > 1.0, []);

  return (
    <WalletContext.Provider value={{
      isAuthenticated, biometricId, wallet, balance, transactions, authMethod, userProfile,
      registerAccount, loginAccount, logout, sendTransaction, checkFraud,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
