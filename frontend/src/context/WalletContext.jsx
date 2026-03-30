import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { auth } from '../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';

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
      rp: { name: 'BioVault' },
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

  // ── Standalone Biometric Functions ─────────────────────────
  const performBiometricScan = useCallback(async (username) => {
    try {
      return await registerWebAuthn(username);
    } catch (err) {
      console.warn('WebAuthn failed, falling back to simulation:', err);
      return await simulateBiometric();
    }
  }, [registerWebAuthn, simulateBiometric]);

  const performBiometricVerify = useCallback(async () => {
    try {
      return await loginWebAuthn();
    } catch (err) {
      console.warn('WebAuthn login failed, falling back to simulation:', err);
      return await simulateBiometric();
    }
  }, [loginWebAuthn, simulateBiometric]);

  // ── Full Register Flow ──────────────────────────────────────
  const registerAccount = useCallback(async ({ username, email, fullName, biometricData, faceBiometricData }) => {

    const generatedAddress = generateWallet(biometricData || faceBiometricData || username);

    const res = await axios.post('/api/auth/register', {
      username,
      email,
      fullName,
      biometricData,
      faceBiometricData,
      walletAddress: generatedAddress
    });

    localStorage.setItem('biovault_username', username);
    if(biometricData) localStorage.setItem('biovault_credential_id', biometricData);
    if(faceBiometricData) localStorage.setItem('biovault_face_id', faceBiometricData);
    
    setUserProfile({ name: res.data.user.fullName, username: res.data.user.username });
    setBalance(res.data.user.points.toFixed(4));
    setBiometricId(biometricData || faceBiometricData);
    setIsAuthenticated(true);
  }, [generateWallet]);

  const loginAccount = useCallback(async ({ username, biometricData, faceBiometricData }) => {
    const res = await axios.post('/api/auth/login', {
      username,
      biometricData: biometricData || undefined,
      faceBiometricData: faceBiometricData || undefined
    });

    if(biometricData || faceBiometricData) generateWallet(biometricData || faceBiometricData);

    setUserProfile({ name: res.data.user.fullName, username: res.data.user.username });
    setBalance(res.data.user.points.toFixed(4));
    setBiometricId(biometricData || faceBiometricData);
    setIsAuthenticated(true);
  }, [generateWallet]);

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
    if (amountNum <= 0) throw new Error('Invalid amount');

    // Call backend to transfer points between users
    // Normally 'to' is an ETH address but we treat it as username here
    const res = await axios.post('/api/transaction/transfer', {
      fromUsername: userProfile.username,
      toUsername: to,
      amount: amountNum
    });

    const hashArr = Array.from(safeRandom(32));
    const hash = '0x' + hashArr.map(b => b.toString(16).padStart(2, '0')).join('');

    const newTx = {
      hash, type: 'sent', amount: amountNum.toFixed(4), from: userProfile.username, to,
      timestamp: new Date().toISOString(), status: 'confirmed', label: label || `Sent to ${to}`,
    };

    setTransactions(prev => [newTx, ...prev]);
    setBalance(res.data.remainingBalance.toFixed(4));
    return hash;
  }, [balance, userProfile]);

  // ── Biometric Reset (Recovery) ─────────────────────────────
  const requestBiometricReset = useCallback(async (username, email) => {
    // 1. Verify user exists in our DB first
    await axios.post('/api/auth/reset-request', { username, email });

    // 2. Send Firebase reset link
    const actionCodeSettings = {
      // Your production URL where the user will land to update biometrics
      url: window.location.origin + '/reset-biometrics?username=' + encodeURIComponent(username),
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    // Save email for verification when they click the link
    window.localStorage.setItem('emailForSignIn', email);
    
    return { success: true };
  }, []);

  const checkFraud = useCallback((amount) => parseFloat(amount) > 1.0, []);

  return (
    <WalletContext.Provider value={{
      isAuthenticated, biometricId, wallet, balance, transactions, authMethod, userProfile,
      registerAccount, loginAccount, logout, sendTransaction, checkFraud,
      performBiometricScan, performBiometricVerify, requestBiometricReset
    }}>
      {children}
    </WalletContext.Provider>
  );
}
