import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useWallet } from '../context/WalletContext';
import FaceScanner from '../components/FaceScanner';
import axios from 'axios';

export default function ResetBiometricsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { performBiometricScan } = useWallet();
  
  const [status, setStatus] = useState('verifying'); // verifying | verified | scanning | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [username, setUsername] = useState('');
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [biometricData, setBiometricData] = useState(null);

  useEffect(() => {
    const user = searchParams.get('username');
    if (user) setUsername(user);

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      signInWithEmailLink(auth, email, window.location.href)
        .then((result) => {
          window.localStorage.removeItem('emailForSignIn');
          setStatus('verified');
          console.log("Email link verified:", result.user.email);
        })
        .catch((err) => {
          console.error("Verification error:", err);
          setStatus('error');
          setErrorMsg('The link has expired or is invalid.');
        });
    } else {
      setStatus('error');
      setErrorMsg('Invalid access link.');
    }
  }, [searchParams]);

  const handleScan = async (type) => {
    if (type === 'face') {
        setShowFaceScanner(true);
        return;
    }
    
    setStatus('scanning');
    try {
      const data = await performBiometricScan(username);
      setBiometricData(data);
      await finalizeReset(data, null);
    } catch (err) {
      setErrorMsg(err.message || 'Scan failed');
      setStatus('verified');
    }
  };

  const handleFaceComplete = async (faceId) => {
      setShowFaceScanner(false);
      setStatus('scanning');
      await finalizeReset(null, faceId);
  };

  const finalizeReset = async (bio, face) => {
      try {
          const email = auth.currentUser?.email;
          const token = await auth.currentUser?.getIdToken();
          
          await axios.post('/api/auth/reset-biometrics', {
              username,
              email,
              biometricData: bio,
              faceBiometricData: face,
              firebaseToken: token
          });
          
          setStatus('success');
          setTimeout(() => navigate('/'), 3000);
      } catch (err) {
          setErrorMsg(err.response?.data?.error || 'Update failed');
          setStatus('verified');
      }
  };

  return (
    <div className="min-h-screen cyber-grid flex flex-col items-center justify-center px-4" style={{ background: '#030712' }}>
      <div className="glass-card w-full max-w-md p-8 flex flex-col items-center gap-6 text-center">
        <h1 className="font-space font-bold text-2xl text-white">Reset Biometrics</h1>
        
        {status === 'verifying' && <p className="text-gray-400 animate-pulse">Verifying security link...</p>}
        
        {status === 'error' && (
            <div className="space-y-4">
                <p className="text-red-500">{errorMsg}</p>
                <button onClick={() => navigate('/')} className="btn-ghost px-6 py-2">Back to Login</button>
            </div>
        )}

        {status === 'verified' && (
            <div className="space-y-6 animate-fadeIn">
                <p className="text-gray-400">Identity verified via email. Please register your new biometrics for <b>{username}</b>.</p>
                <div className="flex gap-4">
                    <button onClick={() => handleScan('finger')} className="btn-primary flex-1 py-3 text-sm">Scan Fingerprint</button>
                    <button onClick={() => handleScan('face')} className="btn-primary flex-1 py-3 text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>Scan Face ID</button>
                </div>
            </div>
        )}

        {status === 'scanning' && <p className="text-cyan-400 animate-pulse">Updating secure vault...</p>}

        {status === 'success' && (
            <div className="animate-fadeIn space-y-4">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-green-500 font-medium">Access Restored!</p>
                <p className="text-xs text-gray-500">Your biometrics have been updated. Redirecting to login...</p>
            </div>
        )}
      </div>

      {showFaceScanner && (
          <FaceScanner 
            onScanComplete={handleFaceComplete} 
            onCancel={() => setShowFaceScanner(false)} 
          />
      )}
    </div>
  );
}
